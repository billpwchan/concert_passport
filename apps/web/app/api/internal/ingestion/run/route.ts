import {
  finishIngestionRun,
  getFollowedArtists,
  recordConnectorRunItems,
  startIngestionRun,
  upsertDiscoveredEvents,
} from '@/db/events';
import { getCoreArtistBatch } from '@/lib/domain/core-artists';
import { discoverAcrossSources } from '@/lib/sources/adapters';
import { syncArtistMedia } from '@/lib/sources/media';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.INGESTION_CRON_SECRET;
  const authorization = request.headers.get('authorization');
  if (!secret) return Response.json({ error: 'Scheduler is not configured.' }, { status: 503 });
  if (authorization !== `Bearer ${secret}`) return Response.json({ error: 'Unauthorized.' }, { status: 401 });

  const runId = startIngestionRun('scheduled');
  const requestedBatchValue = new URL(request.url).searchParams.get('batch');
  const requestedBatch = requestedBatchValue === null ? undefined : Number(requestedBatchValue);
  const coreBatch = getCoreArtistBatch(Date.now(), Number.isFinite(requestedBatch) ? requestedBatch : undefined);
  const targets = [
    ...getFollowedArtists(6),
    ...coreBatch.map((artist) => ({ artist: artist.query, market: 'ALL' })),
  ].filter((target, index, all) => (
    all.findIndex((candidate) => (
      candidate.artist.toLocaleLowerCase('en-US') === target.artist.toLocaleLowerCase('en-US')
      && candidate.market === target.market
    )) === index
  ));
  const start = new Date();
  const end = new Date(start.getTime() + 365 * 86_400_000);
  const errors: Array<{ provider: string; message: string }> = [];
  const providerTotals = new Map<string, { eventsSeen: number; errorsSeen: number }>();
  let eventsSeen = 0;

  try {
    for (let offset = 0; offset < targets.length; offset += 3) {
      const batchTargets = targets.slice(offset, offset + 3);
      const results = await Promise.all(batchTargets.map((target) => (
        discoverAcrossSources({
          artist: target.artist,
          countryCode: target.market === 'ALL' ? undefined : target.market,
          startDateTime: start.toISOString().replace(/\.\d{3}Z$/, 'Z'),
          endDateTime: end.toISOString().replace(/\.\d{3}Z$/, 'Z'),
        })
      )));
      for (const result of results) {
        upsertDiscoveredEvents(result.events);
        eventsSeen += result.events.length;
        errors.push(...result.errors);
        for (const provider of result.providers) {
          const total = providerTotals.get(provider.provider) ?? { eventsSeen: 0, errorsSeen: 0 };
          total.eventsSeen += provider.eventsSeen;
          total.errorsSeen += provider.errorsSeen;
          providerTotals.set(provider.provider, total);
        }
      }
      for (const target of batchTargets) {
        try {
          await syncArtistMedia(target.artist);
        } catch (error) {
          errors.push({
            provider: 'ticketmaster-media',
            message: error instanceof Error ? error.message : 'Artist media refresh failed',
          });
        }
      }
    }
    recordConnectorRunItems(runId, [...providerTotals].map(([connectorId, totals]) => ({ connectorId, ...totals })));
    finishIngestionRun({
      id: runId,
      status: errors.length ? 'partial' : 'completed',
      artistsChecked: targets.length,
      eventsSeen,
      errors,
    });
    return Response.json({ runId, artistsChecked: targets.length, eventsSeen, errors: errors.length });
  } catch (error) {
    const fatal = { provider: 'scheduler', message: error instanceof Error ? error.message : 'Unknown error' };
    finishIngestionRun({ id: runId, status: 'failed', artistsChecked: targets.length, eventsSeen, errors: [...errors, fatal] });
    return Response.json({ error: 'Ingestion run failed.', runId }, { status: 500 });
  }
}
