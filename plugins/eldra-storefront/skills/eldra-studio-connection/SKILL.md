---
name: eldra-studio-connection
description: This skill should be used when the user configures ".env", runtime config or environment variables for an Eldra storefront ("ELDRA_ORG_ID", "BASE_API_URL", "PREVIEW_TOKEN", "NUXT_PUBLIC_CHECKOUT_URL"), sees "ORIGIN_NOT_REGISTERED", asks why drafts do not show, how preview tokens or storefront origins work, how a statically generated site rebuilds when content is published (the deploy hook), or how the Eldra MCP login and permissions work.
---

# Connecting a storefront to Eldra Studio

A storefront talks to one Studio organization through the public gateway. Production is the
default everywhere: gateway `https://web.eldra.app/api`, checkout `https://checkout.eldra.app`,
MCP `https://mcp.eldra.app`. Another environment is always explicit URLs, recorded by
`/eldra-storefront:connect` in `.claude/eldra-storefront.local.md`.

## Environment variables (starter)

| Variable | Meaning | Where it may be read |
| --- | --- | --- |
| `ELDRA_ORG_ID` | Organization id or alias, required | Server-only in production builds |
| `BASE_API_URL` | Gateway origin, default production, normalized to end in `/api` | Runtime config |
| `NUXT_PUBLIC_CHECKOUT_URL` | Checkout origin, default production; set it for any other gateway | Public |
| `NUXT_PUBLIC_DEFAULT_LOCATION_ID` | Inventory location for stock badges; unset means no badges | Public |
| `PREVIEW_TOKEN` | When set, server-side reads see drafts | Server-only, always |
| `NUXT_SITE_URL`, `NUXT_SITE_INDEXABLE` | Canonical URL and robots | Runtime config |

`.env.example` documents them; `.env` is git-ignored. The project's `nuxt.config.ts`
`runtimeConfig` is the truth about which keys are public: anything under `runtimeConfig.public`
ships to the browser. Never move `PREVIEW_TOKEN` into `public`, never prefix it `NUXT_PUBLIC_`, and
never read it in a component.

## Storefront origins

The gateway answers a browser only from an origin the organization registered in Studio, General
settings, Storefront origins. Register `http://localhost:3000` (or the dev port) while developing
and every live domain before launch. An unregistered origin fails with `ORIGIN_NOT_REGISTERED`;
server-side calls are not affected, so a page that renders on the server but whose cart fails in
the browser usually means a missing origin.

## Preview tokens

- A preview token lets reads see draft content. Create it in Studio; put it in `PREVIEW_TOKEN`.
- The SDK sends it as `X-Preview-Token` when the client is created with
  `previewToken: () => process.env.PREVIEW_TOKEN` (server side).
- The Vite plugin takes its own `previewToken` for type generation; it is never written into the
  generated files.
- A static build made with a preview token bakes drafts into the output. Build production without
  it.

## Content deploy hook

A statically generated site must be rebuilt when content is published. Studio can hold a deploy
hook URL from the site's host and call it on publish. The URL is a credential: it lives in Studio
and the host's settings, never in the repository, `.env.example` or a skill.

## The Eldra MCP

- One connector per organization: `<mcp origin>/<org alias>/mcp`, added per project by
  `/eldra-storefront:connect` as `eldra-<org>`.
- Login: the person's own Studio account, a one-time code, and consent. The assistant acts with that
  person's role in the organization, nothing more.
- Only members of the organization can connect, and only when the MCP feature is enabled for it.
- Everything the MCP writes is a draft. It cannot publish or delete; a person publishes in Studio.
- Error ids: `ORGANIZATION_NOT_FOUND` (not a member), `FEATURE_DISABLED` (MCP not enabled),
  `PRIVILEGED_SESSION_REQUIRED` (a login with platform roles reached the MCP), `UNAUTHENTICATED`
  (log in again with `/mcp`), `ACCESS_DENIED` (role does not allow the write; do not retry).
