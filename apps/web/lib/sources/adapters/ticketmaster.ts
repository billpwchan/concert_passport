import { env } from 'cloudflare:workers';
import type { DiscoveredEvent, DiscoveryQuery } from '@/lib/domain/types';
import type { EventSourceAdapter } from './types';

type TicketmasterEvent = {
  id: string;
  name: string;
  url: string;
  dates: {
    start: { dateTime?: string; localDate?: string; localTime?: string };
    timezone?: string;
  };
  _embedded?: {
    venues?: Array<{
      name: string;
      city?: { name: string };
      country?: { countryCode: string };
    }>;
    attractions?: Array<{ name: string }>;
  };
};

type TicketmasterResponse = {
  _embedded?: { events?: TicketmasterEvent[] };
};

function apiKey(): string | undefined {
  return (env as unknown as { TICKETMASTER_API_KEY?: string }).TICKETMASTER_API_KEY;
}

export const ticketmasterAdapter: EventSourceAdapter = {
  id: 'ticketmaster-discovery',
  name: 'Ticketmaster Discovery API',
  health() {
    return apiKey()
      ? { id: this.id, name: this.name, status: 'connected', detail: 'Discovery API configured' }
      : {
          id: this.id,
          name: this.name,
          status: 'configuration_required',
          detail: 'Add TICKETMASTER_API_KEY to activate live discovery',
        };
  },
  async discover(query: DiscoveryQuery): Promise<DiscoveredEvent[]> {
    const key = apiKey();
    if (!key) return [];

    const params = new URLSearchParams({
      apikey: key,
      classificationName: 'music',
      size: '50',
      sort: 'date,asc',
    });
    if (query.artist) params.set('keyword', query.artist);
    if (query.city) params.set('city', query.city);
    if (query.countryCode) params.set('countryCode', query.countryCode);
    if (query.startDateTime) params.set('startDateTime', query.startDateTime);
    if (query.endDateTime) params.set('endDateTime', query.endDateTime);

    const response = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events.json?${params}`,
      { headers: { accept: 'application/json' } },
    );
    if (!response.ok) throw new Error(`Ticketmaster responded ${response.status}`);

    const data = (await response.json()) as TicketmasterResponse;
    return (data._embedded?.events ?? []).map((event) => {
      const venue = event._embedded?.venues?.[0];
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
        officialUrl: event.url,
        confidence: 'official',
      } satisfies DiscoveredEvent;
    });
  },
};
