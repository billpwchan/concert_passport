import { readdir, readFile, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** Preserve installed license/notice files, including bundled dependencies. No network or execution. */
export async function collectNotices(directory) {
  const notices = [];
  async function walk(path) {
    const entries = (await readdir(path, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, 'en'));
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.isSymbolicLink()) continue;
      const file = resolve(path, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (entry.isFile() && /^(?:licen[sc]e|notice|copying)(?:[._-].*)?$/i.test(entry.name)) {
        notices.push({ path: relative(directory, file).split('\\').join('/'), text: await readFile(file, 'utf8') });
      }
    }
  }
  await walk(resolve(directory));
  return notices;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const output = process.argv[2];
  if (!output) throw new Error('Usage: node scripts/collect-notices.mjs <output-file>');
  const notices = await collectNotices(resolve('node_modules'));
  if (!notices.length) throw new Error('No installed dependency notices found');
  const header = 'Concert Passport — installed third-party license and notice files\n\n'
    + 'Collected from installed packages, including development and bundled dependencies.\n'
    + 'This preserves supplied notices; it is not a complete license compliance audit.\n\n';
  await writeFile(output, header + notices.map(({ path, text }) => `===== ${path} =====\n\n${text}\n`).join('\n'), 'utf8');
  console.log(`Preserved ${notices.length} installed dependency notice files.`);
}
