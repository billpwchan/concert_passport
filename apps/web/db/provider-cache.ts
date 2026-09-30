import { normalizeArtistIdentity } from './artists.ts';
import { getDb } from './index.ts';

export type ProviderArtistLookup<T> = {
  status: 'matched' | 'missing';
  providerArtistId?: string;
  payload?: T;
  checkedAt: number;
  expiresAt: number;
};

export function getProviderArtistLookup<T>(
  provider: string,
  artistName: string,
  now = Date.now(),
): ProviderArtistLookup<T> | undefined {
  const row = getDb().prepare(`
    SELECT provider_artist_id AS providerArtistId, payload_json AS payloadJson,
      status, checked_at AS checkedAt, expires_at AS expiresAt
    FROM provider_artist_lookup_cache
    WHERE provider = ? AND normalized_name = ? AND expires_at > ?
  `).get(provider, normalizeArtistIdentity(artistName), now) as {
    providerArtistId?: string;
    payloadJson?: string;
    status: 'matched' | 'missing';
    checkedAt: number;
    expiresAt: number;
  } | undefined;
  if (!row) return undefined;
  let payload: T | undefined;
  try {
    payload = row.payloadJson ? JSON.parse(row.payloadJson) as T : undefined;
  } catch {
    payload = undefined;
  }
  return { ...row, payload };
}

export function saveProviderArtistLookup<T>(input: {
  provider: string;
  artistName: string;
  providerArtistId?: string;
  payload?: T;
  status: 'matched' | 'missing';
  ttlMs: number;
}, now = Date.now()): void {
  getDb().prepare(`
    INSERT INTO provider_artist_lookup_cache
      (provider, normalized_name, provider_artist_id, payload_json, status, checked_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(provider, normalized_name) DO UPDATE SET
      provider_artist_id = excluded.provider_artist_id,
      payload_json = excluded.payload_json,
      status = excluded.status,
      checked_at = excluded.checked_at,
      expires_at = excluded.expires_at
  `).run(
    input.provider,
    normalizeArtistIdentity(input.artistName),
    input.providerArtistId ?? null,
    input.payload ? JSON.stringify(input.payload) : null,
    input.status,
    now,
    now + input.ttlMs,
  );
}
