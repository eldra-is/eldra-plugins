# eldra-mcp

The Eldra Studio MCP connector, and nothing else. It lets Claude work in one Studio organization
with your own login: content schemas and entries, media, languages, products, categories and
collections. Content is written as drafts, and new products, categories and collections start as
drafts at price 0. Whether Claude may also publish, activate products or delete is decided per
organization by an administrator in Studio (Settings → Developers); those switches are off by
default. Claude never sets prices, stock or tax; a person does that in Studio.

## Install

```bash
claude plugin marketplace add eldra-is/eldra-plugins
claude plugin install eldra-mcp@eldra
```

## Choose the organization

The connector URL is `https://mcp.eldra.app/<organization alias>/mcp`. The plugin reads the alias
from the `ELDRA_ORG` environment variable when Claude Code starts:

```bash
export ELDRA_ORG=your-org-alias   # the alias shown in Studio under General settings
claude
```

Then run `/mcp`, choose `eldra` and log in. You sign in with your Studio account and a one-time
code, and approve access. You must be a member of the organization, and the organization must have
the MCP feature enabled.

One value of `ELDRA_ORG` is one organization. To work in a second organization, start Claude Code
from another project with a different value.

## If ELDRA_ORG is not set

The URL becomes `https://mcp.eldra.app//mcp`, which names no organization. Claude Code then warns
that `ELDRA_ORG` is missing or lists the `eldra` server as failed in `/mcp`. Quit Claude Code, set
`ELDRA_ORG` as above, and start it again.

## Errors you may see

| Error id | Meaning |
| --- | --- |
| `ORGANIZATION_NOT_FOUND` | You are not a member of that organization, or the alias is misspelled. |
| `FEATURE_DISABLED` | The MCP is not enabled for the organization yet; ask Eldra to enable it. |
| `PRIVILEGED_SESSION_REQUIRED` | You logged in with an account that has platform roles. Log in with an ordinary member account. |
| `UNAUTHENTICATED` | The login is missing or expired. Run `/mcp` and log in again. |
| `ACCESS_DENIED` | Your role in the organization does not allow that change. Ask an organization administrator. |

## Building a site?

The `eldra-storefront` plugin does the same connection per project with
`/eldra-storefront:connect`, which asks for the organization and writes the connector into the
project's `.mcp.json`. Use one or the other for an organization, not both.
