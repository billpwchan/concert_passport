import { dataMode } from '../sources/data-mode.ts';
import { observedConnectorHealth, officialCollectionHealth } from '@/db/collection';
import { readDiscoveryCache, writeDiscoveryCache } from '@/db/discovery';
import { searchUpcomingCatalogEvents, upsertDiscoveredEvents } from '@/db/events';
import { discoverAcrossSources, eventSourceAdapters } from '@/lib/sources/adapters';
import { canonicalCatalogArtistName, retainKnownKpopEvents } from '@/db/artists';
import type { DiscoveryQuery } from '@/lib/domain/types';
import { createDiscoveryCache } from './cache';

type SourceResult = Awaited<ReturnType<typeof discoverAcrossSources>>;
const cachedDiscovery = createDiscoveryCache<SourceResult>({
  read: readDiscoveryCache, write: writeDiscoveryCache,
  ttl: (result) => result.errors.length ? 60_000 : 10 * 60_000,
});

export async function discoverEvents(input: DiscoveryQuery, force = false) {
  const query = { ...input, artist: canonicalCatalogArtistName(input.artist ?? '') ?? input.artist?.trim() };
  const { payload, checkedAt, cached } = await cachedDiscovery(JSON.stringify({ mode: dataMode(), query }), async () => {
    const result = await discoverAcrossSources(query);
    upsertDiscoveredEvents(query.artist ? result.events : retainKnownKpopEvents(result.events));
    // The canonical catalog owns visibility; cached provider snapshots are never public rows.
    return { ...result, events: [] };
  }, force);
  return { ...payload, dataMode: dataMode(),
    events: searchUpcomingCatalogEvents(query).map((event) => ({ ...event, canonicalId: event.id })),
    generatedAt: new Date(checkedAt).toISOString(), cached, degraded: payload.errors.length > 0,
    connectors: [officialCollectionHealth(), ...eventSourceAdapters.map((adapter) => observedConnectorHealth(adapter.health()))],
  };
}
