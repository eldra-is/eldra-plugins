#!/usr/bin/env bash
set -u
here="$(cd "$(dirname "$0")" && pwd)"
. "$here/lib/assert.sh"
script="$here/../plugins/eldra-storefront/scripts/mcp-url.sh"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

cat > "$tmp/settings.md" <<'EOF'
---
org: sits                      # organization alias
environment: production
gateway: https://web.eldra.app/api
mcp: https://mcp.eldra.app
template: starter
---

# Eldra storefront settings
EOF
printf -- '---\norg: sits\n---\n' > "$tmp/no-mcp.md"

assert_eq "url from settings" "https://mcp.eldra.app/sits/mcp" "$(bash "$script" --settings "$tmp/settings.md")"
assert_eq "server name" "eldra-sits" "$(bash "$script" --settings "$tmp/settings.md" --name)"
assert_eq "flag overrides org" "https://mcp.eldra.app/una/mcp" "$(bash "$script" --settings "$tmp/settings.md" --org una)"
assert_eq "production MCP by default" "https://mcp.eldra.app/sits/mcp" "$(bash "$script" --settings "$tmp/no-mcp.md")"
assert_eq "custom origin, trailing slash dropped" "https://mcp.example.com/sits/mcp" \
  "$(bash "$script" --settings "$tmp/settings.md" --mcp https://mcp.example.com/)"

err="$(bash "$script" --settings "$tmp/missing.md" --org "Sits Web" 2>&1 >/dev/null)"; status=$?
assert_status "uppercase and space alias refused" 2 "$status"
assert_contains "suggests the alias form" "Did you mean 'sits-web'?" "$err"

bash "$script" --settings "$tmp/missing.md" --org "SITS" >/dev/null 2>&1; status=$?
assert_status "uppercase alias refused" 2 "$status"

err="$(bash "$script" --settings "$tmp/missing.md" 2>&1 >/dev/null)"; status=$?
assert_status "no settings and no flag" 4 "$status"
assert_contains "points at connect" "/eldra-storefront:connect" "$err"

bash "$script" --settings "$tmp/settings.md" --mcp https://mcp.example.com/sits/mcp >/dev/null 2>&1; status=$?
assert_status "connector URL given as origin refused" 3 "$status"

bash "$script" --bogus >/dev/null 2>&1; status=$?
assert_status "unknown flag" 1 "$status"

finish
