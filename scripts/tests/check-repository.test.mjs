import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { checkLocalLinks, checkRepository, localDestinations, markdownAnchors, withoutFences } from '../check-repository.mjs';

function fixture(t, files) {
  const root = mkdtempSync(join(tmpdir(), 'cp-repository-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(join(root, name, '..'), { recursive: true });
    writeFileSync(join(root, name), content);
  }
  return root;
}

test('GitHub-style Chinese headings, punctuation, duplicate headings and explicit anchors', () => {
  assert.deepEqual([...markdownAnchors('# 本地体验\n## 本地体验\n## **Node.js** 与 [Web](README.md)\n<a id="custom"></a>')], ['custom', '本地体验', '本地体验-1', 'nodejs-与-web']);
});

test('fenced snippets do not become links or anchors, including a shorter inner fence', () => {
  const md = '````md\n```\n# Fake\n[example](missing.md)\n````\n## Real\n~~~\n[example](also-missing.md)\n~~~';
  assert.deepEqual(localDestinations(md), []);
  assert.deepEqual([...markdownAnchors(md)], ['real']);
  assert.match(withoutFences(md), /## Real/);
});

test('external URLs are excluded without a network request, HTML and reference links are included', () => {
  assert.deepEqual(localDestinations('[a](https://example.org) [b](mailto:test@example.org)\n![img](images/a.svg)\n<img src="b.png" />\n[ref]: docs/a.md#intro\n[a](//example.org)'), ['images/a.svg', 'docs/a.md#intro', 'b.png']);
});

test('relative and root links, directories, encoded spaces and Chinese anchors resolve', (t) => {
  const files = { 'README.md': '[a](docs/a%20b.md#%E4%BD%A0%E5%A5%BD) [dir](docs) [root](/docs/a%20b.md)', 'docs/a b.md': '# 你好' };
  assert.deepEqual(checkLocalLinks(fixture(t, files), 'README.md', new Set(Object.keys(files))), []);
});

test('missing files, missing fragments and malformed URI escapes fail independently', (t) => {
  const files = { 'README.md': '[a](lost.md) [b](doc.md#absent) [c](%ZZ.md)', 'doc.md': '# Present' };
  const errors = checkLocalLinks(fixture(t, files), 'README.md', new Set(Object.keys(files)));
  assert.equal(errors.length, 3);
  assert.match(errors[0], /missing target/);
  assert.match(errors[1], /missing anchor/);
  assert.match(errors[2], /invalid destination/);
});

test('local-only assets cannot silently pass publication checks', (t) => {
  const files = { 'README.md': '![private](local.png)', 'local.png': 'not a public fixture' };
  assert.match(checkLocalLinks(fixture(t, files), 'README.md', new Set(['README.md']))[0], /ignored or absent/);
});

test('links cannot escape the repository, even when the outside file exists', (t) => {
  const files = { 'README.md': '[outside](../secret.md)' };
  assert.match(checkLocalLinks(fixture(t, files), 'README.md', new Set(['README.md']))[0], /escapes repository/);
});

test('same-document fragments and self-contained HTML assets are validated', (t) => {
  const files = { 'README.md': '# Intro\n[a](#intro) <a href="#custom">go</a> <a id="custom"></a>\n<img src="hero.svg" />', 'hero.svg': '<svg />' };
  assert.deepEqual(checkLocalLinks(fixture(t, files), 'README.md', new Set(Object.keys(files))), []);
});

function repositoryFixture(t, extra = {}) {
  const pkg = { version: '0.1.0', license: 'MIT', engines: { node: '>=22.13.0' } };
  const lock = { packages: { '': pkg } };
  const files = Object.fromEntries(['README.md', 'README.en.md', 'LICENSE', 'CONTRIBUTING.md', 'SECURITY.md', 'SUPPORT.md', 'CODE_OF_CONDUCT.md', 'THIRD_PARTY_NOTICES.md', 'CHANGELOG.md'].map((name) => [name, '# Example']));
  Object.assign(files, {
    '.nvmrc': '22\n',
    'package.json': JSON.stringify(pkg),
    'package-lock.json': JSON.stringify(lock),
    'apps/web/package.json': JSON.stringify(pkg),
    'apps/web/package-lock.json': JSON.stringify(lock),
    'apps/web/LICENSE': '# Example',
    '.github/workflows/ci.yml': `steps:\n  - uses: actions/checkout@${'a'.repeat(40)}\n`,
  }, extra);
  const root = fixture(t, files);
  execFileSync('git', ['init', '--quiet'], { cwd: root });
  return root;
}

test('a fresh checkout includes publishable untracked files and ignores local-only private files', (t) => {
  const root = repositoryFixture(t, { '.gitignore': '.env\n', '.env': 'SYNTHETIC=1\n' });
  const result = checkRepository(root);
  assert.deepEqual(result.errors, []);
  assert.equal(result.markdownCount, 8);
});

test('repository check rejects publication of keys, license drift, moving action tags and active SVG', (t) => {
  const root = repositoryFixture(t, {
    'secret.sqlite-wal': 'synthetic fixture',
    '.env.local': 'SYNTHETIC=1\n',
    'apps/web/package.json': JSON.stringify({ version: '0.1.0', license: 'UNLICENSED', engines: { node: '>=22.13.0' } }),
    '.github/workflows/ci.yml': 'steps:\n  - uses: actions/checkout@v4\n',
    'docs/assets/hero.svg': '<svg><script>/* synthetic */</script></svg>',
  });
  const errors = checkRepository(root).errors.join('\n');
  for (const pattern of [/Private database/, /Private environment/, /license must match/, /full commit SHA/, /script-free/]) assert.match(errors, pattern);
});
