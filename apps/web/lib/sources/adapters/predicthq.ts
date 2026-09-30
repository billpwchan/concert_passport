import { paidEventApisEnabled } from '../data-mode.ts';
import { sourceReady, recordSourceOutcome } from '../../../db/collection.ts';
import type { DiscoveredEvent, DiscoveryQuery, EventLifecycleStatus } from '../../domain/types.ts';
import { canonicalCatalogArtistName, getCatalogArtistIdentityProfile } from '../../../db/artists.ts';
import { buildPredictHqSearchWindows } from '../coverage-windows.ts';
import { matchesPredictHqArtistQuery } from './predicthq-matcher.ts';
import { PartialDiscoveryError } from './result.ts';
import type { EventSourceAdapter } from './types.ts';

const APAC_COUNTRIES = 'AU,HK,ID,JP,KR,MY,NZ,PH,SG,TH,TW,VN';

type PredictHqEvent = {
  id: string;
  title: string;
  start: string;
  timezone?: string;
  description?: string;
  state?: 'active' | 'deleted';
  deleted_reason?: string;
  updated?: string;
  entities?: Array<{ name: string; type: string }>;
  location?: [number, number];
  country?: string;
  geo?: { geometry?: { coordinates?: [number, number]; type?: string } };
};

type PredictHqResponse = {
  count?: number;
  next?: string | null;
  overflow?: boolean;
  results?: PredictHqEvent[];
  failure?: string;
};

export type PredictHqChangeBatch = {
  configured: boolean;
  events: DiscoveredEvent[];
  tombstones: Array<{
    providerEventId: string;
    lifecycleStatus: EventLifecycleStatus;
    reason?: string;
    updatedAt?: string;
  }>;
  itemsSeen: number;
  complete: boolean;
  windowEndAt: string;
  nextCursorAt?: string;
  resumeUrl?: string;
};

function accessToken(): string | undefined {
  return paidEventApisEnabled() ? process.env.PREDICTHQ_ACCESS_TOKEN?.trim() || undefined : undefined;
}

function boundedPageLimit(): number {
  const parsed = Number(process.env.PREDICTHQ_MAX_PAGES_PER_WINDOW ?? 4);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(10, Math.floor(parsed))) : 4;
}

function boundedChangePageLimit(): number {
  const parsed = Number(process.env.PREDICTHQ_CHANGE_PAGES_PER_RUN ?? 4);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(10, Math.floor(parsed))) : 4;
}

