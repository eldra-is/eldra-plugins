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
