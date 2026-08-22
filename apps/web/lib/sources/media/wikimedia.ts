import { getArtistMedia, upsertArtistMedia, type ArtistMediaRecord } from '../../../db/media.ts';
import { canonicalCoreArtistName } from '../../domain/core-artists.ts';

const REFRESH_AFTER_MS = 24 * 60 * 60_000;
const wikipediaTitles: Record<string, string> = {
  ILLIT: 'Illit',
  MEOVV: 'Meovv',
  izna: 'Izna',
  KiiiKiii: 'KiiiKiii',
  'ALLDAY PROJECT': 'AllDay Project',
  BoA: 'BoA',
  CHEN: 'Chen (singer)',
  'D.O.': 'D.O. (entertainer)',
  RM: 'RM (musician)',
  Jimin: 'Jimin',
  V: 'V (singer)',
};

type PageImageResponse = {
  query?: {
    pages?: Array<{
      pageid?: number;
      title?: string;
      original?: { source?: string; width?: number; height?: number };
    }>;
  };
};

export function isAllowedWikimediaImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'upload.wikimedia.org';
  } catch {
    return false;
  }
}

export async function syncArtistMediaFromWikimedia(
  requestedName: string,
  force = false,
): Promise<ArtistMediaRecord | undefined> {
  const canonicalName = canonicalCoreArtistName(requestedName) ?? requestedName.trim();
  const title = wikipediaTitles[canonicalName];
  const existing = getArtistMedia(canonicalName);
  if (!title) return existing;
  if (!force && existing?.provider === 'wikimedia-commons'
    && Date.now() - existing.lastCheckedAt < REFRESH_AFTER_MS) return existing;

  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    redirects: '1',
    prop: 'pageimages',
    piprop: 'original',
    titles: title,
  });
  const response = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, {
    headers: {
      accept: 'application/json',
      'user-agent': 'ConcertPassport/0.1 (artist media metadata)',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Wikimedia responded ${response.status}`);
  const data = (await response.json()) as PageImageResponse;
  const page = data.query?.pages?.[0];
  const image = page?.original;
  const width = Number(image?.width ?? 0);
  const height = Number(image?.height ?? 0);
  const landscapeRatio = height ? width / height : 0;
  if (!page?.pageid || !image?.source || !isAllowedWikimediaImageUrl(image.source)
    || width < 900 || height < 500 || landscapeRatio < 1.45) return existing;

  return upsertArtistMedia({
    artistName: canonicalName,
    provider: 'wikimedia-commons',
    providerArtistId: String(page.pageid),
    imageUrl: image.source,
    imageWidth: width,
    imageHeight: height,
    imageAttribution: 'Wikimedia Commons',
    sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title ?? title).replaceAll('%20', '_')}`,
    isFallback: false,
  });
}
