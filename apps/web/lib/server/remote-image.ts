import { isAllowedTicketmasterImageUrl } from '@/lib/sources/ticketmaster-client';
import { isAllowedWikimediaImageUrl } from '@/lib/sources/media/wikimedia';
import type { RemoteMediaSource } from '@/db/media';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export async function proxyRemoteMediaImage(source: RemoteMediaSource): Promise<Response> {
  const allowed = source.provider === 'ticketmaster-discovery'
    ? isAllowedTicketmasterImageUrl(source.imageUrl)
    : source.provider === 'wikimedia-commons' && isAllowedWikimediaImageUrl(source.imageUrl);
  if (!allowed) return new Response(null, { status: 404 });
  try {
    const response = await fetch(source.imageUrl, {
      headers: { accept: 'image/avif,image/webp,image/jpeg,image/png,image/*' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });
    const contentType = response.headers.get('content-type') ?? '';
    const declaredSize = Number(response.headers.get('content-length') ?? 0);
    if (!response.ok || !contentType.startsWith('image/') || declaredSize > MAX_IMAGE_BYTES) {
      return new Response(null, { status: 404 });
    }
    const body = await response.arrayBuffer();
    if (body.byteLength < 256 || body.byteLength > MAX_IMAGE_BYTES) return new Response(null, { status: 404 });
    return new Response(body, {
      headers: {
        'content-type': contentType,
        'cache-control': 'public, max-age=86400, stale-while-revalidate=604800',
        'x-content-type-options': 'nosniff',
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
