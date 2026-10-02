import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';

process.env.CONCERT_PASSPORT_DB_PATH = join(
  tmpdir(),
  `concert-passport-automation-${crypto.randomUUID()}.sqlite`,
);

test('applies versioned migrations once and enforces scheduler leases', async () => {
  const { getDb } = await import('../db/index.ts');
  const { claimScheduledJob, finishScheduledJob } = await import('../db/scheduler.ts');
  const database = getDb();
  assert.equal(
    (database.prepare('SELECT COUNT(*) AS count FROM schema_migrations').get() as { count: number }).count,
    10,
  );
  const first = claimScheduledJob('event_ingestion', 60_000, 1_000);
  assert.ok(first);
  assert.equal(claimScheduledJob('event_ingestion', 60_000, 1_001), undefined);
  assert.equal(finishScheduledJob(first, 'completed', { eventsSeen: 2 }, undefined, 2_000), true);
  assert.ok(claimScheduledJob('event_ingestion', 60_000, 2_001));

  const expired = claimScheduledJob('artist_media_refresh', 100, 3_000);
  assert.ok(expired);
  assert.ok(claimScheduledJob('artist_media_refresh', 100, 3_101));
});

test('returns the persisted scheduler outcome to the isolated worker', async () => {
  process.env.INGESTION_CRON_SECRET = 'test-scheduler-secret-0123456789abcdef';
  try {
    const { runScheduledRoute } = await import('../lib/server/scheduled-job.ts');
    const response = await runScheduledRoute(
      new Request('http://internal.test/job', {
        method: 'POST',
        headers: { authorization: 'Bearer test-scheduler-secret-0123456789abcdef' },
      }),
      { jobName: 'partial-test-job', leaseMs: 60_000, failureMessage: 'failed' },
      async () => ({ body: { accepted: 3 }, outcome: 'partial' }),
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { accepted: 3, schedulerOutcome: 'partial' });
  } finally {
    delete process.env.INGESTION_CRON_SECRET;
  }
});

test('refuses scheduler runs with weak secrets or mismatched bearers', async () => {
  const { runScheduledRoute } = await import('../lib/server/scheduled-job.ts');
  let ran = 0;
  const run = (authorization?: string) => runScheduledRoute(
    new Request('http://internal.test/job', { method: 'POST', headers: authorization ? { authorization } : {} }),
    { jobName: 'secret-test-job', leaseMs: 60_000, failureMessage: 'failed' },
    async () => { ran += 1; return { body: {} }; },
  );
  try {
    for (const weak of ['replace-with-a-random-secret', 'x'.repeat(31)]) {
      process.env.INGESTION_CRON_SECRET = weak;
      assert.equal((await run(`Bearer ${weak}`)).status, 503);
    }
    process.env.INGESTION_CRON_SECRET = 'a'.repeat(64);
    assert.equal((await run()).status, 401);
    assert.equal((await run('Bearer short')).status, 401);
    assert.equal((await run(`Bearer ${'b'.repeat(64)}`)).status, 401);
    assert.equal(ran, 0);
    assert.equal((await run(`Bearer ${'a'.repeat(64)}`)).status, 200);
    assert.equal(ran, 1);
  } finally {
    delete process.env.INGESTION_CRON_SECRET;
  }
});

test('quarantines known identity mismatches and rejects new saves', async () => {
  const {
    getCanonicalEvent,
    getUpcomingCatalogEvents,
    saveEventForUser,
    upsertDiscoveredEvents,
  } = await import('../db/events.ts');
  const id = upsertDiscoveredEvents([{
    provider: 'ticketmaster-discovery',
    providerEventId: 'belle-sebastian-publication-guard',
    name: 'Belle and Sebastian Anniversary Tour',
    artist: 'Belle',
    artistType: 'person',
    artistProviderId: 'ticketmaster-belle-sebastian',
    startsAt: new Date(Date.now() + 40 * 86_400_000).toISOString(),
    city: 'Sydney',
    countryCode: 'AU',
    officialUrl: 'https://example.test/belle-sebastian',
    confidence: 'official',
  }])[0].canonicalId!;
  assert.equal(getCanonicalEvent(id)?.publicationQuarantined, true);
  assert.equal(getUpcomingCatalogEvents(500).some((event) => event.id === id), false);
  assert.equal(await saveEventForUser({
    user: { userId: 'identity-guard-user', email: 'guard@example.test', displayName: 'Guard' },
    eventId: id,
  }), false);
});

