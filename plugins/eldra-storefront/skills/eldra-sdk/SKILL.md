---
name: eldra-sdk
description: This skill should be used when the user writes or reviews code that imports "@eldrajs/sdk", calls "createEldraClient", "eldra.cms", "eldra.catalog", "eldra.cart" or "checkout.handoffUrl", configures the "eldra" Vite plugin or the ".eldra/web-studio" generated types, or asks how to read CMS entries by slug, add to cart, hand off to checkout, recover an order, check stock availability or a feature flag, or handle "EldraHttpError" on an Eldra storefront.
---

# @eldrajs/sdk

The storefront client for the Eldra public API. Plain `fetch`; runs in the browser, Node, SSR and
at the edge. Written against `@eldrajs/sdk` 0.2.x; check the project's `package.json` and prefer the
installed version's types over this text when they disagree. The full docs are linked, not
copied: https://github.com/eldra-is/headless-kit/blob/main/docs/getting-started.md and
https://github.com/eldra-is/headless-kit/blob/main/docs/rich-text.md.

## Creating the client

```ts
import { createEldraClient } from '@eldrajs/sdk';

const eldra = createEldraClient({ orgId: process.env.ELDRA_ORG_ID! });
```

- Options: `orgId`, `apiBaseUrl` (default `DEFAULT_ELDRA_API_BASE_URL`, `https://web.eldra.app/api`),
  `checkoutUrl` (default `DEFAULT_ELDRA_CHECKOUT_URL` only when `apiBaseUrl` is the default),
  `previewToken`, `headers`, `env`, `fetch`, `httpClient`.
- Every option may be a value or a function resolved per request, so SSR can read config at request
  time: `createEldraClient({ orgId: () => useRuntimeConfig().eldraOrgId })`.
- On any gateway other than production, pass `checkoutUrl` too: a cart only exists on the gateway
  that made it, and `checkout.handoffUrl` throws rather than send a customer to the wrong checkout.
- `initEldraClient(options)` stores a default client; `getEldraClient()` returns it and throws if
  `initEldraClient` was not called. In a Nuxt site, go through the project's `useEldraClient()`
  composable instead (see the eldra-storefront-conventions skill).
- There is no API key: storefront data is public for the organization.

## Generated types

The SDK ships no response types. The Vite plugin generates them from the gateway:

```ts
// nuxt.config.ts
import { eldra } from '@eldrajs/sdk/vite';

export default defineNuxtConfig({
  vite: { plugins: [eldra({ orgId: process.env.ELDRA_ORG_ID })] },
  typescript: { tsConfig: { include: ['../.eldra/**/*.ts'] } },
});
```

It writes `.eldra/web-studio/`: `cms-types.ts` (the org's schemas), `contract.ts` (the gateway API,
which fills `EldraContract`, plus `ELDRA_CONTRACT_VERSION`), `client.ts` and `index.ts`
(`createWebStudioClient`, `initWebStudioClient`, `getWebStudioClient`). Rules:

- The Nuxt `include` path is relative to `.nuxt/`, hence `../.eldra/**/*.ts`. Without it every
  response is `unknown`, and nothing flags the mismatch.
- The site commits `.eldra/web-studio/` (the starter ships it ignored and it is generated on the
  first build; commit it once the site has its own organization). Keep the folder whole.
- A failed generation is a build warning and keeps the previous files.
- Other plugin options: `apiBaseUrl`, `previewToken` (never written into the output), `schemas`,
  `maxDepth`, `outDir`, `contract: false` (CMS types only), `skipOnMissingConfig`.
- Without the plugin, name the type at the call site:
  `eldra.catalog.listProducts<{ data: { title: string }[] | null }>()`. For unwrapped paths use
  `EldraContractResponse<'/catalog/v1/categories', 'get'>`.

## Reading CMS content

- One entry by slug, with explicit depth and locale:
  `eldra.cms.getEntryByUniqueField('page', 'slug', slug, { locale, depth: 2 })`. (Older docs call it
  `getByUniqueField`; the method is `getEntryByUniqueField`.)
- One entry by id: `eldra.cms.get('page', id, { locale, depth })`.
- A paged list: `eldra.cms.list('home_section', { locale, page: 1, pageSize: 20, depth: 1 })`.
- An editor-configured entry list field: `eldra.cms.resolveEntryList(list, { locale, pageSize })`.
- Rich text is a TipTap document: render with `RichText` from `@eldrajs/vue`
  (`<RichText :content="entry.data.body" as="article" />`) or `toHtml` from `@eldrajs/rich-text`.
- Pass `previewToken` (server-side only) to read drafts; it sets `X-Preview-Token`.

## Catalog, cart, checkout, orders

- Catalog: `catalog.listProducts`, `getProduct`, `listCategories`, `listCollections`,
  `getCollection`, `listCollectionProducts`, `search(query, options)`.
- Cart: `cart.addItem(input)` creates the cart when there is none; then `cart.get(cartId)`,
  `updateItem(cartId, itemId, { quantity })`, `removeItem`, `applyDiscount(cartId, code)` (returns
  `{ cart, applied }`; the returned cart is the verdict), `removeDiscount`. Totals come from the
  server's `totals`; never sum lines in the storefront.
- Persist the cart id with `createCartSession({ key })` (`read`, `remember`, `forget`; localStorage,
  default key `eldra.cartId`, never throws). On `errorId` `CART_NOT_FOUND`, `forget()` and start a
  new cart.
- Checkout is a hand-off: `window.location.href = eldra.checkout.handoffUrl({ cartId, locale })`.
- Orders: `orders.get(orderId, { accessToken })`; keep the one-time token with
  `createOrderAccessTokens()` (sessionStorage), never in a URL. `orders.recover(token)` rebuilds a
  basket from a recovery link.
- Stock: `inventory.availability(items)`.
- Features: `features.isEnabled('ECOMMERCE')`, `features.getCapabilities()`.

## Errors

Every failed request throws `EldraHttpError` with `status`, `code` (category such as `NOT_FOUND`)
and `errorId` (specific reason such as `CART_NOT_FOUND`, `CART_INSUFFICIENT_STOCK`,
`CART_DISCOUNT_EXHAUSTED`). Branch on `errorId`, never on the message:

```ts
import { EldraHttpError } from '@eldrajs/sdk';

try {
  await eldra.cart.addItem(input);
} catch (error) {
  if (error instanceof EldraHttpError && error.errorId === 'CART_INSUFFICIENT_STOCK') {
    showOutOfStock();
  } else {
    throw error;
  }
}
```

A browser request from an origin the organization has not registered fails with
`ORIGIN_NOT_REGISTERED` (see the eldra-studio-connection skill).
