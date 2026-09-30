---
description: Scaffold a new Eldra storefront from the pinned starter release
argument-hint: "<site-name> [--title \"Display name\"]"
---

# Create a new Eldra storefront

Arguments: `$ARGUMENTS`

Scaffold a new storefront from the plugin's template registry. Do not install dependencies, start a
server, create a remote repository or push anything.

## 1. Site name

The first argument is the site name and becomes the directory name. If there is none, ask the user
for one and stop until they answer. The name must be kebab-case (lowercase letters, digits, single
hyphens). If it is not, propose the kebab-case form (`Sits Web` becomes `sits-web`) and ask the
user to confirm it. A `--title "…"` argument sets the display name; without it the script title-cases
the name.

## 2. Template

Read `${CLAUDE_PLUGIN_ROOT}/templates.json`. It has one template, `starter`. Tell the user which
repository and release will be used, for example: "Using eldra-is/storefront-starter at v0.1.0."

## 3. Settings from an earlier connect

If `.claude/eldra-storefront.local.md` exists in the current directory, `connect` has already run
here. Read its `org` and `gateway` and tell the user they go into the new site's `.env`; pass the
file to the script with `--settings`.

## 4. Run the scaffold

```bash
bash "${CLAUDE_PLUGIN_ROOT}/scripts/scaffold.sh" starter "<name>" [--title "<title>"] [--settings .claude/eldra-storefront.local.md]
```

Handle the exit status:

| Exit | Meaning | What to tell the user |
| --- | --- | --- |
| 0 | Created | Relay the script's closing text. |
| 1 | Bad name or arguments | Show the message; ask for a valid name. |
| 2 | The directory exists and is not empty | Nothing was changed. Ask for another name; never delete or overwrite the directory. |
| 3 | Unknown template | A plugin bug: the registry has no `starter`. Ask the user to report it at https://github.com/eldra-is/eldra-plugins/issues. |
| 4 | The pinned release tag is missing | A plugin bug, not the user's fault. Show the message and the issues link; do not try another tag or branch. |
| 5 | Network or clone failure | Ask the user to check the network and retry. |
| 6 | git or Node.js missing | Say which one to install (Node.js 22 or later). |

Show any `warning:` lines the script printed.

## 5. Finish

Tell the user to quit Claude Code, then run `cd <name> && claude` to start a fresh session inside the
new directory — running `connect` in this session would write settings and `.mcp.json` into the
parent project instead of the new one. End with the two next commands, run from inside the new
directory:

1. `/eldra-storefront:connect` (skip if settings were copied and the user does not want to change them; it still adds the MCP server to the new project)
2. `/eldra-storefront:content-model`

Then list what remains in Studio, General settings: register the storefront origin
(`http://localhost:3000` while developing, then the live domain) and create a preview token for
`PREVIEW_TOKEN` in `.env`. Say plainly that dependencies are not installed (`pnpm install`) and nothing
is running.
