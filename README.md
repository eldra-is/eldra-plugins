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
- Pull request titles are conventional commits (`feat(eldra-storefront): …`); release-please turns
  them into one release per plugin.
- Release PRs are opened and updated by release-please with the organization's release-please GitHub
  App (secrets `RELEASE_PLEASE_APP_ID` and `RELEASE_PLEASE_PRIVATE_KEY`), so CI runs on them like on
  any other PR. The release workflow also runs the validator itself before pushing the synced refs.
- `docs/testing.md` is the manual pass before a release. Design documents live in `docs/specs/`,
  and `docs/backlog.md` lists what is deliberately not built yet.
