# Eldra storefront plugin: design

Date: 2026-09-30. Status: approved in conversation; this document is the written spec.

## Purpose

A Claude Code plugin that teaches Claude how to build an Eldra storefront the way Eldra builds them: scaffold a site from a template, connect it to a Studio organization, create the content model that site expects through the Eldra MCP, and write code against `@eldrajs/sdk` correctly.

The MCP is the hands: it reads and writes content in one organization with the person's own login. The plugin is the knowledge: how a site is structured, how it talks to Studio, what the SDK offers, and how content must be modelled so the site can read it.

## Audience

Both Eldra staff and customers' developers, from the first version. Consequences:

- Everything in the plugin is public-safe. No staging hostnames, no staff-only steps, no deploy hooks, no internal package names.
- Environment-specific values (gateway URL, MCP host) are settings the user provides, with production as the default.
- The template is the public `eldra-is/storefront-starter`, pinned to a tagged release in the registry. Nothing internal is referenced anywhere.

## Repository and marketplace

Repository: `eldra-is/eldra-plugins`, public, MIT (same license as headless-kit).

```
eldra-plugins/
├── .claude-plugin/
│   └── marketplace.json        # name "eldra", owner Eldra, lists every plugin
├── plugins/
│   ├── eldra-storefront/       # build a storefront: scaffold, connect, content model, skills
│   └── eldra-mcp/              # only the MCP connector, for people who do not write code
├── docs/
│   ├── specs/                  # design documents
│   └── backlog.md              # what is deliberately not built yet
├── LICENSE
└── README.md                   # how to add the marketplace and install a plugin
```

The marketplace manifest follows the format of Anthropic's official marketplace: `name`, `description`, `owner`, `plugins[]` with `name`, `description`, `author`, `category`, `version` and a `source` of type `git-subdir` pointing at `plugins/<name>` at a tagged ref. Users add it with `claude plugin marketplace add eldra-is/eldra-plugins` and install `eldra-storefront@eldra` or `eldra-mcp@eldra`.

Releases: release-please with one component per plugin, conventional-commit PR titles, tags `eldra-storefront-vX.Y.Z`. The marketplace entry's `ref` moves with the release.

## Plugin layout

```
plugins/eldra-storefront/
├── .claude-plugin/plugin.json
├── commands/
│   ├── new-site.md             # /eldra-storefront:new-site
│   ├── connect.md              # /eldra-storefront:connect
│   └── content-model.md        # /eldra-storefront:content-model
├── skills/
│   ├── eldra-sdk/SKILL.md
│   ├── eldra-storefront-conventions/SKILL.md
│   ├── eldra-studio-connection/SKILL.md
│   └── eldra-content-model/SKILL.md
├── templates.json              # template registry: one entry, `starter`
├── scripts/
│   ├── scaffold.sh             # clone template at ref, strip, write env
│   └── mcp-url.sh              # build the MCP URL from settings
└── README.md
```

No hooks, no agents, no bundled MCP server. The MCP connection is per project (below), because its URL contains the organization.

## Settings

