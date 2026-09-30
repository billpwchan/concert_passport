import type { DiscoveredEvent, DiscoveryQuery, EventLifecycleStatus } from '../../domain/types.ts';
import { normalizeAttractionName } from '../ticketmaster-attractions.ts';

type JsonObject = Record<string, unknown>;

const COUNTRY_CODES = new Map<string, string>([
  ['au', 'AU'], ['australia', 'AU'],
  ['hk', 'HK'], ['hong kong', 'HK'],
  ['id', 'ID'], ['indonesia', 'ID'],
  ['jp', 'JP'], ['japan', 'JP'],
  ['kr', 'KR'], ['korea', 'KR'], ['south korea', 'KR'], ['republic of korea', 'KR'],
  ['my', 'MY'], ['malaysia', 'MY'],
  ['nz', 'NZ'], ['new zealand', 'NZ'],
  ['ph', 'PH'], ['philippines', 'PH'],
  ['sg', 'SG'], ['singapore', 'SG'],
  ['th', 'TH'], ['thailand', 'TH'],
  ['tw', 'TW'], ['taiwan', 'TW'],
  ['vn', 'VN'], ['vietnam', 'VN'],
]);

const TIMEZONES: Record<string, string> = {
  AU: 'Australia/Sydney', HK: 'Asia/Hong_Kong', ID: 'Asia/Jakarta',
  JP: 'Asia/Tokyo', KR: 'Asia/Seoul', MY: 'Asia/Kuala_Lumpur',
  NZ: 'Pacific/Auckland', PH: 'Asia/Manila', SG: 'Asia/Singapore',
  TH: 'Asia/Bangkok', TW: 'Asia/Taipei', VN: 'Asia/Ho_Chi_Minh',
};

function firstString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (Array.isArray(value)) return value.map(firstString).find(Boolean);
  if (value && typeof value === 'object') {
    const record = value as JsonObject;
    return firstString(record.name) ?? firstString(record.url) ?? firstString(record['@id']);
  }
  return undefined;
}

function collectEventNodes(value: unknown, output: JsonObject[]): void {
  if (Array.isArray(value)) {
    value.forEach((item) => collectEventNodes(item, output));
    return;
  }
  if (!value || typeof value !== 'object') return;
  const record = value as JsonObject;
  const types = Array.isArray(record['@type']) ? record['@type'] : [record['@type']];
  if (types.some((type) => typeof type === 'string' && type.toLocaleLowerCase('en-US').endsWith('event'))) {
    output.push(record);
  }
  if (record['@graph']) collectEventNodes(record['@graph'], output);
}

function performerName(event: JsonObject): string | undefined {
  const performers = event.performers ?? event.performer;
  if (Array.isArray(performers)) return performers.map((item) => firstString(item)).find(Boolean);
  return firstString(performers);
}

function countryCode(value: unknown, city: string | undefined): string | undefined {
  const raw = firstString(value)?.normalize('NFKC').toLocaleLowerCase('en-US').trim();
  if (raw && COUNTRY_CODES.has(raw)) return COUNTRY_CODES.get(raw);
  const normalizedCity = city?.normalize('NFKC').toLocaleLowerCase('en-US').trim();
  return normalizedCity ? COUNTRY_CODES.get(normalizedCity) : undefined;
}

function providerEventId(url: string): string | undefined {
  try {
    return new URL(url).pathname.match(/\/event\/([^/]+)/i)?.[1];
  } catch {
    return undefined;
  }
}

function eventLifecycleStatus(value: unknown): EventLifecycleStatus {
  const normalized = firstString(value)?.toLocaleLowerCase('en-US') ?? '';
  if (normalized.includes('cancel')) return 'cancelled';
  if (normalized.includes('postpon')) return 'postponed';
  if (normalized.includes('reschedul')) return 'rescheduled';
  return 'scheduled';
}

function dateIsWithinQuery(startsAt: string, query: DiscoveryQuery): boolean {
  const start = Date.parse(startsAt);
  if (!Number.isFinite(start)) return false;
  const lower = query.startDateTime ? Date.parse(query.startDateTime) : Date.now();
  const upper = query.endDateTime ? Date.parse(query.endDateTime) : Number.POSITIVE_INFINITY;
  return start >= lower && start <= upper;
}

export function parseLiveNationArtistPage(
  html: string,
  requestedArtist: string,
  query: DiscoveryQuery,
): DiscoveredEvent[] {
  const nodes: JsonObject[] = [];
  const scripts = html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of scripts) {
    try {
      collectEventNodes(JSON.parse(match[1].trim()), nodes);
    } catch {
      // Streaming pages can contain unrelated malformed third-party blocks.
    }
  }

  const requested = normalizeAttractionName(requestedArtist);
  const events = nodes.flatMap((event): DiscoveredEvent[] => {
    const artist = performerName(event);
    const startsAt = firstString(event.startDate);
    const url = firstString(event.url);
    const name = firstString(event.name);
    const location = event.location && typeof event.location === 'object' ? event.location as JsonObject : {};
    const address = location.address && typeof location.address === 'object' ? location.address as JsonObject : {};
    const geo = location.geo && typeof location.geo === 'object' ? location.geo as JsonObject : {};
    const city = firstString(address.addressLocality);
    const market = countryCode(address.addressCountry, city);
    const id = url ? providerEventId(url) : undefined;
    if (!artist || normalizeAttractionName(artist) !== requested || !startsAt || !url || !name || !id || !market) return [];
    if (!dateIsWithinQuery(startsAt, query)) return [];
    if (query.countryCode && market !== query.countryCode.toUpperCase()) return [];
    if (query.city && normalizeAttractionName(city ?? '') !== normalizeAttractionName(query.city)) return [];
    const latitude = Number(firstString(geo.latitude));
    const longitude = Number(firstString(geo.longitude));
    return [{
      provider: 'livenation-tour',
      providerEventId: id,
      name,
      artist: requestedArtist,
      startsAt,
      timezone: TIMEZONES[market],
      venue: firstString(location.name),
      city,
      countryCode: market,
      latitude: Number.isFinite(latitude) ? latitude : undefined,
      longitude: Number.isFinite(longitude) ? longitude : undefined,
      officialUrl: url,
      confidence: 'verified',
      lifecycleStatus: eventLifecycleStatus(event.eventStatus),
      bestLinkUrl: url,
      bestLinkRole: 'event',
      bestLinkSource: 'livenation',
      bestLinkScore: 94,
      bestLinkVerifiedAt: new Date().toISOString(),
      classificationTags: ['K-pop'],
    }];
  });

  return [...new Map(events.map((event) => [event.providerEventId, event])).values()]
    .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));
}
