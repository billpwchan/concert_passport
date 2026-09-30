import { canonicalCoreArtistName, coreArtists } from '../domain/core-artists.ts';
import { getProviderArtistLookup, saveProviderArtistLookup } from '../../db/provider-cache.ts';
import { getCatalogArtistIdentityProfile } from '../../db/artists.ts';
import {
  ticketmasterConfigured,
  ticketmasterRequest,
  type TicketmasterImage,
} from './ticketmaster-client.ts';

export type TicketmasterAttraction = {
  id: string;
  name: string;
  url?: string;
  images?: TicketmasterImage[];
  classifications?: Array<{
    segment?: { name?: string };
    type?: { name?: string };
  }>;
};

type AttractionResponse = {
  _embedded?: { attractions?: TicketmasterAttraction[] };
};

type AttractionCacheEntry = {
  expiresAt: number;
  attraction?: TicketmasterAttraction;
};

const attractionCache = new Map<string, AttractionCacheEntry>();
const attractionRequests = new Map<string, Promise<TicketmasterAttraction | undefined>>();
const MATCH_TTL_MS = 30 * 86_400_000;
const MISS_TTL_MS = 3 * 86_400_000;

export function normalizeAttractionName(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('en-US').replace(/[\s\p{P}\p{S}]+/gu, '');
}

function acceptedArtistNames(value: string): Set<string> {
  const canonical = canonicalCoreArtistName(value) ?? value.trim();
  const artist = coreArtists.find((candidate) => candidate.name === canonical);
  return new Set([canonical, artist?.query, ...(artist?.aliases ?? [])]
    .filter((name): name is string => Boolean(name))
    .map(normalizeAttractionName));
}

function attractionTypeIsCompatible(
  artistName: string,
  attraction: TicketmasterAttraction | undefined,
): boolean {
  if (!attraction) return false;
  const profile = getCatalogArtistIdentityProfile(artistName);
  const providerType = attraction.classifications?.find((item) => item.type?.name)
    ?.type?.name?.toLocaleLowerCase('en-US');
  const normalizedType = providerType === 'group'
    ? 'group'
    : providerType === 'individual' || providerType === 'person'
      ? 'person'
      : 'unknown';
  return !profile || profile.artistType === 'unknown' || normalizedType === 'unknown'
    || profile.artistType === normalizedType;
}

export async function findTicketmasterAttraction(
  requestedName: string,
): Promise<TicketmasterAttraction | undefined> {
  const canonicalName = canonicalCoreArtistName(requestedName) ?? requestedName.trim();
  if (!canonicalName || !ticketmasterConfigured()) return undefined;
  const cacheKey = normalizeAttractionName(canonicalName);
  const cached = attractionCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.attraction;
  const persisted = getProviderArtistLookup<TicketmasterAttraction>(
    'ticketmaster-discovery', canonicalName,
  );
  if (persisted) {
    const attraction = persisted.status === 'matched' && attractionTypeIsCompatible(canonicalName, persisted.payload)
      ? persisted.payload
      : undefined;
    if (attraction || persisted.status === 'missing') {
      attractionCache.set(cacheKey, { attraction, expiresAt: persisted.expiresAt });
      return attraction;
    }
  }
  const pending = attractionRequests.get(cacheKey);
  if (pending) return pending;

  const request = (async () => {
    const params = new URLSearchParams({
      keyword: canonicalName,
      classificationName: 'music',
      size: '8',
      sort: 'relevance,desc',
    });
    const response = await ticketmasterRequest<AttractionResponse>('/discovery/v2/attractions.json', params);
    const names = acceptedArtistNames(canonicalName);
    const attraction = response?._embedded?.attractions?.find((candidate) => (
      names.has(normalizeAttractionName(candidate.name))
      && candidate.classifications?.some((item) => item.segment?.name === 'Music') !== false
      && attractionTypeIsCompatible(canonicalName, candidate)
    ));
    attractionCache.set(cacheKey, {
      attraction,
      expiresAt: Date.now() + (attraction ? MATCH_TTL_MS : MISS_TTL_MS),
    });
    saveProviderArtistLookup({
      provider: 'ticketmaster-discovery',
      artistName: canonicalName,
      providerArtistId: attraction?.id,
      payload: attraction,
      status: attraction ? 'matched' : 'missing',
      ttlMs: attraction ? MATCH_TTL_MS : MISS_TTL_MS,
    });
    return attraction;
  })();
  attractionRequests.set(cacheKey, request);
  try {
    return await request;
  } finally {
    attractionRequests.delete(cacheKey);
  }
}
