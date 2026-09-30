import assert from 'node:assert/strict';
import test from 'node:test';
import { officialCalendarAdapter } from '../lib/sources/adapters/official-calendar.ts';

test('returns exact official calendar dates for a bounded market search', async () => {
  const events = await officialCalendarAdapter.discover({
    countryCode: 'SG',
    startDateTime: '2026-12-18T00:00:00Z',
    endDateTime: '2026-12-21T23:59:59Z',
  });

  assert.deepEqual(events.map((event) => event.startsAt), [
    '2026-12-19T19:00:00+08:00',
    '2026-12-20T19:00:00+08:00',
  ]);
  assert.ok(events.every((event) => (
    event.provider === 'official-event-calendar'
    && event.confidence === 'official'
    && event.bestLinkVerifiedAt === undefined
    && event.sourceObservedAt === Date.parse('2026-08-25T04:22:00Z')
  )));
});

test('filters the official calendar by exact artist identity', async () => {
  const events = await officialCalendarAdapter.discover({
    artist: 'BABYMONSTER',
    startDateTime: '2026-09-01T00:00:00Z',
    endDateTime: '2026-12-31T23:59:59Z',
  });

  assert.equal(events.length, 6);
  assert.ok(events.every((event) => event.artist === 'BABYMONSTER'));
  assert.deepEqual([...new Set(events.map((event) => event.countryCode))].sort(), ['AU', 'ID', 'PH', 'TH']);
});

test('does not leak calendar entries into an unrelated city search', async () => {
  const events = await officialCalendarAdapter.discover({
    artist: 'BTS',
    city: 'Tokyo',
    startDateTime: '2026-01-01T00:00:00Z',
    endDateTime: '2026-12-31T23:59:59Z',
  });
  assert.deepEqual(events, []);
});

test('preserves each officially published Taipei performance time', async () => {
  const events = await officialCalendarAdapter.discover({
    artist: 'IVE',
    city: 'Taipei',
    startDateTime: '2026-09-11T00:00:00Z',
    endDateTime: '2026-09-13T23:59:59Z',
  });
  assert.deepEqual(events.map((event) => event.startsAt), [
    '2026-09-11T19:00:00+08:00',
    '2026-09-12T18:00:00+08:00',
    '2026-09-13T18:00:00+08:00',
  ]);
});
