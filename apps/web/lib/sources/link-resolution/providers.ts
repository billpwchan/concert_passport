import { paidEventApisEnabled } from '../data-mode.ts';
import { ticketmasterAdapter } from '../adapters/ticketmaster.ts';
import { catalogCandidatesForEvent, localEventDate } from './catalog.ts';
import { trustedSourceForUrl } from './trusted-sources.ts';
import type { EventLinkCandidate, ResolvableEvent } from './types.ts';

function ticketmasterWindow(event: ResolvableEvent): { start: string; end: string } {
  const start = new Date(event.startsAt);
  return {
    start: new Date(start.getTime() - 36 * 60 * 60_000).toISOString().replace(/\.\d{3}Z$/, 'Z'),
    end: new Date(start.getTime() + 36 * 60 * 60_000).toISOString().replace(/\.\d{3}Z$/, 'Z'),
  };
}

async function ticketmasterCandidates(event: ResolvableEvent): Promise<EventLinkCandidate[]> {
  if (!event.artist || !event.countryCode) return [];
  const window = ticketmasterWindow(event);
  const events = await ticketmasterAdapter.discover({
    artist: event.artist,
    countryCode: event.countryCode,
    startDateTime: window.start,
    endDateTime: window.end,
  });
  return events.map((found) => ({
    url: found.officialUrl,
    sourceId: found.provider,
    sourceEventId: found.providerEventId,
    role: 'ticket',
    authority: 'seller',
    discoveredBy: 'ticketmaster',
    data: {
      name: found.name,
      artist: found.artist,
      startsAt: found.startsAt,
      venue: found.venue,
      city: found.city,
      countryCode: found.countryCode,
    },
  }));
}

type SearchHit = { title?: string; url?: string; description?: string; content?: string };

function candidatesFromSearch(
  hits: SearchHit[],
  discoveredBy: 'brave' | 'searxng',
): EventLinkCandidate[] {
  return hits.flatMap((hit) => {
    if (!hit.url) return [];
    const source = trustedSourceForUrl(hit.url);
    if (!source || source.authority === 'discovery') return [];
    return [{
      url: hit.url,
      sourceId: source.id,
      role: source.authority === 'seller' ? 'ticket' as const : 'event' as const,
      authority: source.authority,
      discoveredBy,
      data: { name: hit.title },
    }];
  });
}

function searchPhrase(event: ResolvableEvent): string {
  return `"${event.artist ?? event.name}" "${localEventDate(event)}" "${event.city ?? event.venue ?? event.countryCode ?? ''}" tickets`;
}

async function braveCandidates(event: ResolvableEvent): Promise<EventLinkCandidate[]> {
  const key = paidEventApisEnabled() ? process.env.BRAVE_SEARCH_API_KEY : undefined;
  if (!key) return [];
  const params = new URLSearchParams({ q: searchPhrase(event), count: '10', safesearch: 'strict' });
  const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
    headers: { accept: 'application/json', 'x-subscription-token': key },
    cache: 'no-store',
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Brave Search responded ${response.status}`);
  const data = await response.json() as { web?: { results?: SearchHit[] } };
  return candidatesFromSearch(data.web?.results ?? [], 'brave');
}

async function searxngCandidates(event: ResolvableEvent): Promise<EventLinkCandidate[]> {
  const baseUrl = process.env.SEARXNG_URL;
  if (!baseUrl) return [];
  const configured = new URL(baseUrl);
  if (configured.protocol !== 'https:' && configured.hostname !== 'concert-passport-searxng') {
    throw new Error('SEARXNG_URL must use HTTPS or the private service hostname');
  }
  const url = new URL('/search', configured);
  url.searchParams.set('q', searchPhrase(event));
  url.searchParams.set('format', 'json');
  url.searchParams.set('language', 'all');
  const response = await fetch(url, {
    cache: 'no-store',
    headers: { 'x-real-ip': '127.0.0.1' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`SearXNG responded ${response.status}`);
  const data = await response.json() as { results?: SearchHit[] };
  return candidatesFromSearch(data.results ?? [], 'searxng');
}

export async function discoverLinkCandidates(event: ResolvableEvent): Promise<{
  candidates: EventLinkCandidate[];
  errors: string[];
}> {
  const dynamic = await Promise.allSettled([
    ticketmasterCandidates(event),
    braveCandidates(event),
    searxngCandidates(event),
  ]);
  const errors: string[] = [];
  const candidates = [...catalogCandidatesForEvent(event)];
  dynamic.forEach((result) => {
    if (result.status === 'fulfilled') candidates.push(...result.value);
    else errors.push(result.reason instanceof Error ? result.reason.message : 'Candidate discovery failed');
  });
  const unique = new Map<string, EventLinkCandidate>();
  for (const candidate of candidates) {
    const key = candidate.url.replace(/#.*$/, '');
    const existing = unique.get(key);
    if (!existing || candidate.authority === 'seller') unique.set(key, candidate);
  }
  return { candidates: [...unique.values()], errors };
}
