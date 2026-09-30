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
  assert.equal(selectTicketmasterImage([
    { url: 'https://s1.ticketm.net/dam/c/placeholder.jpg', width: 2048, height: 1152, ratio: '16_9', fallback: true },
  ]), undefined);
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

test('merges the same show across providers while retaining both source records', async () => {
  const { getDb } = await import('../db/index.ts');
  const { upsertDiscoveredEvents } = await import('../db/events.ts');
  const ticketmaster = {
    provider: 'ticketmaster-discovery', providerEventId: 'tm-bts-melbourne',
    name: "BTS WORLD TOUR 'ARIRANG' IN MELBOURNE", artist: 'BTS',
    startsAt: '2027-02-10T09:00:00Z', timezone: 'Australia/Melbourne',
    venue: 'Marvel Stadium', city: 'Docklands', countryCode: 'AU',
    officialUrl: 'https://www.ticketmaster.com.au/bts-melbourne',
    confidence: 'official' as const, bestLinkUrl: 'https://www.ticketmaster.com.au/bts-melbourne',
    bestLinkRole: 'ticket' as const, bestLinkSource: 'ticketmaster-discovery', bestLinkScore: 100,
  };
  const liveNation = {
    provider: 'livenation-tour', providerEventId: 'intl_bts_melbourne',
    name: 'BTS WORLD TOUR ‘ARIRANG’ IN MELBOURNE', artist: 'BTS',
    startsAt: '2027-02-10T20:00:00+11:00', timezone: 'Australia/Sydney',
    venue: 'Marvel Stadium', city: 'Melbourne', countryCode: 'AU',
    officialUrl: 'https://www.livenation.com/event/intl_bts_melbourne/bts-melbourne',
    confidence: 'verified' as const, bestLinkUrl: 'https://www.livenation.com/event/intl_bts_melbourne/bts-melbourne',
    bestLinkRole: 'event' as const, bestLinkSource: 'livenation', bestLinkScore: 94,
  };
  const first = upsertDiscoveredEvents([ticketmaster])[0];
  const second = upsertDiscoveredEvents([liveNation])[0];
  assert.ok(first.canonicalId);
  const canonicalId = first.canonicalId;
  assert.equal(second.canonicalId, canonicalId);
  assert.equal((getDb().prepare(`
    SELECT COUNT(*) AS count FROM canonical_events WHERE artist = 'BTS' AND venue = 'Marvel Stadium'
  `).get() as { count: number }).count, 1);
  assert.equal((getDb().prepare(`
    SELECT COUNT(*) AS count FROM event_source_links WHERE event_id = ?
  `).get(canonicalId) as { count: number }).count, 2);
  const stored = getDb().prepare(`
    SELECT official_url AS officialUrl, best_link_role AS bestLinkRole
    FROM canonical_events WHERE id = ?
  `).get(canonicalId) as { officialUrl: string; bestLinkRole: string };
  assert.equal(stored.officialUrl, ticketmaster.officialUrl);
  assert.equal(stored.bestLinkRole, 'ticket');
});

