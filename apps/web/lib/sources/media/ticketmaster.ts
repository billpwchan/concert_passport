import { getArtistMedia, touchArtistMedia, upsertArtistMedia, type ArtistMediaRecord } from '@/db/media';
import { canonicalCoreArtistName, coreArtists } from '@/lib/domain/core-artists';
import {
  selectTicketmasterImage,
  ticketmasterConfigured,
  ticketmasterRequest,
  type TicketmasterImage,
} from '@/lib/sources/ticketmaster-client';

type TicketmasterAttraction = {
  id: string;
  name: string;
  url?: string;
  images?: TicketmasterImage[];
  classifications?: Array<{ segment?: { name?: string } }>;
};

type AttractionResponse = {
  _embedded?: { attractions?: TicketmasterAttraction[] };
};

const REFRESH_AFTER_MS = 12 * 60 * 60_000;

function matchKey(value: string): string {
  return value.toLocaleLowerCase('en-US').replace(/[\s\p{P}\p{S}]+/gu, '');
}

function acceptedArtistNames(value: string): Set<string> {
  const canonical = canonicalCoreArtistName(value) ?? value;
  const artist = coreArtists.find((candidate) => candidate.name === canonical);
  return new Set([canonical, artist?.query, ...(artist?.aliases ?? [])]
    .filter((name): name is string => Boolean(name))
    .map(matchKey));
}

export async function syncArtistMediaFromTicketmaster(
  requestedName: string,
  force = false,
): Promise<ArtistMediaRecord | undefined> {
  const canonicalName = canonicalCoreArtistName(requestedName) ?? requestedName.trim();
  if (!canonicalName || !ticketmasterConfigured()) return getArtistMedia(canonicalName);
  const existing = getArtistMedia(canonicalName);
  if (!force && existing?.provider === 'ticketmaster-discovery'
    && Date.now() - existing.lastCheckedAt < REFRESH_AFTER_MS) return existing;

  const params = new URLSearchParams({
    keyword: canonicalName,
    classificationName: 'music',
    size: '8',
    sort: 'relevance,desc',
  });
  const response = await ticketmasterRequest<AttractionResponse>('/discovery/v2/attractions.json', params);
  const names = acceptedArtistNames(canonicalName);
  const attraction = response?._embedded?.attractions?.find((candidate) => (
    names.has(matchKey(candidate.name))
    && candidate.classifications?.some((item) => item.segment?.name === 'Music') !== false
  ));
  const image = selectTicketmasterImage(attraction?.images);
  if (!attraction || !image) {
    if (existing?.provider === 'ticketmaster-discovery') touchArtistMedia(canonicalName);
    return undefined;
  }
  return upsertArtistMedia({
    artistName: canonicalName,
    provider: 'ticketmaster-discovery',
    providerArtistId: attraction.id,
    imageUrl: image.url,
    imageWidth: image.width,
    imageHeight: image.height,
    imageAttribution: image.attribution,
    sourceUrl: attraction.url ?? `https://www.ticketmaster.com/search?q=${encodeURIComponent(canonicalName)}`,
    isFallback: image.fallback,
  });
}
