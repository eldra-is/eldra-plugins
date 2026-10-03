#!/usr/bin/env bash
# Prints this project's Eldra MCP connector URL, or its server name with --name.
# Usage: mcp-url.sh [--settings FILE] [--org ALIAS] [--mcp ORIGIN] [--name]
# Flags win over the settings file; the MCP origin defaults to production.
# Exit: 0 ok, 1 usage, 2 malformed alias, 3 MCP origin is not a bare origin, 4 no alias.
set -euo pipefail

settings=".claude/eldra-storefront.local.md"
org=""
mcp=""
want="url"
while [ $# -gt 0 ]; do
  case "$1" in
    --settings) settings="${2:?--settings needs a file}"; shift 2 ;;
    --org) org="${2-}"; shift 2 ;;
    --mcp) mcp="${2-}"; shift 2 ;;
    --name) want="name"; shift ;;
    *) echo "mcp-url.sh: unknown argument $1" >&2; exit 1 ;;
  esac
done

# field NAME: the value of NAME in the settings frontmatter, without comment or quotes.
field() {
  [ -f "$settings" ] || return 0
  sed -n '/^---$/,/^---$/p' "$settings" |
    sed -n "s/^$1:[[:space:]]*//p" |
    sed -e 's/[[:space:]]#.*$//' -e 's/[[:space:]]*$//' -e 's/^"\(.*\)"$/\1/' |
    head -n 1
}

[ -n "$org" ] || org="$(field org)"
[ -n "$mcp" ] || mcp="$(field mcp)"
[ -n "$mcp" ] || mcp="https://mcp.eldra.app"

if [ -z "$org" ]; then
  echo "No organization alias. Run /eldra-storefront:connect first; it writes $settings." >&2
  exit 4
fi

if ! printf '%s' "$org" | grep -Eq '^[a-z0-9]+(-[a-z0-9]+)*$'; then
  suggestion="$(printf '%s' "$org" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//')"
  echo "'$org' is not an organization alias: an alias is lowercase letters, digits and single hyphens, as shown in Studio under General settings. Did you mean '$suggestion'?" >&2
  exit 2
fi

mcp="${mcp%/}"
if ! printf '%s' "$mcp" | grep -Eq '^(https://[a-z0-9.-]+(:[0-9]+)?|http://(localhost|127\.0\.0\.1)(:[0-9]+)?)$'; then
  echo "MCP origin '$mcp' must be an origin with no path, such as https://mcp.eldra.app." >&2
  exit 3
fi

if [ "$want" = "name" ]; then
  printf 'eldra-%s\n' "$org"
else
  printf '%s/%s/mcp\n' "$mcp" "$org"
fi
