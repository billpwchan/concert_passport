import { isAmbiguousArtistName } from '../lib/domain/ambiguous-artist-names.ts';
import { coreArtists } from '../lib/domain/core-artists.ts';
import { ambiguousArtistNames } from '../lib/domain/ambiguous-artist-names.ts';
import type { DiscoveredEvent, MarketCode } from '../lib/domain/types.ts';
import { matchesPredictHqArtistQuery } from '../lib/sources/adapters/predicthq-matcher.ts';
import { sourceRegistry } from '../lib/sources/registry.ts';
import { getDb } from './index.ts';

export type ArtistEvidence = {
  canonicalName: string;
  aliases?: Array<{ name: string; locale?: string }>;
  artistType?: 'group' | 'person' | 'unknown';
  countryCode?: string;
  lifeSpanBegin?: string;
  lifeSpanEnd?: string;
  active?: boolean;
  tags?: string[];
  sourceId: string;
  externalId?: string;
  confidenceScore: number;
  priorityScore: number;
  verified?: boolean;
};

export type ArtistCatalogRecord = {
  id: string;
  canonicalName: string;
  artistType: string;
  countryCode?: string;
  lifeSpanBegin?: string;
  lifeSpanEnd?: string;
  active: boolean;
  status: string;
  confidenceScore: number;
  priorityScore: number;
  sourceCount: number;
  aliases: string[];
  nextEventCheckAt?: number;
  lastEventCheckAt?: number;
  lastEventSeenAt?: number;
};

export type MarketCoverage = {
  market: MarketCode;
  eventCount: number;
  sourceCount: number;
  lastCheckedAt?: number;
};

export type ArtistCatalogSummary = {
  artists: number;
  verifiedArtists: number;
  groups: number;
  upcomingShows: number;
  marketsWithShows: number;
  lastCatalogSyncAt?: number;
  lastEventSyncAt?: number;
};

export type CatalogArtistIdentityProfile = {
  canonicalName: string;
  artistType: 'group' | 'person' | 'unknown';
  confidenceScore: number;
  sourceCount: number;
};

export type ArtistIdentityCandidate = {
  provider: string;
  providerArtistId: string;
  artistName: string;
  artistType: 'group' | 'person' | 'unknown';
  eventTitle: string;
  marketCode?: string;
  attempts: number;
};

type ArtistRow = Omit<ArtistCatalogRecord, 'active' | 'aliases'> & {
  active: number;
  aliasesJson: string;
};

export type DueArtistCandidate = {
  artist: string;
  priorityScore: number;
  nextEventCheckAt: number;
  lastEventCheckAt?: number | null;
  lastEventSeenAt?: number | null;
  firstSeenAt: number;
};

let aliasCache: Array<{ alias: string; artist: string }> | undefined;

