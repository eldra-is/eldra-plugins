---
description: Create the site's content model in Studio through the Eldra MCP, add-only, as drafts
argument-hint: "[--dry-run]"
---

# Create the content model

Arguments: `$ARGUMENTS`

Create in the connected organization whatever the site's content model needs and the organization
lacks: missing schemas, missing fields on existing schemas, and missing demo entries as drafts.
Never delete anything, never change an existing field, never overwrite an existing entry, and never
publish: everything written is a draft that a person reviews and publishes in Studio. With
`--dry-run`, only read and print what would happen.

Do not use Studio's archive import for this. Importing into an organization that already has
content replaces matched schemas (fields not in the archive are removed), duplicates entries it did
not create, and drops media links on matched entries.

## 1. Preconditions

1. `.claude/eldra-storefront.local.md` must exist; if not, say `/eldra-storefront:connect` creates it
   and stop.
2. `server="$(bash "${CLAUDE_PLUGIN_ROOT}/scripts/mcp-url.sh" --name)"`. The tools are
   `mcp__<server>__<tool>`. If they are not available in this session, tell the user to run `/mcp`,
   authenticate `<server>`, and run this command again; stop.
3. `cms/content-model.eldra.json` must exist in the project; the starter ships it. If it is missing,
   say so and stop. Its `format` must be `eldra.cms` and `version` `1`.

## 2. Build the state file

Use `.claude/eldra-content-model.local.json` for a real run and
`.claude/eldra-content-model.dry-run.local.json` for a dry run. If the real-run file exists, an
earlier run stopped part way: keep its `created` object and rebuild the rest. Write the file as:

```json
{
  "locales": [],
  "schemas": [],
  "entries": {},
  "created": { "schemas": [], "fields": [], "entries": {}, "linked": [] }
}
```

- `locales`: from `list_locales`, as `{ "locale": "en-US", "isDefault": true }` items.
- `schemas`: call `list_schemas` with `pageSize: 200` and `page` 1, 2, … until a page has fewer than
  200 items. Keep `id`, `apiId` and `fields` of each, storing every field object exactly as returned with all its keys (the planner resends existing fields unchanged in `update_schema`, so a trimmed field would lose properties); if an item has no `fields`, call `get_schema`
  for it.
- Call `list_field_types`. If a field `type` used in the manifest is not offered, stop before any
  write and list those fields.

## 3. Plan and run, one phase at a time

Run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/content-model-plan.mjs" cms/content-model.eldra.json <state file> [--dry-run]
```

It prints `{ "phase", "steps", "report" }`. Exit 2 means the manifest or state is unusable; show the
message and stop.

- `phase` is `done`: go to step 4.
- Otherwise call each step's `tool` on the server with exactly its `args`, in order, and record the
  result in the state file right after each call:

| `record` | Update the state |
| --- | --- |
| `{ "schema": apiId }` | add `apiId` to `created.schemas` |
| `{ "fields": ["apiId.fieldId", …] }` | add each to `created.fields` |
| `{ "relinked": "apiId.fieldId" }` | nothing |
| `{ "lookup": { "schema", "slug" } }` | set `entries[schema][slug]` to the first returned entry's `id`, or `null` when none |
| `{ "entry": ref }` | set `created.entries[ref]` to the new entry's `id` |
| `{ "linked": ref }` | add `ref` to `created.linked` |

After a phase whose steps were `create_schema`, `add_schema_field` or `update_schema_field`, rebuild
`schemas` as in step 2.
Then run the planner again. Never edit the step arguments; if one looks wrong, stop and report it.

In a dry run the planner only returns `list_entries` steps. Never call a write tool in a dry run.

If a call fails, stop the loop. Report the error id with the table below, print the report so far,
and say that running the command again continues safely from where it stopped. If the run was
interrupted right after an entry was created but before the state file was updated, that entry is
found on the next run (by its slug) and skipped, so check its reference fields in Studio.

## 4. Report

Print `report.table`, then these lists when not empty:

- `conflicts`: fields that exist with another type or localization; left unchanged and not written.
- `mediaFields`: media the manifest references. Media is not created; an editor fills these in Studio.
- `fallbackLocales`: locales that got the default locale's text; an editor translates them.
- `missingLocales`: manifest locales the organization does not have. Ask the person whether to add
  them. With their yes, call `add_locale` for each (it needs the owner, administrator or technical
  administrator role; on `ACCESS_DENIED` such a person adds them in Studio), then run again.
- `notes`.

End with: "Nothing was published. Review and publish the drafts in Studio." In a real run that
reached `done`, delete the state file; in a dry run, delete the dry-run file and say "Dry run:
nothing was written."

## Errors

| Error id | Meaning |
| --- | --- |
| `ORGANIZATION_NOT_FOUND` | Not a member of the organization, or a wrong alias in the settings. |
| `FEATURE_DISABLED` | The MCP is not enabled for the organization; a platform administrator enables it. |
| `PRIVILEGED_SESSION_REQUIRED` | The login carries platform roles, which the login configuration should prevent; log in with an ordinary member account and report it to Eldra. |
| `UNAUTHENTICATED` | The login expired; run `/mcp`, authenticate, run again. |
| `ACCESS_DENIED` | The person's organization role does not allow this write; an organization administrator can change the role. Do not retry. |
| `RATE_LIMITED` | Too many writes in a minute; wait a minute and run again. |
| `SCHEMA_CHANGED` | Someone changed the schema during the run; run again, it continues from where it stopped. |
| `CMS_ENTRY_STALE_UPDATE` | Someone saved the entry at the same moment; run again. |
| `UPSTREAM_ERROR` | An Eldra service did not answer; try again later. |
| anything else | Show the id and message as returned. |
