# Eldra plugins

Claude Code plugins from Eldra. Add the marketplace once, then install what you need:

```bash
claude plugin marketplace add eldra-is/eldra-plugins
claude plugin install eldra-storefront@eldra
```

## Plugins

| Plugin | What it does |
| --- | --- |
| `eldra-storefront` | Build a storefront on the Eldra public API: scaffold from a template, connect to a Studio organization, create its content model through the Eldra MCP, and write code against `@eldrajs/sdk` the way Eldra does. |

Design documents live in `docs/specs/`, and `docs/backlog.md` lists what is deliberately not built yet.
