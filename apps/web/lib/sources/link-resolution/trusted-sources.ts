import type { EventLinkAuthority } from '../../domain/types.ts';
import { sourceRegistry } from '../registry.ts';

type TrustedSource = {
  id: string;
  authority: EventLinkAuthority;
  domains: string[];
};

const supplementalSources: TrustedSource[] = [
  { id: 'ticketmaster', authority: 'seller', domains: ['ticketmaster.com', 'ticketmaster.com.au', 'ticketmaster.sg', 'ticketmaster.co.uk', 'ticketm.net'] },
  { id: 'axs', authority: 'seller', domains: ['axs.com'] },
  { id: 'ticketek-au', authority: 'seller', domains: ['ticketek.com.au'] },
  { id: 'livenation', authority: 'promoter', domains: ['livenation.com', 'livenation.com.au', 'livenation.com.sg', 'livenation.sg', 'livenation.com.tw', 'livenation.my'] },
  { id: 'bookmyshow', authority: 'seller', domains: ['bookmyshow.com', 'bookmyshow.sg'] },
  { id: 'yg-family', authority: 'artist', domains: ['ygfamily.com', 'yg-babymonster-official.jp', 'ygex.jp'] },
  { id: 'sony-music-jp', authority: 'artist', domains: ['sonymusic.co.jp'] },
  { id: 'jype', authority: 'artist', domains: ['jype.com'] },
  { id: 'stray-kids-japan', authority: 'artist', domains: ['straykidsjapan.com'] },
  { id: 'mamamoo-official', authority: 'artist', domains: ['mamamoo.co.kr'] },
  { id: 'the-rose-official', authority: 'artist', domains: ['officialtherose.com'] },
  { id: 'frontier-touring', authority: 'promoter', domains: ['frontiertouring.com'] },
  { id: 'singapore-expo', authority: 'venue', domains: ['singaporeexpo.com.sg'] },
  { id: 'the-star-sg', authority: 'venue', domains: ['thestar.sg'] },
  { id: 'festival-hall-au', authority: 'venue', domains: ['festivalhall.com.au'] },
  { id: 'hordern-pavilion', authority: 'venue', domains: ['thehordern.com.au'] },
  { id: 'accor-stadium', authority: 'venue', domains: ['accorstadium.com.au'] },
];

function authorityForCategory(category: (typeof sourceRegistry)[number]['category']): EventLinkAuthority {
  if (category === 'ticketing') return 'seller';
  if (category === 'promoter') return 'promoter';
  if (category === 'fan_platform') return 'artist';
  return 'discovery';
}

const trustedSources: TrustedSource[] = [
  ...sourceRegistry.map((source) => ({
    id: source.id,
    authority: authorityForCategory(source.category),
    domains: [source.host],
  })),
  ...supplementalSources,
];

function hostMatches(hostname: string, domain: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  const trusted = domain.toLowerCase().replace(/\.$/, '');
  return host === trusted || host.endsWith(`.${trusted}`);
}

export function trustedSourceForUrl(value: string): TrustedSource | undefined {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return undefined;
  }
  if (url.protocol !== 'https:' || url.username || url.password) return undefined;
  return trustedSources.find((source) => source.domains.some((domain) => hostMatches(url.hostname, domain)));
}

export function isTrustedOfficialUrl(value: string): boolean {
  return Boolean(trustedSourceForUrl(value));
}

export function canonicalizeCandidateUrl(value: string): string {
  const url = new URL(value);
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|fbclid$|gclid$|came_from$|ref$)/i.test(key)) url.searchParams.delete(key);
  }
  return url.toString();
}
