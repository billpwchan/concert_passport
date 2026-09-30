import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { scoreCandidate } from '../lib/sources/link-resolution/matcher.ts';
import { inspectCandidatePage, parseEventPage } from '../lib/sources/link-resolution/page-inspector.ts';
import { isTrustedOfficialUrl } from '../lib/sources/link-resolution/trusted-sources.ts';
import type { EventLinkCandidate, ResolvableEvent } from '../lib/sources/link-resolution/types.ts';

const event: ResolvableEvent = {
  id: 'predicthq:ive-taipei',
  name: 'IVE WORLD TOUR SHOW WHAT I AM IN TAIPEI',
  artist: 'IVE',
  startsAt: '2026-09-11T11:00:00Z',
  timezone: 'Asia/Taipei',
  venue: 'Taipei Arena',
  city: 'Taipei',
  countryCode: 'TW',
};

const candidate: EventLinkCandidate = {
  url: 'https://tixcraft.com/activity/detail/26_ive',
  sourceId: 'tixcraft',
  sourceEventId: '26_ive',
  role: 'ticket',
  authority: 'seller',
  discoveredBy: 'official-catalog',
  data: {
    name: 'IVE WORLD TOUR SHOW WHAT I AM IN TAIPEI',
    artist: 'IVE',
    startsAt: '2026-09-11T19:00:00+08:00',
    venue: 'Taipei Arena',
    countryCode: 'TW',
  },
};

test('accepts official subdomains and rejects deceptive host suffixes', () => {
  assert.equal(isTrustedOfficialUrl('https://main.login.ticketmaster.sg/activity/detail/26sg_itzy'), true);
  assert.equal(isTrustedOfficialUrl('https://ticketmaster.sg.evil.example/activity/detail/26sg_itzy'), false);
  assert.equal(isTrustedOfficialUrl('http://ticketmaster.sg/activity/detail/26sg_itzy'), false);
});

test('extracts schema Event identity, venue and direct offers URL', () => {
  const html = `
    <html><head><link rel="canonical" href="https://www.livenation.com.tw/event/ive-taipei">
    <script type="application/ld+json">{
      "@context":"https://schema.org","@type":"Event","name":"IVE WORLD TOUR in Taipei",
      "image":{"@type":"ImageObject","url":"https://www.livenation.com.tw/media/ive-tour.jpg"},
      "startDate":"2026-09-11T19:00:00+08:00",
      "performer":{"@type":"MusicGroup","name":"IVE"},
      "location":{"@type":"Place","name":"Taipei Arena","address":{"addressLocality":"Taipei","addressCountry":"TW"}},
      "offers":{"@type":"Offer","url":"https://tixcraft.com/activity/detail/26_ive","validFrom":"2026-07-01T12:00:00+08:00"}
    }</script></head></html>`;
  const parsed = parseEventPage(html, 'https://www.livenation.com.tw/event/ive-taipei');
  assert.equal(parsed.data.artist, 'IVE');
  assert.equal(parsed.data.venue, 'Taipei Arena');
  assert.equal(parsed.offerUrl, 'https://tixcraft.com/activity/detail/26_ive');
  assert.equal(parsed.data.saleStartsAt, '2026-07-01T12:00:00+08:00');
  assert.equal(parsed.data.imageUrl, 'https://www.livenation.com.tw/media/ive-tour.jpg');
  assert.equal(parsed.data.imageSourceUrl, 'https://www.livenation.com.tw/event/ive-taipei');
});

test('uses Open Graph art only when the page identifies one structured event', () => {
  const parsed = parseEventPage(`
    <script type="application/ld+json">{"@type":"MusicEvent","name":"IVE Tour","startDate":"2026-09-06T18:00:00+08:00"}</script>
    <meta property="og:image" content="/assets/tour-key-art.webp">
    <meta property="og:image:width" content="1600">
    <meta property="og:image:height" content="900">
  `, 'https://tixcraft.com/activity/detail/26_ive');
  assert.equal(parsed.data.imageUrl, 'https://tixcraft.com/assets/tour-key-art.webp');
  assert.equal(parsed.data.imageWidth, 1600);
  assert.equal(parsed.data.imageHeight, 900);
});

