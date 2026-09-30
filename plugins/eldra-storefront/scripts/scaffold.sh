#!/usr/bin/env bash
# Scaffolds a new Eldra storefront from a template in the plugin's registry.
# Usage: scaffold.sh <template> <dir> [--title "Display name"] [--settings FILE]
# Exit: 0 ok, 1 usage, 2 target not empty, 3 unknown template, 4 pinned tag missing (plugin bug),
#       5 clone failed, 6 git or node missing.
set -euo pipefail
export GIT_TERMINAL_PROMPT=0

root="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
registry="${ELDRA_TEMPLATES_FILE:-$root/templates.json}"
brand_title="Storefront Starter"
brand_slug="storefront-starter"

usage() { echo "usage: scaffold.sh <template> <dir> [--title \"Display name\"] [--settings FILE]" >&2; exit 1; }

[ $# -ge 2 ] || usage
template="$1"
dir="${2%/}"
shift 2
title=""
settings=""
while [ $# -gt 0 ]; do
  case "$1" in
    --title) title="${2:?--title needs a value}"; shift 2 ;;
    --settings) settings="${2:?--settings needs a file}"; shift 2 ;;
    *) usage ;;
  esac
done

slug="$(basename "$dir")"
if ! printf '%s' "$slug" | grep -Eq '^[a-z0-9]+(-[a-z0-9]+)*$'; then
  echo "Site name '$slug' must be kebab-case: lowercase letters, digits and single hyphens." >&2
  exit 1
fi
if [ -z "$title" ]; then
  title="$(printf '%s' "$slug" | awk -F- '{ for (i = 1; i <= NF; i++) $i = toupper(substr($i, 1, 1)) substr($i, 2) } 1' OFS=' ')"
fi
case "$title" in *"
"*) echo "The title must be one line." >&2; exit 1 ;; esac

command -v git >/dev/null 2>&1 || { echo "git is required." >&2; exit 6; }
command -v node >/dev/null 2>&1 || { echo "Node.js 22 or later is required." >&2; exit 6; }

if [ -e "$dir" ] && { [ ! -d "$dir" ] || [ -n "$(ls -A "$dir")" ]; }; then
  echo "$dir already exists and is not empty. Choose a new directory name; nothing was changed." >&2
  exit 2
fi

set +e
entry="$(node -e '
  const [file, key] = process.argv.slice(1);
  const t = JSON.parse(require("fs").readFileSync(file, "utf8"))[key];
  if (!t) process.exit(3);
  console.log(t.repo); console.log(t.ref);
  for (const f of t.brandFiles ?? []) console.log(f);
' "$registry" "$template")"
rc=$?
set -e
if [ $rc -eq 3 ]; then
  echo "Template '$template' is not in the registry ($registry)." >&2
  exit 3
elif [ $rc -ne 0 ]; then
  echo "Could not read the template registry $registry." >&2
  exit 3
fi
repo="$(printf '%s\n' "$entry" | sed -n 1p)"
ref="$(printf '%s\n' "$entry" | sed -n 2p)"
brand_files="$(printf '%s\n' "$entry" | sed -n '3,$p')"

set +e
git ls-remote --exit-code --tags "$repo" "refs/tags/$ref" >/dev/null 2>&1
rc=$?
set -e
if [ $rc -eq 2 ]; then
  echo "The plugin pins template '$template' at $ref, but $repo has no such tag. This is a bug in the eldra-storefront plugin, not in your setup: please report it at https://github.com/eldra-is/eldra-plugins/issues. Nothing was created." >&2
  exit 4
elif [ $rc -ne 0 ]; then
  echo "Could not reach $repo (git exit $rc). Check your network and try again. Nothing was created." >&2
  exit 5
fi

if ! git -c advice.detachedHead=false clone --quiet --depth 1 --branch "$ref" "$repo" "$dir"; then
  echo "Cloning $repo at $ref failed." >&2
  exit 5
fi
rm -rf "$dir/.git"
git -C "$dir" init --quiet --initial-branch=main

