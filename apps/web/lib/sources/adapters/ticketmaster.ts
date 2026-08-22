import type { DiscoveredEvent, DiscoveryQuery } from '@/lib/domain/types';
import {
  selectTicketmasterImage,
  ticketmasterConfigured,
  ticketmasterRequest,
  type TicketmasterImage,
} from '@/lib/sources/ticketmaster-client';
import type { EventSourceAdapter } from './types';

type TicketmasterEvent = {
  id: string;
  name: string;
  url: string;
  dates: {
    start: { dateTime?: string; localDate?: string; localTime?: string };
    timezone?: string;
  };
  images?: TicketmasterImage[];
  _embedded?: {
    venues?: Array<{
      name: string;
      city?: { name: string };
      country?: { countryCode: string };
      location?: { latitude?: string; longitude?: string };
    }>;
    attractions?: Array<{ name: string; images?: TicketmasterImage[] }>;
  };
};

type TicketmasterResponse = {
  _embedded?: { events?: TicketmasterEvent[] };
};

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
          detail: 'Add TICKETMASTER_API_KEY to activate live discovery',
        };
  },
  async discover(query: DiscoveryQuery): Promise<DiscoveredEvent[]> {
    if (!ticketmasterConfigured()) return [];
    // Discovery accepts one country code. Region-wide searches are served by
    // PredictHQ; selecting a market adds Ticketmaster's primary listings.
    if (!query.countryCode && !query.city) return [];
    const params = new URLSearchParams({
      classificationName: 'music',
      size: '50',
      sort: 'date,asc',
    });
    if (query.artist) params.set('keyword', query.artist);
    if (query.city) params.set('city', query.city);
    if (query.countryCode) params.set('countryCode', query.countryCode);
    if (query.startDateTime) params.set('startDateTime', query.startDateTime);
    if (query.endDateTime) params.set('endDateTime', query.endDateTime);

    const data = await ticketmasterRequest<TicketmasterResponse>('/discovery/v2/events.json', params);
    return (data?._embedded?.events ?? []).map((event) => {
      const venue = event._embedded?.venues?.[0];
      const image = selectTicketmasterImage(event.images)
        ?? selectTicketmasterImage(event._embedded?.attractions?.[0]?.images);
      const start = event.dates.start;
      const startsAt =
        start.dateTime ?? `${start.localDate ?? ''}T${start.localTime ?? '00:00:00'}`;
      return {
        provider: this.id,
        providerEventId: event.id,
        name: event.name,
        artist: event._embedded?.attractions?.[0]?.name,
        startsAt,
        timezone: event.dates.timezone,
        venue: venue?.name,
        city: venue?.city?.name,
        countryCode: venue?.country?.countryCode,
        latitude: venue?.location?.latitude ? Number(venue.location.latitude) : undefined,
        longitude: venue?.location?.longitude ? Number(venue.location.longitude) : undefined,
        officialUrl: event.url,
        confidence: 'official',
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
      } satisfies DiscoveredEvent;
    });
  },
};
