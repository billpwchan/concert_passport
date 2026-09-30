import { resolveUpcomingEventLinks } from '@/lib/sources/link-resolution';
import { runScheduledRoute } from '@/lib/server/scheduled-job';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: Request): Promise<Response> {
  const requested = Number(new URL(request.url).searchParams.get('limit') ?? 12);
  const limit = Number.isFinite(requested) ? Math.max(1, Math.min(36, Math.floor(requested))) : 12;
  return runScheduledRoute(request, {
    jobName: 'event_link_resolution',
    leaseMs: 10 * 60_000,
    failureMessage: 'Link resolution run failed.',
  }, async () => {
    const result = await resolveUpcomingEventLinks({ limit, triggerType: 'scheduled' });
    return {
      body: result,
      outcome: result.stats.errors.length ? 'partial' : 'completed',
    };
  });
}