export function normalizeArtistIdentity(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function hydrateArtist(row: ArtistRow): ArtistCatalogRecord {
  return {
    ...row,
    active: Boolean(row.active),
    aliases: JSON.parse(row.aliasesJson) as string[],
  };
}

function findExistingArtist(sourceId: string, externalId: string | undefined, normalizedName: string): ArtistRow | undefined {
  const db = getDb();
  if (externalId) {
    const byExternal = db.prepare(`
      SELECT a.id, a.canonical_name AS canonicalName, a.artist_type AS artistType,
        a.country_code AS countryCode, a.life_span_begin AS lifeSpanBegin,
        a.life_span_end AS lifeSpanEnd, a.active, a.status,
        a.confidence_score AS confidenceScore, a.priority_score AS priorityScore,
        a.source_count AS sourceCount, a.aliases_json AS aliasesJson,
        a.next_event_check_at AS nextEventCheckAt,
        a.last_event_check_at AS lastEventCheckAt, a.last_event_seen_at AS lastEventSeenAt
      FROM artist_sources s JOIN artist_catalog a ON a.id = s.artist_id
      WHERE s.source_id = ? AND s.external_id = ?
    `).get(sourceId, externalId) as ArtistRow | undefined;
    if (byExternal) return byExternal;
  }
  return db.prepare(`
    SELECT id, canonical_name AS canonicalName, artist_type AS artistType,
      country_code AS countryCode, life_span_begin AS lifeSpanBegin,
      life_span_end AS lifeSpanEnd, active, status,
      confidence_score AS confidenceScore, priority_score AS priorityScore,
      source_count AS sourceCount, aliases_json AS aliasesJson,
      next_event_check_at AS nextEventCheckAt,
      last_event_check_at AS lastEventCheckAt, last_event_seen_at AS lastEventSeenAt
    FROM artist_catalog WHERE normalized_name = ?
  `).get(normalizedName) as ArtistRow | undefined;
}

export function recordArtistEvidence(evidence: ArtistEvidence): ArtistCatalogRecord | undefined {
  const canonicalName = evidence.canonicalName.trim().slice(0, 120);
  const normalizedName = normalizeArtistIdentity(canonicalName);
  if ((normalizedName.length < 2 && !(evidence.verified && evidence.confidenceScore >= 95)) || /^q\d+$/i.test(normalizedName)) {
    return undefined;
  }

  const db = getDb();
  const now = Date.now();
  const existing = findExistingArtist(evidence.sourceId, evidence.externalId, normalizedName);
  const incomingType = evidence.artistType ?? 'unknown';
  const identityTypeConflict = Boolean(existing
    && existing.artistType !== 'unknown'
    && incomingType !== 'unknown'
    && existing.artistType !== incomingType);
  if (identityTypeConflict) {
    if (evidence.externalId) {
      getDb().prepare(`
        DELETE FROM artist_sources
        WHERE artist_id = ? AND source_id = ? AND external_id = ?
      `).run(existing!.id, evidence.sourceId, evidence.externalId);
    }
    return hydrateArtist(existing!);
  }
  const artistId = existing?.id ?? crypto.randomUUID();
  const confidence = Math.max(0, Math.min(100, Math.round(evidence.confidenceScore)));
  const priority = Math.max(0, Math.min(100, Math.round(evidence.priorityScore)));
  const incomingStatus = evidence.verified ? 'verified' : 'observed';
  const incomingAliases = [canonicalName, ...(evidence.aliases ?? []).map((alias) => alias.name)]
    .map((alias) => alias.trim().slice(0, 120))
    .filter((alias, index, all) => alias.length >= 2 && all.indexOf(alias) === index)
    .slice(0, 24);

  if (!existing) {
    db.prepare(`
      INSERT INTO artist_catalog
        (id, canonical_name, normalized_name, artist_type, country_code,
         life_span_begin, life_span_end, active, status, confidence_score,
         priority_score, aliases_json, tags_json, source_count, first_seen_at,
         last_verified_at, next_event_check_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 0, ?, ?)
    `).run(
      artistId, canonicalName, normalizedName, evidence.artistType ?? 'unknown',
      evidence.countryCode ?? null, evidence.lifeSpanBegin ?? null, evidence.lifeSpanEnd ?? null,
      evidence.active === false ? 0 : 1, incomingStatus, confidence, priority,
      JSON.stringify(incomingAliases), JSON.stringify(evidence.tags ?? []), now,
      evidence.verified ? now : null, now, now,
    );
  } else {
    const replaceIdentity = confidence > existing.confidenceScore;
    db.prepare(`
      UPDATE artist_catalog SET
        canonical_name = CASE WHEN ? THEN ? ELSE canonical_name END,
        normalized_name = CASE WHEN ? THEN ? ELSE normalized_name END,
        artist_type = CASE
          WHEN artist_type = 'unknown' AND ? <> 'unknown' THEN ?
          WHEN ? THEN ?
          ELSE artist_type
        END,
        country_code = COALESCE(?, country_code),
        life_span_begin = COALESCE(?, life_span_begin),
        life_span_end = COALESCE(?, life_span_end),
        active = CASE WHEN ? >= confidence_score THEN ? ELSE active END,
        status = CASE WHEN ? = 'verified' THEN 'verified' ELSE status END,
        confidence_score = MAX(confidence_score, ?),
        priority_score = MAX(priority_score, ?),
        tags_json = CASE WHEN ? > confidence_score THEN ? ELSE tags_json END,
        last_verified_at = CASE WHEN ? = 'verified' THEN ? ELSE last_verified_at END,
        updated_at = ?
      WHERE id = ?
    `).run(
      replaceIdentity ? 1 : 0, canonicalName, replaceIdentity ? 1 : 0, normalizedName,
      evidence.artistType ?? 'unknown', evidence.artistType ?? 'unknown',
      replaceIdentity ? 1 : 0, evidence.artistType ?? existing.artistType,
      evidence.countryCode ?? null, evidence.lifeSpanBegin ?? null, evidence.lifeSpanEnd ?? null,
      confidence, evidence.active === false ? 0 : 1, incomingStatus, confidence, priority,
      confidence, JSON.stringify(evidence.tags ?? []), incomingStatus,
      incomingStatus === 'verified' ? now : null, now, artistId,
    );
  }

  db.prepare(`
    INSERT INTO artist_sources
      (artist_id, source_id, external_id, confidence_score, first_seen_at, last_seen_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(artist_id, source_id) DO UPDATE SET
      external_id = CASE WHEN excluded.external_id <> '' THEN excluded.external_id ELSE artist_sources.external_id END,
      confidence_score = MAX(artist_sources.confidence_score, excluded.confidence_score),
      last_seen_at = excluded.last_seen_at
  `).run(artistId, evidence.sourceId, evidence.externalId ?? '', confidence, now, now);

  const aliasStatement = db.prepare(`
    INSERT INTO artist_aliases
      (alias_normalized, alias, artist_id, locale, source_id, confidence_score, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(alias_normalized) DO UPDATE SET
      alias = CASE WHEN excluded.confidence_score > artist_aliases.confidence_score THEN excluded.alias ELSE artist_aliases.alias END,
      artist_id = CASE WHEN excluded.confidence_score > artist_aliases.confidence_score THEN excluded.artist_id ELSE artist_aliases.artist_id END,
      locale = CASE WHEN excluded.confidence_score > artist_aliases.confidence_score THEN excluded.locale ELSE artist_aliases.locale END,
      source_id = CASE WHEN excluded.confidence_score > artist_aliases.confidence_score THEN excluded.source_id ELSE artist_aliases.source_id END,
      confidence_score = MAX(artist_aliases.confidence_score, excluded.confidence_score),
      updated_at = excluded.updated_at
  `);
  for (const alias of evidence.aliases ?? []) {
    const normalizedAlias = normalizeArtistIdentity(alias.name);
    if (normalizedAlias.length >= 2 || (normalizedAlias.length === 1 && confidence >= 95)) {
      aliasStatement.run(normalizedAlias, alias.name.slice(0, 120), artistId, alias.locale ?? null, evidence.sourceId, confidence, now);
    }
  }
  aliasStatement.run(normalizedName, canonicalName, artistId, null, evidence.sourceId, confidence, now);

  const aliases = db.prepare(`
    SELECT alias FROM artist_aliases WHERE artist_id = ?
    ORDER BY confidence_score DESC, length(alias) ASC LIMIT 24
  `).all(artistId) as Array<{ alias: string }>;
  db.prepare(`
    UPDATE artist_catalog SET
      aliases_json = ?,
      source_count = (SELECT COUNT(*) FROM artist_sources WHERE artist_id = ?),
      updated_at = ?
    WHERE id = ?
  `).run(JSON.stringify(aliases.map((row) => row.alias)), artistId, now, artistId);
  aliasCache = undefined;

  const row = findExistingArtist(evidence.sourceId, evidence.externalId, normalizedName);
  return row ? hydrateArtist(row) : undefined;
}

export function ensureCoreArtistCatalog(): void {
  const count = (getDb().prepare(`
    SELECT COUNT(*) AS count FROM artist_sources WHERE source_id = 'launch-catalog'
  `).get() as { count: number }).count;
  if (count >= coreArtists.length) return;
  for (const artist of coreArtists) {
    recordArtistEvidence({
      canonicalName: artist.name,
      aliases: [artist.query, ...(artist.aliases ?? [])].map((name) => ({ name })),
      artistType: 'unknown',
      countryCode: 'KR',
      sourceId: 'launch-catalog',
      externalId: artist.id,
      confidenceScore: 100,
      priorityScore: 100,
      verified: true,
    });
  }
}

export function canonicalCatalogArtistName(value: string): string | undefined {
  ensureCoreArtistCatalog();
  const normalized = normalizeArtistIdentity(value);
  const row = getDb().prepare(`
    SELECT a.canonical_name AS canonicalName
    FROM artist_aliases x JOIN artist_catalog a ON a.id = x.artist_id
    WHERE x.alias_normalized = ? AND a.active = 1
  `).get(normalized) as { canonicalName: string } | undefined;
  return row?.canonicalName;
}

export function getCatalogArtistIdentityProfile(value: string): CatalogArtistIdentityProfile | undefined {
  ensureCoreArtistCatalog();
  const normalized = normalizeArtistIdentity(value);
  return getDb().prepare(`
    SELECT a.canonical_name AS canonicalName, a.artist_type AS artistType,
      a.confidence_score AS confidenceScore, a.source_count AS sourceCount
    FROM artist_aliases x JOIN artist_catalog a ON a.id = x.artist_id
    WHERE x.alias_normalized = ? AND a.active = 1
  `).get(normalized) as CatalogArtistIdentityProfile | undefined;
}

type CatalogArtistTrustRow = {
  artistId: string;
  canonicalName: string;
  artistType: 'group' | 'person' | 'unknown';
  tagsJson: string;
  curated: number;
};

function getCatalogArtistTrust(value: string): CatalogArtistTrustRow | undefined {
  ensureCoreArtistCatalog();
  return getDb().prepare(`
    SELECT a.id AS artistId, a.canonical_name AS canonicalName,
      a.artist_type AS artistType, a.tags_json AS tagsJson,
      EXISTS (
        SELECT 1 FROM artist_sources s
        WHERE s.artist_id = a.id AND s.source_id = 'launch-catalog'
      ) AS curated
    FROM artist_aliases x JOIN artist_catalog a ON a.id = x.artist_id
    WHERE x.alias_normalized = ? AND a.active = 1
  `).get(normalizeArtistIdentity(value)) as CatalogArtistTrustRow | undefined;
}

export function catalogArtistHasTrustedKpopEvidence(value: string): boolean {
  const row = getCatalogArtistTrust(value);
  if (!row) return false;
  const tags = JSON.parse(row.tagsJson) as string[];
  return Boolean(row.curated) || tags.some((tag) => /^(k[ -]?pop|korean pop)$/i.test(tag.trim()));
}

export function getArtistSourceExternalId(
  artistName: string,
  sourceId: string,
): string | undefined {
  ensureCoreArtistCatalog();
  const normalized = normalizeArtistIdentity(artistName);
  const row = getDb().prepare(`
    SELECT s.external_id AS externalId
    FROM artist_aliases x
    JOIN artist_sources s ON s.artist_id = x.artist_id
    WHERE x.alias_normalized = ? AND s.source_id = ? AND s.external_id <> ''
    ORDER BY s.confidence_score DESC LIMIT 1
  `).get(normalized, sourceId) as { externalId: string } | undefined;
  return row?.externalId;
}

export function eventArtistIdentityIsCompatible(
  artistName: string,
  event: Pick<DiscoveredEvent, 'artistType' | 'artistProviderId' | 'provider'>,
): boolean {
  const profile = getCatalogArtistIdentityProfile(artistName);
  if (!profile || !catalogArtistHasTrustedKpopEvidence(artistName)) return false;
  if (event.artistProviderId) {
    const binding = getDb().prepare(`
      SELECT a.canonical_name AS canonicalName
      FROM artist_provider_identities p JOIN artist_catalog a ON a.id = p.artist_id
      WHERE p.provider = ? AND p.provider_artist_id = ?
    `).get(event.provider, event.artistProviderId) as { canonicalName: string } | undefined;
    if (binding) {
      return normalizeArtistIdentity(binding.canonicalName) === normalizeArtistIdentity(profile.canonicalName);
    }
    return false;
  }
  const typeConflict = event.artistType && event.artistType !== 'unknown'
    && profile.artistType !== 'unknown' && event.artistType !== profile.artistType;
  if (typeConflict) return false;
  return profile.confidenceScore >= 95 || profile.sourceCount >= 2;
}

export function bindArtistProviderIdentity(input: {
  provider: string;
  providerArtistId: string;
  artistId: string;
  artistType?: 'group' | 'person' | 'unknown';
  confidenceScore: number;
}, now = Date.now()): boolean {
  const existing = getDb().prepare(`
    SELECT artist_id AS artistId FROM artist_provider_identities
    WHERE provider = ? AND provider_artist_id = ?
  `).get(input.provider, input.providerArtistId) as { artistId: string } | undefined;
  if (existing && existing.artistId !== input.artistId) return false;
  getDb().prepare(`
    INSERT INTO artist_provider_identities
      (provider, provider_artist_id, artist_id, artist_type, confidence_score,
       first_seen_at, last_seen_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(provider, provider_artist_id) DO UPDATE SET
      artist_type = CASE WHEN excluded.confidence_score >= confidence_score
        THEN excluded.artist_type ELSE artist_type END,
      confidence_score = MAX(confidence_score, excluded.confidence_score),
      last_seen_at = excluded.last_seen_at
  `).run(
    input.provider, input.providerArtistId, input.artistId, input.artistType ?? 'unknown',
    input.confidenceScore, now, now,
  );
  return true;
}

function identityCandidatePriority(event: DiscoveredEvent): number {
  let score = 40;
  if (event.artistType === 'group') score += 15;
  if (/^20\d{2}\b/.test(event.name.trim())) score += 20;
  if (/\b(fancon|fan concert|encore|world tour|concert)\b/i.test(event.name)) score += 15;
  const profile = event.artist ? getCatalogArtistIdentityProfile(event.artist) : undefined;
  if (profile && event.artistType && event.artistType !== 'unknown'
    && profile.artistType !== 'unknown' && event.artistType !== profile.artistType) score -= 30;
  return Math.max(0, Math.min(100, score));
}

export function observeArtistIdentityCandidates(events: DiscoveredEvent[], now = Date.now()): number {
  const statement = getDb().prepare(`
    INSERT INTO artist_identity_candidates
      (provider, provider_artist_id, artist_name, artist_type, event_title,
       market_code, priority_score, status, attempts, next_check_at,
       first_seen_at, last_seen_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 0, 0, ?, ?)
    ON CONFLICT(provider, provider_artist_id) DO UPDATE SET
      artist_name = excluded.artist_name,
      artist_type = excluded.artist_type,
      event_title = excluded.event_title,
      market_code = COALESCE(excluded.market_code, artist_identity_candidates.market_code),
      priority_score = MAX(artist_identity_candidates.priority_score, excluded.priority_score),
      status = CASE
        WHEN artist_identity_candidates.artist_name <> excluded.artist_name
          OR artist_identity_candidates.artist_type <> excluded.artist_type
        THEN 'pending' ELSE artist_identity_candidates.status END,
      attempts = CASE
        WHEN artist_identity_candidates.artist_name <> excluded.artist_name
          OR artist_identity_candidates.artist_type <> excluded.artist_type
        THEN 0 ELSE artist_identity_candidates.attempts END,
      next_check_at = CASE
        WHEN artist_identity_candidates.artist_name <> excluded.artist_name
          OR artist_identity_candidates.artist_type <> excluded.artist_type
        THEN 0 ELSE artist_identity_candidates.next_check_at END,
      last_seen_at = excluded.last_seen_at
  `);
  let observed = 0;
  for (const event of events) {
    if (event.provider !== 'ticketmaster-discovery' || !event.artistProviderId || !event.artist
      || eventArtistIdentityIsCompatible(event.artist, event)) continue;
    if (!hasKpopClassification(event)) continue;
    statement.run(
      event.provider, event.artistProviderId, event.artist, event.artistType ?? 'unknown',
      event.name, event.countryCode ?? null, identityCandidatePriority(event), now, now,
    );
    observed += 1;
  }
  return observed;
}

export function getDueArtistIdentityCandidates(
  limit = 6,
  now = Date.now(),
): ArtistIdentityCandidate[] {
  return getDb().prepare(`
    SELECT provider, provider_artist_id AS providerArtistId, artist_name AS artistName,
      artist_type AS artistType, event_title AS eventTitle, market_code AS marketCode,
      attempts
    FROM artist_identity_candidates
    WHERE status IN ('pending', 'retry') AND next_check_at <= ?
    ORDER BY priority_score DESC, attempts ASC, first_seen_at ASC
    LIMIT ?
  `).all(now, limit) as ArtistIdentityCandidate[];
}

export function completeArtistIdentityCandidate(
  candidate: Pick<ArtistIdentityCandidate, 'provider' | 'providerArtistId' | 'attempts'>,
  outcome: 'resolved' | 'needs_review' | 'no_match' | 'error',
  error?: string,
  now = Date.now(),
): void {
  const nextCheckAt = outcome === 'resolved' || outcome === 'needs_review'
    ? now + 180 * 86_400_000
    : outcome === 'no_match'
      ? now + 30 * 86_400_000
      : now + Math.min(7 * 86_400_000, 6 * 60 * 60_000 * (2 ** Math.min(5, candidate.attempts)));
  getDb().prepare(`
    UPDATE artist_identity_candidates SET status = ?, attempts = attempts + 1,
      next_check_at = ?, last_error = ?, last_checked_at = ?
    WHERE provider = ? AND provider_artist_id = ?
  `).run(
    outcome === 'resolved' ? 'resolved'
      : outcome === 'needs_review' ? 'needs_review'
        : outcome === 'no_match' ? 'no_match' : 'retry',
    nextCheckAt, error?.slice(0, 240) ?? null, now,
    candidate.provider, candidate.providerArtistId,
  );
}

export function matchCatalogArtistInText(value: string): string | undefined {
  ensureCoreArtistCatalog();
  const normalized = normalizeArtistIdentity(value);
  const direct = canonicalCatalogArtistName(normalized);
  if (direct) return direct;
  aliasCache ??= (getDb().prepare(`
    SELECT x.alias_normalized AS alias, a.canonical_name AS artist
    FROM artist_aliases x JOIN artist_catalog a ON a.id = x.artist_id
    WHERE a.active = 1 AND length(x.alias_normalized) >= 3
    ORDER BY length(x.alias_normalized) DESC
  `).all() as Array<{ alias: string; artist: string }>).filter(
    (entry) => !ambiguousArtistNames.has(entry.alias),
  );
  const padded = ` ${normalized} `;
  return aliasCache.find((entry) => padded.includes(` ${entry.alias} `))?.artist;
}

function hasKpopClassification(event: DiscoveredEvent): boolean {
  return (event.classificationTags ?? []).some((tag) => /^(k[ -]?pop|korean pop)$/i.test(tag.trim()));
}

export function observeDiscoveredEventArtist(event: DiscoveredEvent): string | undefined {
  const rawArtist = event.artist?.trim();
  const known = rawArtist ? canonicalCatalogArtistName(rawArtist) : undefined;
  if (known) return known;
  const matched = matchCatalogArtistInText([rawArtist, event.name].filter(Boolean).join(' '));
  if (matched) return matched;
  if (!rawArtist || !hasKpopClassification(event)) return undefined;
  return recordArtistEvidence({
    canonicalName: rawArtist,
    artistType: 'unknown',
    sourceId: `event:${event.provider}`,
    externalId: normalizeArtistIdentity(rawArtist),
    confidenceScore: event.confidence === 'official' ? 86 : 72,
    priorityScore: 96,
    verified: event.confidence === 'official',
  })?.canonicalName;
}

export function retainKnownKpopEvents(events: DiscoveredEvent[]): DiscoveredEvent[] {
  return events.flatMap((event) => {
    const rawArtist = event.artist?.trim();
    const knownRawArtist = rawArtist ? canonicalCatalogArtistName(rawArtist) : undefined;
    const titleArtist = matchCatalogArtistInText(event.name);
    const artist = [titleArtist, knownRawArtist]
      .filter((candidate): candidate is string => Boolean(candidate))
      .filter((candidate) => eventArtistIdentityIsCompatible(candidate, event))
      .find((candidate) => (event.provider.startsWith('official:') && knownRawArtist === candidate && !isAmbiguousArtistName(candidate)) || matchesPredictHqArtistQuery({
        title: event.name,
        entities: rawArtist ? [{
          name: rawArtist,
          type: event.artistType === 'group' ? 'organization' : event.artistType === 'person' ? 'person' : 'unknown',
        }] : [],
      }, candidate, getCatalogArtistIdentityProfile(candidate)?.artistType));
    if (artist) return [{ ...event, artist }];
    return [];
  });
}

export function selectAdaptiveArtistQueue(candidates: DueArtistCandidate[], limit: number): DueArtistCandidate[] {
  const budget = Math.max(0, Math.floor(limit));
  if (budget === 0) return [];

  const byHotness = [...candidates].sort((left, right) =>
    right.priorityScore - left.priorityScore
    || left.nextEventCheckAt - right.nextEventCheckAt
    || (right.lastEventSeenAt ?? 0) - (left.lastEventSeenAt ?? 0)
    || left.artist.localeCompare(right.artist));
  const neverChecked = candidates
    .filter((candidate) => candidate.lastEventCheckAt == null)
    .sort((left, right) =>
      right.priorityScore - left.priorityScore
      || right.firstSeenAt - left.firstSeenAt
      || left.artist.localeCompare(right.artist));
  const byLongestWait = [...candidates].sort((left, right) =>
    left.nextEventCheckAt - right.nextEventCheckAt
    || (left.lastEventCheckAt ?? 0) - (right.lastEventCheckAt ?? 0)
    || left.priorityScore - right.priorityScore
    || left.artist.localeCompare(right.artist));

  const hotBudget = Math.ceil(budget / 2);
  const newBudget = budget >= 3 ? Math.max(1, Math.floor(budget / 4)) : 0;
  const longTailBudget = budget - hotBudget - newBudget;
  const selected: DueArtistCandidate[] = [];
  const selectedNames = new Set<string>();
  const take = (pool: DueArtistCandidate[], count: number) => {
    for (const candidate of pool) {
      if (count <= 0) break;
      if (selectedNames.has(candidate.artist)) continue;
      selected.push(candidate);
      selectedNames.add(candidate.artist);
      count -= 1;
    }
  };

  take(byHotness, hotBudget);
  take(neverChecked, newBudget);
  take(byLongestWait, longTailBudget);
  take(byLongestWait, budget - selected.length);
  return selected;
}

export function getArtistsDueForIngestion(limit = 6, now = Date.now()): Array<{ artist: string; market: 'ALL' }> {
  ensureCoreArtistCatalog();
  const candidates = getDb().prepare(`
    SELECT canonical_name AS artist, priority_score AS priorityScore,
      COALESCE(next_event_check_at, 0) AS nextEventCheckAt,
      last_event_check_at AS lastEventCheckAt,
      last_event_seen_at AS lastEventSeenAt,
      first_seen_at AS firstSeenAt
    FROM artist_catalog
    WHERE active = 1 AND COALESCE(next_event_check_at, 0) <= ?
  `).all(now) as DueArtistCandidate[];
  return selectAdaptiveArtistQueue(candidates, limit)
    .map(({ artist }) => ({ artist, market: 'ALL' as const }));
}

export function markArtistEventCheck(artistName: string, eventsSeen: number, now = Date.now()): void {
  const normalized = normalizeArtistIdentity(artistName);
  const row = getDb().prepare(`
    SELECT a.id, a.priority_score AS priorityScore
    FROM artist_aliases x JOIN artist_catalog a ON a.id = x.artist_id
    WHERE x.alias_normalized = ?
  `).get(normalized) as { id: string; priorityScore: number } | undefined;
  if (!row) return;
  const nextDelay = eventsSeen > 0
    ? 6 * 60 * 60_000
    : row.priorityScore >= 95
      ? 24 * 60 * 60_000
      : row.priorityScore >= 75
        ? 3 * 86_400_000
        : 14 * 86_400_000;
  getDb().prepare(`
    UPDATE artist_catalog SET last_event_check_at = ?, next_event_check_at = ?,
      last_event_seen_at = CASE WHEN ? > 0 THEN ? ELSE last_event_seen_at END,
      priority_score = CASE WHEN ? > 0 THEN MAX(priority_score, 95) ELSE priority_score END,
      updated_at = ? WHERE id = ?
  `).run(now, now + nextDelay, eventsSeen, now, eventsSeen, now, row.id);
}

export function getNextMarketSweep(now = Date.now()): MarketCode | undefined {
  const row = getDb().prepare(`
    SELECT market_code AS market FROM market_discovery_state
    WHERE COALESCE(next_sweep_at, 0) <= ?
    ORDER BY COALESCE(last_swept_at, 0) ASC, market_code ASC LIMIT 1
  `).get(now) as { market: MarketCode } | undefined;
  return row?.market;
}

export function completeMarketSweep(market: MarketCode, eventsSeen: number, error?: string, now = Date.now()): void {
  getDb().prepare(`
    UPDATE market_discovery_state SET last_swept_at = ?, next_sweep_at = ?,
      events_seen = ?, last_error = ?, updated_at = ? WHERE market_code = ?
  `).run(now, now + 4 * 60 * 60_000, eventsSeen, error ?? null, now, market);
}

export function searchArtistCatalog(query: string, limit = 8): ArtistCatalogRecord[] {
  ensureCoreArtistCatalog();
  const normalized = normalizeArtistIdentity(query);
  if (!normalized) return [];
  const rows = getDb().prepare(`
    SELECT DISTINCT a.id, a.canonical_name AS canonicalName, a.artist_type AS artistType,
      a.country_code AS countryCode, a.life_span_begin AS lifeSpanBegin,
      a.life_span_end AS lifeSpanEnd, a.active, a.status,
      a.confidence_score AS confidenceScore, a.priority_score AS priorityScore,
      a.source_count AS sourceCount, a.aliases_json AS aliasesJson,
      a.next_event_check_at AS nextEventCheckAt,
      a.last_event_check_at AS lastEventCheckAt, a.last_event_seen_at AS lastEventSeenAt
    FROM artist_catalog a LEFT JOIN artist_aliases x ON x.artist_id = a.id
    WHERE a.active = 1 AND (a.normalized_name LIKE ? OR x.alias_normalized LIKE ?)
    ORDER BY CASE WHEN a.normalized_name = ? THEN 0 WHEN a.normalized_name LIKE ? THEN 1 ELSE 2 END,
      a.priority_score DESC, a.confidence_score DESC, a.canonical_name ASC
    LIMIT ?
  `).all(`%${normalized}%`, `%${normalized}%`, normalized, `${normalized}%`, limit) as unknown as ArtistRow[];
  return rows.map(hydrateArtist);
}

export function getArtistCatalogSummary(now = new Date()): ArtistCatalogSummary {
  ensureCoreArtistCatalog();
  const artist = getDb().prepare(`
    SELECT COUNT(*) AS artists,
      SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) AS verifiedArtists,
      SUM(CASE WHEN artist_type = 'group' THEN 1 ELSE 0 END) AS groups
    FROM artist_catalog WHERE active = 1
  `).get() as { artists: number; verifiedArtists: number; groups: number };
  const events = getDb().prepare(`
    SELECT COUNT(*) AS upcomingShows, COUNT(DISTINCT country_code) AS marketsWithShows
    FROM canonical_events WHERE datetime(starts_at) >= datetime(?)
      AND lifecycle_status NOT IN ('cancelled', 'deleted')
  `).get(now.toISOString()) as { upcomingShows: number; marketsWithShows: number };
  const catalogSync = getDb().prepare(`
    SELECT MAX(finished_at) AS lastCatalogSyncAt FROM artist_catalog_sync_state
  `).get() as { lastCatalogSyncAt?: number };
  const eventSync = getDb().prepare(`
    SELECT MAX(finished_at) AS lastEventSyncAt FROM ingestion_runs
  `).get() as { lastEventSyncAt?: number };
  return { ...artist, ...events, ...catalogSync, ...eventSync };
}

export function getMarketCoverage(now = new Date()): MarketCoverage[] {
  const eventCounts = new Map(
    (getDb().prepare(`
      SELECT country_code AS market, COUNT(*) AS eventCount
      FROM canonical_events WHERE datetime(starts_at) >= datetime(?)
        AND lifecycle_status NOT IN ('cancelled', 'deleted') AND country_code IS NOT NULL
      GROUP BY country_code
    `).all(now.toISOString()) as Array<{ market: MarketCode; eventCount: number }>)
      .map((row) => [row.market, row.eventCount]),
  );
  const sweeps = new Map(
    (getDb().prepare(`
      SELECT market_code AS market, last_swept_at AS lastCheckedAt FROM market_discovery_state
    `).all() as Array<{ market: MarketCode; lastCheckedAt?: number }>)
      .map((row) => [row.market, row.lastCheckedAt]),
  );
  const markets: MarketCode[] = ['SG', 'HK', 'JP', 'TW', 'TH', 'KR', 'MY', 'PH', 'ID', 'VN', 'AU', 'NZ'];
  return markets.map((market) => ({
    market,
    eventCount: eventCounts.get(market) ?? 0,
    sourceCount: sourceRegistry.filter((source) => source.markets.includes(market)).length,
    lastCheckedAt: sweeps.get(market) ?? undefined,
  }));
}

export function getArtistCatalogSyncState(sourceId: string): {
  cursorOffset: number;
  totalCount?: number;
} {
  const row = getDb().prepare(`
    SELECT cursor_offset AS cursorOffset, total_count AS totalCount
    FROM artist_catalog_sync_state WHERE source_id = ?
  `).get(sourceId) as { cursorOffset: number; totalCount?: number } | undefined;
  return row ?? { cursorOffset: 0 };
}

export function saveArtistCatalogSyncState(input: {
  sourceId: string;
  cursorOffset: number;
  totalCount?: number;
  status: 'completed' | 'partial' | 'failed';
  itemsSeen: number;
  itemsAccepted: number;
  error?: string;
  startedAt: number;
}): void {
  const now = Date.now();
  getDb().prepare(`
    INSERT INTO artist_catalog_sync_state
      (source_id, cursor_offset, total_count, status, items_seen, items_accepted,
       last_error, started_at, finished_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(source_id) DO UPDATE SET cursor_offset = excluded.cursor_offset,
      total_count = excluded.total_count, status = excluded.status,
      items_seen = excluded.items_seen, items_accepted = excluded.items_accepted,
      last_error = excluded.last_error, started_at = excluded.started_at,
      finished_at = excluded.finished_at, updated_at = excluded.updated_at
  `).run(
    input.sourceId, input.cursorOffset, input.totalCount ?? null, input.status,
    input.itemsSeen, input.itemsAccepted, input.error ?? null, input.startedAt, now, now,
  );
}

export function markArtistEventCheckFailed(artistName: string, now = Date.now()): void {
  const normalized = normalizeArtistIdentity(artistName);
  getDb().prepare(`UPDATE artist_catalog SET next_event_check_at = ?, updated_at = ? WHERE id IN
    (SELECT artist_id FROM artist_aliases WHERE alias_normalized = ?)`)
    .run(now + 30 * 60_000, now, normalized);
}
