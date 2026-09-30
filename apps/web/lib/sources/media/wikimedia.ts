import { getDb } from '../../../db/index.ts';
import { normalizeArtistMediaName } from '../../../db/media.ts';
import { getArtistSourceExternalId, normalizeArtistIdentity } from '../../../db/artists.ts';
import { getArtistMedia, upsertArtistMedia, type ArtistMediaRecord } from '../../../db/media.ts';
import { canonicalCoreArtistName } from '../../domain/core-artists.ts';

const REFRESH_AFTER_MS = 7 * 86_400_000;
const USER_AGENT = 'ConcertPassport/0.3 (licensed artist media metadata; https://concert-passport.52-198-144-26.sslip.io/sources)';

type WikidataSearchResult = {
  id?: string;
  label?: string;
  description?: string;
  aliases?: string[];
};

type WikidataSearchResponse = { search?: WikidataSearchResult[] };
type WikidataEntityResponse = {
  entities?: Record<string, {
    claims?: {
      P18?: Array<{ mainsnak?: { datavalue?: { value?: string } } }>;
      P373?: Array<{ mainsnak?: { datavalue?: { value?: string } } }>;
    };
    sitelinks?: { commonswiki?: { title?: string } };
  }>;
};

type CommonsImageInfo = {
  url?: string;
  descriptionurl?: string;
  width?: number;
  height?: number;
  mime?: string;
  extmetadata?: Record<string, { value?: string }>;
};

type CommonsPage = { pageid?: number; title?: string; imageinfo?: CommonsImageInfo[] };
type CommonsResponse = { query?: { pages?: CommonsPage[] } };

function stripMarkup(value: string | undefined): string | undefined {
  const text = value?.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ')
    .replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, 240) : undefined;
}

export function exactArtistResult(
  results: WikidataSearchResult[],
  artistName: string,
): WikidataSearchResult | undefined {
  const requested = normalizeArtistIdentity(artistName);
  return results.find((result) => [result.label, ...(result.aliases ?? [])]
    .some((value) => value && normalizeArtistIdentity(value) === requested)
    && /(?:korean|k-pop|girl group|boy band|music group|singer|rapper|musician|artist)/i
      .test(result.description ?? ''));
}