test('carries an active publication quarantine across canonical reconciliation', async () => {
  const { getDb } = await import('../db/index.ts');
  const { getCanonicalEvent, upsertDiscoveredEvents } = await import('../db/events.ts');
  const startsAt = new Date(Date.now() + 70 * 86_400_000).toISOString();
  const candidateId = upsertDiscoveredEvents([{
    provider: 'predicthq', providerEventId: 'quarantine-merge-candidate',
    name: 'IVE WORLD TOUR', artist: 'IVE', startsAt,
    venue: 'Singapore Indoor Stadium', city: 'Singapore', countryCode: 'SG',
    officialUrl: '/events/quarantine-merge-candidate', confidence: 'reported',
  }])[0].canonicalId!;
  getDb().prepare(`
    INSERT INTO event_publication_quarantine
      (event_id, reason, evidence_json, created_at)
    VALUES (?, 'test_review', '{}', ?)
  `).run(candidateId, Date.now());
  const winnerId = upsertDiscoveredEvents([{
    provider: 'ticketmaster-discovery', providerEventId: 'quarantine-merge-winner',
    name: 'IVE WORLD TOUR', artist: 'IVE', startsAt,
    venue: 'Singapore Indoor Stadium', city: 'Singapore', countryCode: 'SG',
    officialUrl: 'https://example.test/ive', confidence: 'official',
  }])[0].canonicalId!;
  assert.equal(getCanonicalEvent(winnerId)?.publicationQuarantined, true);
});

test('hides a cancelled sole-source event and restores it when the source becomes active', async () => {
  const { applyProviderEventTombstones } = await import('../db/provider-changes.ts');
  const {
    getCanonicalEvent,
    getUpcomingCatalogEvents,
    upsertDiscoveredEvents,
  } = await import('../db/events.ts');
  const startsAt = new Date(Date.now() + 60 * 86_400_000).toISOString();
  const event = {
    provider: 'predicthq',
    providerEventId: 'ive-cancel-test',
    name: 'IVE WORLD TOUR',
    artist: 'IVE',
    artistType: 'group' as const,
    startsAt,
    countryCode: 'SG',
    officialUrl: '/events/predicthq:ive-cancel-test',
    confidence: 'reported' as const,
    lifecycleStatus: 'scheduled' as const,
  };
  const id = upsertDiscoveredEvents([event])[0].canonicalId!;
  assert.equal(applyProviderEventTombstones('predicthq', [{
    providerEventId: event.providerEventId,
    lifecycleStatus: 'cancelled',
    reason: 'cancelled',
  }]), 1);
  assert.equal(getCanonicalEvent(id)?.lifecycleStatus, 'cancelled');
  assert.equal(getUpcomingCatalogEvents(500).some((candidate) => candidate.id === id), false);

  upsertDiscoveredEvents([event]);
  assert.equal(getCanonicalEvent(id)?.lifecycleStatus, 'scheduled');
  assert.equal(getUpcomingCatalogEvents(500).some((candidate) => candidate.id === id), true);
});

test('does not cancel a canonical event while another source remains active', async () => {
  const { applyProviderEventTombstones } = await import('../db/provider-changes.ts');
  const { getCanonicalEvent, upsertDiscoveredEvents } = await import('../db/events.ts');
  const startsAt = new Date(Date.now() + 80 * 86_400_000).toISOString();
  const common = {
    name: 'ITZY WORLD TOUR',
    artist: 'ITZY',
    artistType: 'group' as const,
    startsAt,
    venue: 'Singapore Indoor Stadium',
    city: 'Singapore',
    countryCode: 'SG',
    lifecycleStatus: 'scheduled' as const,
  };
  const id = upsertDiscoveredEvents([{
    ...common,
    provider: 'ticketmaster-discovery',
    providerEventId: 'itzy-active-source',
    officialUrl: 'https://ticketmaster.sg/itzy-active-source',
    confidence: 'official',
  }, {
    ...common,
    provider: 'predicthq',
    providerEventId: 'itzy-deleted-source',
    officialUrl: '/events/predicthq:itzy-deleted-source',
    confidence: 'reported',
  }])[0].canonicalId!;
  applyProviderEventTombstones('predicthq', [{
    providerEventId: 'itzy-deleted-source',
    lifecycleStatus: 'deleted',
    reason: 'duplicate',
  }]);
  assert.equal(getCanonicalEvent(id)?.lifecycleStatus, 'scheduled');
});

