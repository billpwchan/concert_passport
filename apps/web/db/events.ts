import { hasTimingConflict } from '../lib/collection/conflicts.ts';
import type {
  DiscoveredEvent,
  DiscoveryQuery,
  EventLifecycleStatus,
} from '../lib/domain/types.ts';
import { resolveCanonicalLifecycle } from '../lib/domain/event-lifecycle.ts';
import { getDb } from './index.ts';
import {
  canonicalCatalogArtistName,
  observeDiscoveredEventArtist,
  recordArtistEvidence,
} from './artists.ts';
import { upsertProfile } from './repository.ts';

export type CanonicalEventRecord = DiscoveredEvent & {
  id: string;
  publicationQuarantined?: boolean;
};

export type SavedEventRecord = CanonicalEventRecord & {
  savedAt: number;
};

function hydrateEventRecord<T extends CanonicalEventRecord>(row: T): T {
  const verifiedAt = row.bestLinkVerifiedAt as unknown;
  return {
    ...row,
    imageFallback: Boolean(row.imageFallback),
    timingConflict: hasTimingConflict(row.id, row),
    publicationQuarantined: Boolean(row.publicationQuarantined),
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
  lifecycleStatus: EventLifecycleStatus;
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

type ExistingEventSnapshot = EventSnapshot & {
  id: string;
  provider: string;
  providerEventId: string;
  dataAuthorityScore: number;
};

function normalizedMergeField(value: string | null | undefined): string {
  return (value ?? '').normalize('NFKC').toLocaleLowerCase('en-US')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function hasKnownArtistIdentityMismatch(event: { artist?: string | null; name: string }): boolean {
  const artist = normalizedMergeField(event.artist);
  const name = normalizedMergeField(event.name);
  return (artist === 'belle' && name.startsWith('belle and sebastian '))
    || (artist === 'shannon' && name.startsWith('shannon noll '))
    || (artist === 'fia' && name.startsWith('fia the love me tour'))
    || (artist === 'nfl' && name.startsWith('nfl ') && name.includes(' kickoff'));
}

function isEndOfDayPlaceholder(startsAt: string): boolean {
  // Live Nation uses 23:59 local when a listing has a date but no published show time.
  return /T23:59(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/u.test(startsAt);
}

function isSameCrossProviderEvent(existing: ExistingEventSnapshot, incoming: DiscoveredEvent): boolean {
  const timeDifference = Math.abs(Date.parse(existing.startsAt) - Date.parse(incoming.startsAt));
  if (!Number.isFinite(timeDifference) || timeDifference > 12 * 60 * 60_000) return false;
  const sameInstant = timeDifference === 0;
  const existingName = normalizedMergeField(existing.name);
  const incomingName = normalizedMergeField(incoming.name);
  const compatibleName = existingName === incomingName
    || (Math.min(existingName.length, incomingName.length) >= 4
      && (existingName.includes(incomingName) || incomingName.includes(existingName)));
  const genericArtistTitle = Boolean(incoming.artist && (
    existingName === normalizedMergeField(incoming.artist)
    || incomingName === normalizedMergeField(incoming.artist)
  ));
  const locationDoesNotConflict = !incoming.city || !existing.city
    || normalizedMergeField(incoming.city) === normalizedMergeField(existing.city);
  const hasPlaceholderTime = isEndOfDayPlaceholder(existing.startsAt)
    || isEndOfDayPlaceholder(incoming.startsAt);
  const sameVenue = Boolean(existing.venue && incoming.venue && normalizedMergeField(existing.venue) === normalizedMergeField(incoming.venue));
  const sameUrl = existing.officialUrl === incoming.officialUrl;
  const incompleteVenue = (!existing.venue || !incoming.venue) && Boolean(existing.city && incoming.city) && locationDoesNotConflict && existingName === incomingName;
  return (sameInstant && (sameVenue && compatibleName || sameUrl || incompleteVenue))
    || (hasPlaceholderTime && locationDoesNotConflict && (sameVenue || sameUrl) && (compatibleName || genericArtistTitle));
}

function reconcileUpcomingCrossProviderEvents(
  db: ReturnType<typeof getDb>,
  now: number,
): Map<string, string> {
  const rows = db.prepare(`
    SELECT id, provider, provider_event_id AS providerEventId,
      name, artist, starts_at AS startsAt, timezone, venue, city,
      country_code AS countryCode, latitude, longitude, official_url AS officialUrl,
      confidence, lifecycle_status AS lifecycleStatus,
      best_link_url AS bestLinkUrl, best_link_role AS bestLinkRole,
      best_link_source AS bestLinkSource, best_link_score AS bestLinkScore,
      best_link_verified_at AS bestLinkVerifiedAt,
      data_authority_score AS dataAuthorityScore,
      image_url AS imageUrl, image_width AS imageWidth,
      image_height AS imageHeight, image_attribution AS imageAttribution,
      image_source_url AS imageSourceUrl, image_fallback AS imageFallback
    FROM canonical_events
    WHERE artist IS NOT NULL AND country_code IS NOT NULL
      AND datetime(starts_at) >= datetime('now')
      AND lifecycle_status NOT IN ('cancelled', 'deleted')
    ORDER BY data_authority_score DESC, COALESCE(best_link_score, -1) DESC,
      CASE WHEN provider = 'ticketmaster-discovery' THEN 0 ELSE 1 END,
      first_seen_at ASC
  `).all() as unknown as ExistingEventSnapshot[];
  const groups = new Map<string, ExistingEventSnapshot[]>();
  for (const row of rows) {
    const key = `${normalizedMergeField(row.artist)}|${row.countryCode}|${row.startsAt.slice(0, 10)}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  const redirects = new Map<string, string>();
  for (const group of groups.values()) {
    const winners: ExistingEventSnapshot[] = [];
    for (const candidate of group) {
      const winner = winners.find((existing) => (
        existing.id !== candidate.id
        && isSameCrossProviderEvent(existing, candidate as unknown as DiscoveredEvent)
      ));
      if (!winner) {
        winners.push(candidate);
        continue;
      }
      const preferCandidateDetails = candidate.provider === 'livenation-tour'
        && isEndOfDayPlaceholder(candidate.startsAt)
        && !isEndOfDayPlaceholder(winner.startsAt);
      const mergedName = preferCandidateDetails && candidate.name ? candidate.name : winner.name;
      const mergedVenue = preferCandidateDetails && candidate.venue
        ? candidate.venue : (winner.venue ?? candidate.venue);
      const mergedCity = preferCandidateDetails && candidate.city
        ? candidate.city : (winner.city ?? candidate.city);
      const mergedOfficialUrl = winner.officialUrl.startsWith('/') && candidate.officialUrl.startsWith('http')
        ? candidate.officialUrl : winner.officialUrl;
      db.prepare(`
        UPDATE canonical_events SET
          name = ?, venue = ?, city = ?, official_url = ?,
          latitude = COALESCE(latitude, ?), longitude = COALESCE(longitude, ?),
          image_url = COALESCE(image_url, ?), image_width = COALESCE(image_width, ?),
          image_height = COALESCE(image_height, ?),
          image_attribution = COALESCE(image_attribution, ?),
          image_source_url = COALESCE(image_source_url, ?),
          last_seen_at = MAX(last_seen_at, ?), updated_at = ?
        WHERE id = ?
      `).run(
        mergedName, mergedVenue, mergedCity, mergedOfficialUrl,
        candidate.latitude, candidate.longitude,
        candidate.imageUrl, candidate.imageWidth, candidate.imageHeight,
        candidate.imageAttribution, candidate.imageSourceUrl, now, now, winner.id,
      );
      db.prepare(`
        INSERT OR IGNORE INTO saved_events (user_id, event_id, created_at)
        SELECT user_id, ?, created_at FROM saved_events WHERE event_id = ?
      `).run(winner.id, candidate.id);
      db.prepare('DELETE FROM saved_events WHERE event_id = ?').run(candidate.id);
      db.prepare(`
        DELETE FROM event_source_links WHERE event_id = ? AND EXISTS (
          SELECT 1 FROM event_source_links winner
          WHERE winner.event_id = ? AND winner.source_id = event_source_links.source_id
            AND winner.source_event_id = event_source_links.source_event_id
        )
      `).run(candidate.id, winner.id);
      db.prepare('UPDATE event_source_links SET event_id = ? WHERE event_id = ?').run(winner.id, candidate.id);
      const mergedLifecycle = resolveCanonicalLifecycle(
        db.prepare(`
          SELECT source_status AS lifecycleStatus, confidence
          FROM event_source_links WHERE event_id = ?
        `).all(winner.id) as Array<{ lifecycleStatus: EventLifecycleStatus; confidence: string }>,
        winner.lifecycleStatus,
      );
      db.prepare(`
        UPDATE canonical_events SET lifecycle_status = ?,
          status_changed_at = CASE WHEN lifecycle_status <> ? THEN ? ELSE status_changed_at END
        WHERE id = ?
      `).run(mergedLifecycle, mergedLifecycle, now, winner.id);
      db.prepare(`
        DELETE FROM event_link_evidence WHERE event_id = ? AND EXISTS (
          SELECT 1 FROM event_link_evidence winner
          WHERE winner.event_id = ? AND winner.canonical_url = event_link_evidence.canonical_url
        )
      `).run(candidate.id, winner.id);
      db.prepare('UPDATE event_link_evidence SET event_id = ? WHERE event_id = ?').run(winner.id, candidate.id);
      db.prepare('UPDATE event_versions SET event_id = ? WHERE event_id = ?').run(winner.id, candidate.id);
      db.prepare(`
        INSERT INTO event_publication_quarantine
          (event_id, reason, evidence_json, created_at, released_at)
        SELECT ?, 'merged_event_identity_review',
          json_object('mergedFrom', ?, 'candidateEvidence', json(evidence_json)),
          created_at, NULL
        FROM event_publication_quarantine
        WHERE event_id = ? AND released_at IS NULL
        ON CONFLICT(event_id) DO UPDATE SET
          reason = excluded.reason,
          evidence_json = excluded.evidence_json,
          created_at = MIN(event_publication_quarantine.created_at, excluded.created_at),
          released_at = NULL
      `).run(winner.id, candidate.id, candidate.id);
      db.prepare(`
        INSERT INTO event_versions
          (id, event_id, provider, change_type, changed_fields_json, snapshot_json, observed_at)
        VALUES (?, ?, ?, 'entity_merged', '[]', ?, ?)
      `).run(
        crypto.randomUUID(), winner.id, candidate.provider,
        JSON.stringify({
          mergedEventId: candidate.id,
          sourceProvider: candidate.provider,
          lifecycleStatus: mergedLifecycle,
        }), now,
      );
      db.prepare(`INSERT OR IGNORE INTO event_media_proofs(event_id,image_url,source_url,scope,content_hash,observed_at,state)
        SELECT ?,image_url,source_url,scope,content_hash,observed_at,state FROM event_media_proofs WHERE event_id=?`).run(winner.id,candidate.id);
      db.prepare(`INSERT OR IGNORE INTO event_enrichment(event_id,document_id,source_url,date_precision,description,sale_starts_at,price_text,currency,availability,offer_url,observed_at)
        SELECT ?,document_id,source_url,date_precision,description,sale_starts_at,price_text,currency,availability,offer_url,observed_at FROM event_enrichment WHERE event_id=?`).run(winner.id,candidate.id);
      db.prepare('UPDATE collection_candidates SET event_id=? WHERE event_id=?').run(winner.id,candidate.id);
      db.prepare('DELETE FROM canonical_events WHERE id = ?').run(candidate.id);
      redirects.set(candidate.id, winner.id);
    }
  }
  return redirects;
}

const snapshotFields: Array<keyof EventSnapshot> = [
  'name', 'artist', 'startsAt', 'timezone', 'venue', 'city', 'countryCode',
  'latitude', 'longitude', 'officialUrl', 'confidence', 'lifecycleStatus',
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
    lifecycleStatus: event.lifecycleStatus ?? 'scheduled',
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
    SELECT id, provider, provider_event_id AS providerEventId,
      name, artist, starts_at AS startsAt, timezone, venue, city,
      country_code AS countryCode, latitude, longitude, official_url AS officialUrl,
      confidence, lifecycle_status AS lifecycleStatus,
      best_link_url AS bestLinkUrl, best_link_role AS bestLinkRole,
      best_link_source AS bestLinkSource, best_link_score AS bestLinkScore,
      best_link_verified_at AS bestLinkVerifiedAt,
      data_authority_score AS dataAuthorityScore,
      image_url AS imageUrl, image_width AS imageWidth,
      image_height AS imageHeight, image_attribution AS imageAttribution,
      image_source_url AS imageSourceUrl, image_fallback AS imageFallback
    FROM canonical_events WHERE provider = ? AND provider_event_id = ?
  `);
  const crossProviderStatement = db.prepare(`
    SELECT id, provider, provider_event_id AS providerEventId,
      name, artist, starts_at AS startsAt, timezone, venue, city,
      country_code AS countryCode, latitude, longitude, official_url AS officialUrl,
      confidence, lifecycle_status AS lifecycleStatus,
      best_link_url AS bestLinkUrl, best_link_role AS bestLinkRole,
      best_link_source AS bestLinkSource, best_link_score AS bestLinkScore,
      best_link_verified_at AS bestLinkVerifiedAt,
      data_authority_score AS dataAuthorityScore,
      image_url AS imageUrl, image_width AS imageWidth,
      image_height AS imageHeight, image_attribution AS imageAttribution,
      image_source_url AS imageSourceUrl, image_fallback AS imageFallback
    FROM canonical_events
    WHERE provider <> ? AND lower(trim(artist)) = lower(trim(?))
      AND country_code = ? AND substr(starts_at, 1, 10) = ?
    ORDER BY data_authority_score DESC LIMIT 12
  `);
  const statement = db.prepare(`
    INSERT INTO canonical_events
      (id, provider, provider_event_id, name, artist, starts_at, timezone, venue, city,
       country_code, latitude, longitude, official_url, confidence, lifecycle_status,
       status_changed_at, image_url, image_width,
       image_height, image_attribution, image_source_url, image_fallback,
       best_link_url, best_link_role, best_link_source, best_link_score, best_link_verified_at,
       data_authority_score, data_source_id, data_verified_at,
       first_seen_at, last_seen_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      official_url = CASE WHEN excluded.data_authority_score >= canonical_events.data_authority_score THEN excluded.official_url ELSE canonical_events.official_url END,
      confidence = CASE WHEN excluded.data_authority_score >= canonical_events.data_authority_score THEN excluded.confidence ELSE canonical_events.confidence END,
      lifecycle_status = excluded.lifecycle_status,
      status_changed_at = CASE
        WHEN excluded.lifecycle_status <> canonical_events.lifecycle_status THEN excluded.status_changed_at
        ELSE canonical_events.status_changed_at END,
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
      last_seen_at = MAX(canonical_events.last_seen_at, excluded.last_seen_at),
      updated_at = excluded.updated_at
  `);
  const versionStatement = db.prepare(`
    INSERT INTO event_versions
      (id, event_id, provider, change_type, changed_fields_json, snapshot_json, observed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const sourceStatement = db.prepare(`
    INSERT INTO event_source_links
      (event_id, source_id, source_event_id, url, confidence, source_status,
       first_seen_at, last_seen_at, last_checked_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(event_id, source_id, source_event_id) DO UPDATE SET
      url = excluded.url,
      confidence = excluded.confidence,
      source_status = excluded.source_status,
      last_seen_at = excluded.last_seen_at,
      last_checked_at = excluded.last_checked_at
  `);
  const officialLinkStatement = db.prepare(`
    INSERT INTO event_link_evidence
      (id, event_id, source_id, source_event_id, candidate_url, canonical_url,
       link_role, authority, validation_state, match_score, evidence_json,
       retry_count, next_check_at, first_seen_at, last_checked_at, last_verified_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'verified', ?, ?, 0, ?, ?, ?, ?, ?)
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
    for (const incomingEvent of events) {
      const observedArtist = observeDiscoveredEventArtist(incomingEvent);
      const event = observedArtist ? { ...incomingEvent, artist: observedArtist } : incomingEvent;
      const observedAt = event.sourceObservedAt ?? now;
      const incoming = eventSnapshot(event);
      const exact = existingStatement.get(event.provider, event.providerEventId) as ExistingEventSnapshot | undefined;
      const crossProvider = !exact && event.artist && event.countryCode
        ? (crossProviderStatement.all(
            event.provider, event.artist, event.countryCode, event.startsAt.slice(0, 10),
          ) as ExistingEventSnapshot[]).find((candidate) => isSameCrossProviderEvent(candidate, event))
        : undefined;
      const previous = exact ?? crossProvider;
      const id = previous?.id ?? `${event.provider}:${event.providerEventId}`;
      const canonicalProvider = previous?.provider ?? event.provider;
      const canonicalProviderEventId = previous?.providerEventId ?? event.providerEventId;
      const incomingAuthority = event.confidence === 'official' ? 100 : event.confidence === 'verified' ? 75 : 40;
      const resolvedLifecycleStatus = resolveCanonicalLifecycle(
        [...db.prepare(`
          SELECT source_status AS lifecycleStatus, confidence
          FROM event_source_links
          WHERE event_id = ? AND NOT (source_id = ? AND source_event_id = ?)
        `).all(id, event.provider, event.providerEventId) as Array<{
          lifecycleStatus: EventLifecycleStatus;
          confidence: string;
        }>, {
          lifecycleStatus: event.lifecycleStatus ?? 'scheduled',
          confidence: event.confidence,
        }],
        previous?.lifecycleStatus ?? incoming.lifecycleStatus,
      );
      const preserveAuthoritativeData = Boolean(previous && previous.dataAuthorityScore > incomingAuthority);
      const preferIncomingPlaceholderDetails = Boolean(previous
        && event.provider === 'livenation-tour'
        && isEndOfDayPlaceholder(event.startsAt)
        && !isEndOfDayPlaceholder(previous.startsAt));
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
          officialUrl: previous.officialUrl,
          confidence: previous.confidence,
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
        lifecycleStatus: resolvedLifecycleStatus,
      } : { ...incoming, lifecycleStatus: resolvedLifecycleStatus };
      if (previous && (previous.bestLinkScore ?? -1) > (incoming.bestLinkScore ?? -1)) {
        next.bestLinkUrl = previous.bestLinkUrl;
        next.bestLinkRole = previous.bestLinkRole;
        next.bestLinkSource = previous.bestLinkSource;
        next.bestLinkScore = previous.bestLinkScore;
        next.bestLinkVerifiedAt = previous.bestLinkVerifiedAt;
      }
      if (previous && preferIncomingPlaceholderDetails) {
        // Keep the exact timestamp from the higher-authority record, while accepting
        // the promoter's richer title and venue metadata from its date-only listing.
        next.name = event.name || previous.name;
        next.venue = event.venue ?? previous.venue;
        next.city = event.city ?? previous.city;
        next.officialUrl = previous.officialUrl.startsWith('/') && event.officialUrl.startsWith('http')
          ? event.officialUrl : previous.officialUrl;
      }
      const changedFields = previous
        ? snapshotFields.filter((field) => previous[field] !== next[field])
        : snapshotFields;
      statement.run(
        id, canonicalProvider, canonicalProviderEventId, event.name, event.artist ?? null,
        event.startsAt, event.timezone ?? null, event.venue ?? null, event.city ?? null,
        event.countryCode ?? null, event.latitude ?? null, event.longitude ?? null,
        event.officialUrl, event.confidence, next.lifecycleStatus, now,
        next.imageUrl, next.imageWidth, next.imageHeight,
        next.imageAttribution, next.imageSourceUrl, next.imageFallback,
        event.bestLinkUrl ?? null, event.bestLinkRole ?? null, event.bestLinkSource ?? null,
        event.bestLinkScore ?? null, event.bestLinkVerifiedAt ? Date.parse(event.bestLinkVerifiedAt) : null,
        incomingAuthority,
        event.provider, event.confidence === 'official' ? now : null,
        now, observedAt, now,
      );
      if (preferIncomingPlaceholderDetails) {
        db.prepare(`
          UPDATE canonical_events SET name = ?, venue = ?, city = ?, official_url = ? WHERE id = ?
        `).run(next.name, next.venue, next.city, next.officialUrl, id);
      }
      if (!previous || changedFields.length) {
        versionStatement.run(
          crypto.randomUUID(), id, event.provider, previous ? 'changed' : 'discovered',
          JSON.stringify(changedFields), JSON.stringify(next), now,
        );
      }
      sourceStatement.run(
        id, event.provider, event.providerEventId, event.officialUrl, event.confidence,
        event.lifecycleStatus ?? 'scheduled',
        now, observedAt, observedAt,
      );
      if (event.bestLinkUrl && event.bestLinkRole && event.bestLinkSource) {
        const linkAuthority = event.bestLinkRole === 'ticket'
          ? 'seller'
          : event.bestLinkRole === 'event' ? 'promoter' : 'artist';
        officialLinkStatement.run(
          crypto.randomUUID(), id, event.bestLinkSource, event.providerEventId,
          event.bestLinkUrl, event.bestLinkUrl, event.bestLinkRole, linkAuthority,
          event.bestLinkScore ?? 100,
          JSON.stringify({ discoveredBy: event.provider, reasons: ['provider_official_url'], conflicts: [] }),
          now + 12 * 60 * 60_000, now, now, now, now,
        );
      }
      if (event.provider === 'ticketmaster-discovery') {
        db.prepare(`UPDATE event_media_proofs SET state='stale' WHERE event_id=? AND source_url=? AND image_url<>?`)
          .run(id,event.imageSourceUrl??event.officialUrl,event.imageUrl??'');
        if(event.imageUrl) db.prepare(`INSERT INTO event_media_proofs(event_id,image_url,source_url,scope,observed_at)
          VALUES(?,?,?,'event',?) ON CONFLICT(event_id,image_url) DO UPDATE SET observed_at=excluded.observed_at,state='verified'`)
          .run(id,event.imageUrl,event.imageSourceUrl??event.officialUrl,now);
      }
      normalized.push({
        ...event,
        canonicalId: id,
        lifecycleStatus: next.lifecycleStatus,
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
      if (hasKnownArtistIdentityMismatch(next)) {
        db.prepare(`
          INSERT INTO event_publication_quarantine
            (event_id, reason, evidence_json, created_at)
          VALUES (?, 'artist_identity_mismatch', ?, ?)
          ON CONFLICT(event_id) DO UPDATE SET
            reason = excluded.reason,
            evidence_json = excluded.evidence_json,
            released_at = NULL
        `).run(
          id,
          JSON.stringify({ artist: next.artist, eventName: next.name, provider: event.provider }),
          now,
        );
      }
    }
    const redirects = reconcileUpcomingCrossProviderEvents(db, now);
    db.exec('COMMIT');
    return normalized.map((event) => ({
      ...event,
      canonicalId: redirects.get(event.canonicalId ?? '') ?? event.canonicalId,
    }));
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
  const exists = getDb().prepare(`
    SELECT 1 FROM canonical_events event
    WHERE event.id = ? AND NOT EXISTS (
      SELECT 1 FROM event_publication_quarantine quarantine
      WHERE quarantine.event_id = event.id AND quarantine.released_at IS NULL
    )
  `).get(input.eventId);
  if (!exists) return false;
  getDb().prepare(`
    INSERT OR IGNORE INTO saved_events (user_id, event_id, created_at) VALUES (?, ?, ?)
  `).run(input.user.userId, input.eventId, Date.now());
  return true;
}

export function removeSavedEventForUser(userId: string, eventId: string): boolean {
  return getDb().prepare('DELETE FROM saved_events WHERE user_id = ? AND event_id = ?')
    .run(userId, eventId).changes > 0;
}

export function getSavedEvents(userId: string): SavedEventRecord[] {
  const rows = getDb().prepare(`
    SELECT e.data_verified_at AS dataVerifiedAt, e.last_seen_at AS lastSeenAt, e.updated_at AS updatedAt, e.id, e.provider, e.provider_event_id AS providerEventId, e.name, e.artist,
      e.starts_at AS startsAt, e.timezone, e.venue, e.city, e.country_code AS countryCode,
      e.latitude, e.longitude, e.official_url AS officialUrl, e.confidence,
      e.lifecycle_status AS lifecycleStatus,
      e.best_link_url AS bestLinkUrl, e.best_link_role AS bestLinkRole,
      e.best_link_source AS bestLinkSource, e.best_link_score AS bestLinkScore,
      e.best_link_verified_at AS bestLinkVerifiedAt,
      COALESCE((SELECT p.image_url FROM event_media_proofs p WHERE p.event_id=e.id AND p.state='verified' AND p.observed_at > CAST(strftime('%s','now') AS INTEGER)*1000 - 2592000000 ORDER BY p.observed_at DESC LIMIT 1), m.image_url) AS imageUrl,
      COALESCE(e.image_width, m.image_width) AS imageWidth,
      COALESCE(e.image_height, m.image_height) AS imageHeight,
      CASE WHEN EXISTS(SELECT 1 FROM event_media_proofs p WHERE p.event_id=e.id AND p.state='verified' AND p.observed_at > CAST(strftime('%s','now') AS INTEGER)*1000 - 2592000000) THEN NULL ELSE m.image_attribution END AS imageAttribution,
      CASE WHEN EXISTS(SELECT 1 FROM event_media_proofs p WHERE p.event_id=e.id AND p.state='verified' AND p.observed_at > CAST(strftime('%s','now') AS INTEGER)*1000 - 2592000000) THEN 'event' WHEN m.image_url IS NOT NULL THEN 'artist' END AS imageKind,
      COALESCE((SELECT p.source_url FROM event_media_proofs p WHERE p.event_id=e.id AND p.state='verified' AND p.observed_at > CAST(strftime('%s','now') AS INTEGER)*1000 - 2592000000 ORDER BY p.observed_at DESC LIMIT 1), m.source_url) AS imageSourceUrl,
      COALESCE(e.image_fallback, m.is_fallback) AS imageFallback,
      s.created_at AS savedAt,
      EXISTS (SELECT 1 FROM event_publication_quarantine q
        WHERE q.event_id = e.id AND q.released_at IS NULL) AS publicationQuarantined
    FROM saved_events s JOIN canonical_events e ON e.id = s.event_id
    LEFT JOIN published_artist_media m ON m.normalized_name = lower(trim(e.artist))
    WHERE s.user_id = ? ORDER BY e.starts_at ASC
  `).all(userId) as unknown as SavedEventRecord[];
  return rows.map(hydrateEventRecord);
}

export function getCanonicalEvent(id: string): CanonicalEventRecord | undefined {
  const row = getDb().prepare(`
    SELECT e.data_verified_at AS dataVerifiedAt, e.last_seen_at AS lastSeenAt, e.updated_at AS updatedAt, e.id, e.provider, e.provider_event_id AS providerEventId, e.name, e.artist,
      e.starts_at AS startsAt, e.timezone, e.venue, e.city, e.country_code AS countryCode,
      e.latitude, e.longitude, e.official_url AS officialUrl, e.confidence,
      e.lifecycle_status AS lifecycleStatus,
      e.best_link_url AS bestLinkUrl, e.best_link_role AS bestLinkRole,
      e.best_link_source AS bestLinkSource, e.best_link_score AS bestLinkScore,
      e.best_link_verified_at AS bestLinkVerifiedAt,
      COALESCE((SELECT p.image_url FROM event_media_proofs p WHERE p.event_id=e.id AND p.state='verified' AND p.observed_at > CAST(strftime('%s','now') AS INTEGER)*1000 - 2592000000 ORDER BY p.observed_at DESC LIMIT 1), m.image_url) AS imageUrl,
      COALESCE(e.image_width, m.image_width) AS imageWidth,
      COALESCE(e.image_height, m.image_height) AS imageHeight,
      CASE WHEN EXISTS(SELECT 1 FROM event_media_proofs p WHERE p.event_id=e.id AND p.state='verified' AND p.observed_at > CAST(strftime('%s','now') AS INTEGER)*1000 - 2592000000) THEN NULL ELSE m.image_attribution END AS imageAttribution,
      CASE WHEN EXISTS(SELECT 1 FROM event_media_proofs p WHERE p.event_id=e.id AND p.state='verified' AND p.observed_at > CAST(strftime('%s','now') AS INTEGER)*1000 - 2592000000) THEN 'event' WHEN m.image_url IS NOT NULL THEN 'artist' END AS imageKind,
      COALESCE((SELECT p.source_url FROM event_media_proofs p WHERE p.event_id=e.id AND p.state='verified' AND p.observed_at > CAST(strftime('%s','now') AS INTEGER)*1000 - 2592000000 ORDER BY p.observed_at DESC LIMIT 1), m.source_url) AS imageSourceUrl,
      COALESCE(e.image_fallback, m.is_fallback) AS imageFallback,
      EXISTS (
        SELECT 1 FROM event_publication_quarantine q
        WHERE q.event_id = e.id AND q.released_at IS NULL
      ) AS publicationQuarantined
    FROM canonical_events e
    LEFT JOIN published_artist_media m ON m.normalized_name = lower(trim(e.artist))
    WHERE e.id = ?
  `).get(id) as CanonicalEventRecord | undefined;
  return row ? hydrateEventRecord(row) : undefined;
}

export function isEventPublicationQuarantined(id: string): boolean {
  return Boolean(getDb().prepare(`
    SELECT 1 FROM event_publication_quarantine
    WHERE event_id = ? AND released_at IS NULL
  `).get(id));
}

export function getUpcomingCatalogEvents(limit = 240, now = new Date()): CanonicalEventRecord[] {
  const rows = getDb().prepare(`
    SELECT e.data_verified_at AS dataVerifiedAt, e.last_seen_at AS lastSeenAt, e.updated_at AS updatedAt, e.id, e.provider, e.provider_event_id AS providerEventId, e.name, e.artist,
      e.starts_at AS startsAt, e.timezone, e.venue, e.city, e.country_code AS countryCode,
      e.latitude, e.longitude, e.official_url AS officialUrl, e.confidence,
      e.lifecycle_status AS lifecycleStatus,
      e.best_link_url AS bestLinkUrl, e.best_link_role AS bestLinkRole,
      e.best_link_source AS bestLinkSource, e.best_link_score AS bestLinkScore,
      e.best_link_verified_at AS bestLinkVerifiedAt,
      COALESCE((SELECT p.image_url FROM event_media_proofs p WHERE p.event_id=e.id AND p.state='verified' AND p.observed_at > CAST(strftime('%s','now') AS INTEGER)*1000 - 2592000000 ORDER BY p.observed_at DESC LIMIT 1), m.image_url) AS imageUrl,
      COALESCE(e.image_width, m.image_width) AS imageWidth,
      COALESCE(e.image_height, m.image_height) AS imageHeight,
      CASE WHEN EXISTS(SELECT 1 FROM event_media_proofs p WHERE p.event_id=e.id AND p.state='verified' AND p.observed_at > CAST(strftime('%s','now') AS INTEGER)*1000 - 2592000000) THEN NULL ELSE m.image_attribution END AS imageAttribution,
      CASE WHEN EXISTS(SELECT 1 FROM event_media_proofs p WHERE p.event_id=e.id AND p.state='verified' AND p.observed_at > CAST(strftime('%s','now') AS INTEGER)*1000 - 2592000000) THEN 'event' WHEN m.image_url IS NOT NULL THEN 'artist' END AS imageKind,
      COALESCE((SELECT p.source_url FROM event_media_proofs p WHERE p.event_id=e.id AND p.state='verified' AND p.observed_at > CAST(strftime('%s','now') AS INTEGER)*1000 - 2592000000 ORDER BY p.observed_at DESC LIMIT 1), m.source_url) AS imageSourceUrl,
      COALESCE(e.image_fallback, m.is_fallback) AS imageFallback
    FROM canonical_events e
    LEFT JOIN published_artist_media m ON m.normalized_name = lower(trim(e.artist))
    WHERE datetime(e.starts_at) >= datetime(?)
      AND e.lifecycle_status NOT IN ('cancelled', 'deleted')
      AND NOT EXISTS (
        SELECT 1 FROM event_publication_quarantine q
        WHERE q.event_id = e.id AND q.released_at IS NULL
      )
    ORDER BY datetime(e.starts_at) ASC
    LIMIT ?
  `).all(now.toISOString(), limit) as unknown as CanonicalEventRecord[];
  return rows.map(hydrateEventRecord);
}

export function searchUpcomingCatalogEvents(
  query: DiscoveryQuery,
  limit = 160,
): CanonicalEventRecord[] {
  const conditions = [
    'datetime(e.starts_at) >= datetime(?)',
    "e.lifecycle_status NOT IN ('cancelled', 'deleted')",
    'NOT EXISTS (SELECT 1 FROM event_publication_quarantine q WHERE q.event_id = e.id AND q.released_at IS NULL)',
  ];
  const parameters: Array<string | number> = [query.startDateTime ?? new Date().toISOString()];
  if (query.endDateTime) {
    conditions.push('datetime(e.starts_at) <= datetime(?)');
    parameters.push(query.endDateTime);
  }
  if (query.countryCode) {
    conditions.push('e.country_code = ?');
    parameters.push(query.countryCode);
  }
  if (query.city) {
    conditions.push("lower(COALESCE(e.city, '')) LIKE lower(?)");
    parameters.push(`%${query.city}%`);
  }
  if (query.artist) {
    const canonicalArtist = canonicalCatalogArtistName(query.artist) ?? query.artist;
    conditions.push("(lower(COALESCE(e.artist, '')) = lower(?) OR lower(e.name) LIKE lower(?))");
    parameters.push(canonicalArtist, `%${query.artist}%`);
  }
  parameters.push(limit);
  const rows = getDb().prepare(`
    SELECT e.data_verified_at AS dataVerifiedAt, e.last_seen_at AS lastSeenAt, e.updated_at AS updatedAt, e.id, e.provider, e.provider_event_id AS providerEventId, e.name, e.artist,
      e.starts_at AS startsAt, e.timezone, e.venue, e.city, e.country_code AS countryCode,
      e.latitude, e.longitude, e.official_url AS officialUrl, e.confidence,
      e.lifecycle_status AS lifecycleStatus,
      e.best_link_url AS bestLinkUrl, e.best_link_role AS bestLinkRole,
      e.best_link_source AS bestLinkSource, e.best_link_score AS bestLinkScore,
      e.best_link_verified_at AS bestLinkVerifiedAt,
      COALESCE((SELECT p.image_url FROM event_media_proofs p WHERE p.event_id=e.id AND p.state='verified' AND p.observed_at > CAST(strftime('%s','now') AS INTEGER)*1000 - 2592000000 ORDER BY p.observed_at DESC LIMIT 1), m.image_url) AS imageUrl,
      COALESCE(e.image_width, m.image_width) AS imageWidth,
      COALESCE(e.image_height, m.image_height) AS imageHeight,
      CASE WHEN EXISTS(SELECT 1 FROM event_media_proofs p WHERE p.event_id=e.id AND p.state='verified' AND p.observed_at > CAST(strftime('%s','now') AS INTEGER)*1000 - 2592000000) THEN NULL ELSE m.image_attribution END AS imageAttribution,
      CASE WHEN EXISTS(SELECT 1 FROM event_media_proofs p WHERE p.event_id=e.id AND p.state='verified' AND p.observed_at > CAST(strftime('%s','now') AS INTEGER)*1000 - 2592000000) THEN 'event' WHEN m.image_url IS NOT NULL THEN 'artist' END AS imageKind,
      COALESCE((SELECT p.source_url FROM event_media_proofs p WHERE p.event_id=e.id AND p.state='verified' AND p.observed_at > CAST(strftime('%s','now') AS INTEGER)*1000 - 2592000000 ORDER BY p.observed_at DESC LIMIT 1), m.source_url) AS imageSourceUrl,
      COALESCE(e.image_fallback, m.is_fallback) AS imageFallback
    FROM canonical_events e
    LEFT JOIN published_artist_media m ON m.normalized_name = lower(trim(e.artist))
    WHERE ${conditions.join(' AND ')}
    ORDER BY datetime(e.starts_at) ASC, e.data_authority_score DESC
    LIMIT ?
  `).all(...parameters) as unknown as CanonicalEventRecord[];
  return rows.map(hydrateEventRecord);
}

export function getUpcomingArtistsMissingMedia(limit = 12): string[] {
  const rows = getDb().prepare(`
    SELECT e.artist
    FROM canonical_events e
    LEFT JOIN published_artist_media m ON m.normalized_name = lower(trim(e.artist))
    WHERE datetime(e.starts_at) >= datetime('now')
      AND e.lifecycle_status NOT IN ('cancelled', 'deleted')
      AND NOT EXISTS (
        SELECT 1 FROM event_publication_quarantine q
        WHERE q.event_id = e.id AND q.released_at IS NULL
      )
      AND e.artist IS NOT NULL AND trim(e.artist) <> ''
      AND e.image_url IS NULL AND m.image_url IS NULL
    GROUP BY lower(trim(e.artist))
    ORDER BY MIN(datetime(e.starts_at)) ASC
    LIMIT ?
  `).all(limit) as Array<{ artist: string }>;
  return rows.map((row) => row.artist);
}

export function getUpcomingArtistsForMediaRefresh(limit = 16): string[] {
  const rows = getDb().prepare(`
    SELECT e.artist
    FROM canonical_events e
    LEFT JOIN published_artist_media m ON m.normalized_name = lower(trim(e.artist))
    WHERE datetime(e.starts_at) >= datetime('now')
      AND e.lifecycle_status NOT IN ('cancelled', 'deleted')
      AND NOT EXISTS (
        SELECT 1 FROM event_publication_quarantine q
        WHERE q.event_id = e.id AND q.released_at IS NULL
      )
      AND e.artist IS NOT NULL AND trim(e.artist) <> ''
    GROUP BY lower(trim(e.artist))
    ORDER BY CASE WHEN m.normalized_name IS NULL THEN 0 ELSE 1 END,
      COALESCE(m.last_checked_at, 0) ASC,
      MIN(datetime(e.starts_at)) ASC
    LIMIT ?
  `).all(limit) as Array<{ artist: string }>;
  return rows.map((row) => row.artist);
}

export async function followArtist(input: {
  user: { userId: string; email: string; displayName: string };
  artist: string;
  market: string;
}): Promise<void> {
  await upsertProfile(input.user);
  recordArtistEvidence({
    canonicalName: input.artist,
    sourceId: 'community-interest',
    externalId: input.artist.toLocaleLowerCase('en-US'),
    confidenceScore: 55,
    priorityScore: 100,
    verified: false,
  });
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

export type EventChange = { id: string; observedAt: number; fields: string[] };
export function getEventChanges(eventId: string, since = 0): EventChange[] {
  const rows = getDb().prepare(`SELECT id, observed_at AS observedAt, changed_fields_json AS fields
    FROM event_versions WHERE event_id = ? AND change_type <> 'discovered' AND observed_at > ?
    ORDER BY observed_at DESC, rowid DESC LIMIT 20`).all(eventId, since) as Array<{ id: string; observedAt: number; fields: string }>;
  const meaningful = new Set(['startsAt', 'venue', 'city', 'countryCode', 'lifecycleStatus', 'bestLinkUrl']);
  return rows.map((row) => ({ ...row, fields: (JSON.parse(row.fields) as string[]).filter((field) => meaningful.has(field)) }))
    .filter((row) => row.fields.length > 0).slice(0, 5);
}

export function getUserFollows(userId: string): Array<{ artist: string; market: string }> {
  return getDb().prepare(`SELECT artist_name AS artist, market_code AS market FROM artist_follows
    WHERE user_id = ? ORDER BY updated_at DESC`).all(userId) as Array<{ artist: string; market: string }>;
}

export function unfollowArtist(userId: string, artist: string, market: string): void {
  getDb().prepare('DELETE FROM artist_follows WHERE user_id=? AND artist_name=? COLLATE NOCASE AND market_code=?').run(userId, artist, market);
}
