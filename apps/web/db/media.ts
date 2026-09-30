import { canonicalCoreArtistName } from '../lib/domain/core-artists.ts';
import { getDb } from './index.ts';
import { getCanonicalEvent } from './events.ts';

export type ArtistMediaRecord = {
  artistName: string;
  normalizedName: string;
  provider: string;
  providerArtistId: string;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  imageAttribution?: string;
  creator?: string;
  licenseName?: string;
  licenseUrl?: string;
  usagePolicy: 'linked_preview' | 'commons_licensed';
  sourceUrl: string;
  isFallback: boolean;
  lastCheckedAt: number;
  updatedAt: number;
};

export function normalizeArtistMediaName(value: string): string {
  return (canonicalCoreArtistName(value) ?? value).toLocaleLowerCase('en-US').trim();
}

export function upsertArtistMedia(input: Omit<ArtistMediaRecord, 'normalizedName' | 'lastCheckedAt' | 'updatedAt' | 'usagePolicy'> & { usagePolicy?: ArtistMediaRecord['usagePolicy'] }): ArtistMediaRecord | undefined {
  const db = getDb();
  const now = Date.now();
  const normalizedName = normalizeArtistMediaName(input.artistName);
  const quarantined = db.prepare(`
    SELECT 1 FROM media_asset_quarantine WHERE image_url = ?
  `).get(input.imageUrl);
  if (quarantined) {
    db.prepare('UPDATE media_asset_quarantine SET last_seen_at = ? WHERE image_url = ?')
      .run(now, input.imageUrl);
    return undefined;
  }
  const collision = db.prepare(`
    SELECT artist_name AS artistName
    FROM artist_media WHERE image_url = ? AND normalized_name <> ? LIMIT 1
  `).get(input.imageUrl, normalizedName) as { artistName: string } | undefined;
  if (collision) {
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare(`
        INSERT INTO media_asset_quarantine
          (image_url, reason, artists_json, first_seen_at, last_seen_at)
        VALUES (?, 'cross_artist_duplicate', ?, ?, ?)
      `).run(
        input.imageUrl,
        JSON.stringify([collision.artistName, input.artistName].sort()),
        now,
        now,
      );
      db.prepare('DELETE FROM artist_media WHERE image_url = ?').run(input.imageUrl);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    return undefined;
  }
  db.prepare(`
    INSERT INTO artist_media
      (normalized_name, artist_name, provider, provider_artist_id, image_url, image_width,
       image_height, image_attribution, creator, license_name, license_url, usage_policy,
       source_url, is_fallback, first_seen_at,
       last_checked_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(normalized_name) DO UPDATE SET
      artist_name = excluded.artist_name,
      provider = excluded.provider,
      provider_artist_id = excluded.provider_artist_id,
      image_url = excluded.image_url,
      image_width = excluded.image_width,
      image_height = excluded.image_height,
      image_attribution = excluded.image_attribution,
      creator = excluded.creator,
      license_name = excluded.license_name,
      license_url = excluded.license_url,
      usage_policy = excluded.usage_policy,
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
    input.creator ?? null, input.licenseName ?? null, input.licenseUrl ?? null,
    input.usagePolicy ?? 'linked_preview', input.sourceUrl, input.isFallback ? 1 : 0,
    now, now, now,
  );
  return getArtistMedia(input.artistName)!;
}

export function touchArtistMedia(artistName: string): void {
  getDb().prepare('UPDATE artist_media SET last_checked_at = ? WHERE normalized_name = ?')
    .run(Date.now(), normalizeArtistMediaName(artistName));
}

export function deleteArtistMedia(artistName: string): void {
  getDb().prepare('DELETE FROM artist_media WHERE normalized_name = ?')
    .run(normalizeArtistMediaName(artistName));
}

export function getArtistMedia(artistName: string): ArtistMediaRecord | undefined {
  const row = getDb().prepare(`
    SELECT artist_name AS artistName, normalized_name AS normalizedName, provider,
      provider_artist_id AS providerArtistId, image_url AS imageUrl,
      image_width AS imageWidth, image_height AS imageHeight,
      image_attribution AS imageAttribution, source_url AS sourceUrl,
      creator, license_name AS licenseName, license_url AS licenseUrl,
      usage_policy AS usagePolicy,
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
  const event = getCanonicalEvent(eventId);
  return event && !event.publicationQuarantined && event.imageUrl && event.imageSourceUrl
    ? {provider:event.provider,imageUrl:event.imageUrl,imageAttribution:event.imageAttribution,sourceUrl:event.imageSourceUrl} : undefined;
}

export function getArtistImageSource(artistName: string): RemoteMediaSource | undefined {
  const allowed = getDb().prepare('SELECT 1 FROM published_artist_media WHERE normalized_name=?').get(normalizeArtistMediaName(artistName));
  const media = allowed ? getArtistMedia(artistName) : undefined;
  return media ? {
    provider: media.provider,
    imageUrl: media.imageUrl,
    imageAttribution: media.imageAttribution,
    sourceUrl: media.sourceUrl,
  } : undefined;
}

export function getEventVisualFallback(eventId: string): {
  artist: string;
  market?: string;
  city?: string;
  localDate: string;
} | undefined {
  return getDb().prepare(`
    SELECT COALESCE(NULLIF(trim(artist), ''), name) AS artist,
      country_code AS market, city, substr(starts_at, 1, 10) AS localDate
    FROM canonical_events WHERE id = ?
  `).get(eventId) as {
    artist: string;
    market?: string;
    city?: string;
    localDate: string;
  } | undefined;
}
