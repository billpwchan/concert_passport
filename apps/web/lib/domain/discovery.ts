import { canonicalCoreArtistName, coreArtists } from './core-artists.ts';
import type { DiscoveredEvent, DiscoveryQuery } from './types.ts';

export const normalizeIdentity = (value: string) => value.normalize('NFKC').toLocaleLowerCase('en-US').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export function matchesArtist(value: string, query: string): boolean {
  const canonical = canonicalCoreArtistName(query);
  const artist = coreArtists.find((item) => item.name === canonical);
  const names = [query, canonical, artist?.query, ...(artist?.aliases ?? [])].filter((name): name is string => Boolean(name));
  const text = ` ${normalizeIdentity(value)} `;
  return names.some((name) => text.includes(` ${normalizeIdentity(name)} `));
}

export function matchesDiscovery(event: DiscoveredEvent, query: DiscoveryQuery): boolean {
  return (!query.artist || matchesArtist(`${event.artist ?? ''} ${event.name}`, query.artist))
    && (!query.countryCode || event.countryCode === query.countryCode)
    && (!query.city || normalizeIdentity(event.city ?? '').includes(normalizeIdentity(query.city)))
    && (!query.startDateTime || Date.parse(event.startsAt) >= Date.parse(query.startDateTime))
    && (!query.endDateTime || Date.parse(event.startsAt) <= Date.parse(query.endDateTime));
}

// Conservative display deduplication. Source rows and their version history remain intact.
// Never merge two performances just because they share an artist and a day.
export function deduplicateEvents<T extends DiscoveredEvent>(events: T[]): T[] {
  const unique = new Map<string, T>();
  const rank = (event: T) => (event.confidence === 'official' ? 100 : event.confidence === 'verified' ? 70 : 30)
    + (event.bestLinkUrl ? 10 : 0);
  for (const event of events) {
    const identity = event.artist && event.venue && event.countryCode
      ? `${normalizeIdentity(canonicalCoreArtistName(event.artist) ?? event.artist)}|${Date.parse(event.startsAt)}|${event.countryCode}|${normalizeIdentity(event.venue)}`
      : `${event.provider}:${event.providerEventId}`;
    const previous = unique.get(identity);
    if (!previous || rank(event) > rank(previous)) unique.set(identity, event);
  }
  return [...unique.values()].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
}

export function eventFreshness(checkedAt?: number, now = Date.now()): 'fresh' | 'aging' | 'stale' | 'unknown' {
  if (!checkedAt) return 'unknown';
  const hours = (now - checkedAt) / 3_600_000;
  return hours <= 24 ? 'fresh' : hours <= 72 ? 'aging' : 'stale';
}

export function hasConfirmedPerformanceTime(event: Pick<DiscoveredEvent, 'startsAt' | 'timingConflict'>): boolean {
  return !event.timingConflict && /T\d{2}:\d{2}/.test(event.startsAt)
    && /(?:Z|[+-]\d{2}:\d{2})$/.test(event.startsAt)
    && !/T23:59(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(event.startsAt);
}
