import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import {
  canonicalCoreArtistName,
  coreArtistBatchCount,
  coreArtists,
  getCoreArtistBatch,
} from '../lib/domain/core-artists.ts';
import { isAllowedTicketmasterImageUrl, selectTicketmasterImage } from '../lib/sources/ticketmaster-client.ts';
import { isAllowedWikimediaImageUrl } from '../lib/sources/media/wikimedia.ts';

test('core artist batches cover the maintained catalog exactly once', () => {
  const ids = Array.from({ length: coreArtistBatchCount() }, (_, batch) => (
    getCoreArtistBatch(0, batch).map((artist) => artist.id)
  )).flat();
  assert.equal(coreArtists.length, 76);
  assert.equal(new Set(ids).size, coreArtists.length);
  assert.deepEqual(ids, coreArtists.map((artist) => artist.id));
});

test('canonicalizes group aliases and disambiguated solo searches', () => {
  assert.equal(canonicalCoreArtistName('TXT'), 'TOMORROW X TOGETHER');
  assert.equal(canonicalCoreArtistName('KAI EXO'), 'KAI');
  assert.equal(canonicalCoreArtistName('not-in-catalog'), undefined);
});

test('selects a real high-resolution Ticketmaster image and rejects lookalike hosts', () => {
  assert.equal(isAllowedTicketmasterImageUrl('https://s1.ticketm.net/dam/a/artist.jpg'), true);
  assert.equal(isAllowedTicketmasterImageUrl('https://ticketm.net.evil.example/artist.jpg'), false);
  assert.equal(isAllowedWikimediaImageUrl('https://upload.wikimedia.org/wikipedia/commons/a/a1/group.jpg'), true);
  assert.equal(isAllowedWikimediaImageUrl('https://upload.wikimedia.org.evil.example/group.jpg'), false);
  const selected = selectTicketmasterImage([
    { url: 'https://s1.ticketm.net/dam/a/small.jpg', width: 305, height: 225, ratio: '4_3' },
    { url: 'https://s1.ticketm.net/dam/a/fallback.jpg', width: 2048, height: 1152, ratio: '16_9', fallback: true },
    { url: 'https://s1.ticketm.net/dam/a/official.jpg', width: 1024, height: 576, ratio: '16_9', fallback: false, attribution: 'Artist team' },
  ]);
  assert.equal(selected?.url, 'https://s1.ticketm.net/dam/a/official.jpg');
  assert.equal(selected?.attribution, 'Artist team');
});

test('retains source provenance and versions only material event changes', async () => {
  process.env.CONCERT_PASSPORT_DB_PATH = join(tmpdir(), `concert-passport-test-${crypto.randomUUID()}.sqlite`);
  const { getDb } = await import('../db/index.ts');
  const { upsertDiscoveredEvents } = await import('../db/events.ts');
  const event = {
    provider: 'test-provider',
    providerEventId: 'event-1',
    name: 'IVE World Tour',
    artist: 'IVE',
    startsAt: '2027-01-10T11:00:00Z',
    timezone: 'Asia/Singapore',
    city: 'Singapore',
    countryCode: 'SG',
    officialUrl: 'https://tickets.example/event-1',
    confidence: 'official' as const,
    imageUrl: 'https://s1.ticketm.net/dam/a/official.jpg',
    imageWidth: 1024,
    imageHeight: 576,
    imageAttribution: 'Artist team',
    imageSourceUrl: 'https://www.ticketmaster.com/event-1',
  };

  upsertDiscoveredEvents([event]);
  upsertDiscoveredEvents([event]);
  assert.equal((getDb().prepare('SELECT COUNT(*) AS count FROM event_versions').get() as { count: number }).count, 1);
  assert.equal((getDb().prepare('SELECT COUNT(*) AS count FROM event_source_links').get() as { count: number }).count, 1);

  const withoutImage = {
    ...event,
    imageUrl: undefined,
    imageWidth: undefined,
    imageHeight: undefined,
    imageAttribution: undefined,
    imageSourceUrl: undefined,
  };
  upsertDiscoveredEvents([withoutImage]);
  assert.equal((getDb().prepare('SELECT image_url AS imageUrl FROM canonical_events').get() as { imageUrl: string }).imageUrl, event.imageUrl);
  assert.equal((getDb().prepare('SELECT COUNT(*) AS count FROM event_versions').get() as { count: number }).count, 1);

  upsertDiscoveredEvents([{ ...event, startsAt: '2027-01-10T12:00:00Z' }]);
  assert.equal((getDb().prepare('SELECT COUNT(*) AS count FROM event_versions').get() as { count: number }).count, 2);
  const version = getDb().prepare(`
    SELECT changed_fields_json AS changedFields FROM event_versions
    ORDER BY observed_at DESC, rowid DESC LIMIT 1
  `).get() as { changedFields: string };
  assert.deepEqual(JSON.parse(version.changedFields), ['startsAt']);
});
