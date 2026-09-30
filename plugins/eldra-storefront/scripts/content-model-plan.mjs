#!/usr/bin/env node
// Plans the next step of /eldra-storefront:content-model. Pure: reads the project's content-model
// manifest (an eldra.cms v1 archive) and a state file describing the organization, and prints
// { phase, steps, report } as JSON. It never talks to the network; the command runs the steps.
// Usage: node content-model-plan.mjs <manifest.eldra.json> <state.json> [--dry-run]
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const isLocalRef = (v, kind) =>
  v !== null && typeof v === 'object' && !Array.isArray(v) && v.kind === kind && typeof v.ref === 'string';

function collectRefs(value, kind, out = []) {
  if (isLocalRef(value, kind)) out.push(value.ref);
  else if (Array.isArray(value)) value.forEach((v) => collectRefs(v, kind, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => collectRefs(v, kind, out));
  return out;
}

// The CMS write shape for entry references: one {value, type} object, or a list when multiple.
export function referenceValue(ids, multiple) {
  const refs = ids.map((id) => ({ value: id, type: 'entry' }));
  return multiple ? refs : refs[0];
}

function slugOf(entry) {
  if (typeof entry.data?.slug === 'string') return entry.data.slug;
  for (const values of Object.values(entry.localizations ?? {})) {
    if (typeof values?.slug === 'string') return values.slug;
  }
  return undefined;
}

const describe = (f) => `${f.type}${f.localized ? ' (localized)' : ''}`;
const union = (a = [], b = []) => [...new Set([...a, ...b])];
const subset = (want = [], have = []) => want.every((id) => have.includes(id));

// An archive field in the Studio field shape, with schema refs mapped to the org's schema ids.
function studioField(field, schemaIdByRef) {
  const out = {
    fieldId: field.fieldId,
    name: field.name,
    type: field.type,
    localized: Boolean(field.localized),
    isTitle: Boolean(field.isTitle),
  };
  for (const key of ['groupId', 'description', 'helpText', 'default', 'validators', 'metadata']) {
    if (field[key] !== undefined) out[key] = structuredClone(field[key]);
  }
  const notes = [];
  if (Array.isArray(field.metadata?.allowedSchemas)) {
    out.metadata.allowedSchemas = field.metadata.allowedSchemas.map((r) => schemaIdByRef.get(r)).filter(Boolean);
  }
  if (field.relation) {
    const ids = (field.relation.allowedSchemaRefs ?? []).map((r) => schemaIdByRef.get(r)).filter(Boolean);
    out.relation = { allowedSchemaIds: ids, allowProducts: false, multiple: Boolean(field.relation.multiple) };
    if (field.relation.allowedTagRefs?.length) notes.push(`${field.fieldId}: tag restrictions are not carried over; set them in Studio`);
  }
  if (field.presetRef) notes.push(`${field.fieldId}: the field preset is not carried over`);
  return { field: out, notes };
}

function linksComplete(orgField, wanted) {
  return (
    subset(wanted.relation?.allowedSchemaIds, orgField.relation?.allowedSchemaIds) &&
    subset(wanted.metadata?.allowedSchemas, orgField.metadata?.allowedSchemas)
  );
}

function withLinks(orgField, wanted) {
  const next = structuredClone(orgField);
  if (wanted.relation) {
    next.relation = { ...next.relation, allowedSchemaIds: union(next.relation?.allowedSchemaIds, wanted.relation.allowedSchemaIds) };
  }
  if (wanted.metadata?.allowedSchemas) {
    next.metadata = { ...next.metadata, allowedSchemas: union(next.metadata?.allowedSchemas, wanted.metadata.allowedSchemas) };
  }
  return next;
}

// The create_entry data for one manifest entry, plus the references to link afterwards.
function entryValues(entry, schema, conflicts, orgLocales, defaultLocale, label, report) {
  const data = {};
  const refs = {};
  for (const field of schema.fields) {
    const id = field.fieldId;
    if (conflicts.has(id)) continue;
    let value;
    if (field.localized) {
      const byLocale = entry.localizations ?? {};
      const sourceLocale = byLocale[defaultLocale]?.[id] !== undefined
        ? defaultLocale
        : Object.keys(byLocale).find((l) => byLocale[l]?.[id] !== undefined);
      if (!sourceLocale) continue;
      value = {};
      for (const locale of orgLocales) {
        const own = byLocale[locale]?.[id];
        value[locale] = own !== undefined ? own : byLocale[sourceLocale][id];
        if (own === undefined) report.fallbackLocales.push(`${label}.${id}: ${locale} uses the ${sourceLocale} text`);
      }
    } else {
      value = entry.data?.[id];
      if (value === undefined) continue;
    }
    if (collectRefs(value, 'media').length) {
      report.mediaFields.push(`${label}.${id}`);
      continue;
    }
    const entryRefs = collectRefs(value, 'entry');
    if (entryRefs.length) {
      if (field.localized) report.notes.push(`${label}.${id}: localized references are not written; set them in Studio`);
      else refs[id] = { refs: entryRefs, multiple: Boolean(field.relation?.multiple) };
      continue;
    }
    data[id] = value;
  }
  return { data, refs };
}

function table(rows, dryRun) {
  const head = ['Schema', 'Action', dryRun ? 'Entries to create' : 'Entries created', 'Entries skipped'];
  return [
    `| ${head.join(' | ')} |`,
    `| ${head.map(() => '---').join(' | ')} |`,
    ...rows.map((r) => `| ${r.schema} | ${r.action} | ${r.created} | ${r.skipped} |`),
  ].join('\n');
}

export function plan(manifest, state, { dryRun = false } = {}) {
  if (manifest?.format !== 'eldra.cms' || manifest?.version !== 1) {
    throw new Error('the manifest is not an eldra.cms version 1 archive');
  }
  const created = { schemas: [], fields: [], entries: {}, linked: [], ...state.created };
  const orgLocales = (state.locales ?? []).map((l) => l.locale);
  if (orgLocales.length === 0) throw new Error('the organization has no locales; add one in Studio first');
  const defaultLocale = state.locales.find((l) => l.isDefault)?.locale ?? orgLocales[0];
  const orgByApiId = new Map((state.schemas ?? []).map((s) => [s.apiId, s]));
  const manifestSchemaByRef = new Map(manifest.schemas.map((s) => [s.ref, s]));
  const schemaIdByRef = new Map();
  for (const s of manifest.schemas) if (orgByApiId.has(s.apiId)) schemaIdByRef.set(s.ref, orgByApiId.get(s.apiId).id);

  const report = { rows: [], table: '', conflicts: [], fallbackLocales: [], mediaFields: [], missingLocales: [], notes: [] };
  const schemaSteps = [];
  const relinkSteps = [];
  const conflictsBySchema = new Map();

  for (const schema of manifest.schemas) {
    const org = orgByApiId.get(schema.apiId);
    const converted = schema.fields.map((f) => studioField(f, schemaIdByRef));
    converted.forEach((c) => c.notes.forEach((n) => report.notes.push(`${schema.apiId}.${n}`)));
    const row = { schema: schema.apiId, action: '', created: 0, skipped: 0 };
    report.rows.push(row);
    if (!org) {
      conflictsBySchema.set(schema.apiId, new Set());
      row.action = dryRun ? 'would create' : 'create';
      schemaSteps.push({
        tool: 'create_schema',
        args: { name: schema.name, apiId: schema.apiId, fields: converted.map((c) => c.field), ...(schema.groups?.length ? { groups: schema.groups } : {}) },
        record: { schema: schema.apiId },
      });
      continue;
    }
    const orgFields = new Map((org.fields ?? []).map((f) => [f.fieldId, f]));
    const conflicts = new Set();
    for (const { field } of converted) {
      const existing = orgFields.get(field.fieldId);
      if (existing && (existing.type !== field.type || Boolean(existing.localized) !== field.localized)) {
        conflicts.add(field.fieldId);
        report.conflicts.push(`${schema.apiId}.${field.fieldId}: the organization has ${describe(existing)}, the manifest wants ${describe(field)}; left unchanged and not written`);
      }
    }
    conflictsBySchema.set(schema.apiId, conflicts);
    const missing = converted.map((c) => c.field).filter((f) => !orgFields.has(f.fieldId));
    const added = missing.map(({ groupId, ...rest }) => rest);
    if (added.length) {
      schemaSteps.push({
        tool: 'update_schema',
        args: { schemaId: org.id, fields: [...org.fields, ...added] },
        record: { fields: added.map((f) => `${schema.apiId}.${f.fieldId}`) },
      });
    }
    const ours = (fieldId) => created.schemas.includes(schema.apiId) || created.fields.includes(`${schema.apiId}.${fieldId}`);
    const unlinked = converted
      .map((c) => c.field)
      .filter((f) => orgFields.has(f.fieldId) && ours(f.fieldId) && !linksComplete(orgFields.get(f.fieldId), f));
    if (unlinked.length) {
      relinkSteps.push({
        tool: 'update_schema',
        args: { schemaId: org.id, fields: org.fields.map((f) => { const w = unlinked.find((u) => u.fieldId === f.fieldId); return w ? withLinks(f, w) : f; }) },
        record: { relinked: schema.apiId },
      });
    }
    const addedEarlier = created.fields.filter((f) => f.startsWith(`${schema.apiId}.`)).map((f) => f.slice(schema.apiId.length + 1));
    if (created.schemas.includes(schema.apiId)) row.action = 'created';
    else if (added.length) row.action = `${dryRun ? 'would add' : 'add'} fields: ${added.map((f) => f.fieldId).join(', ')}`;
    else if (addedEarlier.length) row.action = `added fields: ${addedEarlier.join(', ')}`;
    else row.action = 'unchanged';
    if (conflicts.size) row.action += `; conflicts: ${[...conflicts].join(', ')}`;
  }

  const rowOf = (apiId) => report.rows.find((r) => r.schema === apiId);
  const manifestEntryByRef = new Map(manifest.entries.map((e) => [e.ref, e]));
  const resolveEntryId = (ref) => {
    if (created.entries[ref]) return created.entries[ref];
    const target = manifestEntryByRef.get(ref);
    const targetSchema = target && manifestSchemaByRef.get(target.schemaRef);
    return targetSchema ? state.entries?.[targetSchema.apiId]?.[slugOf(target)] ?? undefined : undefined;
  };
  const lookupSteps = [];
  const entrySteps = [];
  const linkSteps = [];
  const manifestLocales = new Set();

  for (const entry of manifest.entries) {
    Object.keys(entry.localizations ?? {}).forEach((l) => manifestLocales.add(l));
    const schema = manifestSchemaByRef.get(entry.schemaRef);
    if (!schema) {
      report.notes.push(`${entry.ref}: its schema ${entry.schemaRef} is not in the manifest; skipped`);
      continue;
    }
    const apiId = schema.apiId;
    const row = rowOf(apiId);
    const slug = slugOf(entry);
    const label = `${apiId}/${slug ?? entry.ref}`;
    if (!slug) {
      report.notes.push(`${label}: no slug, so an existing copy cannot be found; skipped`);
      row.skipped += 1;
      continue;
    }
    const org = orgByApiId.get(apiId);
    const values = () => entryValues(entry, schema, conflictsBySchema.get(apiId), orgLocales, defaultLocale, label, report);
    if (created.entries[entry.ref]) {
      row.created += 1;
      const { refs } = values();
      if (!org || created.linked.includes(entry.ref)) continue;
      const data = {};
      for (const [fieldId, { refs: targets, multiple }] of Object.entries(refs)) {
        const ids = targets.map(resolveEntryId).filter(Boolean);
        targets.filter((t) => !resolveEntryId(t)).forEach((t) => report.notes.push(`${label}.${fieldId}: ${t} does not exist in the organization; not linked`));
        if (ids.length) data[fieldId] = referenceValue(ids, multiple);
      }
      if (Object.keys(data).length) {
        linkSteps.push({ tool: 'update_entry', args: { schemaId: org.id, entryId: created.entries[entry.ref], data }, record: { linked: entry.ref } });
      }
      continue;
    }
    if (!org) {
      if (dryRun) {
        row.created += 1;
        values();
      }
      continue;
    }
    const known = state.entries?.[apiId] ?? {};
    if (!(slug in known)) {
      lookupSteps.push({ tool: 'list_entries', args: { schemaId: org.id, filter: [`slug:eq:${slug}`], pageSize: 1 }, record: { lookup: { schema: apiId, slug } } });
      continue;
    }
    if (known[slug]) {
      row.skipped += 1;
      continue;
    }
    row.created += 1;
    const { data } = values();
    if (!dryRun) entrySteps.push({ tool: 'create_entry', args: { schemaId: org.id, data }, record: { entry: entry.ref } });
  }

  report.missingLocales = [...manifestLocales].filter((l) => !orgLocales.includes(l));
  report.table = table(report.rows, dryRun);

  const order = dryRun
    ? [['entry-lookups', lookupSteps]]
    : [
        ['schemas', schemaSteps],
        ['schema-relations', relinkSteps],
        ['entry-lookups', lookupSteps],
        ['entries', entrySteps],
        ['entry-relations', linkSteps],
      ];
  const [phase, steps] = order.find(([, s]) => s.length) ?? ['done', []];
  return { phase, steps, report };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [manifestPath, statePath, ...flags] = process.argv.slice(2);
  if (!manifestPath || !statePath) {
    console.error('usage: content-model-plan.mjs <manifest.eldra.json> <state.json> [--dry-run]');
    process.exit(1);
  }
  try {
    const result = plan(JSON.parse(readFileSync(manifestPath, 'utf8')), JSON.parse(readFileSync(statePath, 'utf8')), {
      dryRun: flags.includes('--dry-run'),
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    console.error(`content-model-plan: ${error.message}`);
    process.exit(2);
  }
}
