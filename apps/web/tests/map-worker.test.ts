import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { prepareMapWorker } from '../scripts/prepare-map-worker.mjs';

test('map worker assets retain relative module names and upstream license in a versioned path', () => {
  const root = mkdtempSync(join(tmpdir(), 'map-worker-test-'));
  try {
    const source = join(root, 'package');
    mkdirSync(join(source, 'dist'), { recursive: true });
    const files = {
      'package.json': '{"version":"6.4.1"}',
      'dist/maplibre-gl-worker.mjs': "import './maplibre-gl-shared.mjs';",
      'dist/maplibre-gl-shared.mjs': 'export const shared = true;',
      'LICENSE.txt': 'Original upstream license text',
    };
    for (const [filename, content] of Object.entries(files)) writeFileSync(join(source, filename), content);
    const output = join(root, 'public');
    const result = prepareMapWorker(source, output);
    assert.equal(result.version, '6.4.1');
    assert.equal(result.destination, join(output, '6.4.1'));
    for (const [filename, content] of Object.entries(files)) {
      if (filename === 'package.json') continue;
      assert.equal(readFileSync(join(result.destination, filename.replace('dist/', '')), 'utf8'), content);
    }
    assert.deepEqual(prepareMapWorker(source, output), result);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('map worker preparation rejects an unsafe package version before writing assets', () => {
  const root = mkdtempSync(join(tmpdir(), 'map-worker-version-test-'));
  try {
    writeFileSync(join(root, 'package.json'), '{"version":"../escape"}');
    assert.throws(() => prepareMapWorker(root, join(root, 'public')), /safe versioned asset path/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
