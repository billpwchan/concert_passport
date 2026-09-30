import { matchesArtist, normalizeIdentity } from '../../domain/discovery.ts';
import { isAmbiguousArtistName } from '../../domain/ambiguous-artist-names.ts';
import type { EventLinkAuthority } from '../../domain/types.ts';
import { localEventDate } from './catalog.ts';
import type { CandidateInspection, EventLinkCandidate, ResolvableEvent, ScoredCandidate } from './types.ts';

const authorityPoints: Record<EventLinkAuthority, number> = {
  seller: 34,
  promoter: 28,
  artist: 25,
  venue: 20,
  discovery: 4,
};

export const dataAuthorityScore: Record<EventLinkAuthority, number> = {
  seller: 100,
  promoter: 95,
  artist: 90,
  venue: 85,
  discovery: 40,
};

function normalize(value: string | undefined): string {
  return (value ?? '').normalize('NFKC').toLocaleLowerCase('en-US').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function tokens(value: string | undefined): Set<string> {
  return new Set(normalize(value).split(' ').filter((token) => token.length > 1));
}

function overlap(left: string | undefined, right: string | undefined): number {
  const a = tokens(left);
  const b = tokens(right);
  if (!a.size || !b.size) return 0;
  let common = 0;
  a.forEach((token) => { if (b.has(token)) common += 1; });
  return common / Math.min(a.size, b.size);
}

function datePart(value: string | undefined): string | undefined {
  return value?.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
}

function countryIdentity(value: string | undefined): string {
  const normalized = normalize(value);
  const aliases: Record<string, string> = {
    japan: 'jp', '日本': 'jp', australia: 'au', singapore: 'sg', taiwan: 'tw', '台灣': 'tw', '台湾': 'tw', malaysia: 'my',
  };
  return aliases[normalized] ?? normalized;
}

function mergedInspection(candidate: EventLinkCandidate, inspection: CandidateInspection): CandidateInspection {
  return {
    ...inspection,
    data: {
      ...candidate.data,
      ...Object.fromEntries(Object.entries(inspection.data).filter(([, value]) => value)),
    },
  };
}

export function scoreCandidate(
  event: ResolvableEvent,
  candidate: EventLinkCandidate,
  rawInspection: CandidateInspection,
): ScoredCandidate {
  const inspection = mergedInspection(candidate, rawInspection);
  const data = inspection.data;
  const reasons: string[] = [];
  const conflicts: string[] = [];
  let score = authorityPoints[candidate.authority];
  reasons.push(`authority:${candidate.authority}`);

  const eventArtist = event.artist ?? event.name;
  const artistText = data.artist ?? data.name;
  const artistMatch = data.artist ? normalizeIdentity(data.artist) === normalizeIdentity(eventArtist)
    : !isAmbiguousArtistName(eventArtist) && matchesArtist(artistText ?? '', eventArtist);
  if (artistMatch) {
    score += 30;
    reasons.push('artist');
  } else {
    score -= 45;
    conflicts.push('artist');
  }

  const expectedDate = localEventDate(event);
  const candidateDate = datePart(data.startsAt);
  if (candidateDate === expectedDate) {
    score += 25;
    reasons.push('date');
  } else if (candidateDate) {
    score -= 55;
    conflicts.push('date');
  }

  if (event.countryCode && data.countryCode) {
    if (countryIdentity(event.countryCode) === countryIdentity(data.countryCode)) {
      score += 10;
      reasons.push('country');
    } else {
      score -= 45;
      conflicts.push('country');
    }
  }
  const venueOverlap = overlap(event.venue, data.venue);
  if (venueOverlap >= 0.5) {
    score += 10;
    reasons.push('venue');
  } else if (event.venue && data.venue && venueOverlap === 0) {
    conflicts.push('venue');
  }
  if (overlap(event.name, data.name) >= 0.45) {
    score += 6;
    reasons.push('event_name');
  }
  if (inspection.fetched) {
    score += 5;
    reasons.push('live_page');
  }
  const providerAsserted = candidate.discoveredBy === 'ticketmaster';
  if (providerAsserted) reasons.push('provider_asserted');

  const offerTrusted = Boolean(inspection.offerUrl);
  const resolvedRole = offerTrusted ? 'ticket' : candidate.role;
  if (resolvedRole === 'ticket') score += 5;
  const canonicalUrl = inspection.offerUrl ?? inspection.canonicalUrl;
  const hasIdentity = artistMatch;
  const hasDate = candidateDate === expectedDate;
  const hasMarket = !event.countryCode || !data.countryCode || countryIdentity(event.countryCode) === countryIdentity(data.countryCode);
  const threshold = resolvedRole === 'tour' ? 74 : 78;
  const hasCurrentProof = inspection.fetched || providerAsserted;
  const state = hasCurrentProof && hasIdentity && hasDate && hasMarket
    && !conflicts.includes('country') && score >= threshold
    ? 'verified'
    : 'quarantined';

  return {
    ...candidate,
    inspection,
    canonicalUrl,
    resolvedRole,
    score: Math.max(0, Math.min(100, score)),
    state,
    reasons,
    conflicts,
  };
}
