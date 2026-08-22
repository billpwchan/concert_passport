import type { DiscoveredEvent, DiscoveryQuery } from '@/lib/domain/types';
import type { EventSourceAdapter } from './types';

const APAC_COUNTRIES = 'AU,HK,ID,JP,KR,MY,NZ,PH,SG,TH,TW,VN';

type PredictHqResponse = {
  results?: Array<{
    id: string;
    title: string;
    start: string;
    timezone?: string;
    description?: string;
    entities?: Array<{ name: string; type: string }>;
    location?: [number, number];
    country?: string;
    geo?: { geometry?: { coordinates?: [number, number]; type?: string } };
  }>;
};

function accessToken(): string | undefined {
  return process.env.PREDICTHQ_ACCESS_TOKEN;
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
          detail: 'Add PREDICTHQ_ACCESS_TOKEN to activate broad discovery',
        };
  },
  async discover(query: DiscoveryQuery): Promise<DiscoveredEvent[]> {
    const token = accessToken();
    if (!token) return [];

    const params = new URLSearchParams({ category: 'concerts', limit: '50' });
    if (query.artist) params.set('q', query.artist);
    params.set('country', query.countryCode ?? APAC_COUNTRIES);
    if (query.startDateTime) params.set('start.gte', query.startDateTime);
    if (query.endDateTime) params.set('start.lte', query.endDateTime);
    params.set('sort', 'start');

    const response = await fetch(`https://api.predicthq.com/v1/events/?${params}`, {
      headers: { accept: 'application/json', authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`PredictHQ responded ${response.status}`);

    const data = (await response.json()) as PredictHqResponse;
    return (data.results ?? []).map((event) => {
      const coordinates = event.geo?.geometry?.coordinates ?? event.location;
      const venue = event.entities?.find((entity) => entity.type === 'venue');
      return {
        provider: this.id,
        providerEventId: event.id,
        name: event.title,
        artist: event.entities?.find((entity) => entity.type === 'person')?.name,
        startsAt: event.start,
        timezone: event.timezone,
        venue: venue?.name,
        countryCode: event.country,
        longitude: coordinates?.[0],
        latitude: coordinates?.[1],
        officialUrl: `https://www.predicthq.com/events/${event.id}`,
        confidence: 'reported',
      } satisfies DiscoveredEvent;
    });
  },
};
