import assert from 'node:assert/strict';
import test from 'node:test';

import { demoJourneys } from '../lib/domain/demo.ts';
import {
  createAlertSchedule,
  formatTravelDateRange,
  formatVenueTime,
  getJourneyProgress,
  getNextMilestone,
  sumDistanceKm,
} from '../lib/domain/lifecycle.ts';
import { isVerifiedOfficialHost, sourceRegistry } from '../lib/sources/registry.ts';

test('chooses the earliest incomplete milestone that has not closed', () => {
  const journey = demoJourneys[0];
  const next = getNextMilestone(journey, new Date('2026-08-22T12:00:00+08:00'));

  assert.equal(next?.id, 'riize-hkg-registration');
});

test('creates four deterministic alerts relative to a milestone deadline', () => {
  const milestone = demoJourneys[0].milestones[1];
  const alerts = createAlertSchedule(milestone);

  assert.deepEqual(alerts, [
    '2026-08-21T15:59:00.000Z',
    '2026-08-22T13:59:00.000Z',
    '2026-08-22T15:49:00.000Z',
    '2026-08-22T15:59:00.000Z',
  ]);
});

test('formats an instant in the venue timezone without changing the instant', () => {
  assert.equal(
    formatVenueTime('2026-12-14T12:00:00Z', 'Asia/Hong_Kong'),
    '14 Dec · 20:00',
  );
});

test('formats travel ranges with stable cross-runtime spacing', () => {
  const label = formatTravelDateRange(
    '2026-08-22T03:42:00Z',
    '2027-02-18T03:42:00Z',
  );

  assert.equal(label, '22 Aug 2026 – 18 Feb 2027');
  assert.equal(/[\u00a0\u2000-\u200b\u202f]/u.test(label), false);
});

test('calculates progress and lifetime distance from explicit records', () => {
  assert.deepEqual(getJourneyProgress(demoJourneys[0]), { complete: 1, total: 6 });
  assert.equal(sumDistanceKm([{ travelDistanceKm: 2_589 }, { travelDistanceKm: 4_667 }]), 7_256);
});

test('official host verification accepts owned subdomains and rejects lookalikes', () => {
  assert.equal(isVerifiedOfficialHost('weverse.io'), true);
  assert.equal(isVerifiedOfficialHost('notice.weverse.io'), true);
  assert.equal(isVerifiedOfficialHost('weverse.io.example.com'), false);
  assert.equal(isVerifiedOfficialHost('weverse-login.io'), false);
});

test('source registry has unique ids and a tier-one path in every launch market', () => {
  const launchMarkets = ['SG', 'HK', 'JP', 'TW', 'TH', 'KR', 'MY', 'PH', 'ID', 'VN', 'AU', 'NZ'];
  assert.equal(new Set(sourceRegistry.map((source) => source.id)).size, sourceRegistry.length);

  for (const market of launchMarkets) {
    assert.ok(
      sourceRegistry.some(
        (source) =>
          source.markets.includes(market as never) &&
          source.tier === 1 &&
          (source.category === 'ticketing' || source.category === 'promoter'),
      ),
      `missing a tier-one official path for ${market}`,
    );
  }
});