test('keeps an event-specific seller path when page canonical points to a generic listing', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(`
    <html><head><link rel="canonical" href="https://eplus.jp/sf/detail/4560670001">
    <title>BOYNEXTDOOR 2026/9/9</title></head></html>
  `, { status: 200, headers: { 'content-type': 'text/html' } })) as typeof fetch;
  try {
    const inspected = await inspectCandidatePage('https://eplus.jp/sf/detail/4560670001-P0030004P021001?P6=001');
    assert.equal(inspected.canonicalUrl, 'https://eplus.jp/sf/detail/4560670001-P0030004P021001?P6=001');
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('publishes a unique exact match and quarantines a conflicting date', () => {
  const inspection = {
    requestedUrl: candidate.url,
    canonicalUrl: candidate.url,
    httpStatus: 200,
    fetched: true,
    data: candidate.data,
  };
  const exact = scoreCandidate(event, candidate, inspection);
  assert.equal(exact.state, 'verified');
  assert.equal(exact.resolvedRole, 'ticket');
  assert.ok(exact.score >= 90);

  const conflict = scoreCandidate(event, candidate, {
    ...inspection,
    data: { ...candidate.data, startsAt: '2026-09-19T19:00:00+08:00' },
  });
  assert.equal(conflict.state, 'quarantined');
  assert.ok(conflict.conflicts.includes('date'));

  const unavailableCatalogPage = scoreCandidate(event, candidate, {
    requestedUrl: candidate.url,
    canonicalUrl: candidate.url,
    httpStatus: 403,
    fetched: false,
    failureCode: 'http_403',
    data: {},
  });
  assert.equal(unavailableCatalogPage.state, 'quarantined');

  const providerAssertion = scoreCandidate(event, {
    ...candidate,
    discoveredBy: 'ticketmaster',
  }, {
    requestedUrl: candidate.url,
    canonicalUrl: candidate.url,
    fetched: false,
    data: {},
  });
  assert.equal(providerAssertion.state, 'verified');
  assert.ok(providerAssertion.reasons.includes('provider_asserted'));
});

test('normalizes localized country names without weakening date identity', () => {
  const localized = scoreCandidate({ ...event, countryCode: 'JP' }, {
    ...candidate,
    data: { ...candidate.data, countryCode: '日本' },
  }, {
    requestedUrl: candidate.url,
    canonicalUrl: candidate.url,
    fetched: true,
    data: { ...candidate.data, countryCode: '日本' },
  });
  assert.equal(localized.state, 'verified');
  assert.ok(!localized.conflicts.includes('country'));
});

test('persists verified evidence, selects the link and versions authoritative corrections', async () => {
  process.env.CONCERT_PASSPORT_DB_PATH = join(tmpdir(), `concert-passport-link-test-${crypto.randomUUID()}.sqlite`);
  const { upsertDiscoveredEvents } = await import('../db/events.ts');
  const { getDb } = await import('../db/index.ts');
  const {
    getEventsForLinkResolution,
    publishBestLinkAndReconcile,
    recordLinkEvidence,
  } = await import('../db/link-resolution.ts');

  upsertDiscoveredEvents([{
    provider: 'predicthq',
    providerEventId: 'ive-taipei',
    name: event.name,
    artist: event.artist,
    startsAt: event.startsAt,
    timezone: event.timezone,
    venue: 'Reported Arena Name',
    city: event.city,
    countryCode: event.countryCode,
    officialUrl: '/events/predicthq%3Aive-taipei',
    confidence: 'reported',
  }]);
  const stored = getEventsForLinkResolution(1, new Date('2026-08-22T00:00:00Z'))[0];
  const scored = scoreCandidate(stored, candidate, {
    requestedUrl: candidate.url,
    canonicalUrl: candidate.url,
    httpStatus: 200,
    fetched: true,
    data: candidate.data,
  });
  recordLinkEvidence(stored.id, scored);
  const reconciled = publishBestLinkAndReconcile(stored, scored);
  assert.ok(reconciled >= 1);

  const row = getDb().prepare(`
    SELECT best_link_url AS url, best_link_role AS role, venue, starts_at AS startsAt
    FROM canonical_events WHERE id = ?
  `).get(stored.id) as { url: string; role: string; venue: string; startsAt: string };
  assert.equal(row.url, candidate.url);
  assert.equal(row.role, 'ticket');
  assert.equal(row.venue, 'Taipei Arena');
  assert.equal(row.startsAt, '2026-09-11T11:00:00.000Z');
  assert.equal((getDb().prepare('SELECT COUNT(*) AS count FROM event_link_evidence').get() as { count: number }).count, 1);
  assert.equal((getDb().prepare("SELECT COUNT(*) AS count FROM event_versions WHERE change_type = 'authority_reconciled'").get() as { count: number }).count, 1);

  recordLinkEvidence(stored.id, { ...scored, state: 'quarantined' });
  const revoked = getDb().prepare(`
    SELECT best_link_url AS url, best_link_verified_at AS verifiedAt
    FROM canonical_events WHERE id = ?
  `).get(stored.id) as { url: string | null; verifiedAt: number | null };
  assert.equal(revoked.url, null);
  assert.equal(revoked.verifiedAt, null);
});

test('interprets timezone-less official page times in the venue timezone', async () => {
  const linkRepository = await import('../db/link-resolution.ts');
  const { upsertDiscoveredEvents } = await import('../db/events.ts');
  const { getDb } = await import('../db/index.ts');
  const localEvent = {
    id: 'predicthq:rose-sg',
    name: 'ROSETOPIA IN SINGAPORE',
    artist: 'The Rose',
    startsAt: '2026-10-27T10:00:00Z',
    timezone: 'Asia/Singapore',
    venue: 'The Star Theatre',
    city: 'Singapore',
    countryCode: 'SG',
  };
  upsertDiscoveredEvents([{
    provider: 'predicthq', providerEventId: 'rose-sg', name: localEvent.name,
    artist: localEvent.artist, startsAt: localEvent.startsAt, timezone: localEvent.timezone,
    venue: localEvent.venue, city: localEvent.city, countryCode: localEvent.countryCode,
    officialUrl: '/events/predicthq%3Arose-sg', confidence: 'reported',
  }]);
  const stored = linkRepository.getEventsForLinkResolution(10, new Date('2026-08-22T00:00:00Z'))
    .find((item) => item.id === localEvent.id)!;
  const result = scoreCandidate(stored, {
    url: 'https://bookmyshow.sg/en/events/rose/ROSE2026', sourceId: 'bookmyshow',
    role: 'ticket', authority: 'seller', discoveredBy: 'official-catalog',
    data: { artist: 'The Rose', name: localEvent.name, startsAt: '2026-10-27T19:30:52', venue: localEvent.venue, countryCode: 'SG' },
  }, {
    requestedUrl: 'https://bookmyshow.sg/en/events/rose/ROSE2026',
    canonicalUrl: 'https://bookmyshow.sg/en/events/rose/ROSE2026', fetched: true,
    data: { artist: 'The Rose', name: localEvent.name, startsAt: '2026-10-27T19:30:52', venue: localEvent.venue, countryCode: 'SG' },
  });
  linkRepository.publishBestLinkAndReconcile(stored, result);
  const row = getDb().prepare('SELECT starts_at AS startsAt FROM canonical_events WHERE id = ?').get(stored.id) as { startsAt: string };
  assert.equal(row.startsAt, '2026-10-27T11:30:00.000Z');
});

test('keeps quarantined links out of the queue until exponential retry is due', async () => {
  const linkRepository = await import('../db/link-resolution.ts');
  const { upsertDiscoveredEvents } = await import('../db/events.ts');
  const { getDb } = await import('../db/index.ts');
  const startsAt = new Date(Date.now() + 30 * 86_400_000).toISOString();
  upsertDiscoveredEvents([{
    provider: 'predicthq', providerEventId: 'retry-backoff', name: 'IVE RETRY TEST',
    artist: 'IVE', startsAt, timezone: 'Asia/Singapore', venue: 'Test Hall',
    city: 'Singapore', countryCode: 'SG', officialUrl: '/events/retry-backoff', confidence: 'reported',
  }]);
  const stored = linkRepository.getEventsForLinkResolution(100)
    .find((item) => item.id === 'predicthq:retry-backoff')!;
  const quarantined = scoreCandidate(stored, {
    url: 'https://ticketmaster.sg/activity/detail/26_retry', sourceId: 'ticketmaster-sg',
    role: 'ticket', authority: 'seller', discoveredBy: 'searxng',
    data: { artist: 'IVE', name: 'Different event', startsAt: new Date(Date.now() + 80 * 86_400_000).toISOString(), countryCode: 'SG' },
  }, {
    requestedUrl: 'https://ticketmaster.sg/activity/detail/26_retry',
    canonicalUrl: 'https://ticketmaster.sg/activity/detail/26_retry', fetched: true,
    data: { artist: 'IVE', name: 'Different event', startsAt: new Date(Date.now() + 80 * 86_400_000).toISOString(), countryCode: 'SG' },
  });
  assert.equal(quarantined.state, 'quarantined');
  linkRepository.recordLinkEvidence(stored.id, quarantined);
  assert.ok(!linkRepository.getEventsForLinkResolution(100, new Date(Date.now() + 60 * 60_000)).some((item) => item.id === stored.id));
  assert.ok(linkRepository.getEventsForLinkResolution(100, new Date(Date.now() + 7 * 60 * 60_000)).some((item) => item.id === stored.id));
  linkRepository.recordLinkEvidence(stored.id, quarantined);
  const retry = getDb().prepare(`
    SELECT retry_count AS retryCount, next_check_at - last_checked_at AS delay
    FROM event_link_evidence WHERE event_id = ?
  `).get(stored.id) as { retryCount: number; delay: number };
  assert.equal(retry.retryCount, 2);
  assert.equal(retry.delay, 12 * 60 * 60_000);
});
