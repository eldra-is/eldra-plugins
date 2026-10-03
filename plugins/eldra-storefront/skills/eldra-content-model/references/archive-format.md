# The `.eldra.json` archive as a content-model manifest

`cms/content-model.eldra.json` uses Studio's CMS export format. Top level:

```json
{
  "format": "eldra.cms",
  "version": 1,
  "source": { "organizationId": "starter" },
  "schemas": [],
  "entries": [],
  "media": []
}
```

References inside the archive are local `ref` strings (`"schema:page"`, `"entry:about"`), never ids;
the command maps them to the organization's ids.

## schemas[]

```json
{
  "ref": "schema:page",
  "apiId": "page",
  "name": "Page",
  "fields": [
    { "fieldId": "title", "name": "Title", "type": "string", "localized": true, "isTitle": true },
    { "fieldId": "slug", "name": "Slug", "type": "slug", "validators": { "unique": true, "required": true } },
    { "fieldId": "blocks", "name": "Blocks", "type": "reference",
      "relation": { "allowedSchemaRefs": ["schema:block_text"], "multiple": true } }
  ],
  "groups": [{ "groupId": "content", "name": "Content", "defaultOpen": true }]
}
```

Field keys: `fieldId`, `name`, `type`, `localized`, `isTitle`, `groupId`, `description`,
`helpText`, `default`, `validators` (`required`, `unique`, `min`, `max`, `match`, `prohibit`),
`metadata`, `relation` (`allowedSchemaRefs`, `allowedTagRefs`, `multiple`). In Studio the relation
becomes `allowedSchemaIds`; tag restrictions and presets are not carried over by the command.

## entries[]

```json
{
  "ref": "entry:about",
  "schemaRef": "schema:page",
  "data": { "slug": "about", "blocks": [{ "kind": "entry", "ref": "entry:about-intro" }] },
  "localizations": {
    "en-US": { "title": "About" },
    "is-IS": { "title": "Um okkur" }
  }
}
```

- `data` holds non-localized fields; `localizations[locale]` holds localized ones.
- `{ "kind": "entry", "ref": … }` is a reference to another entry in the archive.
- `{ "kind": "media", "ref": … }` points into `media[]`; the command does not create media and lists
  these fields for an editor.
- Every entry needs a `slug`, so a second run finds it instead of duplicating it.
- Exported archives also carry `sourceId`, `status`, timestamps and revisions; the command ignores
  them and always writes drafts.

## media[]

`{ "ref", "kind": "URL" | "ASSET", "url", "filename", "contentType", "altTranslations" }`.
