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

export async function runScheduledRoute(
  request: Request,
  options: ScheduledRouteOptions,
  operation: () => Promise<ScheduledRouteResult>,
): Promise<Response> {
  const secret = process.env.INGESTION_CRON_SECRET;
  if (!secret) return Response.json({ error: 'Scheduler is not configured.' }, { status: 503 });
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
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
