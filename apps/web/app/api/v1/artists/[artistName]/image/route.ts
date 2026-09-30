import { getArtistImageSource } from '@/db/media';
import { proxyRemoteMediaImage } from '@/lib/server/remote-image';
import { fallbackVisualResponse } from '@/lib/server/visual-fallback';

export const revalidate = 86_400;

export async function GET(
  _request: Request,
  context: { params: Promise<{ artistName: string }> },
): Promise<Response> {
  const artistName = decodeURIComponent((await context.params).artistName);
  const source = getArtistImageSource(artistName);
  if (source) {
    const response = await proxyRemoteMediaImage(source);
    if (response.ok) return response;
  }
  return fallbackVisualResponse({ artist: artistName });
}
