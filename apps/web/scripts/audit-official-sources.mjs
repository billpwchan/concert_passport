import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// An audit always gets a private fresh database, even when production env vars are present.
const flags = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  const name = process.argv[index], value = process.argv[index + 1];
  if (!['--sources', '--batches', '--pages', '--output'].includes(name) || !value) throw new Error(`Invalid argument: ${name}`);
  flags.set(name, value);
}
const bounded = (name, fallback, max) => {
  const value = Number(flags.get(name) ?? fallback);
  if (!Number.isInteger(value) || value < 1 || value > max) throw new Error(`${name} must be 1..${max}`);
  return value;
};
const batches = bounded('--batches', 2, 20), pages = bounded('--pages', 8, 12);
process.env.CONCERT_PASSPORT_DATA_MODE = 'official';
for (const key of ['TICKETMASTER_API_KEY', 'PREDICTHQ_ACCESS_TOKEN', 'BRAVE_SEARCH_API_KEY']) delete process.env[key];
const directory = await mkdtemp(join(tmpdir(), 'concert-passport-source-audit-'));
process.env.CONCERT_PASSPORT_DB_PATH = join(directory, 'catalog.sqlite');
const { collectionSources } = await import('../lib/collection/manifest.ts');
const sourceIds = (flags.get('--sources') ?? 'livenation-sg,livenation-tw,the-star-sg').split(',')
  .map(value => value.startsWith('official:') ? value : `official:${value}`);
if (sourceIds.some(id => !collectionSources.some(source => source.id === id))) throw new Error('Unknown source ID');
const { runOfficialCollection } = await import('../lib/collection/runner.ts');
const { getDb } = await import('../db/index.ts');
const runs = [];
for (let batch = 0; batch < batches; batch++) {
  const result = await runOfficialCollection({sourceIds, limit: pages, maxMs: 50000});
  runs.push(result);
  console.error(JSON.stringify({batch: batch + 1, ...result}));
  if (!result.pages) break;
}
const db = getDb();
const report = {
  observedAt: new Date().toISOString(), dataMode: 'official', database: process.env.CONCERT_PASSPORT_DB_PATH,
  note: 'Fresh isolated database; no event/search API keys. Counts are observations, not coverage guarantees.',
  sources: sourceIds, runs,
  sourceOutcomes: db.prepare('SELECT source_id, status, last_attempt_at, last_success_at, last_error FROM source_runtime').all(),
  catalog: db.prepare('SELECT id, artist, name, starts_at, timezone, venue, official_url FROM canonical_events ORDER BY starts_at').all(),
  candidateStates: db.prepare('SELECT status, reason, COUNT(*) AS count FROM collection_candidates GROUP BY status, reason').all(),
  integrity: db.prepare('PRAGMA integrity_check').get(),
};
const output = flags.get('--output') ?? join(directory, 'report.json');
await writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({report: output, events: report.catalog.length, sources: report.sourceOutcomes, integrity: report.integrity}, null, 2));
if (report.integrity?.integrity_check !== 'ok' || !report.catalog.length) process.exitCode = 1;
