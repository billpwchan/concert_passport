import { getDb } from './index.ts';
import { dataAuthorityScore } from '../lib/sources/link-resolution/matcher.ts';
import type { LinkResolutionStats, ResolvableEvent, ScoredCandidate } from '../lib/sources/link-resolution/types.ts';

type ResolutionEventRow = ResolvableEvent & {
  dataAuthorityScore: number;
  imageUrl?: string;
};

export function getEventsForLinkResolution(limit = 36, now = new Date()): ResolutionEventRow[] {
  return getDb().prepare(`
    SELECT id, name, artist, starts_at AS startsAt, timezone, venue, city,
      country_code AS countryCode, data_authority_score AS dataAuthorityScore,
      image_url AS imageUrl
    FROM canonical_events
    WHERE datetime(starts_at) >= datetime(?)
      AND lifecycle_status NOT IN ('cancelled', 'deleted')
      AND NOT EXISTS (
        SELECT 1 FROM event_publication_quarantine q
        WHERE q.event_id = canonical_events.id AND q.released_at IS NULL
      )
      AND (
        best_link_url IS NULL
        OR best_link_verified_at IS NULL
        OR best_link_verified_at < ?
      )
      AND (
        NOT EXISTS (
          SELECT 1 FROM event_link_evidence e WHERE e.event_id = canonical_events.id
        )
        OR EXISTS (
          SELECT 1 FROM event_link_evidence e
          WHERE e.event_id = canonical_events.id
            AND COALESCE(e.next_check_at, 0) <= ?
        )
      )
    ORDER BY CASE WHEN best_link_url IS NULL THEN 0 ELSE 1 END, datetime(starts_at) ASC
    LIMIT ?
  `).all(now.toISOString(), now.getTime() - 12 * 60 * 60_000, now.getTime(), limit) as unknown as ResolutionEventRow[];
}

function recomputeCanonicalBestLink(eventId: string): void {
  const db = getDb();
  const best = db.prepare(`
    SELECT canonical_url AS url, link_role AS role, source_id AS source,
      match_score AS score, last_verified_at AS verifiedAt
    FROM event_link_evidence
    WHERE event_id = ? AND validation_state = 'verified'
    ORDER BY match_score DESC,
      CASE link_role WHEN 'ticket' THEN 0 WHEN 'event' THEN 1 ELSE 2 END,
      last_verified_at DESC
    LIMIT 1
  `).get(eventId) as {
    url: string;
    role: string;
    source: string;
    score: number;
    verifiedAt: number;
  } | undefined;
  db.prepare(`
    UPDATE canonical_events SET
      best_link_url = ?, best_link_role = ?, best_link_source = ?,
      best_link_score = ?, best_link_verified_at = ?, updated_at = ?
    WHERE id = ?
  `).run(
    best?.url ?? null,
    best?.role ?? null,
    best?.source ?? null,
    best?.score ?? null,
    best?.verifiedAt ?? null,
    Date.now(),
    eventId,
  );
}

