import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DiscoveryInputError,
  normalizeDiscoveryQuery,
} from '../lib/sources/query.ts';

test('normalizes an artist search and APAC market code', () => {
  const query = normalizeDiscoveryQuery(new URLSearchParams({
    artist: '  RIIZE  ',
    countryCode: 'sg',
    startDateTime: '2026-08-22T00:00:00Z',
    endDateTime: '2027-02-18T00:00:00Z',
  }));
  assert.deepEqual(query, {
    artist: 'RIIZE',
    city: undefined,
    countryCode: 'SG',
    startDateTime: '2026-08-22T00:00:00Z',
    endDateTime: '2027-02-18T00:00:00Z',
  });
});

test('rejects empty artist searches and non-APAC markets', () => {
  assert.throws(
    () => normalizeDiscoveryQuery(new URLSearchParams()),
    DiscoveryInputError,
  );
  assert.throws(
    () => normalizeDiscoveryQuery(new URLSearchParams({ artist: 'aespa', countryCode: 'US' })),
    /Asia-Pacific/,
  );
});

test('rejects inverted or unbounded date ranges', () => {
  assert.throws(
    () => normalizeDiscoveryQuery(new URLSearchParams({
      artist: 'IVE',
      startDateTime: '2027-01-01T00:00:00Z',
      endDateTime: '2026-01-01T00:00:00Z',
    })),
    /after/,
  );
  assert.throws(
    () => normalizeDiscoveryQuery(new URLSearchParams({
      artist: 'IVE',
      startDateTime: '2026-01-01T00:00:00Z',
      endDateTime: '2028-01-01T00:00:00Z',
    })),
    /370 days/,
  );
});
