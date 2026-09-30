---
name: eldra-content-model
description: This skill should be used when the user designs or changes Eldra CMS schemas or fields, edits "cms/content-model.eldra.json", asks how to model a page, section, menu or singleton in Studio, or asks Claude to create schemas or entries through the Eldra MCP tools ("create_schema", "update_schema", "create_entry").
---

# Eldra content model

Schemas are the contract between Studio and the site: the Vite plugin turns them into TypeScript
types, so every design choice here shows up in code. The project's model lives in
`cms/content-model.eldra.json` (format in references/archive-format.md), and
`/eldra-storefront:content-model` creates what the organization lacks.

## Designing schemas

- `apiId` and `fieldId` are lower snake_case and stable (`navigation_item`, `hero_image`). Renaming
  one breaks the generated types and every read; add a new field instead.
- One title field per schema (`isTitle: true`); it is what Studio lists.
- Every schema the site reads by URL or as a singleton has a `slug` field of type `slug` with
  `validators.unique: true`. Singletons (header, footer) are one entry found by a fixed slug, not a
  schema with one row assumed.
- Text a visitor reads is `localized: true`; ids, slugs, URLs, numbers and flags are not.
- Reference fields name their allowed schemas (`relation.allowedSchemaIds`) and say whether they
  hold many (`relation.multiple`). An open reference produces a union type nobody can render.
- Select options carry a label per locale.
- Keep presentation out: no colour, spacing or layout fields unless an editor truly chooses them.
- Check `list_field_types` for the types and their configuration before inventing a field shape.

## Changing a model that has content

- Adding a field is safe. Changing a field's type or localization, or removing it, breaks existing
  entries and the generated types; do it in Studio deliberately, never through a script.
- Add the field to `cms/content-model.eldra.json` in the same change as the code that reads it.

## Writing through the MCP

The MCP acts as the logged-in member and writes drafts only. Rules:

1. Call `list_locales` first; write localized fields as an object keyed by locale
   (`{ "en-US": "About", "is-IS": "Um okkur" }`) for every organization locale.
2. Before `create_schema`, call `list_schemas` and `list_field_types`; reuse an existing schema or
   field id rather than creating a near-duplicate.
3. `update_schema` replaces the whole field list: fetch the schema, resend every existing field
   unchanged, and append the new ones. Never drop or alter a field you did not add.
4. Before `create_entry`, search with `list_entries` (`filter: ["slug:eq:<slug>"]`) and check
   `check_unique_field`; prefer `update_entry` on an existing draft over a duplicate.
5. Reference values are `{ "value": "<entry id>", "type": "entry" }`, in a list when the field is
   multiple.
6. Media: `upload_asset_from_url` (public https URL) or `upload_asset` (small base64), alt text in
   every locale, then the asset id in the media field.
7. Never claim content is live. Report the ids of everything created or changed.
8. On `ACCESS_DENIED`, explain that the member's role does not allow it and stop; do not retry.

Use `/eldra-storefront:content-model` for the project's manifest rather than issuing these calls by
hand; it follows these rules and reports conflicts instead of changing fields.

## Never use the archive importer on a live organization

Studio's content import of an `.eldra.json` archive is safe only into an organization with no CMS
content. Into one with content it replaces matched schemas (fields missing from the archive are
removed), duplicates entries it did not create, and drops media links on matched entries.
