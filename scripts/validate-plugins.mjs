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
