import { sourceReady, recordSourceOutcome } from '../../../db/collection.ts';
import type { DiscoveredEvent, DiscoveryQuery } from '@/lib/domain/types';
import {
  canonicalCatalogArtistName,
  eventArtistIdentityIsCompatible,
  getCatalogArtistIdentityProfile,
  normalizeArtistIdentity,
} from '@/db/artists';
import { isAmbiguousArtistName } from '@/lib/domain/ambiguous-artist-names';
import { APAC_COUNTRY_CODES } from '@/lib/sources/query';
import { predictHqAdapter } from './predicthq';
import { ticketmasterAdapter } from './ticketmaster';
import { liveNationAdapter } from './livenation';
import { matchesPredictHqArtistQuery } from './predicthq-matcher';
import { resolveExactKoreanArtistIdentity } from '../artists';
import { PartialDiscoveryError } from './result.ts';

export const eventSourceAdapters = [ticketmasterAdapter, liveNationAdapter, predictHqAdapter];

export async function discoverAcrossSources(
  query: DiscoveryQuery,
): Promise<{
  events: DiscoveredEvent[];
  errors: Array<{ provider: string; message: string }>;
  providers: Array<{ provider: string; eventsSeen: number; errorsSeen: number }>;
}> {
  // Missing optional credentials are not a failed source request.
  const activeAdapters = eventSourceAdapters.filter((adapter) => adapter.health().status === 'connected');
  const results = await Promise.allSettled(
    activeAdapters.map(async (adapter) => ({
      provider: adapter.id,
      events: await (async () => {
        if (adapter.health().status !== 'connected') throw new Error('Source is not configured');
        if (!sourceReady(adapter.id)) throw new Error('Source is waiting for its scheduled retry');
        const started = Date.now();
        try {
          const events = await adapter.discover(query);
          if (adapter.id !== 'livenation-tour') recordSourceOutcome(adapter.id, { count: events.length, durationMs: Date.now() - started });
          return events;
        } catch (error) {
          recordSourceOutcome(adapter.id, { error: error instanceof Error ? error.message : 'Request failed', durationMs: Date.now() - started,
            count: error instanceof PartialDiscoveryError ? error.events.length : 0 });
          throw error;
        }
      })(),
    })),
  );

  const events: DiscoveredEvent[] = [];
  const errors: Array<{ provider: string; message: string }> = [];
  const providers: Array<{ provider: string; eventsSeen: number; errorsSeen: number }> = [];
  let targetArtist = query.artist ? canonicalCatalogArtistName(query.artist) : undefined;
  if (query.artist && !targetArtist) {
    const ticketmasterCandidate = results.flatMap((result) => (
      result.status === 'fulfilled' && result.value.provider === 'ticketmaster-discovery'
        ? result.value.events
        : []
    )).find((event) => (
      event.artist
      && normalizeArtistIdentity(event.artist) === normalizeArtistIdentity(query.artist!)
      && event.artistProviderId
    ));
    if (ticketmasterCandidate) {
      try {
        await resolveExactKoreanArtistIdentity(query.artist, ticketmasterCandidate.artistType, {
          provider: ticketmasterCandidate.provider,
          providerArtistId: ticketmasterCandidate.artistProviderId!,
        });
        targetArtist = canonicalCatalogArtistName(query.artist);
      } catch {
        // An external identity outage or ambiguity keeps the event unpublished.
      }
    }
  }
  const targetProfile = targetArtist ? getCatalogArtistIdentityProfile(targetArtist) : undefined;
  results.forEach((result, index) => {
    const partial = result.status === 'rejected' && result.reason instanceof PartialDiscoveryError ? result.reason : undefined;
    if (result.status === 'fulfilled' || partial) {
      const value = result.status === 'fulfilled' ? result.value : { provider: activeAdapters[index].id, events: partial!.events };
      const accepted = value.events
        .filter((event) => !event.countryCode || APAC_COUNTRY_CODES.has(event.countryCode.toUpperCase()))
        .filter((event) => {
          if (query.artist && !targetArtist) return false;
          if (!targetArtist) return true;
          const exactAttraction = event.artist
            && normalizeArtistIdentity(event.artist) === normalizeArtistIdentity(targetArtist);
          const titleEvidence = matchesPredictHqArtistQuery({
            title: event.name,
            entities: event.artist ? [{
              name: event.artist,
              type: event.artistType === 'group' ? 'organization' : 'person',
            }] : [],
          }, targetArtist, targetProfile?.artistType);
          if (canonicalCatalogArtistName(targetArtist)
            && !eventArtistIdentityIsCompatible(targetArtist, event)) return false;
          return isAmbiguousArtistName(targetArtist)
            ? titleEvidence
            : Boolean(exactAttraction) || titleEvidence;
        })
        .map((event) => targetArtist ? { ...event, artist: targetArtist } : event);
      events.push(...accepted);
      providers.push({ provider: value.provider, eventsSeen: accepted.length, errorsSeen: partial ? 1 : 0 });
      if (partial) errors.push({ provider: value.provider, message: partial.message });
    } else {
      providers.push({ provider: activeAdapters[index].id, eventsSeen: 0, errorsSeen: 1 });
      errors.push({
        provider: activeAdapters[index].id,
        message: result.reason instanceof Error ? result.reason.message : 'Connector failed',
      });
    }
  });

  return {
    // Persistence owns canonical reconciliation; never discard source provenance here.
    events: events.filter((event) => Number.isFinite(Date.parse(event.startsAt))
      && APAC_COUNTRY_CODES.has(event.countryCode?.toUpperCase() ?? '')
      && (!query.countryCode || event.countryCode === query.countryCode))
      .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt)),
    errors,
    providers,
  };
}
