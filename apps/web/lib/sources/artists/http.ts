const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);
let musicBrainzQueue: Promise<void> = Promise.resolve();
let lastMusicBrainzRequestAt = 0;

function queueMusicBrainzRequest<T>(task: () => Promise<T>): Promise<T> {
  const run = musicBrainzQueue.then(async () => {
    const delay = Math.max(0, 1_100 - (Date.now() - lastMusicBrainzRequestAt));
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    lastMusicBrainzRequestAt = Date.now();
    return task();
  }, task);
  musicBrainzQueue = run.then(() => undefined, () => undefined);
  return run;
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfterSeconds = Number(response.headers.get('retry-after'));
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return Math.min(5_000, retryAfterSeconds * 1_000);
  }
  return Math.min(4_000, 1_000 * (2 ** attempt));
}

export async function fetchIdentityPage(
  url: string,
  headers: Record<string, string>,
  timeoutMs: number,
): Promise<Response> {
  if (new URL(url).hostname === 'musicbrainz.org') {
    return queueMusicBrainzRequest(() => fetchIdentityPageUnqueued(url, headers, timeoutMs));
  }
  return fetchIdentityPageUnqueued(url, headers, timeoutMs);
}

async function fetchIdentityPageUnqueued(
  url: string,
  headers: Record<string, string>,
  timeoutMs: number,
): Promise<Response> {
  let response: Response | undefined;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = await fetch(url, {
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    });
    response = current;
    if (current.ok || !RETRYABLE_STATUSES.has(current.status) || attempt === 2) return current;
    await new Promise((resolve) => setTimeout(resolve, retryDelay(current, attempt)));
  }
  if (!response) throw new Error('Identity source request did not run');
  return response;
}
