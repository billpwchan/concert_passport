import assert from 'node:assert/strict';
import test from 'node:test';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createDiscoveryCache, type DiscoveryCacheEntry } from '../lib/discovery/cache.ts';
import { deduplicateEvents, eventFreshness, hasConfirmedPerformanceTime, matchesDiscovery } from '../lib/domain/discovery.ts';
import { eventCalendar } from '../lib/domain/calendar.ts';
import type { DiscoveredEvent } from '../lib/domain/types.ts';

const base: DiscoveredEvent = { provider: 'predicthq', providerEventId: 'afternoon', name: 'IVE Tour', artist: 'IVE',
  startsAt: '2027-02-10T06:00:00Z', venue: 'Taipei Arena', countryCode: 'TW', timezone: 'Asia/Taipei', officialUrl: '/events/example', confidence: 'reported' };

test('one refresh serves concurrent requests and cache reads preserve observation time', async () => {
  let clock = 100; let calls = 0;
  const rows = new Map<string, DiscoveryCacheEntry<number>>();
  const cache = createDiscoveryCache<number>({ read: (key) => rows.get(key), now: () => clock, ttl: () => 10,
    write: (key, payload, checkedAt, ttl) => { rows.set(key, { payload, checkedAt, expiresAt: checkedAt + ttl }); } });
  let resolve!: (value: number) => void;
  const source = () => { calls++; return new Promise<number>((done) => { resolve = done; }); };
  const a = cache('IVE', source); const b = cache('IVE', source);
  resolve(3); assert.deepEqual(await a, await b); assert.equal(calls, 1);
  clock = 109; assert.deepEqual(await cache('IVE', source), { payload: 3, checkedAt: 100, cached: true });
  clock = 111; const c = cache('IVE', source); resolve(4); assert.equal((await c).payload, 4); assert.equal(calls, 2);
});

test('failed refreshes release the pending request so a retry can recover', async () => {
  const cache = createDiscoveryCache<number>({ read: () => undefined, write: () => {}, ttl: () => 10 });
  await assert.rejects(cache('IVE', async () => { throw new Error('offline'); }));
  assert.equal((await cache('IVE', async () => 5)).payload, 5);
});

test('presentation deduplicates equivalent instants but keeps same-day performances separate', () => {
  const official = { ...base, provider: 'ticketmaster-discovery', providerEventId: 'official', confidence: 'official' as const, startsAt: '2027-02-10T14:00:00+08:00' };
  const evening = { ...base, providerEventId: 'evening', startsAt: '2027-02-10T09:00:00Z' };
  const events = deduplicateEvents([base, evening, official]);
  assert.equal(events.length, 2); assert.equal(events[0].provider, 'ticketmaster-discovery');
  assert.equal(matchesDiscovery(base, { artist: 'IU' }), false);
  assert.equal(matchesDiscovery({ ...base, artist: 'TOMORROW X TOGETHER' }, { artist: 'TXT', countryCode: 'TW' }), true);
});

test('date-only placeholders cannot be represented as confirmed start times', () => {
  assert.equal(hasConfirmedPerformanceTime(base), true);
  assert.equal(hasConfirmedPerformanceTime({ startsAt: '2027-02-10T23:59:00+08:00' }), false);
  assert.equal(hasConfirmedPerformanceTime({ startsAt: '2027-02-10' }), false);
  assert.equal(eventFreshness(100, 100 + 73 * 3600000), 'stale');
});

test('calendar retains the absolute start and escapes/folds multilingual user-facing text', () => {
  const calendar = eventCalendar({ ...base, id: 'calendar-1', name: 'IVE, 台北;\n' + '现场'.repeat(50) }, new Date('2026-09-06T00:00:00Z'));
  assert.ok(calendar.includes('DTSTART:20270210T060000Z'));
  assert.ok(calendar.includes('SUMMARY:IVE\\, 台北\\;\\n'));
  assert.ok(calendar.split('\r\n').every((line) => Buffer.byteLength(line) <= 75));
  assert.equal(calendar.includes('DTEND:'), false); // No invented performance duration.
});

test('durable cache, strict cross-provider identity and material history survive database reads', async () => {
  process.env.CONCERT_PASSPORT_DB_PATH = join(tmpdir(), `cp-discovery-${crypto.randomUUID()}.sqlite`);
  const { writeDiscoveryCache, readDiscoveryCache } = await import('../db/discovery.ts');
  const { getDb } = await import('../db/index.ts');
  const { upsertDiscoveredEvents, getEventChanges, getCanonicalEvent, saveEventForUser, getSavedEvents } = await import('../db/events.ts');
  writeDiscoveryCache('IVE', { errors: [] }, 100, 500);
  assert.equal(readDiscoveryCache('IVE')?.checkedAt, 100);
  upsertDiscoveredEvents([base, { ...base, provider: 'ticketmaster-discovery', providerEventId: 'evening', startsAt: '2027-02-10T09:00:00Z', confidence: 'official' }]);
  assert.equal((getDb().prepare('SELECT COUNT(*) AS count FROM canonical_events').get() as { count: number }).count, 2);
  upsertDiscoveredEvents([{ ...base, startsAt: '2027-02-10T07:00:00Z' }]);
  const changes = getEventChanges('predicthq:afternoon');
  assert.deepEqual(changes[0].fields, ['startsAt']);
  assert.ok(getCanonicalEvent('predicthq:afternoon')?.lastSeenAt);
  const observedAt = Date.parse('2026-08-25T04:22:00Z');
  upsertDiscoveredEvents([{ ...base, artist: 'BTS', name: 'BTS Tour', provider: 'official-event-calendar', providerEventId: 'reference', sourceObservedAt: observedAt }]);
  assert.equal(getCanonicalEvent('official-event-calendar:reference')?.lastSeenAt, observedAt);
  const db = getDb();
  // Simulate the prior production release falsely refreshing a static reference.
  db.prepare("UPDATE canonical_events SET last_seen_at = ?, best_link_source = 'official-event-calendar', best_link_url = 'https://example.com' WHERE id = 'official-event-calendar:reference'").run(Date.now());
  db.prepare("UPDATE event_source_links SET last_seen_at = ?, last_checked_at = ? WHERE source_id = 'official-event-calendar'").run(Date.now(), Date.now());
  db.exec('DELETE FROM schema_migrations WHERE version = 8');
  const { runMigrations } = await import('../db/migrations.ts');
  runMigrations(db);
  const restored = getCanonicalEvent('official-event-calendar:reference');
  assert.equal(restored?.lastSeenAt, observedAt);
  assert.equal(restored?.bestLinkUrl, null);
  await saveEventForUser({ user: { userId: 'discovery-test', email: 'discovery@example.test', displayName: 'Test' }, eventId: 'predicthq:afternoon' });
  db.prepare('INSERT INTO event_publication_quarantine (event_id, reason, created_at) VALUES (?, ?, ?)').run('predicthq:afternoon', 'identity_review', Date.now());
  assert.equal(getSavedEvents('discovery-test')[0].publicationQuarantined, true);


});
