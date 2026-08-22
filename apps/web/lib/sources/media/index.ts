import { getArtistMedia, type ArtistMediaRecord } from '@/db/media';
import { syncArtistMediaFromTicketmaster } from './ticketmaster';
import { syncArtistMediaFromWikimedia } from './wikimedia';

export async function syncArtistMedia(
  artistName: string,
  force = false,
): Promise<ArtistMediaRecord | undefined> {
  const ticketmaster = await syncArtistMediaFromTicketmaster(artistName, force);
  if (ticketmaster?.provider === 'ticketmaster-discovery') return ticketmaster;
  return await syncArtistMediaFromWikimedia(artistName, force) ?? getArtistMedia(artistName);
}
