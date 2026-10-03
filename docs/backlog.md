# Backlog

Things deliberately not in the current plugins. Each entry says why it waits.

## eldra-storefront

1. **Deploy to Cloudflare.** Workers Builds, the release and `production` branches, and the Studio content deploy hook. Deploys stay release-gated (merge the release PR; never deploy on push to main). Internal-leaning because it assumes Eldra's Cloudflare setup; may become a separate staff-only plugin.
2. **MCP resources and prompts.** Expose the SDK docs and a "build a storefront page" prompt from the MCP itself so claude.ai users get the same guidance without Claude Code.
3. **Product tools.** Once the MCP can create draft products, a starter content model that also seeds a catalog.

## Repository

1. **Automated releases.** release-please per plugin, with marketplace refs synced to the release tags (`scripts/sync-marketplace-refs.mjs` already does the sync). It needs the organization's release-please GitHub App: give this repository access to the org secrets `RELEASE_PLEASE_APP_ID` and `RELEASE_PLEASE_PRIVATE_KEY`, add it to the App's repository access, and mint the token with `actions/create-github-app-token` (the repository token may not open pull requests). `release-please-config.json` and `.release-please-manifest.json` are kept for this. Releases are cut by hand until then (README, Contributing).
