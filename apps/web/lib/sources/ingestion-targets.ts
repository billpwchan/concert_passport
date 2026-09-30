import { normalizeArtistIdentity } from '../../db/artists.ts';

export type IngestionTarget = { artist: string; market: string };

export function selectIngestionTargets(
  followed: IngestionTarget[],
  scheduled: IngestionTarget[],
  limit: number,
): IngestionTarget[] {
  const boundedLimit = Math.max(0, Math.floor(limit));
  const dueArtists = new Set(scheduled.map((target) => normalizeArtistIdentity(target.artist)));
  const selected: IngestionTarget[] = [];
  const selectedPairs = new Set<string>();
  const followedArtists = new Set<string>();

  for (const target of followed) {
    const identity = normalizeArtistIdentity(target.artist);
    const pair = `${identity}|${target.market}`;
    if (!dueArtists.has(identity) || selectedPairs.has(pair) || selected.length >= boundedLimit) continue;
    selected.push(target);
    selectedPairs.add(pair);
    followedArtists.add(identity);
  }

  for (const target of scheduled) {
    const identity = normalizeArtistIdentity(target.artist);
    const pair = `${identity}|${target.market}`;
    if (followedArtists.has(identity) || selectedPairs.has(pair) || selected.length >= boundedLimit) continue;
    selected.push(target);
    selectedPairs.add(pair);
  }

  return selected;
}
