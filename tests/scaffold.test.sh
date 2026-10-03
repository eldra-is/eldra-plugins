#!/usr/bin/env bash
set -u
here="$(cd "$(dirname "$0")" && pwd)"
. "$here/lib/assert.sh"
script="$here/../plugins/eldra-storefront/scripts/scaffold.sh"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# A local stand-in for the starter, tagged v0.1.0.
starter="$tmp/starter"
mkdir -p "$starter/app"
printf 'export default defineAppConfig({ name: "Storefront Starter" })\n' > "$starter/app/app.config.ts"
printf "export default defineNuxtConfig({ app: { head: { title: 'Storefront Starter' } } })\n" > "$starter/nuxt.config.ts"
printf '# Storefront Starter\n\nClone storefront-starter to begin.\n' > "$starter/README.md"
printf '# storefront-starter conventions\n' > "$starter/CLAUDE.md"
printf 'ELDRA_ORG_ID=\nBASE_API_URL=https://web.eldra.app/api\nPREVIEW_TOKEN=\n' > "$starter/.env.example"
printf 'node_modules\n.nuxt' > "$starter/.gitignore"   # no trailing newline, on purpose
git -C "$starter" init -q
git -C "$starter" add -A
git -C "$starter" -c user.name=test -c user.email=test@example.com commit -qm init
git -C "$starter" tag v0.1.0

registry() { # registry REF
  printf '{"starter":{"repo":"file://%s","ref":"%s","description":"test","brandFiles":["app/app.config.ts","nuxt.config.ts","README.md"]}}\n' "$starter" "$1" > "$tmp/templates.json"
}
registry v0.1.0
export ELDRA_TEMPLATES_FILE="$tmp/templates.json"

# 1. A fresh site.
out="$tmp/sites/sits-web"
mkdir -p "$tmp/sites"
log="$(bash "$script" starter "$out" 2>&1)"; status=$?
assert_status "fresh scaffold" 0 "$status"
assert_file_contains "app config renamed" "$out/app/app.config.ts" 'name: "Sits Web"'
assert_file_contains "nuxt config renamed" "$out/nuxt.config.ts" "title: 'Sits Web'"
assert_file_contains "README title renamed" "$out/README.md" "# Sits Web"
assert_file_contains "README slug renamed" "$out/README.md" "Clone sits-web to begin."
assert_file_contains "files outside brandFiles kept as shipped" "$out/CLAUDE.md" "storefront-starter conventions"
assert_eq "fresh git repository" "yes" "$([ -d "$out/.git" ] && echo yes)"
git -C "$out" rev-parse --verify -q HEAD >/dev/null; assert_status "template history removed" 1 "$?"
assert_file_contains ".env written with placeholders" "$out/.env" "ELDRA_ORG_ID="
assert_eq ".env ignored once" "1" "$(grep -cx '.env' "$out/.gitignore")"
assert_eq "settings ignored" "1" "$(grep -cxF '.claude/*.local.*' "$out/.gitignore")"
assert_eq "last template line not merged" "1" "$(grep -cx '.nuxt' "$out/.gitignore")"
assert_contains "next steps name connect" "/eldra-storefront:connect" "$log"
assert_contains "next steps name content-model" "/eldra-storefront:content-model" "$log"

# 2. With settings from connect.
printf -- '---\norg: sits\nenvironment: production\ngateway: https://web.eldra.app/api\nmcp: https://mcp.eldra.app\n---\n\nBody\n' > "$tmp/settings.md"
out2="$tmp/sites/sits-shop"
bash "$script" starter "$out2" --settings "$tmp/settings.md" --title "Sits & Co / Shop" >/dev/null 2>&1; status=$?
assert_status "scaffold with settings" 0 "$status"
assert_file_contains "org in .env" "$out2/.env" "ELDRA_ORG_ID=sits"
assert_file_contains "gateway in .env" "$out2/.env" "BASE_API_URL=https://web.eldra.app/api"
assert_file_contains "settings copied with template" "$out2/.claude/eldra-storefront.local.md" "template: starter"
assert_file_contains "title with & and / kept literally" "$out2/app/app.config.ts" 'name: "Sits & Co / Shop"'

# 3. A non-empty target is refused and left alone.
mkdir -p "$tmp/busy" && echo keep > "$tmp/busy/file.txt"
err="$(bash "$script" starter "$tmp/busy" 2>&1)"; status=$?
assert_status "non-empty target refused" 2 "$status"
assert_file_contains "existing file untouched" "$tmp/busy/file.txt" "keep"
assert_contains "explains why" "is not empty" "$err"

# 4. A pinned tag the starter does not have is a plugin bug.
registry v9.9.9
err="$(bash "$script" starter "$tmp/sites/ghost" 2>&1)"; status=$?
assert_status "missing tag" 4 "$status"
assert_contains "blames the plugin" "bug in the eldra-storefront plugin" "$err"
assert_eq "nothing created" "no" "$([ -e "$tmp/sites/ghost" ] && echo yes || echo no)"
registry v0.1.0

# 5. Unknown template and bad names.
bash "$script" nope "$tmp/sites/x" >/dev/null 2>&1; assert_status "unknown template" 3 "$?"
bash "$script" starter "$tmp/sites/Sits Web" >/dev/null 2>&1; assert_status "name must be kebab-case" 1 "$?"
bash "$script" starter >/dev/null 2>&1; assert_status "missing directory argument" 1 "$?"

finish
