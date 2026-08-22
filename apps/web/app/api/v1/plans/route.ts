import { saveEventForUser } from '@/db/events';
import { getDataSession } from '@/lib/server/data-session';
import { hasSameOrigin } from '@/lib/server/request-security';

export async function POST(request: Request): Promise<Response> {
  if (!hasSameOrigin(request)) return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  const body = (await request.json()) as { eventId?: string };
  if (!body.eventId || body.eventId.length > 240) {
    return Response.json({ error: 'Invalid event.' }, { status: 400 });
  }
  const session = getDataSession(request);
  const saved = await saveEventForUser({ user: session.user, eventId: body.eventId });
  if (!saved) return Response.json({ error: 'Event not found.' }, { status: 404 });
  const response = Response.json({ saved: true });
  if (session.setCookie) response.headers.append('set-cookie', session.setCookie);
  return response;
}
