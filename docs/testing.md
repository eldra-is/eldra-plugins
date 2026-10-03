# Manual end-to-end pass

Run before each release of `eldra-storefront`, on a non-production environment and a throwaway
organization in it that has the MCP feature enabled and you as a member. Use the environment's MCP
and gateway URLs from `connect`; they are never written in this repository. Record the date, the
plugin commit and the result at the end of the release PR.

## 0. Automated checks

```bash
node scripts/validate-plugins.mjs .
bash scripts/test.sh
```

Then run the plugin-dev `plugin-validator` agent on `plugins/eldra-storefront`, `plugins/eldra-mcp`
and the marketplace manifest, and the `skill-reviewer` agent on each changed skill.

## 1. Scaffold

Start `claude --plugin-dir <checkout>/plugins/eldra-storefront` in an empty temporary directory such
as `/tmp/eldra-e2e`.

1. `/eldra-storefront:new-site e2e-shop`: fresh history (`git -C e2e-shop log` has no commits), brand
   renamed in the three brand files, `.env` present, `.gitignore` has `.env` and `.claude/*.local.*`.
2. The same command again: refused, directory unchanged.

## 2. Connect

Restart Claude Code inside `e2e-shop` with the plugin.

1. `/eldra-storefront:connect`; type the alias with capitals and a space: refused with a suggestion.
2. Choose "Custom environment" and give the environment's gateway and MCP URLs from your notes.
3. `/mcp`, authenticate (login, one-time code, consent), then `/eldra-storefront:connect --verify`:
   the organization's locales and default are listed.
4. Connect again with the same answers: `.mcp.json` has one `eldra-<org>` entry, the settings file
   one copy of each key. Connect with a second organization and "Keep it": two servers; back to the
   first with "Remove it": one server.

## 3. Content model

1. `/eldra-storefront:content-model --dry-run`: `would create` rows; Studio unchanged.
2. `/eldra-storefront:content-model`: schemas and draft entries created; media fields and fallback
   locales listed; "Nothing was published."
3. In Studio: the header's items reference the two navigation entries (this checks the reference
   write shape `{ "value", "type": "entry" }`); nothing is published.
4. Add a field `legacy_note` to `page` in Studio and run the command again: rows `unchanged`,
   entries skipped, `legacy_note` still there.

## 4. The site against the environment

Register `http://localhost:3000` as a storefront origin and create a preview token in Studio; set
`PREVIEW_TOKEN` and `NUXT_PUBLIC_CHECKOUT_URL` (the environment's checkout origin) in `.env`;
`pnpm install && pnpm dev`. The home page and `/pages/about` show the drafts, and adding a product
to the cart works in the browser (no `ORIGIN_NOT_REGISTERED`).

## 5. eldra-mcp

`claude --plugin-dir <checkout>/plugins/eldra-mcp` with `ELDRA_ORG` unset: `/mcp` shows the `eldra`
server failed or a missing-variable warning, as its README says. With `ELDRA_ORG` set to a
production organization you belong to: login works and `list_locales` answers.

## 6. Clean up

Delete the throwaway organization's content in Studio, `rm -rf /tmp/eldra-e2e`, and remove any
`eldra-*` servers you added outside it.
