import { getDb } from './index.ts';

export function readDiscoveryCache<T>(key: string): { payload: T; checkedAt: number; expiresAt: number } | undefined {
  const row = getDb().prepare('SELECT payload_json AS payload, checked_at AS checkedAt, expires_at AS expiresAt FROM discovery_cache WHERE cache_key = ?')
    .get(key) as { payload: string; checkedAt: number; expiresAt: number } | undefined;
  return row ? { ...row, payload: JSON.parse(row.payload) as T } : undefined;
}

export function writeDiscoveryCache(key: string, payload: unknown, checkedAt: number, ttl: number): void {
  const db = getDb();
  db.prepare(`INSERT INTO discovery_cache VALUES (?, ?, ?, ?)
    ON CONFLICT(cache_key) DO UPDATE SET payload_json = excluded.payload_json,
    checked_at = excluded.checked_at, expires_at = excluded.expires_at`)
    .run(key, JSON.stringify(payload), checkedAt, checkedAt + ttl);
  db.prepare(`DELETE FROM discovery_cache WHERE cache_key IN
    (SELECT cache_key FROM discovery_cache ORDER BY checked_at DESC LIMIT -1 OFFSET 500)`).run();
}
