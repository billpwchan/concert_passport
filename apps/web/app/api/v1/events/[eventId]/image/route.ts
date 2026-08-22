import { getEventImageSource } from '@/db/media';
import { proxyRemoteMediaImage } from '@/lib/server/remote-image';

export const revalidate = 86_400;

export async function GET(
  _request: Request,
  context: { params: Promise<{ eventId: string }> },
): Promise<Response> {
  const source = getEventImageSource(decodeURIComponent((await context.params).eventId));
  return source ? proxyRemoteMediaImage(source) : new Response(null, { status: 404 });
}
