import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPredictHqSearchWindows,
  buildTicketmasterQueries,
} from '../lib/sources/coverage-windows.ts';

const yearQuery = {
  countryCode: 'SG',
  startDateTime: '2026-08-23T00:00:00Z',
  endDateTime: '2027-08-23T00:00:00Z',
};

test('uses a stable attraction identity for a bounded global Ticketmaster artist search', () => {
  const queries = buildTicketmasterQueries(
    { ...yearQuery, countryCode: undefined, artist: 'ITZY' },
    undefined,
    'K8vZ9172dB7',
  );
  assert.equal(queries.length, 3);
  assert.ok(queries.every((query) => query.get('attractionId') === 'K8vZ9172dB7'));
  assert.ok(queries.every((query) => !query.has('keyword') && !query.has('countryCode')));
});

test('keeps a country-scoped attraction search to one page', () => {
  const queries = buildTicketmasterQueries(
    { ...yearQuery, countryCode: 'SG', artist: 'ITZY' },
    undefined,
    'K8vZ9172dB7',
  );
  assert.equal(queries.length, 1);
  assert.equal(queries[0]?.get('countryCode'), 'SG');
  assert.equal(queries[0]?.get('attractionId'), 'K8vZ9172dB7');
});

test('combines a focused K-pop query with bounded broad Ticketmaster pages', () => {
  const queries = buildTicketmasterQueries(yearQuery, 3);
  assert.equal(queries.length, 4);
  assert.equal(queries[0].get('classificationName'), 'K-Pop');
  assert.deepEqual(queries.slice(1).map((query) => query.get('page')), ['0', '1', '2']);
  assert.equal(buildTicketmasterQueries({ ...yearQuery, countryCode: 'JP' }).length, 0);
});

test('splits PredictHQ market sweeps into complete non-overlapping date windows', () => {
  const windows = buildPredictHqSearchWindows(yearQuery, 8);
  assert.equal(windows.length, 8);
  assert.equal(windows[0].startDateTime, yearQuery.startDateTime);
  assert.equal(windows.at(-1)?.endDateTime, yearQuery.endDateTime);
  windows.slice(1).forEach((window, index) => {
    const previousEnd = Date.parse(windows[index].endDateTime!);
    assert.equal(Date.parse(window.startDateTime!), previousEnd + 1_000);
  });
  assert.equal(buildPredictHqSearchWindows({ ...yearQuery, artist: 'IVE' }, 8).length, 1);
});
