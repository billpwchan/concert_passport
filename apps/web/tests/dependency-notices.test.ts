import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { collectNotices } from '../scripts/collect-notices.mjs';

test('notice collection preserves nested licenses and attribution without including package source', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'cp-notices-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'package/dist/compiled'), { recursive: true });
  writeFileSync(join(root, 'package/LICENSE'), 'Original terms\n');
  writeFileSync(join(root, 'package/dist/compiled/NOTICE.txt'), 'Required attribution\n');
  writeFileSync(join(root, 'package/dist/compiled/source.js'), 'Not a license');
  assert.deepEqual(await collectNotices(root), [
    { path: 'package/dist/compiled/NOTICE.txt', text: 'Required attribution\n' },
    { path: 'package/LICENSE', text: 'Original terms\n' },
  ]);
});

test('notice collection excludes symlinks outside dependency roots and hidden private paths', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'cp-notices-'));
  const external = mkdtempSync(join(tmpdir(), 'cp-notices-outside-'));
  t.after(() => { rmSync(root, { recursive: true, force: true }); rmSync(external, { recursive: true, force: true }); });
  writeFileSync(join(external, 'LICENSE'), 'Outside content');
  symlinkSync(external, join(root, 'linked'));
  mkdirSync(join(root, '.private'));
  writeFileSync(join(root, '.private/LICENSE'), 'Hidden content');
  assert.deepEqual(await collectNotices(root), []);
});
