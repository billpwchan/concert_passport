import type { ArtistEvidence } from '../../../db/artists.ts';
import { fetchIdentityPage } from './http.ts';

const PAGE_SIZE = 100;

type MusicBrainzArtist = {
  id: string;
  type?: string;
  score?: number;
  name: string;
  country?: string;
  'life-span'?: { begin?: string; end?: string; ended?: boolean };
  aliases?: Array<{ name: string; locale?: string; type?: string }>;
  tags?: Array<{ name: string; count: number }>;
};

type MusicBrainzResponse = {
  count: number;
  offset: number;
  artists?: MusicBrainzArtist[];
};

function aliasesForArtist(artist: MusicBrainzArtist): Array<{ name: string; locale?: string }> {
  return (artist.aliases ?? [])
    .filter((alias) => !alias.type || alias.type === 'Artist name' || alias.type === 'Search hint')
    .filter((alias) => !alias.locale || /^(en|ko|zh)/i.test(alias.locale))
    .map((alias) => ({ name: alias.name, locale: alias.locale }))
    .slice(0, 20);
}

function normalizeExactName(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('en-US').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export async function fetchExactKoreanArtistEvidence(
  name: string,
  expectedType?: 'group' | 'person' | 'unknown',
): Promise<ArtistEvidence | undefined> {
  const escaped = name.replace(/["\\]/g, '\\$&').slice(0, 120);
  const params = new URLSearchParams({
    query: `artist:"${escaped}" AND country:KR`,
    limit: '10',
    fmt: 'json',
  });
  const response = await fetchIdentityPage(
    `https://musicbrainz.org/ws/2/artist/?${params}`,
    {
      accept: 'application/json',
      'user-agent': 'ConcertPassport/0.2 (https://concert-passport.52-198-144-26.sslip.io)',
    },
    15_000,
  );
  if (!response.ok) throw new Error(`MusicBrainz responded ${response.status}`);
  const artists = ((await response.json()) as MusicBrainzResponse).artists ?? [];
  const exact = artists.filter((artist) => (
    normalizeExactName(artist.name) === normalizeExactName(name)
    && artist.country === 'KR'
    && (artist.type === 'Group' || artist.type === 'Person')
    && (artist.tags ?? []).some((tag) => /^(k-pop|kpop|korean pop)$/i.test(tag.name.trim()) && tag.count > 0)
    && (!expectedType || expectedType === 'unknown'
      || (expectedType === 'group' ? artist.type === 'Group' : artist.type === 'Person'))
  ));
  const ranked = exact.sort((left, right) => (right.score ?? 0) - (left.score ?? 0));
  const artist = ranked[0];
  if (!artist) return undefined;
  if (expectedType && expectedType !== 'unknown') {
    if (ranked.length !== 1) return undefined;
  } else if ((artist.score ?? 0) < 98
    || (ranked[1] && (artist.score ?? 0) - (ranked[1].score ?? 0) < 8)) return undefined;
  const tags = (artist.tags ?? []).filter((tag) => tag.count > 0).map((tag) => tag.name).slice(0, 12);
  return {
    canonicalName: artist.name,
    aliases: aliasesForArtist(artist),
    artistType: artist.type === 'Group' ? 'group' : 'person',
    countryCode: 'KR',
    lifeSpanBegin: artist['life-span']?.begin,
    lifeSpanEnd: artist['life-span']?.end,
    active: !artist['life-span']?.ended,
    tags,
    sourceId: 'musicbrainz',
    externalId: artist.id,
    confidenceScore: 92,
    priorityScore: 98,
    verified: true,
  };
}

export async function fetchMusicBrainzKpopPage(offset: number): Promise<{
  evidence: ArtistEvidence[];
  seen: number;
  total: number;
  nextOffset: number;
}> {
  const params = new URLSearchParams({
    query: 'tag:"k-pop" AND country:KR',
    limit: String(PAGE_SIZE),
    offset: String(offset),
    fmt: 'json',
  });
  const response = await fetchIdentityPage(
    `https://musicbrainz.org/ws/2/artist/?${params}`,
    {
      accept: 'application/json',
      'user-agent': 'ConcertPassport/0.2 (https://concert-passport.52-198-144-26.sslip.io)',
    },
    15_000,
  );
  if (!response.ok) throw new Error(`MusicBrainz responded ${response.status}`);
  const data = await response.json() as MusicBrainzResponse;
  const artists = data.artists ?? [];
  const evidence = artists.flatMap((artist): ArtistEvidence[] => {
    const tags = (artist.tags ?? []).filter((tag) => /^(k-pop|kpop)$/i.test(tag.name) && tag.count > 0);
    const tagVotes = tags.reduce((sum, tag) => sum + tag.count, 0);
    const supportedType = artist.type === 'Group' || artist.type === 'Person';
    if (!supportedType || artist.country !== 'KR' || tagVotes < 1 || (artist.score ?? 0) < 55) return [];
    const score = Math.min(98, Math.max(68, (artist.score ?? 0) + Math.min(12, tagVotes)));
    return [{
      canonicalName: artist.name,
      aliases: aliasesForArtist(artist),
      artistType: artist.type === 'Group' ? 'group' : 'person',
      countryCode: artist.country,
      lifeSpanBegin: artist['life-span']?.begin,
      lifeSpanEnd: artist['life-span']?.end,
      active: !artist['life-span']?.ended,
      tags: tags.map((tag) => tag.name),
      sourceId: 'musicbrainz',
      externalId: artist.id,
      confidenceScore: score,
      priorityScore: artist.type === 'Group' ? Math.min(92, 58 + tagVotes * 2) : Math.min(84, 48 + tagVotes * 2),
      verified: score >= 75,
    }];
  });
  const nextOffset = offset + artists.length >= data.count ? 0 : offset + artists.length;
  return { evidence, seen: artists.length, total: data.count, nextOffset };
}
