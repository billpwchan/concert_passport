/** Shared by collectors and tests; no network or database side effects. */
export type FailureKind = 'authentication' | 'rate_limited' | 'unavailable' | 'parse_error' | 'blocked' | 'partial';
export function classifySourceFailure(message: string): FailureKind {
  if (/robots|untrusted|unsafe|unsupported|(?:\b|_)403\b/i.test(message)) return 'blocked';
  if (/(?:\b|_)401\b|unauthori[sz]ed|invalid.*(?:key|token)/i.test(message)) return 'authentication';
  if (/(?:\b|_)429\b|quota|budget|rate.?limit/i.test(message)) return 'rate_limited';
  if (/robots|untrusted|unsafe|unsupported/i.test(message)) return 'blocked';
  if (/parse|structured|schema/i.test(message)) return 'parse_error';
  if (/partial|coverage|truncat/i.test(message)) return 'partial';
  return 'unavailable';
}
export function sourceRetryDelay(kind: FailureKind, failures: number, retryAfterMs = 0): number {
  const delay = kind === 'authentication' ? 6 * 3600000
    : kind === 'blocked' ? 24 * 3600000
    : kind === 'partial' ? 15 * 60000
    : Math.min(6 * 3600000, 60000 * 2 ** Math.min(9, Math.max(0, failures - 1)));
  return Math.max(delay, Number.isFinite(retryAfterMs) ? retryAfterMs : 0);
}
export function pageRefreshDelay(startsAt?: string, now = Date.now(), saleStartsAt?: string): number {
  const days = startsAt ? (Date.parse(startsAt) - now) / 86400000 : Infinity;
  const normal = days < 0 ? 7 * 86400000 : days < 2 ? 30 * 60000 : days < 14 ? 2 * 3600000 : 6 * 3600000;
  const untilSale = saleStartsAt ? Date.parse(saleStartsAt) - now : NaN;
  if (days < 0 || !Number.isFinite(untilSale) || untilSale < -2 * 3600000) return normal;
  if (untilSale <= 2 * 3600000) return 5 * 60000;
  return Math.min(normal, Math.max(5 * 60000, untilSale - 2 * 3600000));
}
export function safeSourceMessage(message: string): string {
  return message.replace(/https?:\/\/\S+/g, '[source URL]').replace(/(?:bearer\s+|(?:apikey|token|secret|key)[=:]\s*)\S+/gi, '[redacted]').slice(0, 300);
}
