import { dataMode } from '@/lib/sources/data-mode';
import {
  finishIngestionRun,
  getFollowedArtists,
  recordConnectorRunItems,
  startIngestionRun,
  upsertDiscoveredEvents,
} from '@/db/events';
import {
  completeMarketSweep,
  getArtistsDueForIngestion,
  getNextMarketSweep,
  markArtistEventCheck,
  markArtistEventCheckFailed,
  retainKnownKpopEvents,
} from '@/db/artists';
import { discoverAcrossSources } from '@/lib/sources/adapters';
import { selectIngestionTargets } from '@/lib/sources/ingestion-targets';
import { resolveMarketArtistCandidates } from '@/lib/sources/artists';
import { runScheduledRoute } from '@/lib/server/scheduled-job';
import {
  applyProviderEventTombstones,
  getProviderChangeSyncState,
  saveProviderChangeSyncResult,
} from '@/db/provider-changes';
import { fetchPredictHqChanges } from '@/lib/sources/adapters/predicthq';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function boundedInteger(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, Math.floor(parsed))) : fallback;
}

export async function POST(request: Request): Promise<Response> {
  return runScheduledRoute(request, {
    jobName: 'event_ingestion',
    leaseMs: 10 * 60_000,
    failureMessage: 'Ingestion run failed.',
  }, async () => {
    if (dataMode() === 'official') return { body: { skipped: true, reason: 'official_collection_is_primary' } };
    const artistTargetLimit = boundedInteger(process.env.INGESTION_ARTIST_TARGETS, 16, 4, 16);
    const artistBatchSize = boundedInteger(process.env.INGESTION_ARTIST_BATCH_SIZE, 4, 1, 6);
    const runId = startIngestionRun('scheduled');
    const followed = getFollowedArtists(4);
    const scheduled = getArtistsDueForIngestion(artistTargetLimit);
    const targets = selectIngestionTargets(followed, scheduled, artistTargetLimit);
    const sweepMarket = getNextMarketSweep();
    const start = new Date();
    const end = new Date(start.getTime() + 365 * 86_400_000);
    const errors: Array<{ provider: string; message: string }> = [];
    const providerTotals = new Map<string, { eventsSeen: number; errorsSeen: number }>();
    let eventsSeen = 0;
    let lifecycleChanges = 0;
    const accumulateProviderTotals = (providers: Array<{ provider: string; eventsSeen: number; errorsSeen: number }>) => {
      for (const provider of providers) {
        const total = providerTotals.get(provider.provider) ?? { eventsSeen: 0, errorsSeen: 0 };
        total.eventsSeen += provider.eventsSeen;
        total.errorsSeen += provider.errorsSeen;
        providerTotals.set(provider.provider, total);
      }
    };

    try {
      const changeSyncStartedAt = Date.now();
      const changeState = getProviderChangeSyncState('predicthq');
      try {
        const changes = await fetchPredictHqChanges(changeState);
        if (changes.configured) {
          const acceptedChanges = retainKnownKpopEvents(changes.events);
          upsertDiscoveredEvents(acceptedChanges);
          lifecycleChanges = applyProviderEventTombstones('predicthq', changes.tombstones);
          eventsSeen += acceptedChanges.length;
          const changeItems = acceptedChanges.length + lifecycleChanges;
          saveProviderChangeSyncResult({
            provider: 'predicthq',
            cursorAt: changes.complete ? changes.nextCursorAt : changeState.cursorAt,
            windowEndAt: changes.complete ? undefined : changes.windowEndAt,
            resumeUrl: changes.complete ? undefined : changes.resumeUrl,
            status: changes.complete ? 'completed' : 'partial',
            itemsSeen: changes.itemsSeen,
            itemsChanged: changeItems,
            startedAt: changeSyncStartedAt,
          });
          accumulateProviderTotals([{
            provider: 'predicthq-change-feed',
            eventsSeen: changeItems,
            errorsSeen: 0,
          }]);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'PredictHQ change sync failed';
        saveProviderChangeSyncResult({
          provider: 'predicthq',
          ...changeState,
          status: 'failed',
          itemsSeen: 0,
          itemsChanged: 0,
          error: message,
          startedAt: changeSyncStartedAt,
        });
        errors.push({ provider: 'predicthq-change-feed', message });
        accumulateProviderTotals([{
          provider: 'predicthq-change-feed',
          eventsSeen: 0,
          errorsSeen: 1,
        }]);
      }
      for (let offset = 0; offset < targets.length; offset += artistBatchSize) {
        const batchTargets = targets.slice(offset, offset + artistBatchSize);
        const results = await Promise.all(batchTargets.map(async (target) => ({
          target,
          result: await discoverAcrossSources({
            artist: target.artist,
            countryCode: target.market === 'ALL' ? undefined : target.market,
            startDateTime: start.toISOString().replace(/\.\d{3}Z$/, 'Z'),
            endDateTime: end.toISOString().replace(/\.\d{3}Z$/, 'Z'),
          }),
        })));
        for (const { target, result } of results) {
          upsertDiscoveredEvents(result.events);
          eventsSeen += result.events.length;
          errors.push(...result.errors);
          accumulateProviderTotals(result.providers);
          if (result.errors.length) markArtistEventCheckFailed(target.artist);
          else markArtistEventCheck(target.artist, result.events.length);
        }
      }
      if (sweepMarket) {
        const sweep = await discoverAcrossSources({
          countryCode: sweepMarket,
          startDateTime: start.toISOString().replace(/\.\d{3}Z$/, 'Z'),
          endDateTime: end.toISOString().replace(/\.\d{3}Z$/, 'Z'),
        });
        await resolveMarketArtistCandidates(sweep.events);
        const kpopEvents = retainKnownKpopEvents(sweep.events);
        upsertDiscoveredEvents(kpopEvents);
        eventsSeen += kpopEvents.length;
        errors.push(...sweep.errors);
        accumulateProviderTotals(sweep.providers);
        completeMarketSweep(
          sweepMarket,
          kpopEvents.length,
          sweep.errors.map((error) => `${error.provider}: ${error.message}`).join('; ') || undefined,
        );
      }
      recordConnectorRunItems(runId, [...providerTotals].map(([connectorId, totals]) => ({ connectorId, ...totals })));
      finishIngestionRun({
        id: runId,
        status: errors.length ? 'partial' : 'completed',
        artistsChecked: targets.length,
        eventsSeen,
        errors,
      });
      return {
        body: {
          runId,
          artistsChecked: targets.length,
          marketSwept: sweepMarket,
          eventsSeen,
          lifecycleChanges,
          artistTargetLimit,
          artistBatchSize,
          errors: errors.length,
        },
        outcome: errors.length ? 'partial' as const : 'completed' as const,
      };
    } catch (error) {
      const fatal = { provider: 'scheduler', message: error instanceof Error ? error.message : 'Unknown error' };
      finishIngestionRun({
        id: runId,
        status: 'failed',
        artistsChecked: targets.length,
        eventsSeen,
        errors: [...errors, fatal],
      });
      throw error;
    }
  });
}