test('automatically reconciles legacy duplicates after a provider corrects its time', async () => {
  const { getDb } = await import('../db/index.ts');
  const { upsertDiscoveredEvents } = await import('../db/events.ts');
  const common = {
    name: "NCT 127 5TH TOUR 'NEO CITY : SINGAPORE - THE REDLINE'",
    artist: 'NCT 127', timezone: 'Asia/Singapore', countryCode: 'SG',
  };
  upsertDiscoveredEvents([{
    ...common, provider: 'ticketmaster-discovery', providerEventId: 'tm-nct-legacy',
    startsAt: '2026-10-18T11:00:00Z', venue: 'Singapore Indoor Stadium', city: 'Singapore',
    officialUrl: 'https://ticketmaster.sg/nct-legacy', confidence: 'official',
  }]);
  upsertDiscoveredEvents([{
    ...common, provider: 'predicthq', providerEventId: 'phq-nct-legacy',
    startsAt: '2026-10-18T15:30:00Z', city: 'Singapore',
    officialUrl: '/events/phq-nct-legacy', confidence: 'reported',
  }]);
  assert.equal((getDb().prepare(`
    SELECT COUNT(*) AS count FROM canonical_events WHERE artist = 'NCT 127'
      AND provider_event_id IN ('tm-nct-legacy', 'phq-nct-legacy')
  `).get() as { count: number }).count, 2);
  upsertDiscoveredEvents([{
    ...common, provider: 'predicthq', providerEventId: 'phq-nct-legacy',
    startsAt: '2026-10-18T11:00:00Z', city: 'Singapore',
    officialUrl: '/events/phq-nct-legacy', confidence: 'reported',
  }]);
  assert.equal((getDb().prepare(`
    SELECT COUNT(*) AS count FROM canonical_events WHERE artist = 'NCT 127'
      AND provider_event_id IN ('tm-nct-legacy', 'phq-nct-legacy')
  `).get() as { count: number }).count, 1);
  assert.equal((getDb().prepare(`
    SELECT COUNT(*) AS count FROM event_versions WHERE change_type = 'entity_merged'
  `).get() as { count: number }).count >= 1, true);
});

test('reconciles title variants at the same venue and exact same-provider duplicates', async () => {
  const { getDb } = await import('../db/index.ts');
  const { upsertDiscoveredEvents } = await import('../db/events.ts');
  const common = {
    artist: 'ITZY', timezone: 'Asia/Singapore', countryCode: 'SG',
    venue: 'Singapore Indoor Stadium', city: 'Singapore',
  };
  upsertDiscoveredEvents([{
    ...common, provider: 'ticketmaster-discovery', providerEventId: 'tm-itzy-title-variant',
    name: 'ITZY', startsAt: '2026-10-03T09:00:00Z',
    officialUrl: 'https://ticketmaster.sg/itzy-title', confidence: 'official',
  }]);
  upsertDiscoveredEvents([{
    ...common, provider: 'predicthq', providerEventId: 'phq-itzy-title-variant',
    name: 'ITZY 3RD WORLD TOUR TUNNEL VISION IN SINGAPORE', startsAt: '2026-10-03T09:00:00Z',
    officialUrl: '/events/phq-itzy-title', confidence: 'reported',
  }]);
  upsertDiscoveredEvents([{
    ...common, provider: 'predicthq', providerEventId: 'phq-itzy-title-copy',
    name: 'ITZY 3RD WORLD TOUR TUNNEL VISION IN SINGAPORE', startsAt: '2026-10-03T09:00:00Z',
    officialUrl: '/events/phq-itzy-title-copy', confidence: 'reported',
  }]);
  assert.equal((getDb().prepare(`
    SELECT COUNT(*) AS count FROM canonical_events WHERE artist = 'ITZY'
      AND provider_event_id IN ('tm-itzy-title-variant', 'phq-itzy-title-variant', 'phq-itzy-title-copy')
  `).get() as { count: number }).count, 1);
});

test('merges promoter end-of-day placeholders without losing the verified show time', async () => {
  const { getDb } = await import('../db/index.ts');
  const { upsertDiscoveredEvents } = await import('../db/events.ts');
  upsertDiscoveredEvents([{
    provider: 'predicthq', providerEventId: 'phq-placeholder-merge',
    name: 'MAMAMOO', artist: 'MAMAMOO', startsAt: '2026-09-25T10:00:00Z',
    timezone: 'Australia/Sydney', venue: 'TikTok Entertainment Centre',
    countryCode: 'AU', officialUrl: '/events/phq-placeholder-merge', confidence: 'official',
  }]);
  upsertDiscoveredEvents([{
    provider: 'livenation-tour', providerEventId: 'ln-placeholder-merge',
    name: 'MAMAMOO 2026 WORLD TOUR <4WARD> in SYDNEY', artist: 'MAMAMOO',
    startsAt: '2026-09-25T23:59:00+10:00', timezone: 'Australia/Sydney',
    venue: 'TikTok Entertainment Centre', city: 'Sydney', countryCode: 'AU',
    officialUrl: 'https://www.livenation.com/event/mamamoo-sydney', confidence: 'verified',
  }]);
  const rows = getDb().prepare(`
    SELECT name, starts_at AS startsAt, venue, city, official_url AS officialUrl
    FROM canonical_events
    WHERE provider_event_id IN ('phq-placeholder-merge', 'ln-placeholder-merge')
  `).all() as unknown as Array<{
    name: string; startsAt: string; venue: string; city: string; officialUrl: string;
  }>;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].startsAt, '2026-09-25T10:00:00Z');
  assert.equal(rows[0].venue, 'TikTok Entertainment Centre');
  assert.equal(rows[0].city, 'Sydney');
  assert.match(rows[0].name, /WORLD TOUR/);
  assert.equal(rows[0].officialUrl, 'https://www.livenation.com/event/mamamoo-sydney');
});

