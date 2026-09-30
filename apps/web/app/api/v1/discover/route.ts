import { getArtistMedia } from '@/db/media';
import { DiscoveryInputError, normalizeDiscoveryQuery } from '@/lib/sources/query';
import { discoverRateLimit } from '@/lib/server/rate-limit';
import { discoverEvents } from '@/lib/discovery/service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const rateLimit = discoverRateLimit(request);
  if (!rateLimit.allowed) return Response.json({ error: 'Too many live searches. Try again shortly.' },
    { status: 429, headers: { 'retry-after': String(rateLimit.retryAfter) } });
  try {
    const query = normalizeDiscoveryQuery(new URL(request.url).searchParams);
    const result = await discoverEvents(query);
    const media = query.artist ? getArtistMedia(query.artist) : undefined;
    return Response.json({ ...result, artistMedia: media ? {
      artistName: media.artistName, imagePath: `/api/v1/artists/${encodeURIComponent(media.artistName)}/image`,
      width: media.imageWidth, height: media.imageHeight, attribution: media.imageAttribution,
      sourceUrl: media.sourceUrl, updatedAt: new Date(media.updatedAt).toISOString(),
    } : undefined }, { headers: { 'cache-control': 'private, no-store', 'x-ratelimit-remaining': String(rateLimit.remaining) } });
  } catch (error) {
    return Response.json({ error: error instanceof DiscoveryInputError ? error.message : 'Discovery is temporarily unavailable.' },
      { status: error instanceof DiscoveryInputError ? 400 : 503 });
  }
}