export function recordLinkEvidence(eventId: string, candidate: ScoredCandidate): void {
  const db = getDb();
  const now = Date.now();
  const previous = db.prepare(`
    SELECT retry_count AS retryCount FROM event_link_evidence
    WHERE event_id = ? AND canonical_url = ?
  `).get(eventId, candidate.canonicalUrl) as { retryCount: number } | undefined;
  const retryCount = candidate.state === 'verified' ? 0 : (previous?.retryCount ?? 0) + 1;
  const retryDelay = Math.min(
    7 * 86_400_000,
    6 * 60 * 60_000 * (2 ** Math.min(5, Math.max(0, retryCount - 1))),
  );
  db.prepare(`
    INSERT INTO event_link_evidence
      (id, event_id, source_id, source_event_id, candidate_url, canonical_url,
       link_role, authority, validation_state, match_score, evidence_json,
       content_hash, http_status, failure_code, retry_count, next_check_at,
       first_seen_at, last_checked_at, last_verified_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(event_id, canonical_url) DO UPDATE SET
      source_id = excluded.source_id,
      source_event_id = excluded.source_event_id,
      candidate_url = excluded.candidate_url,
      link_role = excluded.link_role,
      authority = excluded.authority,
      validation_state = excluded.validation_state,
      match_score = excluded.match_score,
      evidence_json = excluded.evidence_json,
      content_hash = excluded.content_hash,
      http_status = excluded.http_status,
      failure_code = excluded.failure_code,
      retry_count = excluded.retry_count,
      next_check_at = excluded.next_check_at,
      last_checked_at = excluded.last_checked_at,
      last_verified_at = excluded.last_verified_at,
      updated_at = excluded.updated_at
  `).run(
    crypto.randomUUID(), eventId, candidate.sourceId, candidate.sourceEventId ?? null,
    candidate.url, candidate.canonicalUrl, candidate.resolvedRole, candidate.authority,
    candidate.state, candidate.score,
    JSON.stringify({
      discoveredBy: candidate.discoveredBy,
      reasons: candidate.reasons,
      conflicts: candidate.conflicts,
      data: candidate.inspection.data,
      offerUrl: candidate.inspection.offerUrl,
    }),
    candidate.inspection.contentHash ?? null,
    candidate.inspection.httpStatus ?? null,
    candidate.inspection.failureCode ?? null,
    retryCount,
    candidate.state === 'verified' ? now + 12 * 60 * 60_000 : now + retryDelay,
    now, now, candidate.state === 'verified' ? now : null, now,
  );
  recomputeCanonicalBestLink(eventId);
}

function normalizedCountry(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toUpperCase();
  const names: Record<string, string> = {
    AUSTRALIA: 'AU', JAPAN: 'JP', SINGAPORE: 'SG', TAIWAN: 'TW',
    'TAIWAN, PROVINCE OF CHINA': 'TW', MALAYSIA: 'MY',
  };
  return names[normalized] ?? (/^[A-Z]{2}$/.test(normalized) ? normalized : undefined);
}

function timeZoneOffsetAt(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(instant));
  const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const representedAsUtc = Date.UTC(
    read('year'), read('month') - 1, read('day'), read('hour'), read('minute'), read('second'),
  );
  return representedAsUtc - instant;
}

function zonedLocalTimestamp(value: string, timeZone: string): string | undefined {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return undefined;
  const desired = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]), 0);
  let instant = desired - timeZoneOffsetAt(desired, timeZone);
  instant = desired - timeZoneOffsetAt(instant, timeZone);
  return new Date(instant).toISOString();
}

export function verifiedTimestamp(value: string | undefined, timeZone: string | undefined): string | undefined {
  if (!value || !value.includes('T')) return undefined;
  if (/T00:00(?::00)?(?:\.000)?$/.test(value)) return undefined;
  if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) {
    return timeZone ? zonedLocalTimestamp(value, timeZone) : undefined;
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return undefined;
  const normalized = new Date(parsed);
  normalized.setUTCSeconds(0, 0);
  return normalized.toISOString();
}

