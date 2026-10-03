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
