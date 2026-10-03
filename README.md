# Eldra plugins

Claude Code plugins from Eldra. Add the marketplace once, then install what you need:

```bash
claude plugin marketplace add eldra-is/eldra-plugins
claude plugin install eldra-storefront@eldra
claude plugin install eldra-mcp@eldra
```

Plugins install from their release tags (`eldra-storefront-vX.Y.Z`, `eldra-mcp-vX.Y.Z`); a plugin
can be installed once its first release is out.

## Plugins

| Plugin | What it does |
| --- | --- |
| `eldra-storefront` | Build a storefront on the Eldra public API: scaffold from a template, connect to a Studio organization, create its content model through the Eldra MCP, and write code against `@eldrajs/sdk` the way Eldra does. See [its README](plugins/eldra-storefront/README.md). |
| `eldra-mcp` | Only the Eldra Studio MCP connector, for one organization set with `ELDRA_ORG`. For content editors and anyone who does not write code. See [its README](plugins/eldra-mcp/README.md). |

## Contributing

- `node scripts/validate-plugins.mjs .` checks the marketplace, every plugin manifest, command and
  skill; `bash scripts/test.sh` runs the tests. CI runs both.
- Pull request titles are conventional commits (`feat(eldra-storefront): …`).
- Releases are cut by hand for now: bump `version` in the plugin's `plugin.json`, run
  `node scripts/sync-marketplace-refs.mjs .` so the marketplace points at the new tag, merge that
  PR, then tag the merge commit `<plugin>-v<version>` (for example `eldra-storefront-v0.2.0`) and
  push the tag. The marketplace installs plugins from those tags, so a plugin is not installable at
  a version until its tag exists. Automating this with release-please is in `docs/backlog.md`.
- `docs/testing.md` is the manual pass before a release. Design documents live in `docs/specs/`,
  and `docs/backlog.md` lists what is deliberately not built yet.