# Rename the placeholder brand in the registry's brand files only.
esc() { printf '%s' "$1" | sed -e 's/[\/&|\\]/\\&/g'; }
title_e="$(esc "$title")"
slug_e="$(esc "$slug")"
missing=""
while IFS= read -r f; do
  [ -n "$f" ] || continue
  if [ -f "$dir/$f" ]; then
    sed -e "s|$brand_title|$title_e|g" -e "s|$brand_slug|$slug_e|g" "$dir/$f" > "$dir/$f.eldra-tmp"
    mv "$dir/$f.eldra-tmp" "$dir/$f"
  else
    missing="$missing $f"
  fi
done <<EOF
$brand_files
EOF

# field NAME: the value of NAME in the settings frontmatter.
field() {
  sed -n '/^---$/,/^---$/p' "$settings" | sed -n "s/^$1:[[:space:]]*//p" |
    sed -e 's/[[:space:]]#.*$//' -e 's/[[:space:]]*$//' -e 's/^"\(.*\)"$/\1/' | head -n 1
}

# set_env KEY VALUE: replace KEY= in .env, or append it.
set_env() {
  if grep -q "^$1=" "$dir/.env"; then
    awk -v k="$1" -v v="$2" 'index($0, k "=") == 1 { print k "=" v; next } { print }' "$dir/.env" > "$dir/.env.eldra-tmp"
    mv "$dir/.env.eldra-tmp" "$dir/.env"
  else
    printf '%s=%s\n' "$1" "$2" >> "$dir/.env"
  fi
}

org=""
gateway=""
environment=""
if [ -n "$settings" ] && [ -f "$settings" ]; then
  org="$(field org)"
  gateway="$(field gateway)"
  environment="$(field environment)"
  mkdir -p "$dir/.claude"
  awk -v t="$template" '
    /^---$/ { n++; if (n == 2 && !done) print "template: " t }
    n == 1 && /^template:/ { print "template: " t; done = 1; next }
    { print }
  ' "$settings" > "$dir/.claude/eldra-storefront.local.md"
fi

if [ -f "$dir/.env.example" ]; then
  cp "$dir/.env.example" "$dir/.env"
  if [ -n "$org" ]; then set_env ELDRA_ORG_ID "$org"; fi
  if [ -n "$gateway" ]; then set_env BASE_API_URL "$gateway"; fi
else
  echo "warning: the template has no .env.example, so no .env was written." >&2
fi

# ensure_ignored PATTERN: add PATTERN to .gitignore unless it is already a line there.
ensure_ignored() {
  touch "$dir/.gitignore"
  if [ -s "$dir/.gitignore" ] && [ -n "$(tail -c 1 "$dir/.gitignore")" ]; then echo >> "$dir/.gitignore"; fi
  grep -qxF "$1" "$dir/.gitignore" || printf '%s\n' "$1" >> "$dir/.gitignore"
}
ensure_ignored ".env"
ensure_ignored ".claude/*.local.*"

for f in $missing; do
  echo "warning: the registry lists $f as a brand file but the template has no such file. Please report this as a bug in the eldra-storefront plugin." >&2
done

cat <<NEXT
Created $dir from $template at $ref as "$title" ($slug), with a fresh git history.
Dependencies are not installed and nothing is running.

Next: quit Claude Code, then run:
  cd $dir && claude

From inside $dir:
  1. /eldra-storefront:connect         $( [ -n "$org" ] && echo "(already set to '$org'; run it to add the MCP server here)" || echo "(choose the organization and add its MCP server)")
  2. /eldra-storefront:content-model   (create the schemas and demo entries this site reads)

Then configure in Studio, General settings:
  - Storefront origins: add http://localhost:3000 (and your live domain) so browsers may use the cart.
  - Preview token: create one and set PREVIEW_TOKEN in .env to see drafts while developing.
NEXT
if [ -n "$environment" ] && [ "$environment" != "production" ]; then
  echo "  - This is the '$environment' environment: set NUXT_PUBLIC_CHECKOUT_URL in .env to its checkout origin."
fi
