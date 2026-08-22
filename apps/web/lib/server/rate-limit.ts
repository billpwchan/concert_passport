type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
const REQUESTS_PER_WINDOW = 20;
const MAX_BUCKETS = 2_000;

export function discoverRateLimit(request: Request, now = Date.now()) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const key = forwarded || request.headers.get('x-real-ip') || 'local';
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) {
      for (const [entryKey, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(entryKey);
      }
      if (buckets.size >= MAX_BUCKETS) buckets.delete(buckets.keys().next().value!);
    }
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: REQUESTS_PER_WINDOW - 1, retryAfter: 0 };
  }

  if (current.count >= REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1_000)),
    };
  }

  current.count += 1;
  return {
    allowed: true,
    remaining: REQUESTS_PER_WINDOW - current.count,
    retryAfter: 0,
  };
}