async function fetchPredictHqPage(token: string, target: string): Promise<PredictHqResponse> {
  if (!sourceReady('predicthq-api')) throw new Error('PredictHQ is waiting for its scheduled retry');
  const url = new URL(target, 'https://api.predicthq.com/v1/events/');
  if (url.protocol !== 'https:' || url.hostname !== 'api.predicthq.com'
    || !['/v1/events', '/v1/events/'].includes(url.pathname)) {
    throw new Error('PredictHQ returned an unsafe pagination URL');
  }
  const response = await fetch(url, {
    headers: { accept: 'application/json', authorization: `Bearer ${token}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) { recordSourceOutcome('predicthq-api', { error: `PredictHQ responded ${response.status}` }); throw new Error(`PredictHQ responded ${response.status}`); }
  recordSourceOutcome('predicthq-api', {});
  return response.json() as Promise<PredictHqResponse>;
}

async function fetchPredictHqWindow(token: string, query: DiscoveryQuery): Promise<PredictHqResponse> {
  const params = new URLSearchParams({ category: 'concerts', limit: '50' });
  if (query.artist) params.set('q', query.artist);
  params.set('country', query.countryCode ?? APAC_COUNTRIES);
  if (query.startDateTime) params.set('start.gte', query.startDateTime);
  if (query.endDateTime) params.set('start.lte', query.endDateTime);
  params.set('sort', 'start');

  let target = `https://api.predicthq.com/v1/events/?${params}`;
  const collected: NonNullable<PredictHqResponse['results']> = [];
  let count: number | undefined;
  let overflow = false;
  let next: string | null | undefined;
  for (let page = 0; page < boundedPageLimit(); page += 1) {
    let response: PredictHqResponse;
    try { response = await fetchPredictHqPage(token, target); }
    catch (error) { return { count, overflow: true, next: target, results: collected, failure: error instanceof Error ? error.message : 'PredictHQ request failed' }; }
    collected.push(...(response.results ?? []));
    count ??= response.count;
    overflow ||= Boolean(response.overflow);
    next = response.next;
    if (!next) break;
    target = next;
  }
  return { count, overflow, next, results: collected };
}

function mapPredictHqEvent(event: PredictHqEvent, requestedArtist?: string): DiscoveredEvent {
  const coordinates = event.geo?.geometry?.coordinates ?? event.location;
  const venue = event.entities?.find((entity) => entity.type === 'venue');
  const performer = event.entities?.find((entity) => entity.type === 'person')
    ?? event.entities?.find((entity) => entity.type === 'organization');
  return {
    provider: 'predicthq',
    providerEventId: event.id,
    name: event.title,
    artist: canonicalCatalogArtistName(requestedArtist ?? '') ?? performer?.name ?? requestedArtist,
    artistType: performer?.type === 'person'
      ? 'person'
      : performer?.type === 'organization' ? 'group' : 'unknown',
    startsAt: event.start,
    timezone: event.timezone,
    venue: venue?.name,
    countryCode: event.country,
    longitude: coordinates?.[0],
    latitude: coordinates?.[1],
    officialUrl: `/events/${encodeURIComponent(`predicthq:${event.id}`)}`,
    confidence: 'reported',
    lifecycleStatus: 'scheduled',
  };
}

function deletedLifecycleStatus(reason: string | undefined): EventLifecycleStatus {
  if (reason === 'cancelled' || reason === 'canceled') return 'cancelled';
  if (reason === 'postponed') return 'postponed';
  return 'deleted';
}

export async function fetchPredictHqChanges(input: {
  cursorAt?: string;
  windowEndAt?: string;
  resumeUrl?: string;
}, now = new Date()): Promise<PredictHqChangeBatch> {
  const token = accessToken();
  const windowEndAt = input.windowEndAt ?? now.toISOString();
  if (!token) {
    return {
      configured: false,
      events: [],
      tombstones: [],
      itemsSeen: 0,
      complete: true,
      windowEndAt,
    };
  }
  const defaultCursor = new Date(now.getTime() - 24 * 60 * 60_000).toISOString();
  const params = new URLSearchParams({
    category: 'concerts',
    country: APAC_COUNTRIES,
    limit: '100',
    state: 'active,deleted',
    'updated.gte': input.cursorAt ?? defaultCursor,
    'updated.lte': windowEndAt,
    sort: '-updated',
  });
  let target = input.resumeUrl ?? `https://api.predicthq.com/v1/events/?${params}`;
  const collected: PredictHqEvent[] = [];
  let next: string | null | undefined;
  for (let page = 0; page < boundedChangePageLimit(); page += 1) {
    const response = await fetchPredictHqPage(token, target);
    collected.push(...(response.results ?? []));
    next = response.next;
    if (!next) break;
    target = next;
  }
  const unique = [...new Map(collected.map((event) => [event.id, event])).values()];
  const active = unique.filter((event) => event.state !== 'deleted');
  const complete = !next;
  const overlapCursor = new Date(Math.max(0, Date.parse(windowEndAt) - 5 * 60_000)).toISOString();
  return {
    configured: true,
    events: active.map((event) => mapPredictHqEvent(event)),
    tombstones: unique.filter((event) => event.state === 'deleted').map((event) => ({
      providerEventId: event.id,
      lifecycleStatus: deletedLifecycleStatus(event.deleted_reason?.toLocaleLowerCase('en-US')),
      reason: event.deleted_reason,
      updatedAt: event.updated,
    })),
    itemsSeen: unique.length,
    complete,
    windowEndAt,
    nextCursorAt: complete ? overlapCursor : input.cursorAt,
    resumeUrl: next ?? undefined,
  };
}

export const predictHqAdapter: EventSourceAdapter = {
  id: 'predicthq',
  name: 'PredictHQ Events API',
  health() {
    return accessToken()
      ? { id: this.id, name: this.name, status: 'connected', detail: 'Events API configured' }
      : {
          id: this.id,
          name: this.name,
          status: 'configuration_required',
          detail: 'Optional: enable hybrid mode and configure a valid PredictHQ token',
        };
  },
  async discover(query: DiscoveryQuery): Promise<DiscoveredEvent[]> {
    const token = accessToken();
    if (!token) return [];
    const windows = buildPredictHqSearchWindows(query);
    const responses: PredictHqResponse[] = [];
    for (let offset = 0; offset < windows.length; offset += 2) {
      const batch = await Promise.all(windows.slice(offset, offset + 2).map((window) => (
        fetchPredictHqWindow(token, window)
      )));
      responses.push(...batch);
    }
    const providerEvents = [...new Map(
      responses.flatMap((data) => data.results ?? []).map((event) => [event.id, event]),
    ).values()];
    const expectedArtistType = query.artist
      ? getCatalogArtistIdentityProfile(query.artist)?.artistType
      : undefined;
    const events = providerEvents.filter((event) => (
      matchesPredictHqArtistQuery(event, query.artist, expectedArtistType)
    )).map((event) => mapPredictHqEvent(event, query.artist));
    if (responses.some((response) => response.next || response.overflow)) throw new PartialDiscoveryError(responses.find(response => response.failure)?.failure ?? 'PredictHQ returned partial coverage', events);
    return events;
  },
};
