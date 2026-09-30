import { getUpcomingArtistsForMediaRefresh } from '@/db/events';
import { syncArtistMedia } from '@/lib/sources/media';
import { runScheduledRoute } from '@/lib/server/scheduled-job';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function boundedLimit(value: string | undefined): number {
  const parsed = Number(value ?? 12);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(24, Math.floor(parsed))) : 12;
}

export async function POST(request: Request): Promise<Response> {
  return runScheduledRoute(request, {
    jobName: 'artist_media_refresh',
    leaseMs: 10 * 60_000,
    failureMessage: 'Media refresh run failed.',
  }, async () => {
    const artists = getUpcomingArtistsForMediaRefresh(
      boundedLimit(process.env.MEDIA_REFRESH_ARTIST_LIMIT),
    );
    const results: Array<{ artist: string; status: 'updated' | 'unchanged' | 'failed'; provider?: string; message?: string }> = [];
    for (const artist of artists) {
      try {
        const media = await syncArtistMedia(artist, true);
        results.push({
          artist,
          status: media ? 'updated' : 'unchanged',
          provider: media?.provider,
        });
      } catch (error) {
        results.push({
          artist,
          status: 'failed',
          message: error instanceof Error ? error.message : 'Media refresh failed',
        });
      }
    }
    const failures = results.filter((result) => result.status === 'failed').length;
    const body = {
      artistsChecked: artists.length,
      imagesAvailable: results.filter((result) => result.status === 'updated').length,
      failures,
      results,
    };
    return {
      body,
      status: failures === artists.length && artists.length ? 502 : 200,
      outcome: failures ? 'partial' : 'completed',
    };
  });
}
