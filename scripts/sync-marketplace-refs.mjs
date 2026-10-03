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
