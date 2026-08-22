import { coreArtistSearchNames } from '../lib/domain/core-artists.ts';
import type { DiscoveredEvent } from '../lib/domain/types.ts';
import { getDb } from './index.ts';
import { upsertProfile } from './repository.ts';

export type CanonicalEventRecord = DiscoveredEvent & {
  id: string;
};

export type SavedEventRecord = CanonicalEventRecord & {
  savedAt: number;
};

function hydrateEventRecord<T extends CanonicalEventRecord>(row: T): T {
  const verifiedAt = row.bestLinkVerifiedAt as unknown;
  return {
    ...row,
    imageFallback: Boolean(row.imageFallback),
    bestLinkVerifiedAt: typeof verifiedAt === 'number' ? new Date(verifiedAt).toISOString() : row.bestLinkVerifiedAt,
  };
}

type EventSnapshot = {
  name: string;
  artist: string | null;
  startsAt: string;
  timezone: string | null;
  venue: string | null;
  city: string | null;
  countryCode: string | null;
  latitude: number | null;
  longitude: number | null;
  officialUrl: string;
  confidence: string;
  bestLinkUrl: string | null;
  bestLinkRole: string | null;
  bestLinkSource: string | null;
  bestLinkScore: number | null;
  bestLinkVerifiedAt: number | null;
  imageUrl: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  imageAttribution: string | null;
  imageSourceUrl: string | null;
  imageFallback: number;
};

const snapshotFields: Array<keyof EventSnapshot> = [
  'name', 'artist', 'startsAt', 'timezone', 'venue', 'city', 'countryCode',
  'latitude', 'longitude', 'officialUrl', 'confidence',
  'bestLinkUrl', 'bestLinkRole', 'bestLinkSource', 'bestLinkScore',
  'imageUrl', 'imageWidth', 'imageHeight', 'imageAttribution', 'imageSourceUrl', 'imageFallback',
];

function eventSnapshot(event: DiscoveredEvent): EventSnapshot {
  return {
    name: event.name,
    artist: event.artist ?? null,
    startsAt: event.startsAt,
    timezone: event.timezone ?? null,
    venue: event.venue ?? null,
    city: event.city ?? null,
    countryCode: event.countryCode ?? null,
    latitude: event.latitude ?? null,
    longitude: event.longitude ?? null,
    officialUrl: event.officialUrl,
    confidence: event.confidence,
    bestLinkUrl: event.bestLinkUrl ?? null,
    bestLinkRole: event.bestLinkRole ?? null,
    bestLinkSource: event.bestLinkSource ?? null,
    bestLinkScore: event.bestLinkScore ?? null,
    bestLinkVerifiedAt: event.bestLinkVerifiedAt ? Date.parse(event.bestLinkVerifiedAt) : null,
    imageUrl: event.imageUrl ?? null,
    imageWidth: event.imageWidth ?? null,
    imageHeight: event.imageHeight ?? null,
    imageAttribution: event.imageAttribution ?? null,
    imageSourceUrl: event.imageSourceUrl ?? null,
    imageFallback: event.imageFallback ? 1 : 0,
  };
}

