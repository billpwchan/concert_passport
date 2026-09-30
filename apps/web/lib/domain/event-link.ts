import type { DiscoveredEvent, EventLinkRole } from './types';

type LinkableEvent = Pick<DiscoveredEvent,
  'canonicalId' | 'officialUrl' | 'bestLinkUrl' | 'bestLinkRole' | 'bestLinkSource'
> & { id?: string };

export function eventDetailHref(event: LinkableEvent): string {
  const id = event.id ?? event.canonicalId;
  return id ? `/events/${encodeURIComponent(id)}` : event.officialUrl;
}

export function verifiedEventHref(event: LinkableEvent): string | undefined {
  if (!event.bestLinkUrl || !event.bestLinkRole) return undefined;
  try { const url = new URL(event.bestLinkUrl); return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined; } catch { return undefined; }
}

export function primaryEventHref(event: LinkableEvent): { href: string; external: boolean } {
  if (event.id || event.canonicalId) {
    return { href: eventDetailHref(event), external: false };
  }
  const verified = verifiedEventHref(event);
  return verified
    ? { href: verified, external: true }
    : { href: eventDetailHref(event), external: false };
}

export function eventLinkMessageKey(role: EventLinkRole | undefined):
  | 'links.ticket' | 'links.event' | 'links.tour' | 'links.listing' {
  if (role === 'ticket') return 'links.ticket';
  if (role === 'event') return 'links.event';
  if (role === 'tour') return 'links.tour';
  return 'links.listing';
}

export function eventLinkActionKey(role: EventLinkRole | undefined):
  | 'links.openTicket' | 'links.openEvent' | 'links.openTour' | 'links.openListing' {
  if (role === 'ticket') return 'links.openTicket';
  if (role === 'event') return 'links.openEvent';
  if (role === 'tour') return 'links.openTour';
  return 'links.openListing';
}

export function linkSourceName(source: string | undefined): string | undefined {
  const labels: Record<string, string> = {
    'ticketmaster-discovery': 'Ticketmaster',
    'livenation-tour': 'Live Nation',
    'official-event-calendar': 'Official calendar',
    predicthq: 'PredictHQ',
    'ticketmaster-sg': 'Ticketmaster Singapore',
    ticketmaster: 'Ticketmaster',
    tixcraft: 'tixCraft',
    'eplus-jp': 'e+',
    'ticket-pia-jp': 'Ticket PIA',
    'ticketek-au': 'Ticketek',
    axs: 'AXS',
    bookmyshow: 'BookMyShow',
    livenation: 'Live Nation',
    'stray-kids-japan': 'Stray Kids Japan',
    ygex: 'YGEX',
    'singapore-expo': 'Singapore EXPO',
    'festival-hall-au': 'Festival Hall',
    'hordern-pavilion': 'Hordern Pavilion',
  };
  return source ? labels[source] ?? source : undefined;
}
