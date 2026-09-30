# Backlog

Things deliberately not in the current plugins. Each entry says why it waits.

## eldra-storefront

1. **Deploy to Cloudflare.** Workers Builds, the release and `production` branches, and the Studio content deploy hook. Deploys stay release-gated (merge the release PR; never deploy on push to main). Internal-leaning because it assumes Eldra's Cloudflare setup; may become a separate staff-only plugin.
2. **MCP resources and prompts.** Expose the SDK docs and a "build a storefront page" prompt from the MCP itself so claude.ai users get the same guidance without Claude Code.
3. **Product tools.** Once the MCP can create draft products, a starter content model that also seeds a catalog.
