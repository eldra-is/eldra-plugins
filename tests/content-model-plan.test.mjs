import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { plan } from '../plugins/eldra-storefront/scripts/content-model-plan.mjs';

const manifest = JSON.parse(readFileSync(new URL('./fixtures/content-model.eldra.json', import.meta.url), 'utf8'));
const locales = [
  { locale: 'en-US', isDefault: true },
  { locale: 'is-IS', isDefault: false },
];
const ID = {
  navigation_item: '00000000-0000-4000-8000-000000000001',
  site_header: '00000000-0000-4000-8000-000000000002',
  page: '00000000-0000-4000-8000-000000000003',
  navHome: '00000000-0000-4000-8000-0000000000a1',
  navShop: '00000000-0000-4000-8000-0000000000a2',
  header: '00000000-0000-4000-8000-0000000000a3',
  about: '00000000-0000-4000-8000-0000000000a4',
};

// The org's copy of a manifest schema, in the Studio field shape.
function orgSchema(apiId, { linked = true } = {}) {
  const fields = manifest.schemas.find((s) => s.apiId === apiId).fields.map(({ relation, ...f }) =>
    relation
      ? { ...f, relation: { allowedSchemaIds: linked ? [ID.navigation_item] : [], allowProducts: false, multiple: true } }
      : { ...f, localized: Boolean(f.localized), isTitle: Boolean(f.isTitle) }
  );
  return { id: ID[apiId], apiId, fields };
}
const complete = (extra = {}) => ({
  locales,
  schemas: ['navigation_item', 'site_header', 'page'].map((a) => orgSchema(a)),
  entries: {},
  ...extra,
});
const empty = { locales, schemas: [], entries: {} };

test('a dry run on an empty organization writes nothing and predicts every create', () => {
  const result = plan(manifest, empty, { dryRun: true });
  assert.equal(result.phase, 'done');
  assert.deepEqual(result.steps, []);
  assert.deepEqual(result.report.rows, [
    { schema: 'navigation_item', action: 'would create', created: 2, skipped: 0 },
    { schema: 'site_header', action: 'would create', created: 1, skipped: 0 },
    { schema: 'page', action: 'would create', created: 1, skipped: 1 },
  ]);
  assert.ok(result.report.mediaFields.includes('page/about.hero_image'));
  assert.ok(result.report.fallbackLocales.includes('page/about.title: is-IS uses the en-US text'));
  assert.match(result.report.table, /\| Schema \| Action \| Entries to create \| Entries skipped \|/);
});

test('a dry run looks entries up in existing schemas and never plans a write', () => {
  const result = plan(manifest, complete(), { dryRun: true });
  assert.equal(result.phase, 'entry-lookups');
  assert.ok(result.steps.every((s) => s.tool === 'list_entries'));
});

test('missing schemas are created first, relations left open until their targets exist', () => {
  const result = plan(manifest, empty);
  assert.equal(result.phase, 'schemas');
  assert.deepEqual(result.steps.map((s) => [s.tool, s.args.apiId]), [
    ['create_schema', 'navigation_item'],
    ['create_schema', 'site_header'],
    ['create_schema', 'page'],
  ]);
  const items = result.steps[1].args.fields.find((f) => f.fieldId === 'items');
  assert.deepEqual(items.relation, { allowedSchemaIds: [], allowProducts: false, multiple: true });
});

test('relations are filled in on schemas this run created', () => {
  const state = complete({ created: { schemas: ['navigation_item', 'site_header', 'page'] } });
  state.schemas[1] = orgSchema('site_header', { linked: false });
  const result = plan(manifest, state);
  assert.equal(result.phase, 'schema-relations');
  assert.equal(result.steps.length, 1);
  const [step] = result.steps;
  assert.equal(step.tool, 'update_schema');
  assert.equal(step.args.schemaId, ID.site_header);
  assert.equal(step.args.fields.length, 3);
  assert.deepEqual(step.args.fields.find((f) => f.fieldId === 'items').relation.allowedSchemaIds, [ID.navigation_item]);
});

