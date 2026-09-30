import type { DiscoveredEvent, DiscoveryQuery, EventLifecycleStatus } from '../../domain/types.ts';
import {
  selectTicketmasterImage,
  ticketmasterConfigured,
  ticketmasterRequest,
  type TicketmasterImage,
} from '../ticketmaster-client.ts';
import { buildTicketmasterQueries } from '../coverage-windows.ts';
import { findTicketmasterAttraction } from '../ticketmaster-attractions.ts';
import { PartialDiscoveryError } from './result.ts';
import type { EventSourceAdapter } from './types.ts';

type TicketmasterEvent = {
  id: string;
  name: string;
  url: string;
  dates: {
    start: { dateTime?: string; localDate?: string; localTime?: string };
    timezone?: string;
    status?: { code?: string };
  };
  images?: TicketmasterImage[];
  classifications?: Array<{
    genre?: { name?: string };
    subGenre?: { name?: string };
    type?: { name?: string };
    subType?: { name?: string };
  }>;
  _embedded?: {
    venues?: Array<{
      name: string;
      city?: { name: string };
      country?: { countryCode: string };
      location?: { latitude?: string; longitude?: string };
    }>;
    attractions?: Array<{
      id: string;
      name: string;
      images?: TicketmasterImage[];
      classifications?: Array<{ type?: { name?: string } }>;
    }>;
  };
};

type TicketmasterResponse = {
  _embedded?: { events?: TicketmasterEvent[] };
  page?: { size: number; totalElements: number; totalPages: number; number: number };
};

function normalizeAttractionText(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function selectNamedAttraction(event: TicketmasterEvent) {
  const attractions = event._embedded?.attractions ?? [];
  const title = ` ${normalizeAttractionText(event.name)} `;
  return [...attractions]
    .sort((left, right) => right.name.length - left.name.length)
    .find((candidate) => title.includes(` ${normalizeAttractionText(candidate.name)} `))
    ?? attractions[0];
}

function attractionArtistType(attraction: ReturnType<typeof selectNamedAttraction>): 'group' | 'person' | 'unknown' {
  const type = attraction?.classifications?.find((item) => item.type?.name)?.type?.name
    ?.toLocaleLowerCase('en-US');
  if (type === 'group') return 'group';
  if (type === 'individual' || type === 'person') return 'person';
  return 'unknown';
}

export function ticketmasterLifecycleStatus(code: string | undefined): EventLifecycleStatus {
  if (code === 'offsale') return 'offsale';
  if (code === 'cancelled' || code === 'canceled') return 'cancelled';
  if (code === 'postponed') return 'postponed';
  if (code === 'rescheduled') return 'rescheduled';
  return 'scheduled';
}

export const ticketmasterAdapter: EventSourceAdapter = {
  id: 'ticketmaster-discovery',
  name: 'Ticketmaster Discovery API',
  health() {
    return ticketmasterConfigured()
      ? { id: this.id, name: this.name, status: 'connected', detail: 'Discovery API configured' }
      : {
          id: this.id,
          name: this.name,
          status: 'configuration_required',
          detail: 'Optional: enable hybrid mode and configure a valid Ticketmaster key',
        };
  },
  async discover(query: DiscoveryQuery): Promise<DiscoveredEvent[]> {
    if (!ticketmasterConfigured()) return [];
    const attraction = query.artist && !query.city
      ? await findTicketmasterAttraction(query.artist)
      : undefined;
    if (query.artist && !query.city && !attraction) return [];
    const queryParams = buildTicketmasterQueries(query, undefined, attraction?.id);
    if (!queryParams.length) return [];
    const responses = await Promise.allSettled(queryParams.map((params) => (
      ticketmasterRequest<TicketmasterResponse>('/discovery/v2/events.json', params)
    )));
    const rejected = responses.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
    const fulfilled = responses.filter((result): result is PromiseFulfilledResult<TicketmasterResponse | undefined> => (
      result.status === 'fulfilled'
    ));
    const providerEvents = fulfilled.flatMap((result) => result.value?._embedded?.events ?? []);
    const events = [...new Map(providerEvents.map((event) => [event.id, event])).values()].filter((event) => Boolean(event.dates?.start?.dateTime)).map((event) => {
      const venue = event._embedded?.venues?.[0];
      const attraction = selectNamedAttraction(event);
      const image = selectTicketmasterImage(event.images)
        ?? selectTicketmasterImage(attraction?.images);
      const start = event.dates.start;
      const classificationTags = (event.classifications ?? []).flatMap((classification) => [
        classification.genre?.name,
        classification.subGenre?.name,
        classification.type?.name,
        classification.subType?.name,
      ]).filter((value): value is string => Boolean(value));
      const startsAt = start.dateTime!;
      return {
        provider: this.id,
        providerEventId: event.id,
        name: event.name,
        artist: attraction?.name,
        artistType: attractionArtistType(attraction),
        artistProviderId: attraction?.id,
        startsAt,
        timezone: event.dates.timezone,
        venue: venue?.name,
        city: venue?.city?.name,
        countryCode: venue?.country?.countryCode,
        latitude: venue?.location?.latitude ? Number(venue.location.latitude) : undefined,
        longitude: venue?.location?.longitude ? Number(venue.location.longitude) : undefined,
        officialUrl: event.url,
        confidence: 'official',
        lifecycleStatus: ticketmasterLifecycleStatus(event.dates.status?.code?.toLocaleLowerCase('en-US')),
        bestLinkUrl: event.url,
        bestLinkRole: 'ticket',
        bestLinkSource: this.id,
        bestLinkScore: 100,
        bestLinkVerifiedAt: new Date().toISOString(),
        imageUrl: image?.url,
        imageWidth: image?.width,
        imageHeight: image?.height,
        imageAttribution: image?.attribution,
        imageSourceUrl: event.url,
        imageFallback: image?.fallback,
        classificationTags,
      } satisfies DiscoveredEvent;
    });
    const coverageIncomplete = responses.some((result, index) => {
      if (result.status !== 'fulfilled') return false;
      const params = queryParams[index];
      const groupPages = queryParams.filter((candidate) => candidate.get('countryCode') === params.get('countryCode')
        && candidate.get('classificationName') === params.get('classificationName'));
      return (result.value?.page?.totalPages ?? 0) > groupPages.length;
    });
    if (rejected.length || coverageIncomplete) throw new PartialDiscoveryError('Ticketmaster returned partial coverage', events);
    return events;
  },
};
