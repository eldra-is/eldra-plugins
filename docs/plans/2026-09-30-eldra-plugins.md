# Eldra plugins marketplace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the `eldra` Claude Code marketplace with two plugins: `eldra-mcp` (the Eldra Studio MCP connector alone) and `eldra-storefront` (scaffold, connect, content model, and four skills for building a storefront on `@eldrajs/sdk`).

**Architecture:** One public repository holds `.claude-plugin/marketplace.json` and `plugins/<name>/`, each entry a `git-subdir` source pinned to a release-please tag. Deterministic work lives in small scripts (`scaffold.sh`, `mcp-url.sh`, `content-model-plan.mjs`) with shell and `node:test` tests; the commands are instruction text that call those scripts and the organization's MCP tools; the skills carry the SDK's real names and the starter's conventions. CI validates every manifest and frontmatter with a repo-local Node script.

**Tech Stack:** Claude Code plugin format (plugin.json, commands, skills, `.mcp.json`), Bash 3.2+ (macOS default), Node.js 22 (`node:test`, no dependencies), GitHub Actions, release-please v4.

**Spec:** `docs/specs/2026-09-30-eldra-storefront-plugin-design.md` and `docs/backlog.md` on branch `docs/spec-amendments`. Start the work branch from that branch so the amended spec travels with it: `git switch -c feat/eldra-plugins-v1 docs/spec-amendments`. Conventions for the scaffolded site come from `eldra-is/storefront-starter` `docs/specs/2026-09-30-storefront-starter-design.md` (the starter spec), which is the source of truth for everything the skills say about the site.

## Global Constraints

- Public-safe: no staging or internal hostnames, no staff-only steps, no deploy hooks, no internal package names anywhere in `plugins/`, `README.md` or `docs/testing.md`. The only `*.eldra.app` hosts allowed there are `web.eldra.app`, `mcp.eldra.app`, `checkout.eldra.app` (enforced by the validator in Task 1).
- Production defaults: gateway `https://web.eldra.app/api`, MCP origin `https://mcp.eldra.app`, checkout `https://checkout.eldra.app`. Any other environment is given as explicit URLs by the user, never by a name the plugin knows.
- Settings file: `.claude/eldra-storefront.local.md`, YAML frontmatter keys `org`, `environment`, `gateway`, `mcp`, `template`; git-ignored through the pattern `.claude/*.local.*`.
- MCP server per project: `claude mcp add --transport http --scope project eldra-<org> <mcp>/<org>/mcp`; its tools are `mcp__eldra-<org>__<tool>`.
- Nothing the plugin writes through the MCP is published; every write is a draft. `content-model` never deletes and never changes an existing field.
- Template registry pins `https://github.com/eldra-is/storefront-starter.git` at `v0.1.0`. Brand placeholders in the starter's brand files: `Storefront Starter` (display name) and `storefront-starter` (slug).
- Names are kebab-case: plugins, commands, skills, scripts, files.
- Every intra-plugin path in commands and skills is written `${CLAUDE_PLUGIN_ROOT}/...` (enforced by the validator).
- Marketplace entries: `source: {source: "git-subdir", url: "https://github.com/eldra-is/eldra-plugins.git", path: "plugins/<name>", ref: "<name>-v<version>"}`; tags `eldra-storefront-vX.Y.Z` and `eldra-mcp-vX.Y.Z`.
- Commits: conventional commit messages, no attribution or co-author lines, no Claude references. Do not push and do not open pull requests unless the user asks.
- Scripts run on macOS Bash 3.2 and GNU Bash 5: no `mapfile`, no `sed -i`, no GNU-only flags.
- License MIT; owner "Eldra".

## Review Focus

1. `ELDRA_ORG` unset when `eldra-mcp` loads: the URL becomes `https://mcp.eldra.app//mcp`, so the README must say what the user sees and how to fix it, and the `.mcp.json` must keep the variable (never a hard-coded org). Pinned: `tests/eldra-mcp.test.mjs` in Task 2 and the manual check in `docs/testing.md` (Task 12).
2. An org alias typed with uppercase letters or spaces ("Sits Web"): `mcp-url.sh` refuses it with exit 2 and suggests `sits-web`; `connect` never writes an alias that fails. Pinned: `tests/mcp-url.test.sh` cases in Task 4, `connect` step 2 in Task 7.
3. `connect` run twice (same org, then a different org): exactly one `eldra-<org>` entry in `.mcp.json` per org, settings rewritten in place, the old org's server removed only when the user says so. Pinned: `connect` step 5 in Task 7 and the manual check in `docs/testing.md`.
4. `content-model` against an org whose existing schemas have extra fields or a field with the same id but another type: extra fields are resent untouched, only missing fields are added, conflicts are reported and their values not written. Pinned: `tests/content-model-plan.test.mjs` "adds only missing fields…" in Task 6.
5. The pinned starter tag missing from the starter repository: `scaffold.sh` exits 4 with a "bug in the eldra-storefront plugin" message and creates nothing; CI fails before release. Pinned: `tests/scaffold.test.sh` "missing tag" case in Task 5 and the template-ref CI step in Task 3.

---

## File Structure

| Path | Responsibility |
| --- | --- |
| `.claude-plugin/marketplace.json` | Marketplace `eldra`, owner Eldra, both plugins |
| `.github/workflows/validate.yml` | Validator, tests, pinned template tag, PR title lint |
| `.github/workflows/release-please.yml` | Release PRs, then sync marketplace refs onto the PR branch |
| `release-please-config.json`, `.release-please-manifest.json` | One component per plugin |
| `scripts/validate-plugins.mjs` | Structural validation of marketplace, plugins, commands, skills |
| `scripts/sync-marketplace-refs.mjs` | Sets each entry's `version`/`ref` from its plugin.json |
| `scripts/test.sh` | Runs every test |
| `tests/lib/assert.sh` | Tiny assertion helpers for shell tests |
| `tests/*.test.mjs`, `tests/*.test.sh`, `tests/fixtures/` | Tests and fixtures |
| `plugins/eldra-mcp/` | `plugin.json`, `.mcp.json`, `README.md` |
| `plugins/eldra-storefront/.claude-plugin/plugin.json` | Manifest |
| `plugins/eldra-storefront/templates.json` | Template registry |
| `plugins/eldra-storefront/scripts/mcp-url.sh` | Server name and URL from settings, alias validation |
| `plugins/eldra-storefront/scripts/scaffold.sh` | Clone at tag, strip history, rebrand, `.env`, `.gitignore` |
| `plugins/eldra-storefront/scripts/content-model-plan.mjs` | Pure planner for `content-model`: next MCP calls plus report |
| `plugins/eldra-storefront/commands/{new-site,connect,content-model}.md` | The three commands |
| `plugins/eldra-storefront/skills/*/SKILL.md` (+ `references/`) | The four skills |
| `plugins/eldra-storefront/README.md` | Plugin usage |
| `docs/testing.md` | Manual end-to-end pass |
| `README.md` | Marketplace usage |

---

### Task 1: Validation tooling

