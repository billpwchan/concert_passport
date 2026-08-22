const intervalMs = Number(process.env.INGESTION_INTERVAL_MS ?? 20 * 60_000);
const endpoint = process.env.INGESTION_ENDPOINT
  ?? 'http://concert-passport-app:3000/api/internal/ingestion/run';
const linkResolutionEndpoint = process.env.LINK_RESOLUTION_ENDPOINT
  ?? 'http://concert-passport-app:3000/api/internal/link-resolution/run';

async function requestRun(target, eventName) {
  const secret = process.env.INGESTION_CRON_SECRET;
  const response = await fetch(target, {
    method: 'POST',
    headers: { authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(120_000),
  });
  const result = await response.json();
  console.log(JSON.stringify({
    level: response.ok ? 'info' : 'error',
    event: eventName,
    status: response.status,
    ...result,
  }));
}

async function run() {
  const secret = process.env.INGESTION_CRON_SECRET;
  if (!secret) {
    console.error(JSON.stringify({ level: 'error', event: 'ingestion_not_configured' }));
    return;
  }
  try {
    await requestRun(endpoint, 'ingestion_run');
    await requestRun(linkResolutionEndpoint, 'link_resolution_run');
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      event: 'scheduler_request_failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }));
  }
}

setTimeout(() => {
  void run();
  setInterval(() => void run(), intervalMs);
}, 15_000);

console.log(JSON.stringify({ level: 'info', event: 'ingestion_worker_ready', intervalMs }));
