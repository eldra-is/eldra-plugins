---
description: Connect this project to an Eldra Studio organization and its MCP
argument-hint: "[--verify]"
---

# Connect this project to Eldra Studio

Arguments: `$ARGUMENTS`

Connect the current project to one Eldra Studio organization: write the plugin settings, add the
organization's MCP server to the project, and verify it by listing the organization's locales.
If the arguments contain `--verify`, read the settings (step 1) and go straight to step 6.

## 1. Read what is there

Read `.claude/eldra-storefront.local.md` if it exists. Its frontmatter holds `org`, `environment`,
`gateway`, `mcp` and `template`. Use them as defaults below and remember `org` as the previous
organization. With `--verify` and no settings file, say that `/eldra-storefront:connect` without
`--verify` creates it, and stop.

## 2. Organization alias

Ask the user for the organization alias: the short name in Studio under General settings (the
first path segment of the organization's connector URL). Offer the current `org` as the default.

Check it:

```bash
bash "${CLAUDE_PLUGIN_ROOT}/scripts/mcp-url.sh" --org "<alias>"
```

Exit 0 means well-formed. Exit 2 means the value has uppercase letters, spaces or other characters
an alias never has; the message ends with "Did you mean '…'?". Ask the user to confirm that
suggestion or type the alias again. Never write an alias that fails this check.

## 3. Environment

Use AskUserQuestion:

- header: "Environment"
- question: "Which Eldra environment is this organization in?"
- options:
  - "Production (Recommended)": gateway `https://web.eldra.app/api`, MCP `https://mcp.eldra.app`
  - "Custom environment": you give the gateway and MCP URLs

For a custom environment ask for three values: a short lowercase environment name, the gateway URL
and the MCP origin. Never suggest or fill in a non-production URL yourself. Normalize:

- Gateway: drop a trailing `/`; append `/api` if it does not end in `/api`.
- MCP origin: drop a trailing `/`; if it ends in `/<alias>/mcp` the user pasted a connector URL, so
  keep only the part before it. Check with
  `bash "${CLAUDE_PLUGIN_ROOT}/scripts/mcp-url.sh" --org "<alias>" --mcp "<origin>"`; exit 3 means it
  is still not a bare origin, so ask again.

## 4. Write the settings

Write `.claude/eldra-storefront.local.md` (create `.claude/` if needed), replacing the whole file so
it never holds two copies of a key. Keep an existing `template` value; if there was none, write
`template: starter` when `cms/content-model.eldra.json` exists in the project, otherwise leave the
line out.

```markdown
---
org: <alias>
environment: <production or the custom name>
gateway: <gateway URL>
mcp: <MCP origin>
template: <existing template value>
---

# Eldra storefront settings

Written by /eldra-storefront:connect. Run it again to change these values. Do not commit this file.
```

Make sure `.gitignore` in the project root has the line `.claude/*.local.*`; add it if missing
(create `.gitignore` if there is none).

## 5. Add the MCP server

```bash
name="$(bash "${CLAUDE_PLUGIN_ROOT}/scripts/mcp-url.sh" --name)"
url="$(bash "${CLAUDE_PLUGIN_ROOT}/scripts/mcp-url.sh")"
```

Each Bash call runs in a fresh shell, so write the printed name and URL literally into the commands
below. Running this command again must leave one entry per organization:

1. Run `claude mcp get "$name"`. If it succeeds and shows project scope, run
   `claude mcp remove --scope project "$name"`. If it shows another scope (local or user), leave it,
   and tell the user that entry takes precedence over the project one until they remove it.
2. Run `claude mcp add --transport http --scope project "$name" "$url"`.
3. If the previous organization differs from the new alias and `eldra-<previous>` exists, use
   AskUserQuestion (header "Old server"): "Keep eldra-<previous> in this project?" with options
   "Keep it" (two organizations, two servers) and "Remove it" (run
   `claude mcp remove --scope project eldra-<previous>`).

The server lives in the project's `.mcp.json`, which may be committed; it holds no secret.

## 6. Verify

The server's tools are named `mcp__<name>__<tool>`, for example `mcp__eldra-sits__list_locales`.

If that tool is not available in this session, the server is new and needs a login. Tell the user:

1. Run `/mcp`, choose `<name>` and authenticate. The browser opens the Eldra login: sign in with
   your Studio account and a one-time code, then approve access.
2. If `<name>` is not listed, restart Claude Code in this directory and approve the project's MCP
   server when asked.
3. Then run `/eldra-storefront:connect --verify`.

Stop there. Otherwise call `list_locales` (no arguments) on that server.

On success report: "Connected to <org> (<environment>). Locales: en-US (default), is-IS." Then
suggest the next command: `/eldra-storefront:content-model` when `cms/content-model.eldra.json`
exists, otherwise `/eldra-storefront:new-site <name>`.

On failure, find the error id in the message (or in the failed server's status in `/mcp`) and explain:

| Error id | Plain-language cause |
| --- | --- |
| `ORGANIZATION_NOT_FOUND` | The logged-in person is not a member of this organization, or the alias is misspelled. An organization administrator can invite them. |
| `FEATURE_DISABLED` | The MCP is not enabled for this organization. A platform administrator at Eldra enables it. |
| `PRIVILEGED_SESSION_REQUIRED` | The login carries platform roles, which the login configuration should prevent. Log in with an ordinary member account and report it to Eldra. |
| `UNAUTHENTICATED` | No valid login. Run `/mcp` and authenticate again. |
| `ACCESS_DENIED` | The person's role in the organization does not allow the action. |
| none, a connection error, or HTTP 404 | The environment URL is probably wrong. Check `mcp` in the settings file and run this command again. |

When the cause is unclear, name the three usual ones in this order: not a member of the
organization, the MCP not enabled for it, the environment URL wrong.
