import { createHash, timingSafeEqual } from 'node:crypto';
import { claimScheduledJob, finishScheduledJob, type ScheduledJobStatus } from '../../db/scheduler.ts';

type ScheduledRouteResult = {
  body: unknown;
  status?: number;
  outcome?: ScheduledJobStatus;
};

type ScheduledRouteOptions = {
  jobName: string;
  leaseMs: number;
  failureMessage: string;
};

const MIN_SECRET_LENGTH = 32;
const PLACEHOLDER_SECRET = 'replace-with-a-random-secret';

/** Compares fixed-length digests so neither content nor length is leaked by timing. */
function matchesBearer(header: string | null, secret: string): boolean {
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(header ?? ''), digest(`Bearer ${secret}`));
}

export async function runScheduledRoute(
  request: Request,
  options: ScheduledRouteOptions,
  operation: () => Promise<ScheduledRouteResult>,
): Promise<Response> {
  const secret = process.env.INGESTION_CRON_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH || secret === PLACEHOLDER_SECRET) {
    return Response.json({ error: 'Scheduler is not configured.' }, { status: 503 });
  }
  if (!matchesBearer(request.headers.get('authorization'), secret)) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  const lease = claimScheduledJob(options.jobName, options.leaseMs);
  if (!lease) {
    return Response.json({ skipped: true, reason: 'job_already_running', job: options.jobName }, { status: 202 });
  }
  try {
    const result = await operation();
    const status = result.status ?? 200;
    const outcome = result.outcome ?? (status >= 500 ? 'failed' : status >= 400 ? 'partial' : 'completed');
    const responseBody = result.body && typeof result.body === 'object' && !Array.isArray(result.body)
      ? { ...result.body, schedulerOutcome: outcome }
      : { result: result.body, schedulerOutcome: outcome };
    finishScheduledJob(lease, outcome, responseBody);
    return Response.json(responseBody, { status });
  } catch (error) {
    const message = error instanceof Error ? error.message : options.failureMessage;
    finishScheduledJob(lease, 'failed', { error: options.failureMessage }, message);
    return Response.json({ error: options.failureMessage, schedulerOutcome: 'failed' }, { status: 500 });
  }
}
