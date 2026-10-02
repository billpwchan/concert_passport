import { attendSavedEvent, createPassportEntry, getPassportEntries, setPassportEntryRemoved, updatePassportEntry } from '@/db/passport';
import { passportInput } from '@/lib/domain/passport-input';
import { getDataSession } from '@/lib/server/data-session';
import { rateLimitResponse } from '@/lib/server/rate-limit';
import { hasSameOrigin } from '@/lib/server/request-security';

export async function GET(request: Request): Promise<Response> {
  const session = getDataSession(request);
  const entries = getPassportEntries(session.user.userId);
  if (new URL(request.url).searchParams.get('download') === '1') return Response.json({version:1,exportedAt:new Date().toISOString(),entries},
    {headers:{'cache-control':'private, no-store','content-disposition':'attachment; filename="concert-passport-memories.json"'}});
  return Response.json({ entries }, { headers: { 'cache-control': 'private, no-store' } });
}

async function mutate(request: Request): Promise<Response> {
  if (!hasSameOrigin(request)) return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  const limited = rateLimitResponse(request);
  if (limited) return limited;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) return Response.json({ error: 'Invalid record.' }, { status: 400 });
  const session = getDataSession(request);
  let id: string | undefined;
  if (request.method === 'POST' && typeof body.eventId === 'string' && body.eventId.length <= 200) {
    id = attendSavedEvent(session.user.userId, body.eventId);
    if (!id) return Response.json({ error: 'Save an eligible past show first.' }, { status: 400 });
  } else if (request.method === 'DELETE' || (request.method === 'PATCH' && body.restore === true)) {
    if (typeof body.id !== 'string' || body.id.length > 100) return Response.json({ error: 'Invalid record ID.' }, { status: 400 });
    if (!setPassportEntryRemoved(session.user.userId, body.id, request.method === 'DELETE')) return Response.json({ error: 'Record not found.' }, { status: 404 });
    id = body.id;
  } else {
    const input = passportInput(body);
    if (!input) return Response.json({ error: 'Invalid attendance record.' }, { status: 400 });
    if (request.method === 'PATCH') {
      if (typeof body.id !== 'string' || body.id.length > 100) return Response.json({ error: 'Invalid record ID.' }, { status: 400 });
      if (!updatePassportEntry(session.user.userId, body.id, input)) return Response.json({ error: 'Record not found.' }, { status: 404 });
      id = body.id;
    } else id = await createPassportEntry({ user: session.user, ...input });
  }
  const response = Response.json({ id }, { status: request.method === 'POST' ? 201 : 200, headers: { 'cache-control': 'private, no-store' } });
  if (session.setCookie) response.headers.append('set-cookie', session.setCookie);
  return response;
}
export const POST = mutate;
export const PATCH = mutate;
export const DELETE = mutate;
