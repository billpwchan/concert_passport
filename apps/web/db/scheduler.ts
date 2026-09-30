import { getDb } from './index.ts';

export type ScheduledJobLease = {
  jobName: string;
  owner: string;
};

export type ScheduledJobStatus = 'completed' | 'partial' | 'failed';

export function claimScheduledJob(
  jobName: string,
  leaseMs: number,
  now = Date.now(),
): ScheduledJobLease | undefined {
  const database = getDb();
  const owner = crypto.randomUUID();
  database.prepare(`
    INSERT OR IGNORE INTO scheduler_jobs
      (job_name, last_status, consecutive_failures, updated_at)
    VALUES (?, 'idle', 0, ?)
  `).run(jobName, now);
  const result = database.prepare(`
    UPDATE scheduler_jobs SET lease_owner = ?, lease_expires_at = ?,
      last_started_at = ?, last_status = 'running', last_error = NULL, updated_at = ?
    WHERE job_name = ? AND (lease_owner IS NULL OR COALESCE(lease_expires_at, 0) <= ?)
  `).run(owner, now + leaseMs, now, now, jobName, now);
  return result.changes === 1 ? { jobName, owner } : undefined;
}

export function finishScheduledJob(
  lease: ScheduledJobLease,
  status: ScheduledJobStatus,
  result: unknown,
  error?: string,
  now = Date.now(),
): boolean {
  const serialized = JSON.stringify(result);
  const update = getDb().prepare(`
    UPDATE scheduler_jobs SET lease_owner = NULL, lease_expires_at = NULL,
      last_finished_at = ?, last_status = ?, last_error = ?, last_result_json = ?,
      consecutive_failures = CASE WHEN ? = 'failed' THEN consecutive_failures + 1 ELSE 0 END,
      updated_at = ?
    WHERE job_name = ? AND lease_owner = ?
  `).run(
    now,
    status,
    error?.slice(0, 500) ?? null,
    serialized.length > 12_000 ? serialized.slice(0, 12_000) : serialized,
    status,
    now,
    lease.jobName,
    lease.owner,
  );
  return update.changes === 1;
}
