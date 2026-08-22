import { getArtistImageSource } from '@/db/media';
import { proxyRemoteMediaImage } from '@/lib/server/remote-image';

export const revalidate = 86_400;

export async function GET(
  _request: Request,
  context: { params: Promise<{ artistName: string }> },
): Promise<Response> {
  const source = getArtistImageSource(decodeURIComponent((await context.params).artistName));
  return source ? proxyRemoteMediaImage(source) : new Response(null, { status: 404 });
}