Per-project settings live in `.claude/eldra-storefront.local.md` (the plugin-settings pattern: YAML frontmatter, git-ignored by the scaffold's `.gitignore`):

```yaml
---
org: sits                      # organization alias
environment: production        # or the name of a custom environment
gateway: https://web.eldra.app/api
mcp: https://mcp.eldra.app
template: cms-site             # which template this site came from
---
```

`connect` writes it; every command and skill reads it. A custom environment is given as explicit `gateway` and `mcp` URLs, never by a name the plugin has to know. That keeps staging out of the plugin while staff can still point it there.

## MCP connection

`connect` adds the organization's MCP server to the project's own `.mcp.json` (`claude mcp add --transport http --scope project eldra-<org> <mcp>/<org>/mcp`), so the connector, and the OAuth login it triggers, belong to the project, not the plugin. It then verifies by calling `list_locales` and reports the org's locales and default. If the call fails it explains the three usual causes in order: the person is not a member of the org, the org does not have the MCP feature enabled, or the environment URL is wrong.

Two organizations in one project are two servers; the command names them by alias so tools never look alike.

## Commands

### `new-site <name>`

1. Reads `templates.json`, clones `storefront-starter` at the registry's `ref` into `<name>/`, removes the template's git history and starts a fresh one.
2. Renames the starter's placeholder brand to the site name in the few files that carry it (listed in the registry), and leaves everything else as shipped.
3. Writes `.env` from the template's `.env.example` with the org alias and gateway from settings if `connect` has run, otherwise placeholders, and prints what remains to configure in Studio (registered storefront origin, preview token).
4. Ends with the next two commands to run. It does not install dependencies or start anything.

### `connect`

Asks for org alias and environment (production default, or gateway and MCP URLs), writes the settings file, adds the MCP server, verifies with `list_locales`. Re-running updates the settings and the server entry in place.

### `content-model [--dry-run]`

1. Reads `cms/content-model.eldra.json` from the project; the starter ships it.
2. Through the MCP: `list_locales`, `list_schemas`, `list_field_types`. For every schema in the manifest: `create_schema` if the apiId is absent, otherwise compare fields and `update_schema` only to add missing fields, never to change or remove existing ones. For every entry in the manifest: `list_entries` by slug, `create_entry` as a draft if absent, otherwise leave it alone. Localized values are written for every org locale the manifest has text for; missing locales get the default locale's text and are listed in the report.
3. Media referenced by the manifest is not created; the report lists the fields an editor must fill in Studio.
4. Prints a table: schema, action taken, entries created, entries skipped. `--dry-run` prints the table without writing.

Nothing is published. That is the MCP's rule and the command repeats it.

Why the MCP tools and not Studio's archive import: importing an `.eldra.json` archive into an organization that already has content replaces matched schemas (fields not in the archive are removed), duplicates entries that were not made by the importer, and drops every media link on matched entries (verified against web-studio-core, 2026-09-28). The command therefore only creates what is missing and adds fields, and never routes through the importer.

## Skills

Each skill is a `SKILL.md` with a precise trigger description and supporting reference files. They quote the SDK's real names and the starter's real conventions.

- **eldra-sdk.** Creating the client (`createEldraClient`, options as values or functions, `initEldraClient`/`getEldraClient`), the generated `.eldra/web-studio/` types from the Vite plugin and the rule to commit them, `cms.get`, `cms.list`, `cms.getEntryByUniqueField` by slug with `depth`, `catalog`, `cart` with `createCartSession`, `checkout.handoffUrl`, `orders.recover`, `inventory.availability`, `features`, `EldraHttpError` and branching on `errorId`. Reference: the headless-kit docs, linked, not copied.
- **eldra-storefront-conventions.** The ownership rule (editable content and catalog data in Studio; routes, layout, presentation, state and checkout hand-off in code). Project layout. The `useEldraClient` composable pattern and the data-fetching wrappers. Two composition models the starter ships: the generic block renderer for content pages and flat section schemas for the home page, and when to use which. Responsive images by asset URL variant. SEO helper and `noindex` for private entries. i18n: cookie-selected locale with reload versus route prefixes. Cart markup client-only. Price formatting that matches server and browser.
- **eldra-studio-connection.** Env vars (`BASE_API_URL`, `ELDRA_ORG_ID`, checkout URL, default location id, indexable flag, preview token), what is public and what is server-only in Nuxt runtime config, registering the storefront origin in Studio so browsers may spend, preview token behaviour at build time, the content deploy hook as a credential kept in Studio, and how the MCP login works (member of the org, OTP, drafts only).
- **eldra-content-model.** Designing schemas that generate clean types: stable snake_case apiIds and fieldIds, one title field, slugs unique, localized text fields, reference fields with allowed schemas, select options with per-locale labels, singleton entries by unique slug. The `.eldra.json` archive format (`format: eldra.cms`, `version: 1`, `schemas[]`, `entries[]`, `media[]`) as the content-model manifest. The MCP write rules: search before create, drafts only, every locale, report ids.

## Template registry

`templates.json`:

```json
{
  "starter": {
    "repo": "https://github.com/eldra-is/storefront-starter.git",
    "ref": "v0.1.0",
    "description": "Nuxt storefront on the Eldra public API: shop, cart, checkout hand-off, content pages",
    "brandFiles": ["app/app.config.ts", "nuxt.config.ts", "README.md"]
  }
}
```

The ref is a release tag of the starter. Moving to a new starter release is a change to this file only.

## Content-model manifest

The starter ships `cms/content-model.eldra.json` in the archive format; the plugin reads it from the project and does not carry a copy. The starter's own spec defines its content.

## The `eldra-mcp` plugin

For people who only want the connector, for example content editors: a plugin with nothing but a `.mcp.json` declaring the Eldra MCP over HTTP as `https://mcp.eldra.app/${ELDRA_ORG}/mcp`, and a README that says to set `ELDRA_ORG` to the organization alias. One org per variable value; a second org is a second value in another project. Version-pinned like the storefront plugin. Its README also points at the storefront plugin's `connect` command as the explicit alternative.

## Error handling

- Every command checks for the settings file and says which command creates it.
- Every MCP failure is reported with the MCP's error id and the plain-language cause: `ORGANIZATION_NOT_FOUND` means not a member, `FEATURE_DISABLED` means a platform admin has not enabled the MCP for the org, `PRIVILEGED_SESSION_REQUIRED` means a token with platform roles reached the MCP, which the Keycloak configuration should prevent, `ACCESS_DENIED` means the person's org role does not allow the write.
- `content-model` never deletes and never changes an existing field; it reports conflicts instead.
- `new-site` refuses to write into a non-empty directory, and reports a missing tag on the starter as a plugin bug, not a user error.

## Testing

- Structure: the plugin-dev validator on the plugin and the marketplace manifest, in CI.
- Skills: reviewed with the skill reviewer for trigger precision; each skill's code snippets are checked against the headless-kit version the plugin declares.
- Commands: `scaffold.sh` has a shell test that runs against a local clone and asserts the strip and keep lists; `content-model --dry-run` is run against a fixture manifest and a recorded MCP tool list.
- End to end: one manual pass on staging, documented in `docs/testing.md`: connect to an org, scaffold, create the starter content model, run the site against staging, see the draft content through a preview token.

## Non-goals for v1

Deploying to Cloudflare, MCP resources and prompts for claude.ai users, product tools, publishing content, multi-framework templates. These are in `docs/backlog.md`.

## Backlog (also in docs/backlog.md)

1. Deploy to Cloudflare: Workers Builds, release and production branches, the Studio deploy hook. Customer-site deploys are release-gated on purpose (merge the release PR, never deploy on push to main) and the skill must say so. Internal-leaning; may become a second, staff-only plugin.
2. MCP resources and a storefront prompt so claude.ai users get the same guidance.
3. Product tools in the MCP, then a starter content model that also seeds a catalog.