test('reconciles forward lifecycle updates by source authority', async () => {
  const { getCanonicalEvent, upsertDiscoveredEvents } = await import('../db/events.ts');
  const startsAt = new Date(Date.now() + 90 * 86_400_000).toISOString();
  const base = {
    name: 'NMIXX WORLD TOUR',
    artist: 'NMIXX',
    artistType: 'group' as const,
    startsAt,
    venue: 'Impact Arena',
    city: 'Bangkok',
    countryCode: 'TH',
  };
  const official = {
    ...base,
    provider: 'ticketmaster-discovery',
    providerEventId: 'nmixx-authoritative',
    officialUrl: 'https://ticketmaster.example/nmixx-authoritative',
    confidence: 'official' as const,
    lifecycleStatus: 'scheduled' as const,
  };
  const reported = {
    ...base,
    provider: 'predicthq',
    providerEventId: 'nmixx-reported',
    officialUrl: '/events/predicthq:nmixx-reported',
    confidence: 'reported' as const,
    lifecycleStatus: 'scheduled' as const,
  };
  const id = upsertDiscoveredEvents([official, reported])[0].canonicalId!;
  upsertDiscoveredEvents([{ ...reported, lifecycleStatus: 'cancelled' }]);
  assert.equal(getCanonicalEvent(id)?.lifecycleStatus, 'scheduled');
  upsertDiscoveredEvents([{ ...official, lifecycleStatus: 'cancelled' }]);
  assert.equal(getCanonicalEvent(id)?.lifecycleStatus, 'cancelled');
  upsertDiscoveredEvents([{ ...official, lifecycleStatus: 'rescheduled' }]);
  assert.equal(getCanonicalEvent(id)?.lifecycleStatus, 'rescheduled');
});

test('requests PredictHQ active and deleted changes inside a fixed update window', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = '';
  globalThis.fetch = (async (input: string | URL | Request) => {
    requestedUrl = String(input);
    return Response.json({
      next: null,
      results: [{
        id: 'active-itzy',
        title: 'ITZY WORLD TOUR',
        start: '2026-09-05T10:00:00Z',
        updated: '2026-08-23T10:10:00Z',
        state: 'active',
        country: 'TW',
        entities: [{ name: 'ITZY', type: 'organization' }],
      }, {
        id: 'deleted-itzy',
        title: 'ITZY WORLD TOUR',
        start: '2026-09-06T10:00:00Z',
        updated: '2026-08-23T10:11:00Z',
        state: 'deleted',
        deleted_reason: 'cancelled',
        country: 'TW',
      }],
    });
  }) as typeof fetch;
  process.env.CONCERT_PASSPORT_DATA_MODE = 'hybrid';
  process.env.PREDICTHQ_ACCESS_TOKEN = 'test-token';
  try {
    const { fetchPredictHqChanges } = await import('../lib/sources/adapters/predicthq.ts');
    const result = await fetchPredictHqChanges({
      cursorAt: '2026-08-23T10:00:00.000Z',
      windowEndAt: '2026-08-23T11:00:00.000Z',
    });
    const url = new URL(requestedUrl);
    assert.equal(url.searchParams.get('state'), 'active,deleted');
    assert.equal(url.searchParams.get('updated.gte'), '2026-08-23T10:00:00.000Z');
    assert.equal(url.searchParams.get('updated.lte'), '2026-08-23T11:00:00.000Z');
    assert.equal(result.events[0]?.artist, 'ITZY');
    assert.equal(result.tombstones[0]?.lifecycleStatus, 'cancelled');
    assert.equal(result.complete, true);
    assert.equal(result.nextCursorAt, '2026-08-23T10:55:00.000Z');
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.PREDICTHQ_ACCESS_TOKEN;
    delete process.env.CONCERT_PASSPORT_DATA_MODE;
  }
});

test('rejects a PredictHQ pagination cursor outside the exact events endpoint', async () => {
  process.env.CONCERT_PASSPORT_DATA_MODE = 'hybrid';
  process.env.PREDICTHQ_ACCESS_TOKEN = 'test-token';
  try {
    const { fetchPredictHqChanges } = await import('../lib/sources/adapters/predicthq.ts');
    await assert.rejects(
      fetchPredictHqChanges({ resumeUrl: 'https://api.predicthq.com/v1/events-export/?secret=1' }),
      /unsafe pagination URL/,
    );
  } finally {
    delete process.env.PREDICTHQ_ACCESS_TOKEN;
    delete process.env.CONCERT_PASSPORT_DATA_MODE;
  }
});

test('normalizes Ticketmaster lifecycle statuses without hiding postponed shows', async () => {
  const { ticketmasterLifecycleStatus } = await import('../lib/sources/adapters/ticketmaster.ts');
  assert.equal(ticketmasterLifecycleStatus('onsale'), 'scheduled');
  assert.equal(ticketmasterLifecycleStatus('offsale'), 'offsale');
  assert.equal(ticketmasterLifecycleStatus('postponed'), 'postponed');
  assert.equal(ticketmasterLifecycleStatus('rescheduled'), 'rescheduled');
  assert.equal(ticketmasterLifecycleStatus('cancelled'), 'cancelled');
});
