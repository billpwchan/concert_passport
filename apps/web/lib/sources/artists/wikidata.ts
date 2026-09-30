import type { ArtistEvidence } from '../../../db/artists.ts';
import { fetchIdentityPage } from './http.ts';

const PAGE_SIZE = 30;

type BindingValue = { value: string };
type WikidataBinding = {
  artist: BindingValue;
  artistLabel: BindingValue;
  kind: BindingValue;
  mbid?: BindingValue;
  country?: BindingValue;
  inception?: BindingValue;
};

type WikidataResponse = {
  results?: { bindings?: WikidataBinding[] };
};

const COUNTRY_CODES: Record<string, string> = {
  Q16: 'CA', Q17: 'JP', Q30: 'US', Q145: 'GB', Q148: 'CN', Q252: 'ID',
  Q408: 'AU', Q869: 'TH', Q884: 'KR', Q928: 'PH', Q334: 'MY',
};

function entityId(value: string): string {
  return value.split('/').pop() ?? value;
}

function recentPriority(inception?: string): number {
  if (!inception) return 58;
  const year = Number(inception.slice(0, 4));
  const currentYear = new Date().getUTCFullYear();
  if (year >= currentYear - 1) return 96;
  if (year >= currentYear - 3) return 84;
  return 64;
}

export async function fetchWikidataKpopPage(offset: number): Promise<{
  evidence: ArtistEvidence[];
  seen: number;
  nextOffset: number;
}> {
  const query = `
    SELECT ?artist ?artistLabel ?kind
      (SAMPLE(?mbidValue) AS ?mbid)
      (SAMPLE(?countryValue) AS ?country)
      (MAX(?inceptionValue) AS ?inception)
    WHERE {
      ?artist wdt:P136 wd:Q213665 .
      { ?artist wdt:P31 wd:Q5 . BIND("person" AS ?kind) }
      UNION
      { ?artist wdt:P31 wd:Q215380 . BIND("group" AS ?kind) }
      OPTIONAL { ?artist wdt:P434 ?mbidValue }
      OPTIONAL { ?artist wdt:P495 ?countryValue }
      OPTIONAL { ?artist wdt:P571 ?inceptionValue }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en,ko,zh". }
    }
    GROUP BY ?artist ?artistLabel ?kind
    ORDER BY DESC(?inception) ?artist
    LIMIT ${PAGE_SIZE} OFFSET ${Math.max(0, offset)}
  `;
  const params = new URLSearchParams({ query, format: 'json' });
  const response = await fetchIdentityPage(
    `https://query.wikidata.org/sparql?${params}`,
    {
      accept: 'application/sparql-results+json',
      'user-agent': 'ConcertPassport/0.2 (https://concert-passport.52-198-144-26.sslip.io)',
    },
    25_000,
  );
  if (!response.ok) throw new Error(`Wikidata responded ${response.status}`);
  const bindings = ((await response.json()) as WikidataResponse).results?.bindings ?? [];
  const unique = new Map<string, WikidataBinding>();
  for (const binding of bindings) unique.set(entityId(binding.artist.value), binding);
  const evidence = [...unique].flatMap(([id, binding]): ArtistEvidence[] => {
    const name = binding.artistLabel.value;
    if (!name || /^Q\d+$/.test(name)) return [];
    const isGroup = binding.kind.value === 'group';
    const confidence = Math.min(96, 72 + (binding.mbid ? 10 : 0) + (isGroup ? 8 : 0));
    return [{
      canonicalName: name,
      artistType: isGroup ? 'group' : 'person',
      countryCode: binding.country ? COUNTRY_CODES[entityId(binding.country.value)] : undefined,
      lifeSpanBegin: binding.inception?.value.slice(0, 10),
      active: true,
      tags: ['k-pop'],
      sourceId: 'wikidata',
      externalId: id,
      confidenceScore: confidence,
      priorityScore: Math.min(100, recentPriority(binding.inception?.value) + (isGroup ? 4 : 0)),
      verified: confidence >= 80,
    }];
  });
  return {
    evidence,
    seen: bindings.length,
    nextOffset: bindings.length < PAGE_SIZE ? 0 : offset + bindings.length,
  };
}
