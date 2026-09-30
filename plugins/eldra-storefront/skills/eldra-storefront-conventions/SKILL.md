---
name: eldra-storefront-conventions
description: This skill should be used when the user adds or changes a page, component, composable, route, cart behaviour, price display, image, SEO tag or locale handling in a Nuxt storefront built from the Eldra storefront starter, or asks "where should this live", "should this be in Studio or in code", "how do home sections work" or "how do content blocks work" in an Eldra site, or asks how to write an end-to-end test or what to run before finishing a change.
---

# Eldra storefront conventions

How a site scaffolded from `eldra-is/storefront-starter` is built. The site's own `CLAUDE.md` is the
local authority; read it first and follow it where it is more specific than this skill. SDK details
are in the eldra-sdk skill.

## Ownership

- Editable content and catalog data live in Studio: copy, navigation, footer, home sections,
  pages, products, prices, stock.
- Routes, layout, presentation, application state and the checkout hand-off live in code.
- Before adding a hard-coded string a merchant would want to change, add a field or schema instead
  (see the eldra-content-model skill). Before adding a schema, check it is not presentation.

## Layout

```
app/components/blocks/    generic block renderer for `page` content
app/components/home/      flat home sections (hero, section)
app/components/product/   product card, gallery, variant picker, price
app/components/cart/      cart lines, discount, checkout hand-off
app/components/content/   RichText wrapper, media, link overrides
app/components/layout/    header, footer, navigation, locale switch
app/composables/          useEldraClient, useCms, useCatalog, useAvailability, useLocale, useVariants
app/pages/                index, shop, products/[slug], collections/[slug], pages/[slug], cart
app/stores/cart.ts        the cart store (Pinia)
app/types/                storefront types derived from SDK types, never retyped
app/utils/                seo, images, price formatting
shared/utils/             eldra-client.ts, embed policy
server/                   Nitro routes that need server-only config (sitemap, preview)
cms/content-model.eldra.json   the schemas and demo entries the code reads
```

## Reads

- Every read goes through the client from `useEldraClient()`; never a raw `fetch` to the gateway.
  Data fetching goes through the project's wrappers in `app/composables/` (`useCms`, `useCatalog`).
- CMS entries are read by unique slug with explicit `depth`; lists are paged; every call passes the
  locale.
- CMS content is optional decoration: a missing entry renders nothing, never an error page.
- Types for storefront code live in `app/types/` and derive from the generated SDK types
  (`Pick`, indexed access); never retype a response by hand.

## Two composition models

- Home page: flat, repeatable section schemas (`home_hero`, `home_section`) rendered by
  `app/components/home/`. Use this for a fixed page whose sections editors reorder and fill.
- Content pages: `page` has a `blocks` tree rendered recursively by `app/components/blocks/` (text,
  heading, image, card, button, embed, entry list). Unexpanded references resolve lazily with a depth
  limit and in-flight de-duplication. Use this for pages editors compose themselves.
- A new block type needs three things together: the sub-schema in `cms/content-model.eldra.json`, a
  component in `app/components/blocks/`, and its registration in the block renderer.

## Cart and checkout

- The cart id persists through the SDK's `createCartSession` under a starter-prefixed key.
- Cart state skips hydration and cart markup renders client-only (`<ClientOnly>`), so server HTML
  never shows another visitor's cart.
- On 404 (`CART_NOT_FOUND`) forget the cart and retry once; on 409 show the item as out of stock.
- Checkout is `checkout.handoffUrl(...)`; the storefront's job ends at the redirect.
- `/cart?recovery=<token>` restores a basket through `orders.recover` with restored, partial and
  expired states.

## Presentation helpers

- Prices: always `formatPrice(amount, currency, locale)` from `app/utils/`, which uses
  `Intl.NumberFormat` with the locale passed explicitly so server and browser render the same text.
  The currency comes from the organization's data; never hard-code one.
- Images: the one responsive image component builds `srcset` from the asset URL variants; do not
  add a second image path.
- SEO: `buildSeoMeta(entry)` reads the entry's `seo` field with per-type fallbacks and adds `noindex`
  when `private` is true. The sitemap lists published entries only.

## Locales

- Two locales ship, `en-US` and `is-IS`, message files in `i18n/`.
- The locale is chosen by cookie and applied with a reload, not by route prefix; the list of locales
  is the organization's, read once at startup. Switching to route prefixes is a deliberate,
  site-wide change: SEO, sitemap and links all change with it.

## Errors and tests

- Branch on `EldraHttpError.errorId`, never on message text.
- End-to-end tests (Playwright, `tests/e2e/`) use slugs from `cms/content-model.eldra.json`, never
  ids. When the code starts reading a new schema or field, add it to the manifest so the manifest
  test keeps passing.
- Before finishing: `pnpm lint`, `pnpm format:check`, `pnpm typecheck`.
