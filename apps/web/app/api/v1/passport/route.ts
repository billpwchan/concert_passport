import { createPassportEntry } from '@/db/passport';
import { getDataSession } from '@/lib/server/data-session';
import { hasSameOrigin } from '@/lib/server/request-security';
import { APAC_COUNTRY_CODES } from '@/lib/sources/query';

export async function POST(request: Request): Promise<Response> {
  if (!hasSameOrigin(request)) return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  const body = (await request.json()) as {
    artist?: string;
    eventName?: string;
    attendedAt?: string;
    venue?: string;
    city?: string;
    market?: string;
    travelDistanceKm?: number;
  };
  const artist = (body.artist ?? '').trim().slice(0, 100);
  const eventName = (body.eventName ?? '').trim().slice(0, 160);
  const venue = (body.venue ?? '').trim().slice(0, 120);
  const city = (body.city ?? '').trim().slice(0, 100);
  const market = (body.market ?? '').toUpperCase();
  const date = new Date(body.attendedAt ?? '');
  const travelDistanceKm = Number(body.travelDistanceKm ?? 0);
  if (
    artist.length < 2
    || city.length < 2
    || !APAC_COUNTRY_CODES.has(market)
    || !Number.isFinite(date.getTime())
    || date.getTime() > Date.now() + 86_400_000
    || !Number.isFinite(travelDistanceKm)
    || travelDistanceKm < 0
    || travelDistanceKm > 100_000
  ) {
    return Response.json({ error: 'Invalid attendance record.' }, { status: 400 });
  }
  const session = getDataSession(request);
  const id = await createPassportEntry({
    user: session.user,
    artist,
    eventName: eventName || undefined,
    attendedAt: date.toISOString(),
    venue: venue || undefined,
    city,
    market,
    travelDistanceKm,
  });
  const response = Response.json({ id }, { status: 201 });
  if (session.setCookie) response.headers.append('set-cookie', session.setCookie);
  return response;
}