export function upsertDiscoveredEvents(events: DiscoveredEvent[]): DiscoveredEvent[] {
  const db = getDb();
  const now = Date.now();
  const existingStatement = db.prepare(`
    SELECT name, artist, starts_at AS startsAt, timezone, venue, city,
      country_code AS countryCode, latitude, longitude, official_url AS officialUrl,
      confidence, best_link_url AS bestLinkUrl, best_link_role AS bestLinkRole,
      best_link_source AS bestLinkSource, best_link_score AS bestLinkScore,
      best_link_verified_at AS bestLinkVerifiedAt,
      data_authority_score AS dataAuthorityScore,
      image_url AS imageUrl, image_width AS imageWidth,
      image_height AS imageHeight, image_attribution AS imageAttribution,
      image_source_url AS imageSourceUrl, image_fallback AS imageFallback
    FROM canonical_events WHERE provider = ? AND provider_event_id = ?
  `);
  const statement = db.prepare(`
    INSERT INTO canonical_events
      (id, provider, provider_event_id, name, artist, starts_at, timezone, venue, city,
       country_code, latitude, longitude, official_url, confidence, image_url, image_width,
       image_height, image_attribution, image_source_url, image_fallback,
       best_link_url, best_link_role, best_link_source, best_link_score, best_link_verified_at,
       data_authority_score, data_source_id, data_verified_at,
       first_seen_at, last_seen_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(provider, provider_event_id) DO UPDATE SET
      name = CASE WHEN excluded.data_authority_score >= canonical_events.data_authority_score THEN excluded.name ELSE canonical_events.name END,
      artist = CASE WHEN excluded.data_authority_score >= canonical_events.data_authority_score THEN excluded.artist ELSE canonical_events.artist END,
      starts_at = CASE WHEN excluded.data_authority_score >= canonical_events.data_authority_score THEN excluded.starts_at ELSE canonical_events.starts_at END,
      timezone = CASE WHEN excluded.data_authority_score >= canonical_events.data_authority_score THEN excluded.timezone ELSE canonical_events.timezone END,
      venue = CASE WHEN excluded.data_authority_score >= canonical_events.data_authority_score THEN excluded.venue ELSE canonical_events.venue END,
      city = CASE WHEN excluded.data_authority_score >= canonical_events.data_authority_score THEN excluded.city ELSE canonical_events.city END,
      country_code = CASE WHEN excluded.data_authority_score >= canonical_events.data_authority_score THEN excluded.country_code ELSE canonical_events.country_code END,
      latitude = CASE WHEN excluded.data_authority_score >= canonical_events.data_authority_score THEN excluded.latitude ELSE canonical_events.latitude END,
      longitude = CASE WHEN excluded.data_authority_score >= canonical_events.data_authority_score THEN excluded.longitude ELSE canonical_events.longitude END,
      official_url = excluded.official_url,
      confidence = excluded.confidence,
      best_link_url = CASE
        WHEN excluded.best_link_score >= COALESCE(canonical_events.best_link_score, -1) THEN excluded.best_link_url
        ELSE canonical_events.best_link_url END,
      best_link_role = CASE
        WHEN excluded.best_link_score >= COALESCE(canonical_events.best_link_score, -1) THEN excluded.best_link_role
        ELSE canonical_events.best_link_role END,
      best_link_source = CASE
        WHEN excluded.best_link_score >= COALESCE(canonical_events.best_link_score, -1) THEN excluded.best_link_source
        ELSE canonical_events.best_link_source END,
      best_link_score = MAX(COALESCE(canonical_events.best_link_score, -1), COALESCE(excluded.best_link_score, -1)),
      best_link_verified_at = CASE
        WHEN excluded.best_link_score >= COALESCE(canonical_events.best_link_score, -1) THEN excluded.best_link_verified_at
        ELSE canonical_events.best_link_verified_at END,
      data_authority_score = MAX(canonical_events.data_authority_score, excluded.data_authority_score),
      data_source_id = CASE
        WHEN excluded.data_authority_score >= canonical_events.data_authority_score THEN excluded.data_source_id
        ELSE canonical_events.data_source_id END,
      data_verified_at = CASE
        WHEN excluded.data_authority_score >= canonical_events.data_authority_score THEN excluded.data_verified_at
        ELSE canonical_events.data_verified_at END,
      image_url = COALESCE(excluded.image_url, canonical_events.image_url),
      image_width = COALESCE(excluded.image_width, canonical_events.image_width),
      image_height = COALESCE(excluded.image_height, canonical_events.image_height),
      image_attribution = COALESCE(excluded.image_attribution, canonical_events.image_attribution),
      image_source_url = COALESCE(excluded.image_source_url, canonical_events.image_source_url),
      image_fallback = CASE
        WHEN excluded.image_url IS NOT NULL THEN excluded.image_fallback
        ELSE canonical_events.image_fallback
      END,
      last_seen_at = excluded.last_seen_at,
      updated_at = excluded.updated_at
  `);
  const versionStatement = db.prepare(`
    INSERT INTO event_versions
      (id, event_id, provider, change_type, changed_fields_json, snapshot_json, observed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const sourceStatement = db.prepare(`
    INSERT INTO event_source_links
      (event_id, source_id, source_event_id, url, confidence, first_seen_at, last_seen_at, last_checked_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(event_id, source_id, source_event_id) DO UPDATE SET
      url = excluded.url,
      confidence = excluded.confidence,
      last_seen_at = excluded.last_seen_at,
      last_checked_at = excluded.last_checked_at
  `);
  const officialLinkStatement = db.prepare(`
    INSERT INTO event_link_evidence
      (id, event_id, source_id, source_event_id, candidate_url, canonical_url,
       link_role, authority, validation_state, match_score, evidence_json,
       retry_count, next_check_at, first_seen_at, last_checked_at, last_verified_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'seller', 'verified', ?, ?, 0, ?, ?, ?, ?, ?)
    ON CONFLICT(event_id, canonical_url) DO UPDATE SET
      source_id = excluded.source_id,
      source_event_id = excluded.source_event_id,
      link_role = excluded.link_role,
      validation_state = 'verified',
      match_score = excluded.match_score,
      evidence_json = excluded.evidence_json,
      retry_count = 0,
      next_check_at = excluded.next_check_at,
      last_checked_at = excluded.last_checked_at,
      last_verified_at = excluded.last_verified_at,
      updated_at = excluded.updated_at
  `);
  const normalized: DiscoveredEvent[] = [];
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const event of events) {
      const id = `${event.provider}:${event.providerEventId}`;
      const incoming = eventSnapshot(event);
      const previous = existingStatement.get(event.provider, event.providerEventId) as (EventSnapshot & { dataAuthorityScore: number }) | undefined;
      const incomingAuthority = event.confidence === 'official' ? 100 : event.confidence === 'verified' ? 75 : 40;
      const preserveAuthoritativeData = Boolean(previous && previous.dataAuthorityScore > incomingAuthority);
      const next = previous ? {
        ...incoming,
        ...(preserveAuthoritativeData ? {
          name: previous.name,
          artist: previous.artist,
          startsAt: previous.startsAt,
          timezone: previous.timezone,
          venue: previous.venue,
          city: previous.city,
          countryCode: previous.countryCode,
          latitude: previous.latitude,
          longitude: previous.longitude,
        } : {}),
        imageUrl: incoming.imageUrl ?? previous.imageUrl,
        imageWidth: incoming.imageUrl ? incoming.imageWidth : previous.imageWidth,
        imageHeight: incoming.imageUrl ? incoming.imageHeight : previous.imageHeight,
        imageAttribution: incoming.imageUrl ? incoming.imageAttribution : previous.imageAttribution,
        imageSourceUrl: incoming.imageUrl ? incoming.imageSourceUrl : previous.imageSourceUrl,
        imageFallback: incoming.imageUrl ? incoming.imageFallback : previous.imageFallback,
        bestLinkUrl: incoming.bestLinkUrl ?? previous.bestLinkUrl,
        bestLinkRole: incoming.bestLinkRole ?? previous.bestLinkRole,
        bestLinkSource: incoming.bestLinkSource ?? previous.bestLinkSource,
        bestLinkScore: incoming.bestLinkScore ?? previous.bestLinkScore,
        bestLinkVerifiedAt: incoming.bestLinkVerifiedAt ?? previous.bestLinkVerifiedAt,
      } : incoming;
      const changedFields = previous
        ? snapshotFields.filter((field) => previous[field] !== next[field])
        : snapshotFields;
      statement.run(
        id, event.provider, event.providerEventId, event.name, event.artist ?? null,
        event.startsAt, event.timezone ?? null, event.venue ?? null, event.city ?? null,
        event.countryCode ?? null, event.latitude ?? null, event.longitude ?? null,
        event.officialUrl, event.confidence, next.imageUrl, next.imageWidth, next.imageHeight,
        next.imageAttribution, next.imageSourceUrl, next.imageFallback,
        event.bestLinkUrl ?? null, event.bestLinkRole ?? null, event.bestLinkSource ?? null,
        event.bestLinkScore ?? null, event.bestLinkVerifiedAt ? Date.parse(event.bestLinkVerifiedAt) : null,
        incomingAuthority,
        event.provider, event.confidence === 'official' ? now : null,
        now, now, now,
      );
      if (!previous || changedFields.length) {
        versionStatement.run(
          crypto.randomUUID(), id, event.provider, previous ? 'changed' : 'discovered',
          JSON.stringify(changedFields), JSON.stringify(next), now,
        );
      }
      sourceStatement.run(
        id, event.provider, event.providerEventId, event.officialUrl, event.confidence,
        now, now, now,
      );
      if (event.bestLinkUrl && event.bestLinkRole && event.bestLinkSource) {
        officialLinkStatement.run(
          crypto.randomUUID(), id, event.bestLinkSource, event.providerEventId,
          event.bestLinkUrl, event.bestLinkUrl, event.bestLinkRole, event.bestLinkScore ?? 100,
          JSON.stringify({ discoveredBy: event.provider, reasons: ['provider_official_url'], conflicts: [] }),
          now + 12 * 60 * 60_000, now, now, now, now,
        );
      }
      normalized.push({
        ...event,
        canonicalId: id,
        imageUrl: next.imageUrl ?? undefined,
        imageWidth: next.imageWidth ?? undefined,
        imageHeight: next.imageHeight ?? undefined,
        imageAttribution: next.imageAttribution ?? undefined,
        imageSourceUrl: next.imageSourceUrl ?? undefined,
        imageFallback: Boolean(next.imageFallback),
        bestLinkUrl: next.bestLinkUrl ?? undefined,
        bestLinkRole: next.bestLinkRole as DiscoveredEvent['bestLinkRole'],
        bestLinkSource: next.bestLinkSource ?? undefined,
        bestLinkScore: next.bestLinkScore ?? undefined,
        bestLinkVerifiedAt: next.bestLinkVerifiedAt ? new Date(next.bestLinkVerifiedAt).toISOString() : undefined,
      });
    }
    db.exec('COMMIT');
    return normalized;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export async function saveEventForUser(input: {
  user: { userId: string; email: string; displayName: string };
  eventId: string;
}): Promise<boolean> {
  await upsertProfile(input.user);
  const exists = getDb().prepare('SELECT 1 FROM canonical_events WHERE id = ?').get(input.eventId);
  if (!exists) return false;
  getDb().prepare(`
    INSERT OR IGNORE INTO saved_events (user_id, event_id, created_at) VALUES (?, ?, ?)
  `).run(input.user.userId, input.eventId, Date.now());
  return true;
}

export function getSavedEvents(userId: string): SavedEventRecord[] {
  const rows = getDb().prepare(`
    SELECT e.id, e.provider, e.provider_event_id AS providerEventId, e.name, e.artist,
      e.starts_at AS startsAt, e.timezone, e.venue, e.city, e.country_code AS countryCode,
      e.latitude, e.longitude, e.official_url AS officialUrl, e.confidence,
      e.best_link_url AS bestLinkUrl, e.best_link_role AS bestLinkRole,
      e.best_link_source AS bestLinkSource, e.best_link_score AS bestLinkScore,
      e.best_link_verified_at AS bestLinkVerifiedAt,
      COALESCE(e.image_url, m.image_url) AS imageUrl,
      COALESCE(e.image_width, m.image_width) AS imageWidth,
      COALESCE(e.image_height, m.image_height) AS imageHeight,
      COALESCE(e.image_attribution, m.image_attribution) AS imageAttribution,
      COALESCE(e.image_source_url, m.source_url) AS imageSourceUrl,
      COALESCE(e.image_fallback, m.is_fallback) AS imageFallback,
      s.created_at AS savedAt
    FROM saved_events s JOIN canonical_events e ON e.id = s.event_id
    LEFT JOIN artist_media m ON m.normalized_name = lower(trim(e.artist))
    WHERE s.user_id = ? ORDER BY e.starts_at ASC
  `).all(userId) as unknown as SavedEventRecord[];
  return rows.map(hydrateEventRecord);
}

export function getCanonicalEvent(id: string): CanonicalEventRecord | undefined {
  const row = getDb().prepare(`
    SELECT e.id, e.provider, e.provider_event_id AS providerEventId, e.name, e.artist,
      e.starts_at AS startsAt, e.timezone, e.venue, e.city, e.country_code AS countryCode,
      e.latitude, e.longitude, e.official_url AS officialUrl, e.confidence,
      e.best_link_url AS bestLinkUrl, e.best_link_role AS bestLinkRole,
      e.best_link_source AS bestLinkSource, e.best_link_score AS bestLinkScore,
      e.best_link_verified_at AS bestLinkVerifiedAt,
      COALESCE(e.image_url, m.image_url) AS imageUrl,
      COALESCE(e.image_width, m.image_width) AS imageWidth,
      COALESCE(e.image_height, m.image_height) AS imageHeight,
      COALESCE(e.image_attribution, m.image_attribution) AS imageAttribution,
      COALESCE(e.image_source_url, m.source_url) AS imageSourceUrl,
      COALESCE(e.image_fallback, m.is_fallback) AS imageFallback
    FROM canonical_events e
    LEFT JOIN artist_media m ON m.normalized_name = lower(trim(e.artist))
    WHERE e.id = ?
  `).get(id) as CanonicalEventRecord | undefined;
  return row ? hydrateEventRecord(row) : undefined;
}

export function getUpcomingCatalogEvents(limit = 24, now = new Date()): CanonicalEventRecord[] {
  const artistNames = [...coreArtistSearchNames];
  const placeholders = artistNames.map(() => '?').join(', ');
  const rows = getDb().prepare(`
    SELECT e.id, e.provider, e.provider_event_id AS providerEventId, e.name, e.artist,
      e.starts_at AS startsAt, e.timezone, e.venue, e.city, e.country_code AS countryCode,
      e.latitude, e.longitude, e.official_url AS officialUrl, e.confidence,
      e.best_link_url AS bestLinkUrl, e.best_link_role AS bestLinkRole,
      e.best_link_source AS bestLinkSource, e.best_link_score AS bestLinkScore,
      e.best_link_verified_at AS bestLinkVerifiedAt,
      COALESCE(e.image_url, m.image_url) AS imageUrl,
      COALESCE(e.image_width, m.image_width) AS imageWidth,
      COALESCE(e.image_height, m.image_height) AS imageHeight,
      COALESCE(e.image_attribution, m.image_attribution) AS imageAttribution,
      COALESCE(e.image_source_url, m.source_url) AS imageSourceUrl,
      COALESCE(e.image_fallback, m.is_fallback) AS imageFallback
    FROM canonical_events e
    LEFT JOIN artist_media m ON m.normalized_name = lower(trim(e.artist))
    WHERE datetime(e.starts_at) >= datetime(?)
      AND lower(COALESCE(e.artist, '')) IN (${placeholders})
    ORDER BY datetime(e.starts_at) ASC
    LIMIT ?
  `).all(now.toISOString(), ...artistNames, limit) as unknown as CanonicalEventRecord[];
  return rows.map(hydrateEventRecord);
}

export async function followArtist(input: {
  user: { userId: string; email: string; displayName: string };
  artist: string;
  market: string;
}): Promise<void> {
  await upsertProfile(input.user);
  const now = Date.now();
  getDb().prepare(`
    INSERT INTO artist_follows
      (user_id, artist_name, market_code, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, artist_name, market_code) DO UPDATE SET updated_at = excluded.updated_at
  `).run(input.user.userId, input.artist, input.market, now, now);
}

export function getFollowedArtists(limit = 8): Array<{ artist: string; market: string }> {
  return getDb().prepare(`
    SELECT artist_name AS artist, market_code AS market, MAX(updated_at) AS updatedAt
    FROM artist_follows GROUP BY artist_name, market_code
    ORDER BY updatedAt DESC LIMIT ?
  `).all(limit) as Array<{ artist: string; market: string }>;
}

export function startIngestionRun(triggerType: string): string {
  const id = crypto.randomUUID();
  getDb().prepare(`
    INSERT INTO ingestion_runs (id, trigger_type, status, started_at) VALUES (?, ?, 'running', ?)
  `).run(id, triggerType, Date.now());
  return id;
}

export function finishIngestionRun(input: {
  id: string;
  status: 'completed' | 'partial' | 'failed';
  artistsChecked: number;
  eventsSeen: number;
  errors: Array<{ provider: string; message: string }>;
}): void {
  getDb().prepare(`
    UPDATE ingestion_runs SET status = ?, artists_checked = ?, events_seen = ?,
      errors_json = ?, finished_at = ? WHERE id = ?
  `).run(
    input.status, input.artistsChecked, input.eventsSeen,
    JSON.stringify(input.errors), Date.now(), input.id,
  );
}

export function recordConnectorRunItems(
  runId: string,
  items: Array<{ connectorId: string; eventsSeen: number; errorsSeen: number }>,
): void {
  const now = Date.now();
  const statement = getDb().prepare(`
    INSERT INTO connector_run_items
      (id, run_id, connector_id, status, events_seen, errors_seen, recorded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (const item of items) {
    statement.run(
      crypto.randomUUID(), runId, item.connectorId,
      item.errorsSeen ? (item.eventsSeen ? 'partial' : 'failed') : 'completed',
      item.eventsSeen, item.errorsSeen, now,
    );
  }
}
