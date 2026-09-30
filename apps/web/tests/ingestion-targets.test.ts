import assert from 'node:assert/strict';
import test from 'node:test';
import { selectIngestionTargets } from '../lib/sources/ingestion-targets.ts';

test('prioritizes followed artists only when their catalog refresh is due', () => {
  const targets = selectIngestionTargets(
    [
      { artist: 'ITZY', market: 'SG' },
      { artist: 'BLACKPINK', market: 'HK' },
      { artist: 'Not Due', market: 'JP' },
    ],
    [
      { artist: 'ITZY', market: 'ALL' },
      { artist: 'BLACKPINK', market: 'ALL' },
      { artist: 'NewJeans', market: 'ALL' },
    ],
    3,
  );

  assert.deepEqual(targets, [
    { artist: 'ITZY', market: 'SG' },
    { artist: 'BLACKPINK', market: 'HK' },
    { artist: 'NewJeans', market: 'ALL' },
  ]);
});

test('deduplicates followed pairs and enforces the run budget', () => {
  const targets = selectIngestionTargets(
    [
      { artist: 'ITZY', market: 'SG' },
      { artist: 'ITZY', market: 'SG' },
      { artist: 'ITZY', market: 'TW' },
    ],
    [
      { artist: 'ITZY', market: 'ALL' },
      { artist: 'IVE', market: 'ALL' },
    ],
    2,
  );

  assert.deepEqual(targets, [
    { artist: 'ITZY', market: 'SG' },
    { artist: 'ITZY', market: 'TW' },
  ]);
});
