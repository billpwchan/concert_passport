import { getDb } from '@/db/index';
import { dataMode } from '@/lib/sources/data-mode';
export const dynamic = 'force-dynamic';
export async function GET(): Promise<Response> {
  try {
    const db = getDb();
    db.prepare('SELECT 1').get();
    const schema = db.prepare('SELECT max(version) AS version FROM schema_migrations').get();
    const job = db.prepare("SELECT last_finished_at AS finishedAt,last_status AS status FROM scheduler_jobs WHERE job_name='official_collection'").get() as {finishedAt:number|null;status:string}|undefined;
    return Response.json({ status: 'ready', dataMode: dataMode(), schema,
      collection: { status: job?.status ?? 'not_started', lastFinishedAt: job?.finishedAt ? new Date(job.finishedAt).toISOString() : null,
        delayed: !job?.finishedAt || Date.now() - job.finishedAt > 30 * 60_000 } }, { headers: { 'cache-control': 'no-store' } });
  } catch { return Response.json({ status: 'unavailable' }, { status: 503, headers: { 'cache-control': 'no-store' } }); }
}