test('keeps distinct same-day performances when neither time is a placeholder', async () => {
  const { getDb } = await import('../db/index.ts');
  const { upsertDiscoveredEvents } = await import('../db/events.ts');
  const common = {
    provider: 'predicthq', artist: 'XLOV', timezone: 'Asia/Singapore',
    countryCode: 'SG', confidence: 'reported' as const,
  };
  upsertDiscoveredEvents([{
    ...common, providerEventId: 'xlov-matinee', name: 'XLOV ASIA TOUR',
    startsAt: '2026-10-01T11:00:00Z', venue: 'The Star Theatre',
    officialUrl: '/events/xlov-matinee',
  }, {
    ...common, providerEventId: 'xlov-evening', name: 'XLOV ASIA TOUR',
    startsAt: '2026-10-01T11:30:00Z', venue: 'The Star Performing Arts Centre',
    officialUrl: '/events/xlov-evening',
  }]);
  assert.equal((getDb().prepare(`
    SELECT COUNT(*) AS count FROM canonical_events
    WHERE provider_event_id IN ('xlov-matinee', 'xlov-evening')
  `).get() as { count: number }).count, 2);
});

test('quarantines a media asset reused across different artist identities', async () => {
  const { getDb } = await import('../db/index.ts');
  const { getArtistMedia, upsertArtistMedia } = await import('../db/media.ts');
  const shared = {
    provider: 'test-media',
    providerArtistId: 'one',
    imageUrl: 'https://s1.ticketm.net/dam/a/shared.jpg',
    imageWidth: 1200,
    imageHeight: 675,
    sourceUrl: 'https://www.ticketmaster.com/artist/one',
    isFallback: false,
  };
  assert.ok(upsertArtistMedia({ ...shared, artistName: 'Artist One' }));
  assert.equal(upsertArtistMedia({ ...shared, artistName: 'Artist Two', providerArtistId: 'two' }), undefined);
  assert.equal(getArtistMedia('Artist One'), undefined);
  assert.equal((getDb().prepare(`
    SELECT reason FROM media_asset_quarantine WHERE image_url = ?
  `).get(shared.imageUrl) as { reason: string }).reason, 'cross_artist_duplicate');
});

test('returns stored upcoming shows when live connectors have no fresh match', async () => {
  const { searchUpcomingCatalogEvents, upsertDiscoveredEvents } = await import('../db/events.ts');
  upsertDiscoveredEvents([{
    provider: 'official-tour',
    providerEventId: 'stored-itzy-taipei',
    name: 'ITZY 3RD WORLD TOUR IN TAIPEI',
    artist: 'ITZY',
    startsAt: '2027-03-06T11:00:00Z',
    timezone: 'Asia/Taipei',
    venue: 'Taipei Arena',
    city: 'Taipei',
    countryCode: 'TW',
    officialUrl: 'https://tickets.example/itzy-taipei',
    confidence: 'official',
  }]);
  const matches = searchUpcomingCatalogEvents({
    artist: 'itzy',
    countryCode: 'TW',
    startDateTime: '2027-01-01T00:00:00Z',
    endDateTime: '2027-12-31T23:59:59Z',
  });
  assert.equal(matches.some((event) => event.providerEventId === 'stored-itzy-taipei'), true);
});
