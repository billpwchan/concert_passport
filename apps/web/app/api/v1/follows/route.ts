import { followArtist } from '@/db/events';
import { getDataSession } from '@/lib/server/data-session';
import { hasSameOrigin } from '@/lib/server/request-security';
import { APAC_COUNTRY_CODES } from '@/lib/sources/query';

export async function POST(request: Request): Promise<Response> {
  if (!hasSameOrigin(request)) return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  const body = (await request.json()) as { artist?: string; market?: string };
  const artist = (body.artist ?? '').trim().slice(0, 100);
  const market = (body.market ?? 'ALL').toUpperCase();
  if (artist.length < 2 || (market !== 'ALL' && !APAC_COUNTRY_CODES.has(market))) {
    return Response.json({ error: 'Invalid artist or market.' }, { status: 400 });
  }
  const session = getDataSession(request);
  await followArtist({ user: session.user, artist, market });
  const response = Response.json({ followed: true });
  if (session.setCookie) response.headers.append('set-cookie', session.setCookie);
  return response;
}
