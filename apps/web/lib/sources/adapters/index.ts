import type { DiscoveredEvent, DiscoveryQuery } from '@/lib/domain/types';
import { predictHqAdapter } from './predicthq';
import { ticketmasterAdapter } from './ticketmaster';

export const eventSourceAdapters = [ticketmasterAdapter, predictHqAdapter];

export async function discoverAcrossSources(
  query: DiscoveryQuery,
): Promise<{ events: DiscoveredEvent[]; errors: Array<{ provider: string; message: string }> }> {
  const results = await Promise.allSettled(
    eventSourceAdapters.map(async (adapter) => ({
      provider: adapter.id,
      events: await adapter.discover(query),
    })),
  );

  const events: DiscoveredEvent[] = [];
  const errors: Array<{ provider: string; message: string }> = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      events.push(...result.value.events);
    } else {
      errors.push({
        provider: eventSourceAdapters[index].id,
        message: result.reason instanceof Error ? result.reason.message : 'Connector failed',
      });
    }
  });

  const unique = new Map<string, DiscoveredEvent>();
  for (const event of events) {
    const key = `${event.name.toLowerCase()}|${event.startsAt}|${event.city ?? ''}`;
    if (!unique.has(key) || event.confidence === 'official') unique.set(key, event);
  }

  return {
    events: [...unique.values()].sort(
      (left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
    ),
    errors,
  };
}
