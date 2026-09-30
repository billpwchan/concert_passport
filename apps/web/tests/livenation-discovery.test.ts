import assert from 'node:assert/strict';
import test from 'node:test';
import { parseLiveNationArtistPage } from '../lib/sources/adapters/livenation-parser.ts';

const eventNode = (id: string, startsAt: string, eventStatus?: string) => JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'MusicEvent',
  name: "BTS WORLD TOUR 'ARIRANG' IN HONG KONG",
  performers: [{ '@type': 'MusicGroup', name: 'BTS' }],
  startDate: startsAt,
  eventStatus,
  url: `https://www.livenation.com/event/${id}/bts-world-tour-arirang-in-hong-kong`,
  location: {
    '@type': 'Place',
    name: 'Kai Tak Stadium',
    address: { addressLocality: 'Hong Kong', addressCountry: 'Hong Kong' },
    geo: { latitude: 22.3193, longitude: 114.1978 },
  },
});

test('retains official postponed status for a still-visible Live Nation date', () => {
  const html = `<script type="application/ld+json">${eventNode(
    'intl_postponed',
    '2027-03-04T19:30:00+08:00',
    'https://schema.org/EventPostponed',
  )}</script>`;
  const [event] = parseLiveNationArtistPage(html, 'BTS', {
    artist: 'BTS', startDateTime: '2026-01-01T00:00:00Z', countryCode: 'HK',
  });
  assert.equal(event?.lifecycleStatus, 'postponed');
});

test('extracts all APAC dates from an official Live Nation artist calendar', () => {
  const html = `<html><body>
    <script type="application/ld+json">${eventNode('intl_1675688', '2027-03-04T19:30:00+08:00')}</script>
    <script type="application/ld+json">${eventNode('intl_1675927', '2027-03-06T19:30:00+08:00')}</script>
    <script type="application/ld+json">${eventNode('intl_1675932', '2027-03-07T19:30:00+08:00')}</script>
  </body></html>`;
  const events = parseLiveNationArtistPage(html, 'BTS', {
    artist: 'BTS',
    startDateTime: '2026-08-23T00:00:00Z',
    endDateTime: '2027-08-23T00:00:00Z',
  });
  assert.equal(events.length, 3);
  assert.deepEqual(events.map((event) => event.providerEventId), [
    'intl_1675688', 'intl_1675927', 'intl_1675932',
  ]);
  assert.ok(events.every((event) => event.countryCode === 'HK'));
  assert.ok(events.every((event) => event.venue === 'Kai Tak Stadium'));
  assert.ok(events.every((event) => event.bestLinkRole === 'event'));
});

test('rejects same-page non-matching performers and out-of-window shows', () => {
  const wrongArtist = eventNode('intl_wrong', '2027-03-04T19:30:00+08:00').replace('"BTS"', '"ABTS"');
  const html = `<script type="application/ld+json">${wrongArtist}</script>
    <script type="application/ld+json">${eventNode('intl_old', '2025-03-04T19:30:00+08:00')}</script>`;
  assert.deepEqual(parseLiveNationArtistPage(html, 'BTS', {
    artist: 'BTS', startDateTime: '2026-01-01T00:00:00Z', countryCode: 'HK',
  }), []);
});
