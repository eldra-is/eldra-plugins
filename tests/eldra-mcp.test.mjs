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
