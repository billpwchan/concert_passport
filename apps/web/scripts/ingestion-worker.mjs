function boundedInterval(value, fallback, minimum, maximum) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? Math.max(minimum, Math.min(maximum, Math.floor(parsed)))
    : fallback;
}

const appBaseUrl = process.env.INTERNAL_APP_URL ?? 'http://concert-passport-app:3000';
const dataMode = process.env.CONCERT_PASSPORT_DATA_MODE === 'hybrid' ? 'hybrid' : 'official';
const jobs = [
  {
    name: 'official_collection_run',
    endpoint: `${appBaseUrl}/api/internal/collection/run`,
    intervalMs: boundedInterval(process.env.OFFICIAL_COLLECTION_INTERVAL_MS, 5 * 60_000, 60_000, 30 * 60_000),
    nextRunAt: 0,
  },
  {
    name: 'artist_catalog_run',
    endpoint: process.env.ARTIST_CATALOG_ENDPOINT ?? `${appBaseUrl}/api/internal/artist-catalog/run`,
    intervalMs: boundedInterval(process.env.ARTIST_CATALOG_INTERVAL_MS, 6 * 60 * 60_000, 60 * 60_000, 24 * 60 * 60_000),
    nextRunAt: 0,
  },
  {
    name: 'ingestion_run',
    endpoint: process.env.INGESTION_ENDPOINT ?? `${appBaseUrl}/api/internal/ingestion/run`,
    intervalMs: boundedInterval(process.env.INGESTION_INTERVAL_MS, 20 * 60_000, 5 * 60_000, 2 * 60 * 60_000),
    nextRunAt: 0,
  },
  {
    name: 'link_resolution_run',
    endpoint: process.env.LINK_RESOLUTION_ENDPOINT ?? `${appBaseUrl}/api/internal/link-resolution/run`,
    intervalMs: boundedInterval(process.env.LINK_RESOLUTION_INTERVAL_MS, 20 * 60_000, 5 * 60_000, 2 * 60 * 60_000),
    nextRunAt: 0,
  },
  {
    name: 'media_refresh_run',
    endpoint: process.env.MEDIA_REFRESH_ENDPOINT ?? `${appBaseUrl}/api/internal/media/run`,
    intervalMs: boundedInterval(process.env.MEDIA_REFRESH_INTERVAL_MS, 6 * 60 * 60_000, 60 * 60_000, 24 * 60 * 60_000),
    nextRunAt: 0,
  },
].filter((job) => dataMode === 'hybrid' || job.name !== 'ingestion_run');
const tickIntervalMs = boundedInterval(process.env.SCHEDULER_TICK_INTERVAL_MS, 60_000, 15_000, 5 * 60_000);
let running = false;

async function requestRun(job) {
  const secret = process.env.INGESTION_CRON_SECRET;
  const response = await fetch(job.endpoint, {
    method: 'POST',
    headers: { authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(180_000),
  });
  const raw = await response.text();
  let result;
  try {
    result = raw ? JSON.parse(raw) : {};
  } catch {
    result = { error: 'internal_job_returned_invalid_json' };
  }
  console.log(JSON.stringify({
    level: response.ok ? 'info' : 'error',
    event: job.name,
    status: response.status,
    ...result,
  }));
  if (!response.ok || result.error === 'internal_job_returned_invalid_json') return 'failed';
  if (result.schedulerOutcome === 'partial') return 'partial';
  return 'completed';
}

async function runDueJobs() {
  if (running) return;
  const secret = process.env.INGESTION_CRON_SECRET;
  if (!secret) {
    console.error(JSON.stringify({ level: 'error', event: 'scheduler_not_configured' }));
    return;
  }
  running = true;
  try {
    for (const job of jobs) {
      const now = Date.now();
      if (now < job.nextRunAt) continue;
      const retryMs = Math.min(job.intervalMs, 5 * 60_000);
      const partialRetryMs = Math.min(job.intervalMs, 15 * 60_000);
      job.nextRunAt = now + retryMs;
      try {
        const outcome = await requestRun(job);
        job.nextRunAt = Date.now() + (outcome === 'completed'
          ? job.intervalMs
          : outcome === 'partial' ? partialRetryMs : retryMs);
      } catch (error) {
        job.nextRunAt = Date.now() + retryMs;
        console.error(JSON.stringify({
          level: 'error',
          event: job.name,
          status: 'request_failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    }
  } finally {
    running = false;
  }
}

setTimeout(() => {
  void runDueJobs();
  setInterval(() => void runDueJobs(), tickIntervalMs);
}, 15_000);

console.log(JSON.stringify({
  level: 'info',
  event: 'scheduler_ready',
  dataMode,
  tickIntervalMs,
  jobs: jobs.map(({ name, intervalMs }) => ({ name, intervalMs })),
}));
