import { requestClientKey } from './request-security';

const buckets = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60_000;
const MAX_ATTEMPTS = 8;

export function authRateLimit(request: Request, action: string, now = Date.now()) {
  const key = `${action}:${requestClientKey(request)}`;
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }
  if (current.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfter: Math.ceil((current.resetAt - now) / 1_000) };
  }
  current.count += 1;
  return { allowed: true, retryAfter: 0 };
}
