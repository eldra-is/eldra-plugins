# eldra-storefront

Build a storefront on the Eldra public API the way Eldra builds them.

```bash
claude plugin marketplace add eldra-is/eldra-plugins
claude plugin install eldra-storefront@eldra
```

## Commands

| Command | What it does |
| --- | --- |
| `/eldra-storefront:new-site <name>` | Clones the public `eldra-is/storefront-starter` at its pinned release into `<name>/`, starts a fresh git history, renames the starter brand, writes `.env`. Installs nothing. |
| `/eldra-storefront:connect` | Asks for your organization alias and environment (production by default), writes `.claude/eldra-storefront.local.md`, adds the organization's MCP server to the project's `.mcp.json`, and checks it by listing the organization's locales. |
| `/eldra-storefront:content-model [--dry-run]` | Creates the schemas and demo entries the site expects (`cms/content-model.eldra.json`) through the MCP: only what is missing, as drafts, never changing an existing field. |

Typical order: `new-site`, then inside the new folder `connect` and `content-model`.

## Skills

Claude loads these when the work calls for them:

- `eldra-sdk`: `@eldrajs/sdk` (written against 0.2.x): the client, generated types, CMS reads, cart, checkout hand-off, orders, errors.
- `eldra-storefront-conventions`: how a site built from the starter is organized and why.
- `eldra-studio-connection`: environment variables, storefront origins, preview tokens, the MCP login.
- `eldra-content-model`: designing schemas that generate clean types, the `.eldra.json` manifest, the MCP write rules.

## Settings

`connect` writes `.claude/eldra-storefront.local.md` (`org`, `environment`, `gateway`, `mcp`,
`template`); every command reads it. Production is the default; for another environment `connect`
asks for its gateway and MCP URLs. Keep the file out of git with the `.gitignore` line
`.claude/*.local.*` (the scaffold and `connect` add it).

## Requirements

Git, Node.js 22 or later, pnpm, and a Studio account that is a member of the organization.