async function resolveWikidataId(artistName: string): Promise<string | undefined> {
  const musicbrainzId = getArtistSourceExternalId(artistName, 'musicbrainz');
  if (musicbrainzId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(musicbrainzId)) {
    const query = `SELECT ?item WHERE { ?item wdt:P434 "${musicbrainzId}". } LIMIT 2`;
    const params = new URLSearchParams({ query, format: 'json' });
    const response = await fetch(`https://query.wikidata.org/sparql?${params}`, {
      headers: { accept: 'application/sparql-results+json', 'user-agent': USER_AGENT },
      cache: 'no-store', signal: AbortSignal.timeout(12_000),
    });
    if (response.ok) {
      const data = await response.json() as {
        results?: { bindings?: Array<{ item?: { value?: string } }> };
      };
      const matches = data.results?.bindings ?? [];
      if (matches.length === 1) {
        const id = matches[0].item?.value?.split('/').pop();
        if (id && /^Q\d+$/.test(id)) return id;
      }
    }
  }
  const known = getArtistSourceExternalId(artistName, 'wikidata');
  if (known && /^Q\d+$/.test(known)) return known;
  const params = new URLSearchParams({
    action: 'wbsearchentities', format: 'json', language: 'en', uselang: 'en',
    type: 'item', limit: '10', search: artistName,
  });
  const response = await fetch(`https://www.wikidata.org/w/api.php?${params}`, {
    headers: { accept: 'application/json', 'user-agent': USER_AGENT },
    cache: 'no-store', signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Wikidata media search responded ${response.status}`);
  return exactArtistResult(
    ((await response.json()) as WikidataSearchResponse).search ?? [], artistName,
  )?.id;
}

async function wikidataMediaClaims(entityId: string): Promise<{
  filename?: string;
  commonsCategory?: string;
}> {
  const params = new URLSearchParams({
    action: 'wbgetentities', format: 'json', props: 'claims|sitelinks', ids: entityId,
  });
  const response = await fetch(`https://www.wikidata.org/w/api.php?${params}`, {
    headers: { accept: 'application/json', 'user-agent': USER_AGENT },
    cache: 'no-store', signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Wikidata entity responded ${response.status}`);
  const entity = ((await response.json()) as WikidataEntityResponse).entities?.[entityId];
  const claims = entity?.claims;
  const commonsTitle = entity?.sitelinks?.commonswiki?.title;
  return {
    filename: claims?.P18?.[0]?.mainsnak?.datavalue?.value,
    commonsCategory: claims?.P373?.[0]?.mainsnak?.datavalue?.value
      ?? commonsTitle?.replace(/^Category:/i, ''),
  };
}

async function commonsImage(
  filename: string,
): Promise<{ pageId: string; info: CommonsImageInfo } | undefined> {
  const params = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', prop: 'imageinfo',
    iiprop: 'url|size|mime|extmetadata', titles: `File:${filename}`,
  });
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: { accept: 'application/json', 'user-agent': USER_AGENT },
    cache: 'no-store', signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Wikimedia Commons responded ${response.status}`);
  const page = ((await response.json()) as CommonsResponse).query?.pages?.[0];
  const info = page?.imageinfo?.[0];
  if (!page?.pageid || !info) return undefined;
  return { pageId: String(page.pageid), info };
}

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
  const existing = getArtistMedia(canonicalName);
  if (!canonicalName) return existing;
  if (!force && existing?.provider === 'wikimedia-commons'
    && Date.now() - existing.lastCheckedAt < REFRESH_AFTER_MS) return existing;

  const entityId = await resolveWikidataId(canonicalName);
  if (!entityId) return existing;
  const claims = await wikidataMediaClaims(entityId);
  const media = claims.filename
    ? await commonsImage(claims.filename)
    : undefined;
  const image = media?.info;
  const width = Number(image?.width ?? 0);
  const height = Number(image?.height ?? 0);
  if (!media || !image?.url || !isAllowedWikimediaImageUrl(image.url)
    || !image.mime?.startsWith('image/') || width < 640 || height < 360) return existing;

  const metadata = image.extmetadata ?? {};
  const creator = stripMarkup(metadata.Artist?.value ?? metadata.Credit?.value);
  const licenseName = stripMarkup(metadata.LicenseShortName?.value ?? metadata.UsageTerms?.value);
  const licenseUrl = metadata.LicenseUrl?.value?.startsWith('https://')
    ? metadata.LicenseUrl.value
    : undefined;
  const attribution = [creator, licenseName].filter(Boolean).join(' · ') || 'Wikimedia Commons';
  const saved = upsertArtistMedia({
    artistName: canonicalName,
    provider: 'wikimedia-commons',
    providerArtistId: entityId,
    imageUrl: image.url,
    imageWidth: width,
    imageHeight: height,
    imageAttribution: attribution,
    creator,
    licenseName,
    licenseUrl,
    usagePolicy: 'commons_licensed',
    sourceUrl: image.descriptionurl
      ?? (claims.filename
        ? `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(claims.filename).replaceAll('%20', '_')}`
        : `https://commons.wikimedia.org/wiki/Category:${encodeURIComponent(claims.commonsCategory ?? '').replaceAll('%20', '_')}`),
    isFallback: false,
  });
  if (saved && claims.filename) getDb().prepare(`INSERT INTO artist_media_proofs(normalized_name,image_url,identity_id,relation,observed_at)
    VALUES(?,?,?,'wikidata:P18',?) ON CONFLICT(normalized_name,image_url) DO UPDATE SET identity_id=excluded.identity_id,observed_at=excluded.observed_at`)
    .run(normalizeArtistMediaName(canonicalName),saved.imageUrl,entityId,Date.now());
  return saved;
}
