import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';

process.env.CONCERT_PASSPORT_DB_PATH = join(tmpdir(), `concert-passport-artists-${crypto.randomUUID()}.sqlite`);

test('bootstraps the launch catalog and learns a newly debuted group without code changes', async () => {
  const {
    canonicalCatalogArtistName,
    ensureCoreArtistCatalog,
    getArtistCatalogSummary,
    getArtistsDueForIngestion,
    markArtistEventCheck,
    normalizeArtistIdentity,
    recordArtistEvidence,
  } = await import('../db/artists.ts');

  ensureCoreArtistCatalog();
  assert.ok(getArtistCatalogSummary().artists >= 76);
  assert.equal(normalizeArtistIdentity('  NCT—DREAM  '), 'nct dream');

  recordArtistEvidence({
    canonicalName: 'Future Seoul',
    aliases: [{ name: '퓨처서울', locale: 'ko' }, { name: 'FS Seoul', locale: 'en' }],
    artistType: 'group',
    countryCode: 'KR',
    sourceId: 'wikidata',
    externalId: 'Q999999999',
    confidenceScore: 90,
    priorityScore: 99,
    verified: true,
  });

  assert.equal(canonicalCatalogArtistName('퓨처서울'), 'Future Seoul');
  assert.ok(getArtistsDueForIngestion(100).some((target) => target.artist === 'Future Seoul'));
  markArtistEventCheck('FS Seoul', 0, 1_000);
  assert.ok(!getArtistsDueForIngestion(100, 1_001).some((target) => target.artist === 'Future Seoul'));
});

test('reserves discovery capacity for hot, unseen and long-tail artists', async () => {
  const { selectAdaptiveArtistQueue } = await import('../db/artists.ts');
  const candidate = (
    artist: string,
    priorityScore: number,
    nextEventCheckAt: number,
    lastEventCheckAt?: number,
  ) => ({
    artist,
    priorityScore,
    nextEventCheckAt,
    lastEventCheckAt: lastEventCheckAt ?? null,
    lastEventSeenAt: priorityScore >= 90 ? 9_000 : undefined,
    firstSeenAt: lastEventCheckAt === undefined ? 10_000 : 1_000,
  });
  const queue = selectAdaptiveArtistQueue([
    ...Array.from({ length: 12 }, (_, index) => candidate(`Hot ${index}`, 100 - index, 5_000 + index, 8_000)),
    candidate('New debut', 72, 9_000),
    candidate('Longest waiting tail', 35, 1, 100),
    candidate('Recent tail', 30, 8_500, 8_000),
  ], 8);

  assert.equal(queue.length, 8);
  assert.ok(queue.some((artist) => artist.artist === 'New debut'));
  assert.ok(queue.some((artist) => artist.artist === 'Longest waiting tail'));
  assert.ok(queue.filter((artist) => artist.priorityScore >= 90).length >= 4);
});

test('keeps dynamically learned artists in the public event catalog', async () => {
  const { recordArtistEvidence } = await import('../db/artists.ts');
  const { getUpcomingCatalogEvents, upsertDiscoveredEvents } = await import('../db/events.ts');
  recordArtistEvidence({
    canonicalName: 'New Wave Unit',
    artistType: 'group',
    sourceId: 'musicbrainz',
    externalId: '00000000-0000-0000-0000-000000000001',
    confidenceScore: 88,
    priorityScore: 90,
    verified: true,
  });
  const startsAt = new Date(Date.now() + 60 * 86_400_000).toISOString();
  upsertDiscoveredEvents([{
    provider: 'test-provider',
    providerEventId: 'new-wave-live',
    name: 'New Wave Unit Asia Tour',
    artist: 'New Wave Unit',
    startsAt,
    countryCode: 'TH',
    officialUrl: '/events/test-provider:new-wave-live',
    confidence: 'reported',
  }]);
  assert.ok(getUpcomingCatalogEvents(500).some((event) => event.artist === 'New Wave Unit'));
});

