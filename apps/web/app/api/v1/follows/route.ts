import { followArtist, getUserFollows, unfollowArtist } from '@/db/events';
import { getDataSession } from '@/lib/server/data-session';
import { hasSameOrigin } from '@/lib/server/request-security';
import { APAC_COUNTRY_CODES } from '@/lib/sources/query';

export async function POST(request: Request): Promise<Response> {
  if (!hasSameOrigin(request)) return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  const body = await request.json().catch(() => null) as { artist?: unknown; market?: unknown } | null;
  if (!body || typeof body.artist !== 'string' || (body.market !== undefined && typeof body.market !== 'string')) return Response.json({ error: 'Invalid artist or market.' }, { status: 400 });
  const artist = (body.artist ?? '').trim().slice(0, 100);
  const market = ((body.market ?? 'ALL') as string).toUpperCase();
  if (!artist || (market !== 'ALL' && !APAC_COUNTRY_CODES.has(market))) {
    return Response.json({ error: 'Invalid artist or market.' }, { status: 400 });
  }
  const session = getDataSession(request);
  await followArtist({ user: session.user, artist, market });
  const response = Response.json({ followed: true });
  if (session.setCookie) response.headers.append('set-cookie', session.setCookie);
  return response;
}

export async function GET(request: Request): Promise<Response> {
  const session = getDataSession(request);
  return Response.json({ follows: getUserFollows(session.user.userId) }, { headers: { 'cache-control': 'private, no-store' } });
}

export async function DELETE(request: Request): Promise<Response> {
  if (!hasSameOrigin(request)) return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.artist !== 'string' || body.artist.length > 100 || typeof body.market !== 'string' || (body.market !== 'ALL' && !APAC_COUNTRY_CODES.has(body.market))) return Response.json({ error: 'Invalid artist or market.' }, { status: 400 });
  unfollowArtist(getDataSession(request).user.userId, body.artist.trim(), body.market);
  return Response.json({ followed: false }, { headers: { 'cache-control': 'private, no-store' } });
}
