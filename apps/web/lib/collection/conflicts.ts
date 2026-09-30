import { getDb } from '../../db/index.ts';
import { normalizeIdentity } from '../domain/discovery.ts';
import type { DiscoveredEvent } from '../domain/types.ts';

function venueKey(venue: string, market: string): string {
  const key = normalizeIdentity(venue);
  // The Singapore venue is also listed under the name of its performing-arts centre.
  if (market === 'SG' && ['the star theatre', 'the star performing arts centre'].includes(key)) return 'the star theatre';
  return key;
}

/** Nearby start times from independent sources are evidence to review, never an automatic merge. */
export function conflictingPerformances(event: DiscoveredEvent): string[] {
  if (!event.artist || !event.venue || !event.countryCode || /T23:59/.test(event.startsAt)) return [];
  const rows = getDb().prepare(`SELECT id,venue FROM canonical_events WHERE artist=? COLLATE NOCASE AND country_code=?
    AND NOT (provider=? AND provider_event_id=?)
    AND abs(unixepoch(starts_at)-unixepoch(?)) BETWEEN 1 AND 7200
    AND starts_at NOT LIKE '%T23:59%' AND lifecycle_status NOT IN ('cancelled','deleted')
    AND NOT EXISTS (SELECT 1 FROM event_publication_quarantine q WHERE q.event_id=canonical_events.id AND q.released_at IS NULL)`).all(event.artist,event.countryCode,event.provider,event.providerEventId,event.startsAt) as {id:string;venue:string|null}[];
  return rows.filter(row => venueKey(row.venue ?? '',event.countryCode!) === venueKey(event.venue!,event.countryCode!)).map(row => row.id);
}
export function hasTimingConflict(eventId: string, event?: DiscoveredEvent): boolean {
  if (getDb().prepare(`SELECT 1 FROM collection_candidates WHERE event_id=? AND status='needs_review'
    AND reason='conflicting_performance_time' LIMIT 1`).get(eventId)) return true;
  const record = event ?? getDb().prepare(`SELECT provider,provider_event_id AS providerEventId,artist,venue,country_code AS countryCode,starts_at AS startsAt
    FROM canonical_events WHERE id=?`).get(eventId) as DiscoveredEvent | undefined;
  return record ? conflictingPerformances(record).length > 0 : false;
}
