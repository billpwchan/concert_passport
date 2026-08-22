import { resolveUpcomingEventLinks } from '@/lib/sources/link-resolution';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.INGESTION_CRON_SECRET;
  if (!secret) return Response.json({ error: 'Scheduler is not configured.' }, { status: 503 });
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  const requested = Number(new URL(request.url).searchParams.get('limit') ?? 12);
  const limit = Number.isFinite(requested) ? Math.max(1, Math.min(36, Math.floor(requested))) : 12;
  try {
    const result = await resolveUpcomingEventLinks({ limit, triggerType: 'scheduled' });
    return Response.json(result);
  } catch {
    return Response.json({ error: 'Link resolution run failed.' }, { status: 500 });
  }
}
