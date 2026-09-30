import { getArtistCatalogSummary } from '@/db/artists';
import { syncArtistCatalog } from '@/lib/sources/artists';
import { runScheduledRoute } from '@/lib/server/scheduled-job';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  return runScheduledRoute(request, {
    jobName: 'artist_catalog_sync',
    leaseMs: 10 * 60_000,
    failureMessage: 'Artist catalog sync failed.',
  }, async () => {
    const result = await syncArtistCatalog();
    return {
      body: { ...result, catalog: getArtistCatalogSummary() },
      status: result.status === 'failed' ? 502 : 200,
      outcome: result.status,
    };
  });
}
