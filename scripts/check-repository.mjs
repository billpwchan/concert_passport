import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** Ignore fenced examples; this deliberately supports this repo's Markdown subset. */
export function withoutFences(markdown) {
  let fence;
  return markdown.split('\n').map((line) => {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (!fence && marker) {
      fence = marker[1];
      return '';
    }
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length
        && line.slice(marker[0].length).trim() === '') fence = undefined;
      return '';
    }
    return line;
  }).join('\n');
}

export function markdownAnchors(markdown) {
  const text = withoutFences(markdown);
  const anchors = new Set();
  for (const match of text.matchAll(/\b(?:id|name)=["']([^"']+)["']/g)) anchors.add(match[1]);
  for (const match of text.matchAll(/^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$/gm)) {
    const slug = match[1].replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/<[^>]*>/g, '')
      .toLowerCase().replace(/[^\p{L}\p{N}\p{M}_\- ]/gu, '').replace(/ /g, '-');
    let anchor = slug;
    let suffix = 0;
    while (anchors.has(anchor)) anchor = `${slug}-${++suffix}`;
    anchors.add(anchor);
  }
  return anchors;
}

export function localDestinations(markdown) {
  const text = withoutFences(markdown);
  return [
    ...[...text.matchAll(/\]\(\s*(<[^>\n]+>|[^)\s]+)(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/g)].map((m) => m[1]),
    ...[...text.matchAll(/^ {0,3}\[[^\]]+\]:\s*(<[^>\n]+>|\S+)/gm)].map((m) => m[1]),
    ...[...text.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/g)].map((m) => m[1]),
  ].map((value) => value.replace(/^<|>$/g, ''))
    .filter((value) => !/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value));
}

export function checkLocalLinks(root, filename, files) {
  const errors = [];
  const markdown = readFileSync(resolve(root, filename), 'utf8');
  for (const destination of new Set(localDestinations(markdown))) {
    try {
      const [rawPath, rawFragment] = destination.split('#', 2);
      const path = decodeURIComponent(rawPath.split('?', 1)[0]);
      const resolved = !path ? resolve(root, filename)
        : path.startsWith('/') ? resolve(root, `.${path}`)
        : resolve(dirname(resolve(root, filename)), path);
      const name = relative(root, resolved).split(sep).join('/');
      if (name === '..' || name.startsWith('../') || isAbsolute(name)) {
        errors.push(`${filename}: link escapes repository: ${destination}`);
      } else if (!existsSync(resolved)) {
        errors.push(`${filename}: missing target: ${destination}`);
      } else if (!files.has(name) && !(statSync(resolved).isDirectory() && [...files].some((file) => file.startsWith(`${name}/`)))) {
        errors.push(`${filename}: target is ignored or absent from Git's file list: ${destination}`);
      } else if (rawFragment && /\.md$/i.test(resolved) && !markdownAnchors(readFileSync(resolved, 'utf8')).has(decodeURIComponent(rawFragment))) {
        errors.push(`${filename}: missing anchor: ${destination}`);
      }
    } catch (error) {
      errors.push(`${filename}: invalid destination ${destination}: ${error.message}`);
    }
  }
  return errors;
}

export function checkRepository(root) {
  const files = new Set(execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' })
    .split('\0').filter((name) => name && existsSync(resolve(root, name))));
  const errors = [];
  const markdown = [...files].filter((name) => name.endsWith('.md'));
  for (const filename of markdown) errors.push(...checkLocalLinks(root, filename, files));
  for (const filename of files) {
    if (/(?:^|\/)\.env(?:\..*)?$/.test(filename) && !filename.endsWith('/.env.example') && filename !== '.env.example') errors.push(`Private environment file in repository: ${filename}`);
    if (/\.(?:sqlite(?:3)?(?:-.*)?|pem|key|p12|pfx)$/i.test(filename)) errors.push(`Private database or key file in repository: ${filename}`);
  }
  for (const filename of ['README.md', 'README.en.md', 'LICENSE', 'CONTRIBUTING.md', 'SECURITY.md', 'SUPPORT.md', 'CODE_OF_CONDUCT.md', 'THIRD_PARTY_NOTICES.md', 'CHANGELOG.md', '.nvmrc', '.github/workflows/ci.yml']) {
    if (!files.has(filename)) errors.push(`Missing repository entry point: ${filename}`);
  }
  const readJson = (name) => JSON.parse(readFileSync(resolve(root, name), 'utf8'));
  const rootPackage = readJson('package.json');
  const rootLock = readJson('package-lock.json');
  const web = readJson('apps/web/package.json');
  const lock = readJson('apps/web/package-lock.json');
  if (readFileSync(resolve(root, 'LICENSE'), 'utf8') !== readFileSync(resolve(root, 'apps/web/LICENSE'), 'utf8')) errors.push('Web distribution LICENSE differs from root LICENSE');
  for (const [name, pkg] of [['root package', rootPackage], ['root lock package', rootLock.packages['']], ['web package', web], ['web lock package', lock.packages['']]]) {
    if (pkg.license !== 'MIT') errors.push(`${name}: license must match LICENSE (MIT)`);
    if (pkg.version !== rootPackage.version) errors.push(`${name}: version differs from root package`);
    if (pkg.engines?.node !== rootPackage.engines.node) errors.push(`${name}: Node engine differs from root package`);
  }
  for (const key of ['dependencies', 'devDependencies']) {
    if (JSON.stringify(Object.entries(web[key] ?? {}).sort()) !== JSON.stringify(Object.entries(lock.packages[''][key] ?? {}).sort())) errors.push(`Web ${key} differ from package-lock.json`);
  }
  for (const filename of [...files].filter((name) => /^\.github\/workflows\/.*\.ya?ml$/.test(name))) {
    const workflow = readFileSync(resolve(root, filename), 'utf8');
    for (const match of workflow.matchAll(/^\s*-?\s*uses:\s*([^\s#]+)/gm)) {
      if (!match[1].startsWith('./') && !match[1].startsWith('docker://') && !/@[a-f0-9]{40}$/.test(match[1])) errors.push(`${filename}: action must use a full commit SHA: ${match[1]}`);
    }
  }
  for (const filename of [...files].filter((name) => /^docs\/assets\/.*\.svg$/.test(name))) {
    if (/<script\b|<foreignObject\b|\bon[a-z]+\s*=|(?:href|src)\s*=\s*["'](?:https?:|\/\/)/i.test(readFileSync(resolve(root, filename), 'utf8'))) errors.push(`${filename}: README artwork must be self-contained and script-free`);
  }
  return { errors, markdownCount: markdown.length, fileCount: files.size };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = checkRepository(fileURLToPath(new URL('../', import.meta.url)));
    if (result.errors.length) {
      result.errors.forEach((error) => console.error(error));
      process.exitCode = 1;
    } else console.log(`Repository checks passed: ${result.markdownCount} Markdown files, ${result.fileCount} publishable files. External URLs are not checked.`);
  } catch (error) {
    console.error(`Repository check failed: ${error.message}`);
    process.exitCode = 1;
  }
}