test('adds only missing fields to an existing schema, keeps extra fields and reports conflicts', () => {
  const title = { fieldId: 'title', name: 'Title', type: 'string', localized: false, isTitle: true };
  const legacy = { fieldId: 'legacy_banner', name: 'Legacy banner', type: 'string', localized: false, isTitle: false };
  const state = complete();
  state.schemas[2] = { id: ID.page, apiId: 'page', fields: [title, legacy] };
  const result = plan(manifest, state);
  assert.equal(result.phase, 'schemas');
  assert.equal(result.steps.length, 1);
  const [step] = result.steps;
  assert.equal(step.tool, 'update_schema');
  assert.deepEqual(step.args.fields.map((f) => f.fieldId), ['title', 'legacy_banner', 'slug', 'hero_image']);
  assert.deepEqual(step.args.fields[0], title);
  assert.deepEqual(step.args.fields[1], legacy);
  assert.deepEqual(step.record, { fields: ['page.slug', 'page.hero_image'] });
  assert.match(result.report.conflicts[0], /^page\.title: the organization has string, the manifest wants string \(localized\)/);
  assert.equal(result.report.rows[2].action, 'add fields: slug, hero_image; conflicts: title');
});

test('entries are looked up by slug before any is created', () => {
  const result = plan(manifest, complete());
  assert.equal(result.phase, 'entry-lookups');
  assert.deepEqual(result.steps.map((s) => s.args.filter[0]), ['slug:eq:nav-home', 'slug:eq:nav-shop', 'slug:eq:main-header', 'slug:eq:about']);
  assert.deepEqual(result.steps[0].args, { schemaId: ID.navigation_item, filter: ['slug:eq:nav-home'], pageSize: 1 });
  assert.ok(result.report.notes.some((n) => n.startsWith('page/entry:untitled: no slug')));
});

test('only absent entries are created, as drafts, with a value for every org locale', () => {
  const entries = {
    navigation_item: { 'nav-home': ID.navHome, 'nav-shop': null },
    site_header: { 'main-header': null },
    page: { about: null },
  };
  const result = plan(manifest, complete({ entries }));
  assert.equal(result.phase, 'entries');
  assert.deepEqual(result.steps.map((s) => s.record.entry), ['entry:nav-shop', 'entry:header', 'entry:about']);
  const about = result.steps[2].args;
  assert.deepEqual(about, { schemaId: ID.page, data: { title: { 'en-US': 'About', 'is-IS': 'About' }, slug: 'about' } });
  assert.deepEqual(result.steps[1].args.data, { title: 'Main header', slug: 'main-header' });
  assert.ok(result.steps.every((s) => !('status' in s.args.data)));
  assert.deepEqual(result.report.rows[0], { schema: 'navigation_item', action: 'unchanged', created: 1, skipped: 1 });
});

test('references are linked once their entries exist', () => {
  const entries = { navigation_item: { 'nav-home': ID.navHome } };
  const created = { entries: { 'entry:nav-shop': ID.navShop, 'entry:header': ID.header, 'entry:about': ID.about } };
  const result = plan(manifest, complete({ entries, created }));
  assert.equal(result.phase, 'entry-relations');
  assert.deepEqual(result.steps, [
    {
      tool: 'update_entry',
      args: {
        schemaId: ID.site_header,
        entryId: ID.header,
        data: { items: [{ value: ID.navHome, type: 'entry' }, { value: ID.navShop, type: 'entry' }] },
      },
      record: { linked: 'entry:header' },
    },
  ]);
});

test('finishes with a report once everything is done', () => {
  const entries = { navigation_item: { 'nav-home': ID.navHome } };
  const created = {
    entries: { 'entry:nav-shop': ID.navShop, 'entry:header': ID.header, 'entry:about': ID.about },
    linked: ['entry:header'],
  };
  const result = plan(manifest, complete({ entries, created }));
  assert.equal(result.phase, 'done');
  assert.match(result.report.table, /\| site_header \| unchanged \| 1 \| 0 \|/);
});

test('reference multiplicity mismatch is treated as a conflict', () => {
  const entries = { navigation_item: { 'nav-home': ID.navHome } };
  const created = { entries: { 'entry:nav-shop': ID.navShop, 'entry:header': ID.header, 'entry:about': ID.about } };
  const state = complete({ entries, created });
  state.schemas[1].fields.find((f) => f.fieldId === 'items').relation.multiple = false;
  const result = plan(manifest, state);
  assert.equal(result.phase, 'done');
  assert.ok(result.report.conflicts.some((c) => c.startsWith('site_header.items: the organization has reference, the manifest wants reference (multiple)')));
  assert.ok(!result.steps.some((s) => s.tool === 'update_entry' && s.args.entryId === ID.header));
});

test('a manifest that is not an eldra.cms version 1 archive is refused', () => {
  assert.throws(() => plan({ ...manifest, version: 2 }, empty), /not an eldra\.cms version 1 archive/);
});
