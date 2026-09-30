import { hasTimingConflict } from '@/lib/collection/conflicts';
import { getCanonicalEvent } from '@/db/events';
import { hasConfirmedPerformanceTime } from '@/lib/domain/discovery';
import { eventCalendar } from '@/lib/domain/calendar';
export async function GET(_request: Request, { params }: { params: Promise<{ eventId: string }> }): Promise<Response> {
  const event = getCanonicalEvent((await params).eventId);
  if (!event || event.publicationQuarantined) return new Response(null, { status: 404 });
  if (hasTimingConflict(event.id) || !hasConfirmedPerformanceTime(event) || event.lifecycleStatus === 'cancelled' || event.lifecycleStatus === 'postponed' || event.lifecycleStatus === 'deleted') return Response.json({ error: 'Show is not scheduled.' }, { status: 409 });
  return new Response(eventCalendar(event), { headers: { 'content-type': 'text/calendar; charset=utf-8',
    'content-disposition': 'attachment; filename="concert-passport.ics"', 'cache-control': 'private, no-store' } });
}
