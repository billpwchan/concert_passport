import type { DiscoveryQuery } from '../domain/types.ts';

const TICKETMASTER_DISCOVERY_MARKETS = ['SG', 'HK', 'AU', 'NZ'] as const;
const ticketmasterDiscoveryMarkets = new Set<string>(TICKETMASTER_DISCOVERY_MARKETS);

function boundedInteger(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, Math.floor(parsed))) : fallback;
}

function eventQueryParams(query: DiscoveryQuery, market: string | undefined): URLSearchParams {
  const params = new URLSearchParams({ size: '100', sort: 'date,asc' });
  if (query.artist) params.set('keyword', query.artist);
  if (query.city) params.set('city', query.city);
  if (market) params.set('countryCode', market);
  if (query.startDateTime) params.set('startDateTime', query.startDateTime);
  if (query.endDateTime) params.set('endDateTime', query.endDateTime);
  return params;
}

export function buildTicketmasterQueries(
  query: DiscoveryQuery,
  pageCount = boundedInteger(process.env.TICKETMASTER_MARKET_SWEEP_PAGES, 5, 1, 5),
  attractionId?: string,
): URLSearchParams[] {
  if (query.countryCode && !ticketmasterDiscoveryMarkets.has(query.countryCode)) return [];
  if (query.artist && !query.city && attractionId) {
    const pages = query.countryCode
      ? 1
      : boundedInteger(process.env.TICKETMASTER_ARTIST_DISCOVERY_PAGES, 3, 1, 5);
    return Array.from({ length: pages }, (_, page) => {
      const params = eventQueryParams({ ...query, artist: undefined }, query.countryCode);
      params.set('attractionId', attractionId);
      params.set('classificationName', 'music');
      params.set('page', String(page));
      return params;
    });
  }
  const markets = query.countryCode
    ? [query.countryCode]
    : query.artist && !query.city
      ? [...TICKETMASTER_DISCOVERY_MARKETS]
      : [undefined];

  if (query.artist || query.city || !query.countryCode) {
    return markets.map((market) => {
      const params = eventQueryParams(query, market);
      params.set('classificationName', 'music');
      params.set('size', '50');
      return params;
    });
  }

  const pages = Math.max(1, Math.min(5, Math.floor(pageCount)));
  const focused = eventQueryParams(query, query.countryCode);
  focused.set('classificationName', 'K-Pop');
  focused.set('page', '0');
  const broad = Array.from({ length: pages }, (_, page) => {
    const params = eventQueryParams(query, query.countryCode);
    params.set('classificationName', 'music');
    params.set('page', String(page));
    return params;
  });
  return [focused, ...broad];
}

export function buildPredictHqSearchWindows(
  query: DiscoveryQuery,
  shardCount = boundedInteger(process.env.PREDICTHQ_MARKET_SWEEP_SHARDS, 16, 1, 16),
): DiscoveryQuery[] {
  if (query.artist || query.city || !query.countryCode || !query.startDateTime || !query.endDateTime) {
    return [query];
  }
  const start = new Date(query.startDateTime).getTime();
  const end = new Date(query.endDateTime).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [query];
  const shards = Math.max(1, Math.min(16, Math.floor(shardCount)));
  return Array.from({ length: shards }, (_, index) => {
    const windowStart = start + Math.floor(((end - start) * index) / shards);
    const nextStart = start + Math.floor(((end - start) * (index + 1)) / shards);
    return {
      ...query,
      startDateTime: new Date(windowStart).toISOString().replace(/\.\d{3}Z$/, 'Z'),
      endDateTime: new Date(index === shards - 1 ? end : nextStart - 1_000).toISOString().replace(/\.\d{3}Z$/, 'Z'),
    };
  });
}
