import {
  deleteArtistMedia,
  getArtistMedia,
  touchArtistMedia,
  upsertArtistMedia,
  type ArtistMediaRecord,
} from '@/db/media';
import { canonicalCoreArtistName } from '@/lib/domain/core-artists';
import { isAmbiguousArtistName } from '@/lib/domain/ambiguous-artist-names';
import {
  selectTicketmasterImage,
  ticketmasterConfigured,
} from '@/lib/sources/ticketmaster-client';
import { findTicketmasterAttraction } from '@/lib/sources/ticketmaster-attractions';

const REFRESH_AFTER_MS = 12 * 60 * 60_000;

export async function syncArtistMediaFromTicketmaster(
  requestedName: string,
  force = false,
): Promise<ArtistMediaRecord | undefined> {
  const canonicalName = canonicalCoreArtistName(requestedName) ?? requestedName.trim();
  if (!canonicalName || !ticketmasterConfigured()) return getArtistMedia(canonicalName);
  const existing = getArtistMedia(canonicalName);
  if (isAmbiguousArtistName(canonicalName)) {
    if (existing?.provider === 'ticketmaster-discovery') deleteArtistMedia(canonicalName);
    return undefined;
  }
  if (!force && existing?.provider === 'ticketmaster-discovery'
    && Date.now() - existing.lastCheckedAt < REFRESH_AFTER_MS) return existing;

  const attraction = await findTicketmasterAttraction(canonicalName);
  const image = selectTicketmasterImage(attraction?.images);
  if (!attraction || !image) {
    if (existing?.provider === 'ticketmaster-discovery') {
      if (existing.isFallback) deleteArtistMedia(canonicalName);
      else touchArtistMedia(canonicalName);
    }
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