**Files:**
- Create: `scripts/validate-plugins.mjs`
- Create: `scripts/test.sh`
- Create: `tests/lib/assert.sh`
- Test: `tests/validate-plugins.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `validate(root: string): string[]` (one problem per string, empty when valid) and `parseFrontmatter(text: string): Record<string,string> | null`, exported from `scripts/validate-plugins.mjs`; CLI `node scripts/validate-plugins.mjs [root]` exits 0 or 1. `scripts/test.sh` runs `node --test tests/*.test.mjs` and every `tests/*.test.sh`. `tests/lib/assert.sh` provides `assert_eq`, `assert_status`, `assert_contains`, `assert_file_contains`, `assert_file_lacks`, `finish`.

- [ ] **Step 1: Write the failing test**

`tests/validate-plugins.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { validate } from '../scripts/validate-plugins.mjs';

function tree(files) {
  const root = mkdtempSync(join(tmpdir(), 'eldra-validate-'));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), typeof content === 'string' ? content : JSON.stringify(content, null, 2));
  }
  return root;
}

function valid(overrides = {}) {
  return {
    '.claude-plugin/marketplace.json': {
      name: 'eldra',
      owner: { name: 'Eldra' },
      plugins: [
        {
          name: 'demo',
          description: 'Demo plugin',
          version: '0.1.0',
          category: 'development',
          author: { name: 'Eldra' },
          source: {
            source: 'git-subdir',
            url: 'https://github.com/eldra-is/eldra-plugins.git',
            path: 'plugins/demo',
            ref: 'demo-v0.1.0',
          },
        },
      ],
    },
    'plugins/demo/.claude-plugin/plugin.json': {
      name: 'demo',
      version: '0.1.0',
      description: 'Demo plugin',
      license: 'MIT',
    },
    'plugins/demo/commands/do-thing.md':
      '---\ndescription: Do the thing\nargument-hint: "[--dry-run]"\n---\n\nRun `${CLAUDE_PLUGIN_ROOT}/scripts/run.sh`.\n',
    'plugins/demo/scripts/run.sh': '#!/usr/bin/env bash\n',
    'plugins/demo/skills/demo-skill/SKILL.md':
      '---\nname: demo-skill\ndescription: This skill should be used when the user asks to "demo".\n---\n\nSee references/more.md.\n',
    'plugins/demo/skills/demo-skill/references/more.md': '# More\n',
    'plugins/demo/README.md': 'Talks to https://web.eldra.app/api.\n',
    ...overrides,
  };
}

test('a complete marketplace validates clean', () => {
  assert.deepEqual(validate(tree(valid())), []);
});

const cmd = (body) => ({ 'plugins/demo/commands/do-thing.md': body });
const skill = (body) => ({ 'plugins/demo/skills/demo-skill/SKILL.md': body });
const wrongRef = valid()['.claude-plugin/marketplace.json'];
wrongRef.plugins[0].source.ref = 'v0.1.0';

const cases = [
  ['a command without a description', cmd('---\nargument-hint: x\n---\nBody\n'), /do-thing\.md: frontmatter description is required/],
  ['an unquoted value containing ": "', cmd('---\ndescription: Do: the thing\n---\nBody\n'), /description must be quoted/],
  ['an unquoted value starting with "["', cmd('---\ndescription: Do\nargument-hint: [--dry-run]\n---\n'), /argument-hint must be quoted/],
  ['a ref that is not name-vVERSION', { '.claude-plugin/marketplace.json': wrongRef }, /source\.ref must be demo-v0\.1\.0/],
  ['a skill named unlike its directory', skill('---\nname: Demo Skill\ndescription: This skill should be used when x.\n---\n'), /name must equal the directory name demo-skill/],
  ['a missing reference file', skill('---\nname: demo-skill\ndescription: This skill should be used when x.\n---\nSee references/gone.md.\n'), /references\/gone\.md does not exist/],
  ['an internal eldra.app host', { 'plugins/demo/README.md': 'Try https://secret.internal.eldra.app/api\n' }, /secret\.internal\.eldra\.app is not a public Eldra host/],
  ['a plugin path without CLAUDE_PLUGIN_ROOT', cmd('---\ndescription: Do\n---\nRun `scripts/run.sh`.\n'), /scripts\/run\.sh must be written \$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/run\.sh/],
  ['a CLAUDE_PLUGIN_ROOT path that does not exist', cmd('---\ndescription: Do\n---\nRun `${CLAUDE_PLUGIN_ROOT}/scripts/gone.sh`.\n'), /\$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/gone\.sh does not exist/],
  ['a plugin directory missing from the marketplace', { 'plugins/stray/.claude-plugin/plugin.json': { name: 'stray', version: '0.1.0' } }, /plugins\/stray: plugin is not listed in marketplace\.json/],
  ['an http MCP server without https', { 'plugins/demo/.mcp.json': { mcpServers: { x: { type: 'http', url: 'http://example.com/mcp' } } } }, /mcpServers\.x\.url must be https/],
];

for (const [name, overrides, pattern] of cases) {
  test(`${name} is reported`, () => {
    assert.match(validate(tree(valid(overrides))).join('\n'), pattern);
  });
}
```

`tests/lib/assert.sh`:

```bash
# Minimal assertions for shell tests. Source it, call the asserts, end with `finish`.
failures=0

pass() { printf 'ok   %s\n' "$1"; }
fail() { printf 'FAIL %s\n     %s\n' "$1" "$2"; failures=$((failures + 1)); }

assert_eq() { # assert_eq NAME EXPECTED ACTUAL
  if [ "$2" = "$3" ]; then pass "$1"; else fail "$1" "expected [$2], got [$3]"; fi
}

assert_status() { # assert_status NAME EXPECTED_STATUS ACTUAL_STATUS
  assert_eq "$1 (exit status)" "$2" "$3"
}

assert_contains() { # assert_contains NAME NEEDLE HAYSTACK
  case "$3" in *"$2"*) pass "$1" ;; *) fail "$1" "[$2] not found in [$3]" ;; esac
}

assert_file_contains() { # assert_file_contains NAME FILE FIXED_LINE_OR_TEXT
  if [ -f "$2" ] && grep -qF -- "$3" "$2"; then pass "$1"; else fail "$1" "[$3] not in $2"; fi
}

assert_file_lacks() { # assert_file_lacks NAME FILE TEXT
  if [ -f "$2" ] && ! grep -qF -- "$3" "$2"; then pass "$1"; else fail "$1" "[$3] unexpectedly in $2 (or file missing)"; fi
}

finish() {
  if [ "$failures" -gt 0 ]; then printf '%s failure(s)\n' "$failures"; exit 1; fi
  printf 'all passed\n'
}
```

`scripts/test.sh`:

```bash
#!/usr/bin/env bash
# Runs every test in the repository.
set -euo pipefail
cd "$(dirname "$0")/.."
shopt -s nullglob
node --test tests/*.test.mjs
for t in tests/*.test.sh; do
  echo "== $t"
  bash "$t"
done
```

- [ ] **Step 2: Run test to verify it fails**

Run: `chmod +x scripts/test.sh && node --test tests/validate-plugins.test.mjs`
Expected: FAIL with `Cannot find module '.../scripts/validate-plugins.mjs'`.

- [ ] **Step 3: Write the implementation**

`scripts/validate-plugins.mjs`:

```js
#!/usr/bin/env node
// Validates the marketplace manifest, every plugin manifest, and every command and skill file.
// Usage: node scripts/validate-plugins.mjs [repo-root]. Exit 0 when valid, 1 with one line per problem.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SEMVER = /^\d+\.\d+\.\d+$/;
const PUBLIC_HOSTS = new Set(['web.eldra.app', 'mcp.eldra.app', 'checkout.eldra.app']);
const ELDRA_HOST = /\b(?:[a-z0-9-]+\.)+eldra\.app\b/gi;
const BARE_PLUGIN_PATH = /(?<![\w/.${}-])(scripts\/[\w.-]+|templates\.json)/g;
const TEXT_FILE = /\.(md|json|sh|mjs|js|ts|txt|ya?ml)$/;

export function parseFrontmatter(text) {
  const match = /^---\n([\s\S]*?)\n---(\n|$)/.exec(text);
  if (!match) return null;
  const fields = {};
  for (const line of match[1].split('\n')) {
    const kv = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (kv) fields[kv[1]] = kv[2].trim();
  }
  return fields;
}

function unquote(value) {
  const m = /^"(.*)"$/.exec(value) ?? /^'(.*)'$/.exec(value);
  return m ? m[1] : value;
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

export function validate(root) {
  const problems = [];
  const fail = (file, message) => problems.push(`${relative(root, file) || '.'}: ${message}`);
  const readJson = (file) => {
    try {
      return JSON.parse(readFileSync(file, 'utf8'));
    } catch (error) {
      fail(file, existsSync(file) ? `not valid JSON (${error.message})` : 'missing');
      return null;
    }
  };

  const checkFrontmatter = (file, required) => {
    const fields = parseFrontmatter(readFileSync(file, 'utf8'));
    if (!fields) {
      fail(file, 'has no YAML frontmatter');
      return null;
    }
    for (const [key, raw] of Object.entries(fields)) {
      const quoted = /^(".*"|'.*')$/.test(raw);
      if (!quoted && raw.includes(': ')) fail(file, `frontmatter ${key} must be quoted (it contains ": ")`);
      if (!quoted && /^[[{]/.test(raw)) fail(file, `frontmatter ${key} must be quoted (it starts with ${raw[0]})`);
    }
    for (const key of required) if (!fields[key]) fail(file, `frontmatter ${key} is required`);
    return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, unquote(v)]));
  };

  // pluginDir is set for command and skill files, whose plugin paths must go through CLAUDE_PLUGIN_ROOT.
  const checkText = (file, pluginDir) => {
    const text = readFileSync(file, 'utf8');
    for (const host of text.match(ELDRA_HOST) ?? []) {
      if (!PUBLIC_HOSTS.has(host.toLowerCase())) fail(file, `${host} is not a public Eldra host`);
    }
    if (!pluginDir) return;
    for (const m of text.matchAll(BARE_PLUGIN_PATH)) {
      fail(file, `${m[1]} must be written \${CLAUDE_PLUGIN_ROOT}/${m[1]}`);
    }
    for (const m of text.matchAll(/\$\{CLAUDE_PLUGIN_ROOT\}\/([\w./-]+)/g)) {
      const path = m[1].replace(/\.+$/, '');
      if (!existsSync(join(pluginDir, path))) fail(file, `\${CLAUDE_PLUGIN_ROOT}/${path} does not exist`);
    }
  };

  const marketFile = join(root, '.claude-plugin', 'marketplace.json');
  const market = readJson(marketFile);
  if (!market) return problems;
  if (!KEBAB.test(market.name ?? '')) fail(marketFile, 'name must be kebab-case');
  if (!market.owner?.name) fail(marketFile, 'owner.name is required');
  if (!Array.isArray(market.plugins) || market.plugins.length === 0) {
    fail(marketFile, 'plugins[] is required');
    return problems;
  }

  const listed = new Set();
  market.plugins.forEach((entry, i) => {
    const at = `plugins[${i}]`;
    for (const key of ['name', 'description', 'version', 'category']) {
      if (!entry[key]) fail(marketFile, `${at}.${key} is required`);
    }
    if (!entry.author?.name) fail(marketFile, `${at}.author.name is required`);
    if (!KEBAB.test(entry.name ?? '')) fail(marketFile, `${at}.name must be kebab-case`);
    if (!SEMVER.test(entry.version ?? '')) fail(marketFile, `${at}.version must be X.Y.Z`);
    listed.add(entry.name);
    const src = entry.source ?? {};
    if (src.source !== 'git-subdir') fail(marketFile, `${at}.source.source must be git-subdir`);
    if (!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\.git$/.test(src.url ?? '')) {
      fail(marketFile, `${at}.source.url must be an https GitHub .git URL`);
    }
    if (src.path !== `plugins/${entry.name}`) fail(marketFile, `${at}.source.path must be plugins/${entry.name}`);
    if (src.ref !== `${entry.name}-v${entry.version}`) {
      fail(marketFile, `${at}.source.ref must be ${entry.name}-v${entry.version}`);
    }
    validatePlugin(join(root, 'plugins', entry.name ?? ''), entry);
  });

  const pluginsDir = join(root, 'plugins');
  if (existsSync(pluginsDir)) {
    for (const dir of readdirSync(pluginsDir)) {
      if (statSync(join(pluginsDir, dir)).isDirectory() && !listed.has(dir)) {
        fail(join(pluginsDir, dir), 'plugin is not listed in marketplace.json');
      }
    }
  }
  for (const file of ['README.md', 'docs/testing.md'].map((f) => join(root, f))) {
    if (existsSync(file)) checkText(file, null);
  }
  return problems;

  function validatePlugin(dir, entry) {
    const manifestFile = join(dir, '.claude-plugin', 'plugin.json');
    const manifest = readJson(manifestFile);
    if (!manifest) return;
    if (manifest.name !== entry.name) fail(manifestFile, `name must be ${entry.name}`);
    if (manifest.version !== entry.version) fail(manifestFile, `version ${manifest.version} differs from marketplace ${entry.version}`);
    if (!manifest.description) fail(manifestFile, 'description is required');
    if (manifest.license !== 'MIT') fail(manifestFile, 'license must be MIT');

    for (const file of walk(join(dir, 'commands'))) {
      if (!file.endsWith('.md')) continue;
      const name = file.slice(file.lastIndexOf('/') + 1, -3);
      if (!KEBAB.test(name)) fail(file, 'command file name must be kebab-case');
      checkFrontmatter(file, ['description']);
    }

    const skillsDir = join(dir, 'skills');
    if (existsSync(skillsDir)) {
      for (const skill of readdirSync(skillsDir)) {
        const skillFile = join(skillsDir, skill, 'SKILL.md');
        if (!existsSync(skillFile)) {
          fail(join(skillsDir, skill), 'SKILL.md is missing');
          continue;
        }
        const fields = checkFrontmatter(skillFile, ['name', 'description']);
        if (fields?.name && fields.name !== skill) fail(skillFile, `name must equal the directory name ${skill}`);
        if (fields?.description && !fields.description.startsWith('This skill should be used when')) {
          fail(skillFile, 'description must start with "This skill should be used when"');
        }
        const body = readFileSync(skillFile, 'utf8');
        for (const m of body.matchAll(/\breferences\/[\w.-]+\.md\b/g)) {
          if (!existsSync(join(skillsDir, skill, m[0]))) fail(skillFile, `${m[0]} does not exist`);
        }
      }
    }

    const mcpFile = join(dir, '.mcp.json');
    if (existsSync(mcpFile)) {
      const mcp = readJson(mcpFile);
      if (mcp && (typeof mcp.mcpServers !== 'object' || mcp.mcpServers === null)) fail(mcpFile, 'mcpServers object is required');
      for (const [name, server] of Object.entries(mcp?.mcpServers ?? {})) {
        if (server.type === 'http' && !/^https:\/\//.test(server.url ?? '')) fail(mcpFile, `mcpServers.${name}.url must be https`);
      }
    }
    for (const file of walk(dir)) {
      if (file.endsWith('.json')) readJson(file);
      if (!TEXT_FILE.test(file)) continue;
      const inComponent = /^(commands|skills)\//.test(relative(dir, file));
      checkText(file, inComponent ? dir : null);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const problems = validate(process.argv[2] ?? '.');
  for (const p of problems) console.error(p);
  if (problems.length) process.exit(1);
  console.log('marketplace and plugins are valid');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/validate-plugins.test.mjs`
Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/validate-plugins.mjs scripts/test.sh tests/lib/assert.sh tests/validate-plugins.test.mjs
git commit -m "build: add plugin and marketplace validator with tests"
```

---

### Task 2: `eldra-mcp` plugin, marketplace manifest and validation workflow

**Files:**
- Create: `plugins/eldra-mcp/.claude-plugin/plugin.json`
- Create: `plugins/eldra-mcp/.mcp.json`
- Create: `plugins/eldra-mcp/README.md`
- Create: `.claude-plugin/marketplace.json`
- Create: `.github/workflows/validate.yml`
- Test: `tests/eldra-mcp.test.mjs`

**Interfaces:**
- Consumes: `validate(root)` from Task 1.
- Produces: marketplace entry shape every later task copies; version bootstrap `0.0.0` (the first release PR moves it to `0.1.0`, see Task 11).

- [ ] **Step 1: Write the failing test**

`tests/eldra-mcp.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('the connector URL keeps ELDRA_ORG as a variable and never names an org', () => {
  const mcp = JSON.parse(read('plugins/eldra-mcp/.mcp.json'));
  assert.deepEqual(mcp, {
    mcpServers: { eldra: { type: 'http', url: 'https://mcp.eldra.app/${ELDRA_ORG}/mcp' } },
  });
});

test('the README explains an unset ELDRA_ORG', () => {
  const readme = read('plugins/eldra-mcp/README.md');
  assert.match(readme, /## If ELDRA_ORG is not set/);
  assert.match(readme, /\/eldra-storefront:connect/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/eldra-mcp.test.mjs`
Expected: FAIL with `ENOENT: no such file or directory, open '.../plugins/eldra-mcp/.mcp.json'`.

- [ ] **Step 3: Write the plugin, the marketplace and the workflow**

`plugins/eldra-mcp/.claude-plugin/plugin.json`:

```json
{
  "name": "eldra-mcp",
  "version": "0.0.0",
  "description": "The Eldra Studio MCP connector for one organization, chosen with ELDRA_ORG. Drafts only: a person publishes in Studio.",
  "author": { "name": "Eldra", "url": "https://eldra.is" },
  "homepage": "https://github.com/eldra-is/eldra-plugins/tree/main/plugins/eldra-mcp",
  "repository": "https://github.com/eldra-is/eldra-plugins",
  "license": "MIT",
  "keywords": ["eldra", "mcp", "cms", "studio"]
}
```

`plugins/eldra-mcp/.mcp.json`:

```json
{
  "mcpServers": {
    "eldra": {
      "type": "http",
      "url": "https://mcp.eldra.app/${ELDRA_ORG}/mcp"
    }
  }
}
```

`plugins/eldra-mcp/README.md`:

````markdown
# eldra-mcp

The Eldra Studio MCP connector, and nothing else. It lets Claude read and write draft content and
media in one Studio organization with your own login. Nothing it writes is published; a person
publishes in Studio.

## Install

```bash
claude plugin marketplace add eldra-is/eldra-plugins
claude plugin install eldra-mcp@eldra
```

## Choose the organization

The connector URL is `https://mcp.eldra.app/<organization alias>/mcp`. The plugin reads the alias
from the `ELDRA_ORG` environment variable when Claude Code starts:

```bash
export ELDRA_ORG=your-org-alias   # the alias shown in Studio under General settings
claude
```

Then run `/mcp`, choose `eldra` and log in. You sign in with your Studio account and a one-time
code, and approve access. You must be a member of the organization, and the organization must have
the MCP feature enabled.

One value of `ELDRA_ORG` is one organization. To work in a second organization, start Claude Code
from another project with a different value.

## If ELDRA_ORG is not set

The URL becomes `https://mcp.eldra.app//mcp`, which names no organization. Claude Code then warns
that `ELDRA_ORG` is missing or lists the `eldra` server as failed in `/mcp`. Quit Claude Code, set
`ELDRA_ORG` as above, and start it again.

## Errors you may see

| Error id | Meaning |
| --- | --- |
| `ORGANIZATION_NOT_FOUND` | You are not a member of that organization, or the alias is misspelled. |
| `FEATURE_DISABLED` | The MCP is not enabled for the organization yet; ask Eldra to enable it. |
| `PRIVILEGED_SESSION_REQUIRED` | You logged in with an account that has platform roles. Log in with an ordinary member account. |
| `UNAUTHENTICATED` | The login is missing or expired. Run `/mcp` and log in again. |
| `ACCESS_DENIED` | Your role in the organization does not allow that change. Ask an organization administrator. |

## Building a site?

The `eldra-storefront` plugin does the same connection per project with
`/eldra-storefront:connect`, which asks for the organization and writes the connector into the
project's `.mcp.json`. Use one or the other for an organization, not both.
````

`.claude-plugin/marketplace.json`:

```json
{
  "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
  "name": "eldra",
  "description": "Claude Code plugins from Eldra: build storefronts on the Eldra public API and connect to Eldra Studio.",
  "owner": { "name": "Eldra" },
  "plugins": [
    {
      "name": "eldra-mcp",
      "description": "Only the Eldra Studio MCP connector, for one organization set with ELDRA_ORG. For content editors and anyone who does not write code.",
      "author": { "name": "Eldra" },
      "category": "productivity",
      "version": "0.0.0",
      "homepage": "https://github.com/eldra-is/eldra-plugins/tree/main/plugins/eldra-mcp",
      "source": {
        "source": "git-subdir",
        "url": "https://github.com/eldra-is/eldra-plugins.git",
        "path": "plugins/eldra-mcp",
        "ref": "eldra-mcp-v0.0.0"
      }
    }
  ]
}
```

`.github/workflows/validate.yml`:

```yaml
name: validate

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Marketplace, plugin manifests, commands and skills
        run: node scripts/validate-plugins.mjs .
      - name: Tests
        run: bash scripts/test.sh

  pr-title:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    permissions:
      pull-requests: read
    steps:
      - uses: amannn/action-semantic-pull-request@v5
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

- [ ] **Step 4: Run tests and the validator**

Run: `node --test tests/eldra-mcp.test.mjs && node scripts/validate-plugins.mjs . && bash scripts/test.sh`
Expected: PASS; validator prints `marketplace and plugins are valid`.

- [ ] **Step 5: Commit**

```bash
git add plugins/eldra-mcp .claude-plugin/marketplace.json .github/workflows/validate.yml tests/eldra-mcp.test.mjs
git commit -m "feat(eldra-mcp): add the Eldra MCP connector plugin and the eldra marketplace"
```

---

### Task 3: `eldra-storefront` skeleton, template registry and pinned-tag CI check

**Files:**
- Create: `plugins/eldra-storefront/.claude-plugin/plugin.json`
- Create: `plugins/eldra-storefront/templates.json`
- Create: `plugins/eldra-storefront/README.md`
- Modify: `.claude-plugin/marketplace.json` (add the entry)
- Modify: `.github/workflows/validate.yml` (add the template-ref step)

**Interfaces:**
- Consumes: marketplace entry shape (Task 2).
- Produces: `templates.json` shape `{ "<key>": { repo, ref, description, brandFiles[] } }` read by `scaffold.sh` (Task 5).

- [ ] **Step 1: Write the manifest and the registry**

`plugins/eldra-storefront/.claude-plugin/plugin.json`:

```json
{
  "name": "eldra-storefront",
  "version": "0.0.0",
  "description": "Build an Eldra storefront: scaffold from the public starter, connect a Studio organization, create its content model through the Eldra MCP, and write code against @eldrajs/sdk.",
  "author": { "name": "Eldra", "url": "https://eldra.is" },
  "homepage": "https://github.com/eldra-is/eldra-plugins/tree/main/plugins/eldra-storefront",
  "repository": "https://github.com/eldra-is/eldra-plugins",
  "license": "MIT",
  "keywords": ["eldra", "storefront", "nuxt", "headless", "cms", "ecommerce"]
}
```

`plugins/eldra-storefront/templates.json`:

```json
{
  "starter": {
    "repo": "https://github.com/eldra-is/storefront-starter.git",
    "ref": "v0.1.0",
    "description": "Nuxt storefront on the Eldra public API: shop, cart, checkout hand-off, content pages",
    "brandFiles": ["app/app.config.ts", "nuxt.config.ts", "README.md"]
  }
}
```

Append to `plugins` in `.claude-plugin/marketplace.json`:

```json
    {
      "name": "eldra-storefront",
      "description": "Build a storefront on the Eldra public API: scaffold from a template, connect to a Studio organization, create its content model through the Eldra MCP, and write code against @eldrajs/sdk the way Eldra does.",
      "author": { "name": "Eldra" },
      "category": "development",
      "version": "0.0.0",
      "homepage": "https://github.com/eldra-is/eldra-plugins/tree/main/plugins/eldra-storefront",
      "source": {
        "source": "git-subdir",
        "url": "https://github.com/eldra-is/eldra-plugins.git",
        "path": "plugins/eldra-storefront",
        "ref": "eldra-storefront-v0.0.0"
      }
    }
```

- [ ] **Step 2: Write the plugin README**

`plugins/eldra-storefront/README.md`:

````markdown
# eldra-storefront

Build a storefront on the Eldra public API the way Eldra builds them.

```bash
claude plugin marketplace add eldra-is/eldra-plugins
claude plugin install eldra-storefront@eldra
```

## Commands

| Command | What it does |
| --- | --- |
| `/eldra-storefront:new-site <name>` | Clones the public `eldra-is/storefront-starter` at its pinned release into `<name>/`, starts a fresh git history, renames the starter brand, writes `.env`. Installs nothing. |
| `/eldra-storefront:connect` | Asks for your organization alias and environment (production by default), writes `.claude/eldra-storefront.local.md`, adds the organization's MCP server to the project's `.mcp.json`, and checks it by listing the organization's locales. |
| `/eldra-storefront:content-model [--dry-run]` | Creates the schemas and demo entries the site expects (`cms/content-model.eldra.json`) through the MCP: only what is missing, as drafts, never changing an existing field. |

Typical order: `new-site`, then inside the new folder `connect` and `content-model`.

## Skills

Claude loads these when the work calls for them:

- `eldra-sdk`: `@eldrajs/sdk` (written against 0.2.x): the client, generated types, CMS reads, cart, checkout hand-off, orders, errors.
- `eldra-storefront-conventions`: how a site built from the starter is organized and why.
- `eldra-studio-connection`: environment variables, storefront origins, preview tokens, the MCP login.
- `eldra-content-model`: designing schemas that generate clean types, the `.eldra.json` manifest, the MCP write rules.

## Settings

`connect` writes `.claude/eldra-storefront.local.md` (`org`, `environment`, `gateway`, `mcp`,
`template`); every command reads it. Production is the default; for another environment `connect`
asks for its gateway and MCP URLs. Keep the file out of git with the `.gitignore` line
`.claude/*.local.*` (the scaffold and `connect` add it).

## Requirements

Git, Node.js 22 or later, pnpm, and a Studio account that is a member of the organization.
````

- [ ] **Step 3: Add the pinned-tag CI step**

In `.github/workflows/validate.yml`, append to the `validate` job's `steps`:

```yaml
      - name: Pinned template tags exist
        run: |
          node -e 'for (const [key, t] of Object.entries(require("./plugins/eldra-storefront/templates.json"))) console.log(key, t.repo, t.ref)' |
          while read -r key repo ref; do
            if ! git ls-remote --exit-code --tags "$repo" "refs/tags/$ref" >/dev/null; then
              echo "::error::template $key pins $ref, which $repo does not have"
              exit 1
            fi
          done
```

This step fails until `eldra-is/storefront-starter` has published `v0.1.0` (the starter's build order ends with that release). Merge this repository's first pull request after that tag exists.

- [ ] **Step 4: Validate**

Run: `node scripts/validate-plugins.mjs . && bash scripts/test.sh && git ls-remote --tags https://github.com/eldra-is/storefront-starter.git refs/tags/v0.1.0`
Expected: validator prints `marketplace and plugins are valid`; tests pass; `ls-remote` prints one line once the starter is released (empty output before that is the expected, known blocker, not a plan failure).

- [ ] **Step 5: Commit**

```bash
git add plugins/eldra-storefront .claude-plugin/marketplace.json .github/workflows/validate.yml
git commit -m "feat(eldra-storefront): add plugin manifest, template registry and README"
```

---
### Task 4: `mcp-url.sh`

**Files:**
- Create: `plugins/eldra-storefront/scripts/mcp-url.sh`
- Test: `tests/mcp-url.test.sh`

**Interfaces:**
- Consumes: settings file format (Global Constraints).
- Produces: `bash ${CLAUDE_PLUGIN_ROOT}/scripts/mcp-url.sh [--settings FILE] [--org ALIAS] [--mcp ORIGIN] [--name]`. Prints `<mcp>/<org>/mcp`, or `eldra-<org>` with `--name`. Flags win over the settings file (default `.claude/eldra-storefront.local.md`); MCP origin defaults to `https://mcp.eldra.app`. Exit 0 ok, 1 usage, 2 malformed alias (stderr ends with `Did you mean '<suggestion>'?`), 3 MCP origin not a bare origin, 4 no alias anywhere.

- [ ] **Step 1: Write the failing test**

`tests/mcp-url.test.sh`:

```bash
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash tests/mcp-url.test.sh`
Expected: FAIL lines (`bash: .../mcp-url.sh: No such file or directory`), ending `N failure(s)` and exit 1.

- [ ] **Step 3: Write the implementation**

`plugins/eldra-storefront/scripts/mcp-url.sh`:

```bash
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `chmod +x plugins/eldra-storefront/scripts/mcp-url.sh && bash tests/mcp-url.test.sh`
Expected: every line `ok`, then `all passed`.

- [ ] **Step 5: Commit**

```bash
git add plugins/eldra-storefront/scripts/mcp-url.sh tests/mcp-url.test.sh
git commit -m "feat(eldra-storefront): build the MCP server name and URL from settings"
```

---

### Task 5: `scaffold.sh`

**Files:**
- Create: `plugins/eldra-storefront/scripts/scaffold.sh`
- Test: `tests/scaffold.test.sh`

**Interfaces:**
- Consumes: `templates.json` (Task 3); settings file format.
- Produces: `bash ${CLAUDE_PLUGIN_ROOT}/scripts/scaffold.sh <template> <dir> [--title "Display name"] [--settings FILE]`. The site slug is the basename of `<dir>` and must be kebab-case; the title defaults to the slug in title case (`sits-web` → `Sits Web`). With `--settings`, `.env` gets `ELDRA_ORG_ID` and `BASE_API_URL` from it and the file is copied to `<dir>/.claude/eldra-storefront.local.md` with `template: <template>`. Exit 0 ok, 1 usage, 2 target exists and is not empty, 3 template not in the registry, 4 pinned tag missing (plugin bug), 5 clone failed or repository unreachable, 6 git or node missing. `ELDRA_TEMPLATES_FILE` overrides the registry path (tests only).

- [ ] **Step 1: Write the failing test**

`tests/scaffold.test.sh`:

```bash
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash tests/scaffold.test.sh`
Expected: FAIL lines ending `N failure(s)`, exit 1.

- [ ] **Step 3: Write the implementation**

`plugins/eldra-storefront/scripts/scaffold.sh`:

```bash
#!/usr/bin/env bash
# Scaffolds a new Eldra storefront from a template in the plugin's registry.
# Usage: scaffold.sh <template> <dir> [--title "Display name"] [--settings FILE]
# Exit: 0 ok, 1 usage, 2 target not empty, 3 unknown template, 4 pinned tag missing (plugin bug),
#       5 clone failed, 6 git or node missing.
set -euo pipefail

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

Next, from inside $dir:
  1. /eldra-storefront:connect         $( [ -n "$org" ] && echo "(already set to '$org'; run it to add the MCP server here)" || echo "(choose the organization and add its MCP server)")
  2. /eldra-storefront:content-model   (create the schemas and demo entries this site reads)

Then configure in Studio, General settings:
  - Storefront origins: add http://localhost:3000 (and your live domain) so browsers may use the cart.
  - Preview token: create one and set PREVIEW_TOKEN in .env to see drafts while developing.
NEXT
if [ -n "$environment" ] && [ "$environment" != "production" ]; then
  echo "  - This is the '$environment' environment: set NUXT_PUBLIC_CHECKOUT_URL in .env to its checkout origin."
fi
```

- [ ] **Step 4: Run test to verify it passes**

Run: `chmod +x plugins/eldra-storefront/scripts/scaffold.sh && bash tests/scaffold.test.sh`
Expected: every line `ok`, then `all passed`.

- [ ] **Step 5: Commit**

```bash
git add plugins/eldra-storefront/scripts/scaffold.sh tests/scaffold.test.sh
git commit -m "feat(eldra-storefront): scaffold a site from the pinned starter release"
```

---

### Task 6: Content-model planner

**Files:**
- Create: `plugins/eldra-storefront/scripts/content-model-plan.mjs`
- Create: `tests/fixtures/content-model.eldra.json`
- Test: `tests/content-model-plan.test.mjs`

**Interfaces:**
- Consumes: the `.eldra.json` archive shape (`format: "eldra.cms"`, `version: 1`, `schemas[] {ref, apiId, name, fields[], groups?}`, `entries[] {ref, schemaRef, data, localizations?}`, `media[]`; field values hold `{kind: "entry"|"media", ref}` local references) and a state file the command writes:

  ```json
  {
    "locales": [{ "locale": "en-US", "isDefault": true }],
    "schemas": [{ "id": "<uuid>", "apiId": "page", "fields": [] }],
    "entries": { "page": { "about": "<uuid or null>" } },
    "created": { "schemas": [], "fields": [], "entries": {}, "linked": [] }
  }
  ```

- Produces: `plan(manifest, state, { dryRun }) → { phase, steps, report }` and `referenceValue(ids, multiple)`; CLI `node ${CLAUDE_PLUGIN_ROOT}/scripts/content-model-plan.mjs <manifest> <state> [--dry-run]` prints that JSON (exit 1 usage, 2 bad input). `phase` is one of `schemas`, `schema-relations`, `entry-lookups`, `entries`, `entry-relations`, `done`. Each step is `{ tool, args, record }` where `tool` is an MCP tool name and `record` is one of `{schema: apiId}`, `{fields: ["apiId.fieldId"]}`, `{relinked: apiId}`, `{lookup: {schema, slug}}`, `{entry: ref}`, `{linked: ref}`. `report` is `{ rows[{schema, action, created, skipped}], table, conflicts[], fallbackLocales[], mediaFields[], missingLocales[], notes[] }`. A dry run only ever emits `list_entries` steps.

- [ ] **Step 1: Write the fixture**

`tests/fixtures/content-model.eldra.json`:

```json
{
  "format": "eldra.cms",
  "version": 1,
  "source": { "organizationId": "fixture" },
  "schemas": [
    {
      "ref": "schema:nav",
      "apiId": "navigation_item",
      "name": "Navigation item",
      "fields": [
        { "fieldId": "label", "name": "Label", "type": "string", "localized": true, "isTitle": true },
        { "fieldId": "slug", "name": "Slug", "type": "slug", "validators": { "unique": true, "required": true } },
        { "fieldId": "url", "name": "URL", "type": "string" }
      ]
    },
    {
      "ref": "schema:header",
      "apiId": "site_header",
      "name": "Site header",
      "fields": [
        { "fieldId": "title", "name": "Title", "type": "string", "isTitle": true },
        { "fieldId": "slug", "name": "Slug", "type": "slug", "validators": { "unique": true, "required": true } },
        { "fieldId": "items", "name": "Items", "type": "reference", "relation": { "allowedSchemaRefs": ["schema:nav"], "multiple": true } }
      ]
    },
    {
      "ref": "schema:page",
      "apiId": "page",
      "name": "Page",
      "fields": [
        { "fieldId": "title", "name": "Title", "type": "string", "localized": true, "isTitle": true },
        { "fieldId": "slug", "name": "Slug", "type": "slug", "validators": { "unique": true, "required": true } },
        { "fieldId": "hero_image", "name": "Hero image", "type": "media" }
      ]
    }
  ],
  "entries": [
    { "ref": "entry:nav-home", "schemaRef": "schema:nav", "data": { "slug": "nav-home", "url": "/" }, "localizations": { "en-US": { "label": "Home" }, "is-IS": { "label": "Heim" } } },
    { "ref": "entry:nav-shop", "schemaRef": "schema:nav", "data": { "slug": "nav-shop", "url": "/shop" }, "localizations": { "en-US": { "label": "Shop" }, "is-IS": { "label": "Verslun" } } },
    { "ref": "entry:header", "schemaRef": "schema:header", "data": { "slug": "main-header", "title": "Main header", "items": [{ "kind": "entry", "ref": "entry:nav-home" }, { "kind": "entry", "ref": "entry:nav-shop" }] } },
    { "ref": "entry:about", "schemaRef": "schema:page", "data": { "slug": "about", "hero_image": { "kind": "media", "ref": "media:hero" } }, "localizations": { "en-US": { "title": "About" } } },
    { "ref": "entry:untitled", "schemaRef": "schema:page", "data": {}, "localizations": { "en-US": { "title": "Untitled" } } }
  ],
  "media": [{ "ref": "media:hero", "kind": "URL", "url": "https://example.com/hero.jpg" }]
}
```

- [ ] **Step 2: Write the failing test**

`tests/content-model-plan.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { plan } from '../plugins/eldra-storefront/scripts/content-model-plan.mjs';

const manifest = JSON.parse(readFileSync(new URL('./fixtures/content-model.eldra.json', import.meta.url), 'utf8'));
const locales = [
  { locale: 'en-US', isDefault: true },
  { locale: 'is-IS', isDefault: false },
];
const ID = {
  navigation_item: '00000000-0000-4000-8000-000000000001',
  site_header: '00000000-0000-4000-8000-000000000002',
  page: '00000000-0000-4000-8000-000000000003',
  navHome: '00000000-0000-4000-8000-0000000000a1',
  navShop: '00000000-0000-4000-8000-0000000000a2',
  header: '00000000-0000-4000-8000-0000000000a3',
  about: '00000000-0000-4000-8000-0000000000a4',
};

// The org's copy of a manifest schema, in the Studio field shape.
function orgSchema(apiId, { linked = true } = {}) {
  const fields = manifest.schemas.find((s) => s.apiId === apiId).fields.map(({ relation, ...f }) =>
    relation
      ? { ...f, relation: { allowedSchemaIds: linked ? [ID.navigation_item] : [], allowProducts: false, multiple: true } }
      : { ...f, localized: Boolean(f.localized), isTitle: Boolean(f.isTitle) }
  );
  return { id: ID[apiId], apiId, fields };
}
const complete = (extra = {}) => ({
  locales,
  schemas: ['navigation_item', 'site_header', 'page'].map((a) => orgSchema(a)),
  entries: {},
  ...extra,
});
const empty = { locales, schemas: [], entries: {} };

test('a dry run on an empty organization writes nothing and predicts every create', () => {
  const result = plan(manifest, empty, { dryRun: true });
  assert.equal(result.phase, 'done');
  assert.deepEqual(result.steps, []);
  assert.deepEqual(result.report.rows, [
    { schema: 'navigation_item', action: 'would create', created: 2, skipped: 0 },
    { schema: 'site_header', action: 'would create', created: 1, skipped: 0 },
    { schema: 'page', action: 'would create', created: 1, skipped: 1 },
  ]);
  assert.ok(result.report.mediaFields.includes('page/about.hero_image'));
  assert.ok(result.report.fallbackLocales.includes('page/about.title: is-IS uses the en-US text'));
  assert.match(result.report.table, /\| Schema \| Action \| Entries to create \| Entries skipped \|/);
});

test('a dry run looks entries up in existing schemas and never plans a write', () => {
  const result = plan(manifest, complete(), { dryRun: true });
  assert.equal(result.phase, 'entry-lookups');
  assert.ok(result.steps.every((s) => s.tool === 'list_entries'));
});

test('missing schemas are created first, relations left open until their targets exist', () => {
  const result = plan(manifest, empty);
  assert.equal(result.phase, 'schemas');
  assert.deepEqual(result.steps.map((s) => [s.tool, s.args.apiId]), [
    ['create_schema', 'navigation_item'],
    ['create_schema', 'site_header'],
    ['create_schema', 'page'],
  ]);
  const items = result.steps[1].args.fields.find((f) => f.fieldId === 'items');
  assert.deepEqual(items.relation, { allowedSchemaIds: [], allowProducts: false, multiple: true });
});

test('relations are filled in on schemas this run created', () => {
  const state = complete({ created: { schemas: ['navigation_item', 'site_header', 'page'] } });
  state.schemas[1] = orgSchema('site_header', { linked: false });
  const result = plan(manifest, state);
  assert.equal(result.phase, 'schema-relations');
  assert.equal(result.steps.length, 1);
  const [step] = result.steps;
  assert.equal(step.tool, 'update_schema');
  assert.equal(step.args.schemaId, ID.site_header);
  assert.equal(step.args.fields.length, 3);
  assert.deepEqual(step.args.fields.find((f) => f.fieldId === 'items').relation.allowedSchemaIds, [ID.navigation_item]);
});

test('adds only missing fields to an existing schema, keeps extra fields and reports conflicts', () => {
  const title = { fieldId: 'title', name: 'Title', type: 'string', localized: false, isTitle: true };
  const legacy = { fieldId: 'legacy_banner', name: 'Legacy banner', type: 'string', localized: false, isTitle: false };
  const state = complete();
  state.schemas[2] = { id: ID.page, apiId: 'page', fields: [title, legacy] };
  const result = plan(manifest, state);
  assert.equal(result.phase, 'schemas');
  assert.equal(result.steps.length, 1);
  const [step] = result.steps;
  assert.equal(step.tool, 'update_schema');
  assert.deepEqual(step.args.fields.map((f) => f.fieldId), ['title', 'legacy_banner', 'slug', 'hero_image']);
  assert.deepEqual(step.args.fields[0], title);
  assert.deepEqual(step.args.fields[1], legacy);
  assert.deepEqual(step.record, { fields: ['page.slug', 'page.hero_image'] });
  assert.match(result.report.conflicts[0], /^page\.title: the organization has string, the manifest wants string \(localized\)/);
  assert.equal(result.report.rows[2].action, 'add fields: slug, hero_image; conflicts: title');
});

test('entries are looked up by slug before any is created', () => {
  const result = plan(manifest, complete());
  assert.equal(result.phase, 'entry-lookups');
  assert.deepEqual(result.steps.map((s) => s.args.filter[0]), ['slug:eq:nav-home', 'slug:eq:nav-shop', 'slug:eq:main-header', 'slug:eq:about']);
  assert.deepEqual(result.steps[0].args, { schemaId: ID.navigation_item, filter: ['slug:eq:nav-home'], pageSize: 1 });
  assert.ok(result.report.notes.some((n) => n.startsWith('page/entry:untitled: no slug')));
});

test('only absent entries are created, as drafts, with a value for every org locale', () => {
  const entries = {
    navigation_item: { 'nav-home': ID.navHome, 'nav-shop': null },
    site_header: { 'main-header': null },
    page: { about: null },
  };
  const result = plan(manifest, complete({ entries }));
  assert.equal(result.phase, 'entries');
  assert.deepEqual(result.steps.map((s) => s.record.entry), ['entry:nav-shop', 'entry:header', 'entry:about']);
  const about = result.steps[2].args;
  assert.deepEqual(about, { schemaId: ID.page, data: { title: { 'en-US': 'About', 'is-IS': 'About' }, slug: 'about' } });
  assert.deepEqual(result.steps[1].args.data, { title: 'Main header', slug: 'main-header' });
  assert.ok(result.steps.every((s) => !('status' in s.args.data)));
  assert.deepEqual(result.report.rows[0], { schema: 'navigation_item', action: 'unchanged', created: 1, skipped: 1 });
});

test('references are linked once their entries exist', () => {
  const entries = { navigation_item: { 'nav-home': ID.navHome } };
  const created = { entries: { 'entry:nav-shop': ID.navShop, 'entry:header': ID.header, 'entry:about': ID.about } };
  const result = plan(manifest, complete({ entries, created }));
  assert.equal(result.phase, 'entry-relations');
  assert.deepEqual(result.steps, [
    {
      tool: 'update_entry',
      args: {
        schemaId: ID.site_header,
        entryId: ID.header,
        data: { items: [{ value: ID.navHome, type: 'entry' }, { value: ID.navShop, type: 'entry' }] },
      },
      record: { linked: 'entry:header' },
    },
  ]);
});

test('finishes with a report once everything is done', () => {
  const entries = { navigation_item: { 'nav-home': ID.navHome } };
  const created = {
    entries: { 'entry:nav-shop': ID.navShop, 'entry:header': ID.header, 'entry:about': ID.about },
    linked: ['entry:header'],
  };
  const result = plan(manifest, complete({ entries, created }));
  assert.equal(result.phase, 'done');
  assert.match(result.report.table, /\| site_header \| unchanged \| 1 \| 0 \|/);
});

test('a manifest that is not an eldra.cms version 1 archive is refused', () => {
  assert.throws(() => plan({ ...manifest, version: 2 }, empty), /not an eldra\.cms version 1 archive/);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test tests/content-model-plan.test.mjs`
Expected: FAIL with `Cannot find module '.../content-model-plan.mjs'`.

- [ ] **Step 4: Write the implementation**

`plugins/eldra-storefront/scripts/content-model-plan.mjs`:

```js
#!/usr/bin/env node
// Plans the next step of /eldra-storefront:content-model. Pure: reads the project's content-model
// manifest (an eldra.cms v1 archive) and a state file describing the organization, and prints
// { phase, steps, report } as JSON. It never talks to the network; the command runs the steps.
// Usage: node content-model-plan.mjs <manifest.eldra.json> <state.json> [--dry-run]
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const isLocalRef = (v, kind) =>
  v !== null && typeof v === 'object' && !Array.isArray(v) && v.kind === kind && typeof v.ref === 'string';

function collectRefs(value, kind, out = []) {
  if (isLocalRef(value, kind)) out.push(value.ref);
  else if (Array.isArray(value)) value.forEach((v) => collectRefs(v, kind, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => collectRefs(v, kind, out));
  return out;
}

// The CMS write shape for entry references: one {value, type} object, or a list when multiple.
export function referenceValue(ids, multiple) {
  const refs = ids.map((id) => ({ value: id, type: 'entry' }));
  return multiple ? refs : refs[0];
}

function slugOf(entry) {
  if (typeof entry.data?.slug === 'string') return entry.data.slug;
  for (const values of Object.values(entry.localizations ?? {})) {
    if (typeof values?.slug === 'string') return values.slug;
  }
  return undefined;
}

const describe = (f) => `${f.type}${f.localized ? ' (localized)' : ''}`;
const union = (a = [], b = []) => [...new Set([...a, ...b])];
const subset = (want = [], have = []) => want.every((id) => have.includes(id));

// An archive field in the Studio field shape, with schema refs mapped to the org's schema ids.
function studioField(field, schemaIdByRef) {
  const out = {
    fieldId: field.fieldId,
    name: field.name,
    type: field.type,
    localized: Boolean(field.localized),
    isTitle: Boolean(field.isTitle),
  };
  for (const key of ['groupId', 'description', 'helpText', 'default', 'validators', 'metadata']) {
    if (field[key] !== undefined) out[key] = structuredClone(field[key]);
  }
  const notes = [];
  if (Array.isArray(field.metadata?.allowedSchemas)) {
    out.metadata.allowedSchemas = field.metadata.allowedSchemas.map((r) => schemaIdByRef.get(r)).filter(Boolean);
  }
  if (field.relation) {
    const ids = (field.relation.allowedSchemaRefs ?? []).map((r) => schemaIdByRef.get(r)).filter(Boolean);
    out.relation = { allowedSchemaIds: ids, allowProducts: false, multiple: Boolean(field.relation.multiple) };
    if (field.relation.allowedTagRefs?.length) notes.push(`${field.fieldId}: tag restrictions are not carried over; set them in Studio`);
  }
  if (field.presetRef) notes.push(`${field.fieldId}: the field preset is not carried over`);
  return { field: out, notes };
}

function linksComplete(orgField, wanted) {
  return (
    subset(wanted.relation?.allowedSchemaIds, orgField.relation?.allowedSchemaIds) &&
    subset(wanted.metadata?.allowedSchemas, orgField.metadata?.allowedSchemas)
  );
}

function withLinks(orgField, wanted) {
  const next = structuredClone(orgField);
  if (wanted.relation) {
    next.relation = { ...next.relation, allowedSchemaIds: union(next.relation?.allowedSchemaIds, wanted.relation.allowedSchemaIds) };
  }
  if (wanted.metadata?.allowedSchemas) {
    next.metadata = { ...next.metadata, allowedSchemas: union(next.metadata?.allowedSchemas, wanted.metadata.allowedSchemas) };
  }
  return next;
}

// The create_entry data for one manifest entry, plus the references to link afterwards.
function entryValues(entry, schema, conflicts, orgLocales, defaultLocale, label, report) {
  const data = {};
  const refs = {};
  for (const field of schema.fields) {
    const id = field.fieldId;
    if (conflicts.has(id)) continue;
    let value;
    if (field.localized) {
      const byLocale = entry.localizations ?? {};
      const sourceLocale = byLocale[defaultLocale]?.[id] !== undefined
        ? defaultLocale
        : Object.keys(byLocale).find((l) => byLocale[l]?.[id] !== undefined);
      if (!sourceLocale) continue;
      value = {};
      for (const locale of orgLocales) {
        const own = byLocale[locale]?.[id];
        value[locale] = own !== undefined ? own : byLocale[sourceLocale][id];
        if (own === undefined) report.fallbackLocales.push(`${label}.${id}: ${locale} uses the ${sourceLocale} text`);
      }
    } else {
      value = entry.data?.[id];
      if (value === undefined) continue;
    }
    if (collectRefs(value, 'media').length) {
      report.mediaFields.push(`${label}.${id}`);
      continue;
    }
    const entryRefs = collectRefs(value, 'entry');
    if (entryRefs.length) {
      if (field.localized) report.notes.push(`${label}.${id}: localized references are not written; set them in Studio`);
      else refs[id] = { refs: entryRefs, multiple: Boolean(field.relation?.multiple) };
      continue;
    }
    data[id] = value;
  }
  return { data, refs };
}

function table(rows, dryRun) {
  const head = ['Schema', 'Action', dryRun ? 'Entries to create' : 'Entries created', 'Entries skipped'];
  return [
    `| ${head.join(' | ')} |`,
    `| ${head.map(() => '---').join(' | ')} |`,
    ...rows.map((r) => `| ${r.schema} | ${r.action} | ${r.created} | ${r.skipped} |`),
  ].join('\n');
}

export function plan(manifest, state, { dryRun = false } = {}) {
  if (manifest?.format !== 'eldra.cms' || manifest?.version !== 1) {
    throw new Error('the manifest is not an eldra.cms version 1 archive');
  }
  const created = { schemas: [], fields: [], entries: {}, linked: [], ...state.created };
  const orgLocales = (state.locales ?? []).map((l) => l.locale);
  if (orgLocales.length === 0) throw new Error('the organization has no locales; add one in Studio first');
  const defaultLocale = state.locales.find((l) => l.isDefault)?.locale ?? orgLocales[0];
  const orgByApiId = new Map((state.schemas ?? []).map((s) => [s.apiId, s]));
  const manifestSchemaByRef = new Map(manifest.schemas.map((s) => [s.ref, s]));
  const schemaIdByRef = new Map();
  for (const s of manifest.schemas) if (orgByApiId.has(s.apiId)) schemaIdByRef.set(s.ref, orgByApiId.get(s.apiId).id);

  const report = { rows: [], table: '', conflicts: [], fallbackLocales: [], mediaFields: [], missingLocales: [], notes: [] };
  const schemaSteps = [];
  const relinkSteps = [];
  const conflictsBySchema = new Map();

  for (const schema of manifest.schemas) {
    const org = orgByApiId.get(schema.apiId);
    const converted = schema.fields.map((f) => studioField(f, schemaIdByRef));
    converted.forEach((c) => c.notes.forEach((n) => report.notes.push(`${schema.apiId}.${n}`)));
    const row = { schema: schema.apiId, action: '', created: 0, skipped: 0 };
    report.rows.push(row);
    if (!org) {
      conflictsBySchema.set(schema.apiId, new Set());
      row.action = dryRun ? 'would create' : 'create';
      schemaSteps.push({
        tool: 'create_schema',
        args: { name: schema.name, apiId: schema.apiId, fields: converted.map((c) => c.field), ...(schema.groups?.length ? { groups: schema.groups } : {}) },
        record: { schema: schema.apiId },
      });
      continue;
    }
    const orgFields = new Map((org.fields ?? []).map((f) => [f.fieldId, f]));
    const conflicts = new Set();
    for (const { field } of converted) {
      const existing = orgFields.get(field.fieldId);
      if (existing && (existing.type !== field.type || Boolean(existing.localized) !== field.localized)) {
        conflicts.add(field.fieldId);
        report.conflicts.push(`${schema.apiId}.${field.fieldId}: the organization has ${describe(existing)}, the manifest wants ${describe(field)}; left unchanged and not written`);
      }
    }
    conflictsBySchema.set(schema.apiId, conflicts);
    const missing = converted.map((c) => c.field).filter((f) => !orgFields.has(f.fieldId));
    const added = missing.map(({ groupId, ...rest }) => rest);
    if (added.length) {
      schemaSteps.push({
        tool: 'update_schema',
        args: { schemaId: org.id, fields: [...org.fields, ...added] },
        record: { fields: added.map((f) => `${schema.apiId}.${f.fieldId}`) },
      });
    }
    const ours = (fieldId) => created.schemas.includes(schema.apiId) || created.fields.includes(`${schema.apiId}.${fieldId}`);
    const unlinked = converted
      .map((c) => c.field)
      .filter((f) => orgFields.has(f.fieldId) && ours(f.fieldId) && !linksComplete(orgFields.get(f.fieldId), f));
    if (unlinked.length) {
      relinkSteps.push({
        tool: 'update_schema',
        args: { schemaId: org.id, fields: org.fields.map((f) => { const w = unlinked.find((u) => u.fieldId === f.fieldId); return w ? withLinks(f, w) : f; }) },
        record: { relinked: schema.apiId },
      });
    }
    const addedEarlier = created.fields.filter((f) => f.startsWith(`${schema.apiId}.`)).map((f) => f.slice(schema.apiId.length + 1));
    if (created.schemas.includes(schema.apiId)) row.action = 'created';
    else if (added.length) row.action = `${dryRun ? 'would add' : 'add'} fields: ${added.map((f) => f.fieldId).join(', ')}`;
    else if (addedEarlier.length) row.action = `added fields: ${addedEarlier.join(', ')}`;
    else row.action = 'unchanged';
    if (conflicts.size) row.action += `; conflicts: ${[...conflicts].join(', ')}`;
  }

  const rowOf = (apiId) => report.rows.find((r) => r.schema === apiId);
  const manifestEntryByRef = new Map(manifest.entries.map((e) => [e.ref, e]));
  const resolveEntryId = (ref) => {
    if (created.entries[ref]) return created.entries[ref];
    const target = manifestEntryByRef.get(ref);
    const targetSchema = target && manifestSchemaByRef.get(target.schemaRef);
    return targetSchema ? state.entries?.[targetSchema.apiId]?.[slugOf(target)] ?? undefined : undefined;
  };
  const lookupSteps = [];
  const entrySteps = [];
  const linkSteps = [];
  const manifestLocales = new Set();

  for (const entry of manifest.entries) {
    Object.keys(entry.localizations ?? {}).forEach((l) => manifestLocales.add(l));
    const schema = manifestSchemaByRef.get(entry.schemaRef);
    if (!schema) {
      report.notes.push(`${entry.ref}: its schema ${entry.schemaRef} is not in the manifest; skipped`);
      continue;
    }
    const apiId = schema.apiId;
    const row = rowOf(apiId);
    const slug = slugOf(entry);
    const label = `${apiId}/${slug ?? entry.ref}`;
    if (!slug) {
      report.notes.push(`${label}: no slug, so an existing copy cannot be found; skipped`);
      row.skipped += 1;
      continue;
    }
    const org = orgByApiId.get(apiId);
    const values = () => entryValues(entry, schema, conflictsBySchema.get(apiId), orgLocales, defaultLocale, label, report);
    if (created.entries[entry.ref]) {
      row.created += 1;
      const { refs } = values();
      if (!org || created.linked.includes(entry.ref)) continue;
      const data = {};
      for (const [fieldId, { refs: targets, multiple }] of Object.entries(refs)) {
        const ids = targets.map(resolveEntryId).filter(Boolean);
        targets.filter((t) => !resolveEntryId(t)).forEach((t) => report.notes.push(`${label}.${fieldId}: ${t} does not exist in the organization; not linked`));
        if (ids.length) data[fieldId] = referenceValue(ids, multiple);
      }
      if (Object.keys(data).length) {
        linkSteps.push({ tool: 'update_entry', args: { schemaId: org.id, entryId: created.entries[entry.ref], data }, record: { linked: entry.ref } });
      }
      continue;
    }
    if (!org) {
      if (dryRun) {
        row.created += 1;
        values();
      }
      continue;
    }
    const known = state.entries?.[apiId] ?? {};
    if (!(slug in known)) {
      lookupSteps.push({ tool: 'list_entries', args: { schemaId: org.id, filter: [`slug:eq:${slug}`], pageSize: 1 }, record: { lookup: { schema: apiId, slug } } });
      continue;
    }
    if (known[slug]) {
      row.skipped += 1;
      continue;
    }
    row.created += 1;
    const { data } = values();
    if (!dryRun) entrySteps.push({ tool: 'create_entry', args: { schemaId: org.id, data }, record: { entry: entry.ref } });
  }

  report.missingLocales = [...manifestLocales].filter((l) => !orgLocales.includes(l));
  report.table = table(report.rows, dryRun);

  const order = dryRun
    ? [['entry-lookups', lookupSteps]]
    : [
        ['schemas', schemaSteps],
        ['schema-relations', relinkSteps],
        ['entry-lookups', lookupSteps],
        ['entries', entrySteps],
        ['entry-relations', linkSteps],
      ];
  const [phase, steps] = order.find(([, s]) => s.length) ?? ['done', []];
  return { phase, steps, report };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [manifestPath, statePath, ...flags] = process.argv.slice(2);
  if (!manifestPath || !statePath) {
    console.error('usage: content-model-plan.mjs <manifest.eldra.json> <state.json> [--dry-run]');
    process.exit(1);
  }
  try {
    const result = plan(JSON.parse(readFileSync(manifestPath, 'utf8')), JSON.parse(readFileSync(statePath, 'utf8')), {
      dryRun: flags.includes('--dry-run'),
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    console.error(`content-model-plan: ${error.message}`);
    process.exit(2);
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test tests/content-model-plan.test.mjs && node scripts/validate-plugins.mjs .`
Expected: PASS, 10 tests; validator clean.

- [ ] **Step 6: Commit**

```bash
git add plugins/eldra-storefront/scripts/content-model-plan.mjs tests/content-model-plan.test.mjs tests/fixtures/content-model.eldra.json
git commit -m "feat(eldra-storefront): plan content-model changes as add-only MCP steps"
```

---
### Task 7: `new-site` and `connect` commands

**Files:**
- Create: `plugins/eldra-storefront/commands/new-site.md`
- Create: `plugins/eldra-storefront/commands/connect.md`

**Interfaces:**
- Consumes: `scaffold.sh` exit codes (Task 5); `mcp-url.sh` flags and exit codes (Task 4); MCP tool `list_locales` (no input; returns `{locales: [{locale, isDefault}]}`).
- Produces: `/eldra-storefront:new-site <name> [--title "…"]`, `/eldra-storefront:connect [--verify]`; the settings file every other command reads.

- [ ] **Step 1: Write `new-site.md`**

`plugins/eldra-storefront/commands/new-site.md`:

````markdown
---
description: Scaffold a new Eldra storefront from the pinned starter release
argument-hint: "<site-name> [--title \"Display name\"]"
---

# Create a new Eldra storefront

Arguments: `$ARGUMENTS`

Scaffold a new storefront from the plugin's template registry. Do not install dependencies, start a
server, create a remote repository or push anything.

## 1. Site name

The first argument is the site name and becomes the directory name. If there is none, ask the user
for one and stop until they answer. The name must be kebab-case (lowercase letters, digits, single
hyphens). If it is not, propose the kebab-case form (`Sits Web` becomes `sits-web`) and ask the
user to confirm it. A `--title "…"` argument sets the display name; without it the script title-cases
the name.

## 2. Template

Read `${CLAUDE_PLUGIN_ROOT}/templates.json`. It has one template, `starter`. Tell the user which
repository and release will be used, for example: "Using eldra-is/storefront-starter at v0.1.0."

## 3. Settings from an earlier connect

If `.claude/eldra-storefront.local.md` exists in the current directory, `connect` has already run
here. Read its `org` and `gateway` and tell the user they go into the new site's `.env`; pass the
file to the script with `--settings`.

## 4. Run the scaffold

```bash
bash "${CLAUDE_PLUGIN_ROOT}/scripts/scaffold.sh" starter "<name>" [--title "<title>"] [--settings .claude/eldra-storefront.local.md]
```

Handle the exit status:

| Exit | Meaning | What to tell the user |
| --- | --- | --- |
| 0 | Created | Relay the script's closing text. |
| 1 | Bad name or arguments | Show the message; ask for a valid name. |
| 2 | The directory exists and is not empty | Nothing was changed. Ask for another name; never delete or overwrite the directory. |
| 3 | Unknown template | A plugin bug: the registry has no `starter`. Ask the user to report it at https://github.com/eldra-is/eldra-plugins/issues. |
| 4 | The pinned release tag is missing | A plugin bug, not the user's fault. Show the message and the issues link; do not try another tag or branch. |
| 5 | Network or clone failure | Ask the user to check the network and retry. |
| 6 | git or Node.js missing | Say which one to install (Node.js 22 or later). |

Show any `warning:` lines the script printed.

## 5. Finish

End with the two next commands, run from inside the new directory:

1. `/eldra-storefront:connect` (skip if settings were copied and the user does not want to change them; it still adds the MCP server to the new project)
2. `/eldra-storefront:content-model`

Then list what remains in Studio, General settings: register the storefront origin
(`http://localhost:3000` while developing, then the live domain) and create a preview token for
`PREVIEW_TOKEN` in `.env`. Say plainly that dependencies are not installed (`pnpm install`) and nothing
is running.
````

- [ ] **Step 2: Write `connect.md`**

`plugins/eldra-storefront/commands/connect.md`:

````markdown
---
description: Connect this project to an Eldra Studio organization and its MCP
argument-hint: "[--verify]"
---

# Connect this project to Eldra Studio

Arguments: `$ARGUMENTS`

Connect the current project to one Eldra Studio organization: write the plugin settings, add the
organization's MCP server to the project, and verify it by listing the organization's locales.
If the arguments contain `--verify`, read the settings (step 1) and go straight to step 6.

## 1. Read what is there

Read `.claude/eldra-storefront.local.md` if it exists. Its frontmatter holds `org`, `environment`,
`gateway`, `mcp` and `template`. Use them as defaults below and remember `org` as the previous
organization. With `--verify` and no settings file, say that `/eldra-storefront:connect` without
`--verify` creates it, and stop.

## 2. Organization alias

Ask the user for the organization alias: the short name in Studio under General settings (the
first path segment of the organization's connector URL). Offer the current `org` as the default.

Check it:

```bash
bash "${CLAUDE_PLUGIN_ROOT}/scripts/mcp-url.sh" --org "<alias>"
```

Exit 0 means well-formed. Exit 2 means the value has uppercase letters, spaces or other characters
an alias never has; the message ends with "Did you mean '…'?". Ask the user to confirm that
suggestion or type the alias again. Never write an alias that fails this check.

## 3. Environment

Use AskUserQuestion:

- header: "Environment"
- question: "Which Eldra environment is this organization in?"
- options:
  - "Production (Recommended)": gateway `https://web.eldra.app/api`, MCP `https://mcp.eldra.app`
  - "Custom environment": you give the gateway and MCP URLs

For a custom environment ask for three values: a short lowercase environment name, the gateway URL
and the MCP origin. Never suggest or fill in a non-production URL yourself. Normalize:

- Gateway: drop a trailing `/`; append `/api` if it does not end in `/api`.
- MCP origin: drop a trailing `/`; if it ends in `/<alias>/mcp` the user pasted a connector URL, so
  keep only the part before it. Check with
  `bash "${CLAUDE_PLUGIN_ROOT}/scripts/mcp-url.sh" --org "<alias>" --mcp "<origin>"`; exit 3 means it
  is still not a bare origin, so ask again.

## 4. Write the settings

Write `.claude/eldra-storefront.local.md` (create `.claude/` if needed), replacing the whole file so
it never holds two copies of a key. Keep an existing `template` value; leave the line out if there
was none.

```markdown
---
org: <alias>
environment: <production or the custom name>
gateway: <gateway URL>
mcp: <MCP origin>
template: <existing template value>
---

# Eldra storefront settings

Written by /eldra-storefront:connect. Run it again to change these values. Do not commit this file.
```

Make sure `.gitignore` in the project root has the line `.claude/*.local.*`; add it if missing
(create `.gitignore` if there is none).

## 5. Add the MCP server

```bash
name="$(bash "${CLAUDE_PLUGIN_ROOT}/scripts/mcp-url.sh" --name)"
url="$(bash "${CLAUDE_PLUGIN_ROOT}/scripts/mcp-url.sh")"
```

Each Bash call runs in a fresh shell, so write the printed name and URL literally into the commands
below. Running this command again must leave one entry per organization:

1. Run `claude mcp get "$name"`. If it succeeds and shows project scope, run
   `claude mcp remove --scope project "$name"`. If it shows another scope (local or user), leave it,
   and tell the user that entry takes precedence over the project one until they remove it.
2. Run `claude mcp add --transport http --scope project "$name" "$url"`.
3. If the previous organization differs from the new alias and `eldra-<previous>` exists, use
   AskUserQuestion (header "Old server"): "Keep eldra-<previous> in this project?" with options
   "Keep it" (two organizations, two servers) and "Remove it" (run
   `claude mcp remove --scope project eldra-<previous>`).

The server lives in the project's `.mcp.json`, which may be committed; it holds no secret.

## 6. Verify

The server's tools are named `mcp__<name>__<tool>`, for example `mcp__eldra-sits__list_locales`.

If that tool is not available in this session, the server is new and needs a login. Tell the user:

1. Run `/mcp`, choose `<name>` and authenticate. The browser opens the Eldra login: sign in with
   your Studio account and a one-time code, then approve access.
2. If `<name>` is not listed, restart Claude Code in this directory and approve the project's MCP
   server when asked.
3. Then run `/eldra-storefront:connect --verify`.

Stop there. Otherwise call `list_locales` (no arguments) on that server.

On success report: "Connected to <org> (<environment>). Locales: en-US (default), is-IS." Then
suggest the next command: `/eldra-storefront:content-model` when `cms/content-model.eldra.json`
exists, otherwise `/eldra-storefront:new-site <name>`.

On failure, find the error id in the message (or in the failed server's status in `/mcp`) and explain:

| Error id | Plain-language cause |
| --- | --- |
| `ORGANIZATION_NOT_FOUND` | The logged-in person is not a member of this organization, or the alias is misspelled. An organization administrator can invite them. |
| `FEATURE_DISABLED` | The MCP is not enabled for this organization. A platform administrator at Eldra enables it. |
| `PRIVILEGED_SESSION_REQUIRED` | The login carries platform roles, which the login configuration should prevent. Log in with an ordinary member account and report it to Eldra. |
| `UNAUTHENTICATED` | No valid login. Run `/mcp` and authenticate again. |
| `ACCESS_DENIED` | The person's role in the organization does not allow the action. |
| none, a connection error, or HTTP 404 | The environment URL is probably wrong. Check `mcp` in the settings file and run this command again. |

When the cause is unclear, name the three usual ones in this order: not a member of the
organization, the MCP not enabled for it, the environment URL wrong.
````

- [ ] **Step 3: Validate**

Run: `node scripts/validate-plugins.mjs . && bash scripts/test.sh`
Expected: `marketplace and plugins are valid`; all tests pass.

- [ ] **Step 4: Smoke-check that the commands load**

Run: `claude --plugin-dir plugins/eldra-storefront`, then type `/eldra-storefront:` and look at the completion list.
Expected: `new-site` and `connect` appear with their descriptions and argument hints. Quit without running them.

- [ ] **Step 5: Commit**

```bash
git add plugins/eldra-storefront/commands/new-site.md plugins/eldra-storefront/commands/connect.md
git commit -m "feat(eldra-storefront): add new-site and connect commands"
```

---

### Task 8: `content-model` command

**Files:**
- Create: `plugins/eldra-storefront/commands/content-model.md`

**Interfaces:**
- Consumes: `content-model-plan.mjs` CLI, phases, step and record shapes (Task 6); `mcp-url.sh --name` (Task 4); MCP tools `list_locales`, `list_schemas {page, pageSize}`, `get_schema {schemaId}`, `list_field_types`, `create_schema {name, apiId, fields, groups?}`, `update_schema {schemaId, fields}` (fields replace the whole list), `list_entries {schemaId, filter, pageSize}`, `create_entry {schemaId, data}`, `update_entry {schemaId, entryId, data}`.
- Produces: `/eldra-storefront:content-model [--dry-run]`; state file `.claude/eldra-content-model.local.json`.

- [ ] **Step 1: Write `content-model.md`**

`plugins/eldra-storefront/commands/content-model.md`:

````markdown
---
description: Create the site's content model in Studio through the Eldra MCP, add-only, as drafts
argument-hint: "[--dry-run]"
---

# Create the content model

Arguments: `$ARGUMENTS`

Create in the connected organization whatever the site's content model needs and the organization
lacks: missing schemas, missing fields on existing schemas, and missing demo entries as drafts.
Never delete anything, never change an existing field, never overwrite an existing entry, and never
publish: everything written is a draft that a person reviews and publishes in Studio. With
`--dry-run`, only read and print what would happen.

Do not use Studio's archive import for this. Importing into an organization that already has
content replaces matched schemas (fields not in the archive are removed), duplicates entries it did
not create, and drops media links on matched entries.

## 1. Preconditions

1. `.claude/eldra-storefront.local.md` must exist; if not, say `/eldra-storefront:connect` creates it
   and stop.
2. `server="$(bash "${CLAUDE_PLUGIN_ROOT}/scripts/mcp-url.sh" --name)"`. The tools are
   `mcp__<server>__<tool>`. If they are not available in this session, tell the user to run `/mcp`,
   authenticate `<server>`, and run this command again; stop.
3. `cms/content-model.eldra.json` must exist in the project; the starter ships it. If it is missing,
   say so and stop. Its `format` must be `eldra.cms` and `version` `1`.

## 2. Build the state file

Use `.claude/eldra-content-model.local.json` for a real run and
`.claude/eldra-content-model.dry-run.local.json` for a dry run. If the real-run file exists, an
earlier run stopped part way: keep its `created` object and rebuild the rest. Write the file as:

```json
{
  "locales": [],
  "schemas": [],
  "entries": {},
  "created": { "schemas": [], "fields": [], "entries": {}, "linked": [] }
}
```

- `locales`: from `list_locales`, as `{ "locale": "en-US", "isDefault": true }` items.
- `schemas`: call `list_schemas` with `pageSize: 200` and `page` 1, 2, … until a page has fewer than
  200 items. Keep `id`, `apiId` and `fields` of each; if an item has no `fields`, call `get_schema`
  for it.
- Call `list_field_types`. If a field `type` used in the manifest is not offered, stop before any
  write and list those fields.

## 3. Plan and run, one phase at a time

Run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/content-model-plan.mjs" cms/content-model.eldra.json <state file> [--dry-run]
```

It prints `{ "phase", "steps", "report" }`. Exit 2 means the manifest or state is unusable; show the
message and stop.

- `phase` is `done`: go to step 4.
- Otherwise call each step's `tool` on the server with exactly its `args`, in order, and record the
  result in the state file right after each call:

| `record` | Update the state |
| --- | --- |
| `{ "schema": apiId }` | add `apiId` to `created.schemas` |
| `{ "fields": ["apiId.fieldId", …] }` | add each to `created.fields` |
| `{ "relinked": apiId }` | nothing |
| `{ "lookup": { "schema", "slug" } }` | set `entries[schema][slug]` to the first returned entry's `id`, or `null` when none |
| `{ "entry": ref }` | set `created.entries[ref]` to the new entry's `id` |
| `{ "linked": ref }` | add `ref` to `created.linked` |

After a phase whose steps were `create_schema` or `update_schema`, rebuild `schemas` as in step 2.
Then run the planner again. Never edit the step arguments; if one looks wrong, stop and report it.

In a dry run the planner only returns `list_entries` steps. Never call a write tool in a dry run.

If a call fails, stop the loop. Report the error id with the table below, print the report so far,
and say that running the command again continues safely from where it stopped.

## 4. Report

Print `report.table`, then these lists when not empty:

- `conflicts`: fields that exist with another type or localization; left unchanged and not written.
- `mediaFields`: media the manifest references. Media is not created; an editor fills these in Studio.
- `fallbackLocales`: locales that got the default locale's text; an editor translates them.
- `missingLocales`: manifest locales the organization does not have; add them in Studio and run again.
- `notes`.

End with: "Nothing was published. Review and publish the drafts in Studio." In a real run that
reached `done`, delete the state file; in a dry run, delete the dry-run file and say "Dry run:
nothing was written."

## Errors

| Error id | Meaning |
| --- | --- |
| `ORGANIZATION_NOT_FOUND` | Not a member of the organization, or a wrong alias in the settings. |
| `FEATURE_DISABLED` | The MCP is not enabled for the organization; a platform administrator enables it. |
| `PRIVILEGED_SESSION_REQUIRED` | The login carries platform roles, which the login configuration should prevent; log in with an ordinary member account and report it to Eldra. |
| `UNAUTHENTICATED` | The login expired; run `/mcp`, authenticate, run again. |
| `ACCESS_DENIED` | The person's organization role does not allow this write; an organization administrator can change the role. Do not retry. |
| `RATE_LIMITED` | Too many writes in a minute; wait a minute and run again. |
| `UPSTREAM_ERROR` | An Eldra service did not answer; try again later. |
| anything else | Show the id and message as returned. |
````

- [ ] **Step 2: Validate**

Run: `node scripts/validate-plugins.mjs . && bash scripts/test.sh`
Expected: `marketplace and plugins are valid`; all tests pass.

- [ ] **Step 3: Dry-run the planner the way the command does**

Run:

```bash
printf '%s\n' '{"locales":[{"locale":"en-US","isDefault":true},{"locale":"is-IS","isDefault":false}],"schemas":[],"entries":{}}' > /tmp/eldra-state.json
node plugins/eldra-storefront/scripts/content-model-plan.mjs tests/fixtures/content-model.eldra.json /tmp/eldra-state.json --dry-run
```

Expected: JSON with `"phase": "done"`, `"steps": []`, and a `table` whose rows read `would create`.

- [ ] **Step 4: Commit**

```bash
git add plugins/eldra-storefront/commands/content-model.md
git commit -m "feat(eldra-storefront): add the content-model command"
```

---

### Task 9: `eldra-sdk` and `eldra-storefront-conventions` skills

**Files:**
- Create: `plugins/eldra-storefront/skills/eldra-sdk/SKILL.md`
- Create: `plugins/eldra-storefront/skills/eldra-storefront-conventions/SKILL.md`

**Interfaces:**
- Consumes: `@eldrajs/sdk` 0.2.5 exports (`createEldraClient`, `initEldraClient`, `getEldraClient`, `EldraHttpError`, `DEFAULT_ELDRA_API_BASE_URL`, `DEFAULT_ELDRA_CHECKOUT_URL`, `createCartSession`, `createOrderAccessTokens`, `analyticsTrackerScript`, `eldra` from `@eldrajs/sdk/vite`); the starter spec's conventions.
- Produces: skills named `eldra-sdk` and `eldra-storefront-conventions`.

- [ ] **Step 1: Write `eldra-sdk/SKILL.md`**

`plugins/eldra-storefront/skills/eldra-sdk/SKILL.md`:

````markdown
---
name: eldra-sdk
description: This skill should be used when the user writes or reviews code that imports "@eldrajs/sdk", calls "createEldraClient", "eldra.cms", "eldra.catalog", "eldra.cart" or "checkout.handoffUrl", configures the "eldra" Vite plugin or the ".eldra/web-studio" generated types, or asks how to read CMS entries by slug, add to cart, hand off to checkout, recover an order or handle "EldraHttpError" on an Eldra storefront.
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
  response is `unknown` and nothing warns you.
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
````

- [ ] **Step 2: Write `eldra-storefront-conventions/SKILL.md`**

`plugins/eldra-storefront/skills/eldra-storefront-conventions/SKILL.md`:

````markdown
---
name: eldra-storefront-conventions
description: This skill should be used when the user adds or changes a page, component, composable, route, cart behaviour, price display, image, SEO tag or locale handling in a Nuxt storefront built from the Eldra storefront starter, or asks "where should this live", "should this be in Studio or in code", "how do home sections work" or "how do content blocks work" in an Eldra site.
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
````

- [ ] **Step 3: Validate and check the SDK names against the source**

Run:

```bash
node scripts/validate-plugins.mjs .
for name in createEldraClient initEldraClient getEldraClient EldraHttpError DEFAULT_ELDRA_API_BASE_URL DEFAULT_ELDRA_CHECKOUT_URL createCartSession createOrderAccessTokens analyticsTrackerScript getEntryByUniqueField resolveEntryList handoffUrl createWebStudioClient ELDRA_CONTRACT_VERSION; do
  grep -rq "$name" ../headless-kit/packages/sdk/src || echo "MISSING $name"
done
```

Expected: `marketplace and plugins are valid` and no `MISSING` lines (adjust the `../headless-kit` path to your checkout of `eldra-is/headless-kit`).

- [ ] **Step 4: Review trigger precision**

Run the plugin-dev `skill-reviewer` agent on both skills. Expected: no finding that the description is vague or first-person; fix any concrete finding inline.

- [ ] **Step 5: Commit**

```bash
git add plugins/eldra-storefront/skills/eldra-sdk plugins/eldra-storefront/skills/eldra-storefront-conventions
git commit -m "feat(eldra-storefront): add eldra-sdk and storefront conventions skills"
```

---

### Task 10: `eldra-studio-connection` and `eldra-content-model` skills

**Files:**
- Create: `plugins/eldra-storefront/skills/eldra-studio-connection/SKILL.md`
- Create: `plugins/eldra-storefront/skills/eldra-content-model/SKILL.md`
- Create: `plugins/eldra-storefront/skills/eldra-content-model/references/archive-format.md`

**Interfaces:**
- Consumes: the starter's environment variables; the MCP instructions and tool names; the archive shape (Task 6).
- Produces: skills named `eldra-studio-connection` and `eldra-content-model`.

- [ ] **Step 1: Write `eldra-studio-connection/SKILL.md`**

`plugins/eldra-storefront/skills/eldra-studio-connection/SKILL.md`:

````markdown
---
name: eldra-studio-connection
description: This skill should be used when the user configures ".env", runtime config or environment variables for an Eldra storefront ("ELDRA_ORG_ID", "BASE_API_URL", "PREVIEW_TOKEN", "NUXT_PUBLIC_CHECKOUT_URL"), sees "ORIGIN_NOT_REGISTERED", asks why drafts do not show, how preview tokens or storefront origins work, or how the Eldra MCP login and permissions work.
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
````

- [ ] **Step 2: Write `eldra-content-model/SKILL.md`**

`plugins/eldra-storefront/skills/eldra-content-model/SKILL.md`:

````markdown
---
name: eldra-content-model
description: This skill should be used when the user designs or changes Eldra CMS schemas or fields, edits "cms/content-model.eldra.json", asks how to model a page, section, menu or singleton in Studio, or asks Claude to create schemas or entries through the Eldra MCP tools ("create_schema", "update_schema", "create_entry").
---

# Eldra content model

Schemas are the contract between Studio and the site: the Vite plugin turns them into TypeScript
types, so every design choice here shows up in code. The project's model lives in
`cms/content-model.eldra.json` (format in references/archive-format.md), and
`/eldra-storefront:content-model` creates what the organization lacks.

## Designing schemas

- `apiId` and `fieldId` are lower snake_case and stable (`navigation_item`, `hero_image`). Renaming
  one breaks the generated types and every read; add a new field instead.
- One title field per schema (`isTitle: true`); it is what Studio lists.
- Every schema the site reads by URL or as a singleton has a `slug` field of type `slug` with
  `validators.unique: true`. Singletons (header, footer) are one entry found by a fixed slug, not a
  schema with one row assumed.
- Text a visitor reads is `localized: true`; ids, slugs, URLs, numbers and flags are not.
- Reference fields name their allowed schemas (`relation.allowedSchemaIds`) and say whether they
  hold many (`relation.multiple`). An open reference produces a union type nobody can render.
- Select options carry a label per locale.
- Keep presentation out: no colour, spacing or layout fields unless an editor truly chooses them.
- Check `list_field_types` for the types and their configuration before inventing a field shape.

## Changing a model that has content

- Adding a field is safe. Changing a field's type or localization, or removing it, breaks existing
  entries and the generated types; do it in Studio deliberately, never through a script.
- Add the field to `cms/content-model.eldra.json` in the same change as the code that reads it.

## Writing through the MCP

The MCP acts as the logged-in member and writes drafts only. Rules:

1. Call `list_locales` first; write localized fields as an object keyed by locale
   (`{ "en-US": "About", "is-IS": "Um okkur" }`) for every organization locale.
2. Before `create_schema`, call `list_schemas` and `list_field_types`; reuse an existing schema or
   field id rather than creating a near-duplicate.
3. `update_schema` replaces the whole field list: fetch the schema, resend every existing field
   unchanged, and append the new ones. Never drop or alter a field you did not add.
4. Before `create_entry`, search with `list_entries` (`filter: ["slug:eq:<slug>"]`) and check
   `check_unique_field`; prefer `update_entry` on an existing draft over a duplicate.
5. Reference values are `{ "value": "<entry id>", "type": "entry" }`, in a list when the field is
   multiple.
6. Media: `upload_asset_from_url` (public https URL) or `upload_asset` (small base64), alt text in
   every locale, then the asset id in the media field.
7. Never claim content is live. Report the ids of everything created or changed.
8. On `ACCESS_DENIED`, explain that the member's role does not allow it and stop; do not retry.

Use `/eldra-storefront:content-model` for the project's manifest rather than issuing these calls by
hand; it follows these rules and reports conflicts instead of changing fields.

## Never use the archive importer on a live organization

Studio's content import of an `.eldra.json` archive is safe only into an organization with no CMS
content. Into one with content it replaces matched schemas (fields missing from the archive are
removed), duplicates entries it did not create, and drops media links on matched entries.
````

- [ ] **Step 3: Write `eldra-content-model/references/archive-format.md`**

`plugins/eldra-storefront/skills/eldra-content-model/references/archive-format.md`:

````markdown
# The `.eldra.json` archive as a content-model manifest

`cms/content-model.eldra.json` uses Studio's CMS export format. Top level:

```json
{
  "format": "eldra.cms",
  "version": 1,
  "source": { "organizationId": "starter" },
  "schemas": [],
  "entries": [],
  "media": []
}
```

References inside the archive are local `ref` strings (`"schema:page"`, `"entry:about"`), never ids;
the command maps them to the organization's ids.

## schemas[]

```json
{
  "ref": "schema:page",
  "apiId": "page",
  "name": "Page",
  "fields": [
    { "fieldId": "title", "name": "Title", "type": "string", "localized": true, "isTitle": true },
    { "fieldId": "slug", "name": "Slug", "type": "slug", "validators": { "unique": true, "required": true } },
    { "fieldId": "blocks", "name": "Blocks", "type": "reference",
      "relation": { "allowedSchemaRefs": ["schema:block_text"], "multiple": true } }
  ],
  "groups": [{ "groupId": "content", "name": "Content", "defaultOpen": true }]
}
```

Field keys: `fieldId`, `name`, `type`, `localized`, `isTitle`, `groupId`, `description`,
`helpText`, `default`, `validators` (`required`, `unique`, `min`, `max`, `match`, `prohibit`),
`metadata`, `relation` (`allowedSchemaRefs`, `allowedTagRefs`, `multiple`). In Studio the relation
becomes `allowedSchemaIds`; tag restrictions and presets are not carried over by the command.

## entries[]

```json
{
  "ref": "entry:about",
  "schemaRef": "schema:page",
  "data": { "slug": "about", "blocks": [{ "kind": "entry", "ref": "entry:about-intro" }] },
  "localizations": {
    "en-US": { "title": "About" },
    "is-IS": { "title": "Um okkur" }
  }
}
```

- `data` holds non-localized fields; `localizations[locale]` holds localized ones.
- `{ "kind": "entry", "ref": … }` is a reference to another entry in the archive.
- `{ "kind": "media", "ref": … }` points into `media[]`; the command does not create media and lists
  these fields for an editor.
- Every entry needs a `slug`, so a second run finds it instead of duplicating it.
- Exported archives also carry `sourceId`, `status`, timestamps and revisions; the command ignores
  them and always writes drafts.

## media[]

`{ "ref", "kind": "URL" | "ASSET", "url", "filename", "contentType", "altTranslations" }`.
````

- [ ] **Step 4: Validate and review**

Run: `node scripts/validate-plugins.mjs . && bash scripts/test.sh`
Expected: `marketplace and plugins are valid`; all tests pass. Then run the plugin-dev `skill-reviewer` agent on both skills and fix concrete findings inline.

- [ ] **Step 5: Commit**

```bash
git add plugins/eldra-storefront/skills/eldra-studio-connection plugins/eldra-storefront/skills/eldra-content-model
git commit -m "feat(eldra-storefront): add studio connection and content model skills"
```

---

### Task 11: Releases

**Files:**
- Create: `release-please-config.json`
- Create: `.release-please-manifest.json`
- Create: `scripts/sync-marketplace-refs.mjs`
- Create: `.github/workflows/release-please.yml`
- Test: `tests/sync-marketplace-refs.test.mjs`

**Interfaces:**
- Consumes: marketplace and plugin manifests; the validator's rule `ref == <name>-v<version>`.
- Produces: `syncRefs(root: string): boolean` (true when the file changed) and CLI `node scripts/sync-marketplace-refs.mjs [root]`.

- [ ] **Step 1: Write the failing test**

`tests/sync-marketplace-refs.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { syncRefs } from '../scripts/sync-marketplace-refs.mjs';

test('each entry takes its version and tag from its plugin.json', () => {
  const root = mkdtempSync(join(tmpdir(), 'eldra-sync-'));
  mkdirSync(join(root, '.claude-plugin'));
  mkdirSync(join(root, 'plugins/demo/.claude-plugin'), { recursive: true });
  writeFileSync(join(root, 'plugins/demo/.claude-plugin/plugin.json'), JSON.stringify({ name: 'demo', version: '0.2.0' }));
  const market = { name: 'eldra', plugins: [{ name: 'demo', version: '0.1.0', source: { source: 'git-subdir', path: 'plugins/demo', ref: 'demo-v0.1.0' } }] };
  writeFileSync(join(root, '.claude-plugin/marketplace.json'), JSON.stringify(market));

  assert.equal(syncRefs(root), true);
  const after = JSON.parse(readFileSync(join(root, '.claude-plugin/marketplace.json'), 'utf8'));
  assert.equal(after.plugins[0].version, '0.2.0');
  assert.equal(after.plugins[0].source.ref, 'demo-v0.2.0');
  assert.equal(syncRefs(root), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/sync-marketplace-refs.test.mjs`
Expected: FAIL with `Cannot find module '.../scripts/sync-marketplace-refs.mjs'`.

- [ ] **Step 3: Write the implementation and release configuration**

`scripts/sync-marketplace-refs.mjs`:

```js
#!/usr/bin/env node
// Sets every marketplace entry's version and source.ref from its plugin's plugin.json.
// release-please bumps plugin.json; this keeps marketplace.json pointing at the matching tag.
// Usage: node scripts/sync-marketplace-refs.mjs [repo-root]
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export function syncRefs(root) {
  const file = join(root, '.claude-plugin', 'marketplace.json');
  const before = readFileSync(file, 'utf8');
  const market = JSON.parse(before);
  for (const entry of market.plugins) {
    const { version } = JSON.parse(readFileSync(join(root, entry.source.path, '.claude-plugin', 'plugin.json'), 'utf8'));
    entry.version = version;
    entry.source.ref = `${entry.name}-v${version}`;
  }
  const after = `${JSON.stringify(market, null, 2)}\n`;
  if (after === before) return false;
  writeFileSync(file, after);
  return true;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(syncRefs(process.argv[2] ?? '.') ? 'marketplace refs updated' : 'marketplace refs already in sync');
}
```

`release-please-config.json`:

```json
{
  "$schema": "https://raw.githubusercontent.com/googleapis/release-please/main/schemas/config.json",
  "release-type": "simple",
  "include-component-in-tag": true,
  "include-v-in-tag": true,
  "tag-separator": "-",
  "bump-minor-pre-major": true,
  "packages": {
    "plugins/eldra-storefront": {
      "component": "eldra-storefront",
      "extra-files": [{ "type": "json", "path": ".claude-plugin/plugin.json", "jsonpath": "$.version" }]
    },
    "plugins/eldra-mcp": {
      "component": "eldra-mcp",
      "extra-files": [{ "type": "json", "path": ".claude-plugin/plugin.json", "jsonpath": "$.version" }]
    }
  }
}
```

`.release-please-manifest.json`:

```json
{
  "plugins/eldra-storefront": "0.0.0",
  "plugins/eldra-mcp": "0.0.0"
}
```

`.github/workflows/release-please.yml`:

```yaml
name: release-please

on:
  push:
    branches: [main]

permissions:
  contents: write
  pull-requests: write

jobs:
  release-please:
    runs-on: ubuntu-latest
    steps:
      - id: release
        uses: googleapis/release-please-action@v4
        with:
          config-file: release-please-config.json
          manifest-file: .release-please-manifest.json
      - if: ${{ steps.release.outputs.prs_created == 'true' }}
        uses: actions/checkout@v4
        with:
          ref: ${{ fromJSON(steps.release.outputs.pr).headBranchName }}
      - if: ${{ steps.release.outputs.prs_created == 'true' }}
        uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Point the marketplace at the tags this release will create
        if: ${{ steps.release.outputs.prs_created == 'true' }}
        run: |
          node scripts/sync-marketplace-refs.mjs .
          node scripts/validate-plugins.mjs .
          if ! git diff --quiet; then
            git config user.name "github-actions[bot]"
            git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
            git commit -am "chore: sync marketplace refs"
            git push
          fi
```

The first release PR moves both plugins from `0.0.0` to `0.1.0` (`feat` commits, `bump-minor-pre-major`), and the sync step sets the refs to `eldra-storefront-v0.1.0` and `eldra-mcp-v0.1.0`; merging it creates those tags. Until then the marketplace can be added but not installed from; the README says so.

- [ ] **Step 4: Run the tests and the validator**

Run: `node --test tests/sync-marketplace-refs.test.mjs && node scripts/sync-marketplace-refs.mjs . && node scripts/validate-plugins.mjs . && bash scripts/test.sh`
Expected: PASS; the sync prints `marketplace refs updated` once (it rewrites the hand-written file in `JSON.stringify` two-space layout; versions and refs stay `0.0.0`) and `already in sync` on a second run; `marketplace and plugins are valid`; all tests pass.

- [ ] **Step 5: Commit**

```bash
git add release-please-config.json .release-please-manifest.json scripts/sync-marketplace-refs.mjs tests/sync-marketplace-refs.test.mjs .github/workflows/release-please.yml .claude-plugin/marketplace.json
git commit -m "build: release each plugin with release-please and sync marketplace refs"
```

---

### Task 12: Manual end-to-end pass and marketplace README

**Files:**
- Create: `docs/testing.md`
- Modify: `README.md` (whole file)

**Interfaces:**
- Consumes: every command and script above.
- Produces: the documented release check.

- [ ] **Step 1: Write `docs/testing.md`**

`docs/testing.md`:

````markdown
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

Start `claude --plugin-dir <checkout>/plugins/eldra-storefront` in an empty temporary directory.

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
````

- [ ] **Step 2: Rewrite `README.md`**

`README.md`:

````markdown
# Eldra plugins

Claude Code plugins from Eldra. Add the marketplace once, then install what you need:

```bash
claude plugin marketplace add eldra-is/eldra-plugins
claude plugin install eldra-storefront@eldra
claude plugin install eldra-mcp@eldra
```

Plugins install from their release tags (`eldra-storefront-vX.Y.Z`, `eldra-mcp-vX.Y.Z`); a plugin
can be installed once its first release is out.

## Plugins

| Plugin | What it does |
| --- | --- |
| `eldra-storefront` | Build a storefront on the Eldra public API: scaffold from a template, connect to a Studio organization, create its content model through the Eldra MCP, and write code against `@eldrajs/sdk` the way Eldra does. See [its README](plugins/eldra-storefront/README.md). |
| `eldra-mcp` | Only the Eldra Studio MCP connector, for one organization set with `ELDRA_ORG`. For content editors and anyone who does not write code. See [its README](plugins/eldra-mcp/README.md). |

## Contributing

- `node scripts/validate-plugins.mjs .` checks the marketplace, every plugin manifest, command and
  skill; `bash scripts/test.sh` runs the tests. CI runs both.
- Pull request titles are conventional commits (`feat(eldra-storefront): …`); release-please turns
  them into one release per plugin.
- `docs/testing.md` is the manual pass before a release. Design documents live in `docs/specs/`,
  and `docs/backlog.md` lists what is deliberately not built yet.
````

- [ ] **Step 3: Validate**

Run: `node scripts/validate-plugins.mjs . && bash scripts/test.sh`
Expected: `marketplace and plugins are valid`; all tests pass (the validator also scans `README.md` and `docs/testing.md` for non-public hosts).

- [ ] **Step 4: Commit**

```bash
git add docs/testing.md README.md
git commit -m "docs: marketplace README and the manual end-to-end pass"
```

---

## Self-Review

**Spec coverage.** Marketplace and repository layout: Tasks 2, 3, 12. Releases (release-please, component tags, ref moves with the release, conventional PR titles): Tasks 2 (PR title lint) and 11. Plugin layout, no hooks, agents or bundled MCP server in `eldra-storefront`: Tasks 3–10. Settings file and custom environments as explicit URLs: Tasks 4, 7. MCP connection per project, `list_locales` verification, three usual causes, two orgs as two servers: Task 7. `new-site` steps 1–4 including `.env` and Studio to-dos, non-empty refusal, missing tag as a plugin bug: Tasks 5, 7. `content-model` algorithm, add-only fields, draft entries by slug, per-locale values with fallback report, media listed not created, table, `--dry-run`, nothing published, no archive importer: Tasks 6, 8. The four skills with the spec's topics: Tasks 9, 10. Template registry: Task 3. `eldra-mcp` plugin: Task 2. Error handling (settings check, error ids including `ACCESS_DENIED`, conflicts reported): Tasks 7, 8. Testing (validator in CI, skill review, SDK names checked against the source, `scaffold.sh` shell test against a local clone, `--dry-run` against a fixture manifest, manual pass): Tasks 1, 5, 6, 8, 9, 10, 12. Non-goals and backlog: nothing built for them.

**Deviations, stated.** The spec's testing section says "a recorded MCP tool list" for the dry-run test; the plan records the organization's state (locales, schemas, entry lookups) as JSON fixtures in `tests/content-model-plan.test.mjs`, which is what the planner consumes. The spec's manual pass says "staging"; `docs/testing.md` says "a non-production environment" to keep hostnames and environment names out of the public repository. The spec puts "the plugin-dev validator" in CI; that validator is an agent, so CI runs the repo-local `scripts/validate-plugins.mjs` and the agent runs in the manual pass (`docs/testing.md` step 0). The spec's scripts list has two scripts; the planner (`content-model-plan.mjs`) is added so the content-model algorithm is testable in CI.

**Placeholder scan.** No TBD/TODO; every code step has the full file. Angle-bracket values inside command text (`<alias>`, `<name>`) are instructions for Claude to substitute at run time, not plan gaps.

**Type consistency.** `plan`/`referenceValue` (Task 6) match the command's record table (Task 8): `schema`, `fields`, `relinked`, `lookup`, `entry`, `linked`. `mcp-url.sh` flags and exit codes (Task 4) match `connect` and `content-model` (Tasks 7, 8). `scaffold.sh` exit codes (Task 5) match the `new-site` table (Task 7). Ignore pattern `.claude/*.local.*` is the same in `scaffold.sh`, `connect`, the plugin README and `docs/testing.md`.

**Review Focus.** All five items have their pin in the owning task (Tasks 2, 4, 5, 6, 7, 12).
