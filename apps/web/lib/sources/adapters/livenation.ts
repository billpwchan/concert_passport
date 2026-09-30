import { ticketmasterConfigured } from '../ticketmaster-client.ts';
import { recordSourceOutcome } from '../../../db/collection.ts';
import { eventArtistIdentityIsCompatible } from '../../../db/artists.ts';
import type { DiscoveryQuery } from '../../domain/types.ts';
import { findTicketmasterAttraction } from '../ticketmaster-attractions.ts';
import type { EventSourceAdapter } from './types.ts';
import { parseLiveNationArtistPage } from './livenation-parser.ts';

const MAX_HTML_BYTES = 2_000_000;

function artistSlug(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-US').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export const liveNationAdapter: EventSourceAdapter = {
  id: 'livenation-tour',
  name: 'Live Nation Tour Calendar',
  health() {
    return {
      id: this.id,
      name: this.name,
      status: ticketmasterConfigured() ? 'connected' : 'configuration_required',
      detail: 'Optional legacy tour lookup requires Ticketmaster; independent official collection needs no key',
    };
  },
  async discover(query: DiscoveryQuery) {
    const requestedArtist = query.artist?.trim();
    if (!requestedArtist) return [];
    const attraction = await findTicketmasterAttraction(requestedArtist);
    if (!attraction || !eventArtistIdentityIsCompatible(requestedArtist, {provider:'ticketmaster-discovery',artistProviderId:attraction.id})) return [];
    const url = `https://www.livenation.com/artist/${encodeURIComponent(attraction.id)}/${artistSlug(attraction.name)}-events`;
    const response = await fetch(url, {
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'user-agent': 'ConcertPassportTourDiscovery/1.0 (+https://concert-passport.52-198-144-26.sslip.io/sources)',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
    });
    if (response.status === 404) return [];
    const contentType = response.headers.get('content-type') ?? '';
    const declaredSize = Number(response.headers.get('content-length') ?? 0);
    if (!response.ok) throw new Error(`Live Nation responded ${response.status}`);
    if (!contentType.includes('text/html') || declaredSize > MAX_HTML_BYTES) {
      throw new Error('Live Nation returned unsupported content');
    }
    const html = (await response.text()).slice(0, MAX_HTML_BYTES);
    const events = parseLiveNationArtistPage(html, requestedArtist, query);
    recordSourceOutcome('livenation-tour', {count:events.length});
    return events;
  },
};