export function publishBestLinkAndReconcile(
  event: ResolutionEventRow,
  candidate: ScoredCandidate,
): number {
  if (candidate.state !== 'verified') return 0;
  const db = getDb();
  const now = Date.now();
  const sourceScore = dataAuthorityScore[candidate.authority];
  const patch: Record<string, string> = {};
  if (sourceScore >= event.dataAuthorityScore && candidate.score >= 85) {
    const data = candidate.inspection.data;
    const startsAt = verifiedTimestamp(candidate.data.startsAt, event.timezone)
      ?? verifiedTimestamp(data.startsAt, event.timezone);
    if (startsAt && startsAt !== event.startsAt) patch.startsAt = startsAt;
    if (data.venue && data.venue !== event.venue) patch.venue = data.venue;
    if (data.city && data.city !== event.city) patch.city = data.city;
    const countryCode = normalizedCountry(data.countryCode);
    if (countryCode && countryCode !== event.countryCode) patch.countryCode = countryCode;
  }
  const candidateImage = candidate.score >= 85 && candidate.inspection.data.imageScope === 'event' && candidate.inspection.data.imageUrl
    ? candidate.inspection.data.imageUrl
    : undefined;
  if (!event.imageUrl && candidateImage) patch.imageUrl = candidateImage;

  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(`
      UPDATE canonical_events SET
        best_link_url = ?, best_link_role = ?, best_link_source = ?,
        best_link_score = ?, best_link_verified_at = ?,
        starts_at = COALESCE(?, starts_at), venue = COALESCE(?, venue),
        city = COALESCE(?, city), country_code = COALESCE(?, country_code),
        image_url = COALESCE(image_url, ?),
        image_width = COALESCE(image_width, ?), image_height = COALESCE(image_height, ?),
        image_attribution = COALESCE(image_attribution, ?),
        image_source_url = COALESCE(image_source_url, ?),
        data_authority_score = CASE WHEN ? > data_authority_score THEN ? ELSE data_authority_score END,
        data_source_id = CASE WHEN ? >= data_authority_score THEN ? ELSE data_source_id END,
        data_verified_at = CASE WHEN ? >= data_authority_score THEN ? ELSE data_verified_at END,
        updated_at = ?
      WHERE id = ?
    `).run(
      candidate.canonicalUrl, candidate.resolvedRole, candidate.sourceId,
      candidate.score, now,
      patch.startsAt ?? null, patch.venue ?? null, patch.city ?? null, patch.countryCode ?? null,
      candidateImage ?? null,
      candidate.inspection.data.imageWidth ?? null,
      candidate.inspection.data.imageHeight ?? null,
      candidateImage ? `Official media · ${candidate.sourceId}` : null,
      candidateImage ? candidate.canonicalUrl : null,
      sourceScore, sourceScore, sourceScore, candidate.sourceId, sourceScore, now, now, event.id,
    );
    db.prepare("UPDATE event_media_proofs SET state='stale' WHERE event_id=? AND source_url=? AND image_url<>?").run(event.id,candidate.inspection.requestedUrl,candidateImage??'');
    if (candidateImage) db.prepare(`INSERT INTO event_media_proofs(event_id,image_url,source_url,scope,content_hash,observed_at)
      VALUES(?,?,?,'event',?,?) ON CONFLICT(event_id,image_url) DO UPDATE SET observed_at=excluded.observed_at,content_hash=excluded.content_hash,state='verified'`)
      .run(event.id,candidateImage,candidate.inspection.requestedUrl,candidate.inspection.contentHash??null,now);
    const changedFields = Object.keys(patch);
    if (changedFields.length) {
      db.prepare(`
        INSERT INTO event_versions
          (id, event_id, provider, change_type, changed_fields_json, snapshot_json, observed_at)
        VALUES (?, ?, ?, 'authority_reconciled', ?, ?, ?)
      `).run(
        crypto.randomUUID(), event.id, candidate.sourceId,
        JSON.stringify(changedFields),
        JSON.stringify({ ...patch, authority: candidate.authority, score: candidate.score, evidenceUrl: candidate.canonicalUrl }),
        now,
      );
    }
    db.exec('COMMIT');
    return changedFields.length;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function startLinkResolutionRun(triggerType: string): string {
  const id = crypto.randomUUID();
  getDb().prepare(`
    INSERT INTO link_resolution_runs (id, trigger_type, status, started_at)
    VALUES (?, ?, 'running', ?)
  `).run(id, triggerType, Date.now());
  return id;
}

export function finishLinkResolutionRun(id: string, status: 'completed' | 'partial' | 'failed', stats: LinkResolutionStats): void {
  getDb().prepare(`
    UPDATE link_resolution_runs SET status = ?, events_checked = ?, links_verified = ?,
      links_quarantined = ?, fields_reconciled = ?, errors_json = ?, finished_at = ?
    WHERE id = ?
  `).run(
    status, stats.eventsChecked, stats.linksVerified, stats.linksQuarantined,
    stats.fieldsReconciled, JSON.stringify(stats.errors), Date.now(), id,
  );
}
