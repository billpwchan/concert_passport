export type DiscoveryCacheEntry<T> = { payload: T; checkedAt: number; expiresAt: number };

/** Coalesces identical refreshes; the caller owns persistence and publication filtering. */
export function createDiscoveryCache<T>(options: {
  read: (key: string) => DiscoveryCacheEntry<T> | undefined;
  write: (key: string, payload: T, checkedAt: number, ttl: number) => void;
  ttl: (payload: T) => number;
  now?: () => number;
}) {
  const pending = new Map<string, Promise<{ payload: T; checkedAt: number; cached: boolean }>>();
  const now = options.now ?? Date.now;
  return async (key: string, retrieve: () => Promise<T>, force = false) => {
    const stored = options.read(key);
    if (!force && stored && stored.expiresAt > now()) return { payload: stored.payload, checkedAt: stored.checkedAt, cached: true };
    const inflight = pending.get(key);
    if (inflight) return inflight;
    const work = (async () => {
      const payload = await retrieve();
      const checkedAt = now();
      options.write(key, payload, checkedAt, options.ttl(payload));
      return { payload, checkedAt, cached: false };
    })();
    pending.set(key, work);
    try { return await work; } finally { pending.delete(key); }
  };
}
