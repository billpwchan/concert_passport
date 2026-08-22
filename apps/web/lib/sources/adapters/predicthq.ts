import { env } from 'cloudflare:workers';
import type { DiscoveredEvent, DiscoveryQuery } from '@/lib/domain/types';
import type { EventSourceAdapter } from './types';

type PredictHqResponse = {
  results?: Array<{
    id: string;
    title: string;
    start: string;
    timezone?: string;
    description?: string;
    entities?: Array<{ name: string; type: string }>;
    location?: [number, number];
  }>;
};

function accessToken(): string | undefined {
  return (env as unknown as { PREDICTHQ_ACCESS_TOKEN?: string }).PREDICTHQ_ACCESS_TOKEN;
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
    if (query.startDateTime) params.set('active.gte', query.startDateTime);
    if (query.endDateTime) params.set('active.lte', query.endDateTime);

    const response = await fetch(`https://api.predicthq.com/v1/events/?${params}`, {
      headers: { accept: 'application/json', authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`PredictHQ responded ${response.status}`);

    const data = (await response.json()) as PredictHqResponse;
    return (data.results ?? []).map((event) => ({
      provider: this.id,
      providerEventId: event.id,
      name: event.title,
      artist: event.entities?.find((entity) => entity.type === 'person')?.name,
      startsAt: event.start,
      timezone: event.timezone,
      officialUrl: `https://www.predicthq.com/events/${event.id}`,
      confidence: 'reported',
    }));
  },
};