test('does not attach a same-name person identity to an established group', async () => {
  const { getDb } = await import('../db/index.ts');
  const { recordArtistEvidence } = await import('../db/artists.ts');
  const group = recordArtistEvidence({
    canonicalName: 'Identity Guard', artistType: 'group', sourceId: 'musicbrainz',
    externalId: '00000000-0000-0000-0000-000000000099', confidenceScore: 94,
    priorityScore: 80, verified: true,
  })!;
  recordArtistEvidence({
    canonicalName: 'Identity Guard', artistType: 'person', sourceId: 'wikidata',
    externalId: 'Q999999998', confidenceScore: 96, priorityScore: 80, verified: true,
  });
  const source = getDb().prepare(`
    SELECT 1 FROM artist_sources WHERE artist_id = ? AND source_id = 'wikidata'
  `).get(group.id);
  assert.equal(source, undefined);
});

test('does not infer ambiguous stage names from unrelated event prose', async () => {
  const {
    bindArtistProviderIdentity,
    canonicalCatalogArtistName,
    completeArtistIdentityCandidate,
    getDueArtistIdentityCandidates,
    matchCatalogArtistInText,
    observeArtistIdentityCandidates,
    recordArtistEvidence,
    retainKnownKpopEvents,
  } = await import('../db/artists.ts');
  assert.equal(canonicalCatalogArtistName('KEY'), 'KEY');
  assert.equal(matchCatalogArtistInText('LOCK & KEY IV: Bike Thief'), undefined);
  const lucy = recordArtistEvidence({
    canonicalName: 'LUCY',
    artistType: 'group',
    tags: ['k-pop'],
    sourceId: 'musicbrainz',
    externalId: 'test-LUCY',
    confidenceScore: 90,
    priorityScore: 90,
    verified: true,
  })!;
  recordArtistEvidence({
    canonicalName: 'Haee',
    artistType: 'person',
    sourceId: 'musicbrainz',
    externalId: 'test-Haee',
    confidenceScore: 90,
    priorityScore: 90,
    verified: true,
  });
  const lucyEvent = {
    provider: 'ticketmaster-discovery',
    providerEventId: 'lucy-singapore',
    name: '2026 LUCY 9TH CONCERT ISLAND ENCORE IN SINGAPORE',
    artist: 'LUCY',
    artistType: 'group' as const,
    artistProviderId: 'ticketmaster-lucy',
    startsAt: '2026-11-14T10:00:00Z',
    countryCode: 'SG',
    officialUrl: 'https://ticketmaster.sg/lucy',
    confidence: 'official' as const,
  };
  assert.equal(bindArtistProviderIdentity({
    provider: lucyEvent.provider,
    providerArtistId: lucyEvent.artistProviderId,
    artistId: lucy.id,
    artistType: 'group',
    confidenceScore: 92,
  }), true);
  assert.equal(retainKnownKpopEvents([lucyEvent])[0]?.artist, 'LUCY');
  assert.equal(retainKnownKpopEvents([{ ...lucyEvent, name: 'KEY TO LIT', artist: 'KEY' }]).length, 0);
  recordArtistEvidence({
    canonicalName: 'Bini',
    artistType: 'person',
    sourceId: 'wikidata',
    externalId: 'Q16083125',
    confidenceScore: 82,
    priorityScore: 70,
    verified: true,
  });
  assert.equal(retainKnownKpopEvents([{
    ...lucyEvent,
    providerEventId: 'bini-singapore',
    name: 'BINI SIGNALS WORLD TOUR 2026 SINGAPORE',
    artist: 'Bini',
    artistType: 'group',
    artistProviderId: 'ticketmaster-bini-group',
  }]).length, 0);
  observeArtistIdentityCandidates([{
    ...lucyEvent,
    providerEventId: 'future-band-singapore',
    name: '2026 FUTURE BAND ENCORE CONCERT IN SINGAPORE',
    artist: 'Future Band',
    artistType: 'group',
    artistProviderId: 'ticketmaster-future-band',
    classificationTags: ['K-Pop'],
  }, {
    ...lucyEvent,
    providerEventId: 'bini-singapore',
    name: 'BINI SIGNALS WORLD TOUR 2026 SINGAPORE',
    artist: 'Bini',
    artistType: 'group',
    artistProviderId: 'ticketmaster-bini-group',
  }]);
  const candidates = getDueArtistIdentityCandidates(2);
  assert.equal(candidates[0]?.artistName, 'Future Band');
  completeArtistIdentityCandidate(candidates[0], 'no_match', undefined, 1_000);
  assert.ok(!getDueArtistIdentityCandidates(10, 1_001)
    .some((candidate) => candidate.artistName === 'Future Band'));
  recordArtistEvidence({
    canonicalName: 'Phantom',
    artistType: 'group',
    sourceId: 'wikidata',
    externalId: 'Q7180539',
    confidenceScore: 90,
    priorityScore: 60,
    verified: true,
  });
  assert.equal(retainKnownKpopEvents([{
    ...lucyEvent,
    provider: 'predicthq',
    providerEventId: 'phantom-au',
    name: 'Phantom',
    artist: 'Phantom',
    artistType: undefined,
    artistProviderId: undefined,
  }]).length, 0);

  recordArtistEvidence({
    canonicalName: 'Belle', artistType: 'person', countryCode: 'KR',
    tags: ['k-pop'], sourceId: 'wikidata', externalId: 'Q-belle-test',
    confidenceScore: 92, priorityScore: 70, verified: true,
  });
  assert.equal(retainKnownKpopEvents([{
    ...lucyEvent,
    providerEventId: 'belle-and-sebastian-au',
    name: "Belle and Sebastian - If You're Feeling Sinister 30th Anniversary Tour",
    artist: 'Belle and Sebastian',
    artistType: 'group',
    artistProviderId: 'ticketmaster-belle-and-sebastian',
    countryCode: 'AU',
  }]).length, 0);

  const fia = recordArtistEvidence({
    canonicalName: 'FiA', artistType: 'person', countryCode: 'KR', tags: [],
    sourceId: 'musicbrainz', externalId: 'mbid-fia-test', confidenceScore: 92,
    priorityScore: 70, verified: true,
  })!;
  bindArtistProviderIdentity({
    provider: 'ticketmaster-discovery', providerArtistId: 'ticketmaster-fia',
    artistId: fia.id, artistType: 'person', confidenceScore: 92,
  });
  assert.equal(retainKnownKpopEvents([{
    ...lucyEvent,
    providerEventId: 'fia-love-me-nz',
    name: 'FIA - The Love Me Tour',
    artist: 'FIA',
    artistType: 'person',
    artistProviderId: 'ticketmaster-fia',
    countryCode: 'NZ',
  }]).length, 0);

  recordArtistEvidence({
    canonicalName: 'Same Name Unit', artistType: 'group', countryCode: 'KR',
    tags: ['k-pop'], sourceId: 'musicbrainz', externalId: 'mbid-same-name-unit',
    confidenceScore: 96, priorityScore: 70, verified: true,
  });
  assert.equal(retainKnownKpopEvents([{
    ...lucyEvent,
    providerEventId: 'unreviewed-same-name-attraction',
    name: 'SAME NAME UNIT WORLD TOUR',
    artist: 'Same Name Unit',
    artistType: 'group',
    artistProviderId: 'ticketmaster-unreviewed-same-name-unit',
    classificationTags: ['K-Pop'],
  }]).length, 0);

  assert.equal(observeArtistIdentityCandidates([{
    ...lucyEvent,
    providerEventId: 'nfl-kickoff',
    name: 'NFL Kickoff Festival',
    artist: 'NFL',
    artistType: 'group',
    artistProviderId: 'ticketmaster-nfl',
    classificationTags: ['Music'],
  }]), 0);
});
