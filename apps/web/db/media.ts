import { canonicalCoreArtistName } from '../lib/domain/core-artists.ts';
import { getDb } from './index.ts';

export type ArtistMediaRecord = {
  artistName: string;
  normalizedName: string;
  provider: string;
  providerArtistId: string;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  imageAttribution?: string;
  sourceUrl: string;
  isFallback: boolean;
  lastCheckedAt: number;
  updatedAt: number;
};

export function normalizeArtistMediaName(value: string): string {
  return (canonicalCoreArtistName(value) ?? value).toLocaleLowerCase('en-US').trim();
}

export function upsertArtistMedia(input: Omit<ArtistMediaRecord, 'normalizedName' | 'lastCheckedAt' | 'updatedAt'>): ArtistMediaRecord {
  const db = getDb();
  const now = Date.now();
  const normalizedName = normalizeArtistMediaName(input.artistName);
  db.prepare(`
    INSERT INTO artist_media
      (normalized_name, artist_name, provider, provider_artist_id, image_url, image_width,
       image_height, image_attribution, source_url, is_fallback, first_seen_at,
       last_checked_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(normalized_name) DO UPDATE SET
      artist_name = excluded.artist_name,
      provider = excluded.provider,
      provider_artist_id = excluded.provider_artist_id,
      image_url = excluded.image_url,
      image_width = excluded.image_width,
      image_height = excluded.image_height,
      image_attribution = excluded.image_attribution,
      source_url = excluded.source_url,
      is_fallback = excluded.is_fallback,
      last_checked_at = excluded.last_checked_at,
      updated_at = CASE
        WHEN artist_media.image_url <> excluded.image_url THEN excluded.updated_at
        ELSE artist_media.updated_at
      END
  `).run(
    normalizedName, input.artistName, input.provider, input.providerArtistId,
    input.imageUrl, input.imageWidth, input.imageHeight, input.imageAttribution ?? null,
    input.sourceUrl, input.isFallback ? 1 : 0, now, now, now,
  );
  return getArtistMedia(input.artistName)!;
}

export function touchArtistMedia(artistName: string): void {
  getDb().prepare('UPDATE artist_media SET last_checked_at = ? WHERE normalized_name = ?')
    .run(Date.now(), normalizeArtistMediaName(artistName));
}

export function getArtistMedia(artistName: string): ArtistMediaRecord | undefined {
  const row = getDb().prepare(`
    SELECT artist_name AS artistName, normalized_name AS normalizedName, provider,
      provider_artist_id AS providerArtistId, image_url AS imageUrl,
      image_width AS imageWidth, image_height AS imageHeight,
      image_attribution AS imageAttribution, source_url AS sourceUrl,
      is_fallback AS isFallback, last_checked_at AS lastCheckedAt, updated_at AS updatedAt
    FROM artist_media WHERE normalized_name = ?
  `).get(normalizeArtistMediaName(artistName)) as (Omit<ArtistMediaRecord, 'isFallback'> & { isFallback: number }) | undefined;
  return row ? { ...row, isFallback: Boolean(row.isFallback) } : undefined;
}

export type RemoteMediaSource = {
  provider: string;
  imageUrl: string;
  imageAttribution?: string;
  sourceUrl: string;
};

export function getEventImageSource(eventId: string): RemoteMediaSource | undefined {
  const row = getDb().prepare(`
    SELECT CASE WHEN e.image_url IS NOT NULL THEN e.provider ELSE m.provider END AS provider,
      COALESCE(e.image_url, m.image_url) AS imageUrl,
      COALESCE(e.image_attribution, m.image_attribution) AS imageAttribution,
      COALESCE(e.image_source_url, m.source_url) AS sourceUrl
    FROM canonical_events e
    LEFT JOIN artist_media m ON m.normalized_name = lower(trim(e.artist))
    WHERE e.id = ? AND COALESCE(e.image_url, m.image_url) IS NOT NULL
  `).get(eventId) as RemoteMediaSource | undefined;
  return row ? { ...row } : undefined;
}

export function getArtistImageSource(artistName: string): RemoteMediaSource | undefined {
  const media = getArtistMedia(artistName);
  return media ? {
    provider: media.provider,
    imageUrl: media.imageUrl,
    imageAttribution: media.imageAttribution,
    sourceUrl: media.sourceUrl,
  } : undefined;
}
