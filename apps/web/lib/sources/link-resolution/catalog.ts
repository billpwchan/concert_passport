import type { EventLinkCandidate, ResolvableEvent } from './types.ts';

type CatalogEntry = Omit<EventLinkCandidate, 'data' | 'discoveredBy'> & {
  artist: string;
  dates: string[];
  countryCode: string;
  venue?: string;
  name?: string;
  startsAt?: Record<string, string>;
};

// These are official tour and seller entry points, not event records. They seed
// the resolver when a marketplace has no supported search API; every candidate
// still passes the same automatic identity/date/market validation as API finds.
const officialCatalog: CatalogEntry[] = [
  { artist: 'Stray Kids', dates: ['2026-08-29', '2026-08-30', '2026-09-05', '2026-09-06', '2026-09-19', '2026-09-20', '2026-10-24'], countryCode: 'JP', url: 'https://www.straykidsjapan.com/runitjapan/', sourceId: 'stray-kids-japan', role: 'tour', authority: 'artist', name: 'Stray Kids RUN IT JAPAN' },
  { artist: 'TREASURE', dates: ['2026-09-05', '2026-09-06'], countryCode: 'JP', url: 'https://ygex.jp/en/treasure/live/tour.php?id=1002948', sourceId: 'ygex', role: 'tour', authority: 'artist', name: 'TREASURE TOUR [PULSE ON] IN JAPAN' },
  { artist: 'ITZY', dates: ['2026-09-05'], countryCode: 'TW', url: 'https://tixcraft.com/activity/detail/26_itzytpe', sourceId: 'tixcraft', role: 'ticket', authority: 'seller', venue: 'Taipei Arena', name: 'ITZY 3RD WORLD TOUR TUNNEL VISION IN TAIPEI', startsAt: { '2026-09-05': '2026-09-05T18:00:00+08:00' } },
  { artist: 'IVE', dates: ['2026-09-11', '2026-09-12', '2026-09-13'], countryCode: 'TW', url: 'https://tixcraft.com/activity/detail/26_ive', sourceId: 'tixcraft', role: 'ticket', authority: 'seller', venue: 'Taipei Arena', name: 'IVE WORLD TOUR SHOW WHAT I AM IN TAIPEI' },
  { artist: 'BOYNEXTDOOR', dates: ['2026-09-09'], countryCode: 'JP', url: 'https://eplus.jp/sf/detail/4560670001-P0030004P021001?P6=001', sourceId: 'eplus-jp', role: 'ticket', authority: 'seller', venue: 'Osaka-Jo Hall', startsAt: { '2026-09-09': '2026-09-09T18:00:00+09:00' } },
  { artist: 'BOYNEXTDOOR', dates: ['2026-09-10'], countryCode: 'JP', url: 'https://eplus.jp/sf/detail/4560670001-P0030004P021002?P6=001', sourceId: 'eplus-jp', role: 'ticket', authority: 'seller', venue: 'Osaka-Jo Hall', startsAt: { '2026-09-10': '2026-09-10T18:00:00+09:00' } },
  { artist: 'MAMAMOO', dates: ['2026-09-22', '2026-09-25'], countryCode: 'AU', url: 'https://premier.ticketek.com.au/shows/show.aspx?eg=MMLNA&ep=MMLNA&sh=OAMOFWM26', sourceId: 'ticketek-au', role: 'ticket', authority: 'seller', name: 'MAMAMOO 2026 WORLD TOUR 4WARD IN AUSTRALIA' },
  { artist: 'BABYMONSTER', dates: ['2026-09-22', '2026-09-23'], countryCode: 'JP', url: 'https://t.pia.jp/pia/event/event.do?eventBundleCd=b2669211', sourceId: 'ticket-pia-jp', role: 'ticket', authority: 'seller', venue: 'Kyocera Dome Osaka' },
  { artist: 'BABYMONSTER', dates: ['2026-11-14'], countryCode: 'MY', url: 'https://www.livenation.my/event/2026-27-babymonster-world-tour-%25ec%25b6%25a4-choom-in-kuala-lumpur-kuala-lumpur-tickets-edp1682916', sourceId: 'livenation', role: 'event', authority: 'promoter', venue: 'Unifi Arena', name: '2026-27 BABYMONSTER WORLD TOUR CHOOM IN KUALA LUMPUR' },
  { artist: 'ITZY', dates: ['2026-10-03'], countryCode: 'SG', url: 'https://main.login.ticketmaster.sg/activity/detail/26sg_itzy', sourceId: 'ticketmaster-sg', role: 'ticket', authority: 'seller', venue: 'Singapore Indoor Stadium' },
  { artist: 'The Rose', dates: ['2026-10-09'], countryCode: 'AU', url: 'https://www.festivalhall.com.au/all-events/the-rose-tickets-ae1306815', sourceId: 'festival-hall-au', role: 'event', authority: 'venue', venue: 'Festival Hall Melbourne', startsAt: { '2026-10-09': '2026-10-09T19:30:00+11:00' } },
  { artist: 'The Rose', dates: ['2026-10-11'], countryCode: 'AU', url: 'https://thehordern.com.au/event/therose/', sourceId: 'hordern-pavilion', role: 'event', authority: 'venue', venue: 'Hordern Pavilion' },
  { artist: 'The Rose', dates: ['2026-10-25'], countryCode: 'MY', url: 'https://my.bookmyshow.com/en/events/rosetopia-asia-tour-2026-kl/ROSE26KL', sourceId: 'bookmyshow', role: 'ticket', authority: 'seller', venue: 'Mega Star Arena', startsAt: { '2026-10-25': '2026-10-25T20:00:00+08:00' } },
  { artist: 'The Rose', dates: ['2026-10-27'], countryCode: 'SG', url: 'https://bookmyshow.sg/en/events/rosetopia-asia-tour-2026-in-singapore/ROSE2026', sourceId: 'bookmyshow', role: 'ticket', authority: 'seller', venue: 'The Star Theatre', startsAt: { '2026-10-27': '2026-10-27T19:30:00+08:00' } },
  { artist: 'TWS', dates: ['2026-10-10'], countryCode: 'SG', url: 'https://www.singaporeexpo.com.sg/events-at-expo/2026-tws-tour-24-7foryou-in-singapore/', sourceId: 'singapore-expo', role: 'event', authority: 'venue', venue: 'Arena @ EXPO', name: "2026 TWS TOUR 24/7:FOR:YOU IN SINGAPORE", startsAt: { '2026-10-10': '2026-10-10T17:00:00+08:00' } },
  { artist: 'BIGBANG', dates: ['2026-10-17'], countryCode: 'SG', url: 'https://ticketmaster.sg/ticket/area/26sg_bigbang2026/3750', sourceId: 'ticketmaster-sg', role: 'ticket', authority: 'seller', venue: 'National Stadium', startsAt: { '2026-10-17': '2026-10-17T19:00:00+08:00' } },
  { artist: 'BIGBANG', dates: ['2026-10-31'], countryCode: 'AU', url: 'https://www.axs.com/events/1504646/bigbang-tickets?staticDetails=staticDetails', sourceId: 'axs', role: 'ticket', authority: 'seller', venue: 'Accor Stadium', startsAt: { '2026-10-31': '2026-10-31T19:30:00+11:00' } },
  { artist: 'NCT 127', dates: ['2026-10-18'], countryCode: 'SG', url: 'https://ticketmaster.sg/activity/detail/26sg_nct127', sourceId: 'ticketmaster-sg', role: 'ticket', authority: 'seller', venue: 'Singapore Indoor Stadium', startsAt: { '2026-10-18': '2026-10-18T19:00:00+08:00' } },
];

function normalize(value: string | undefined): string {
  return (value ?? '').normalize('NFKC').toLocaleLowerCase('en-US').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function localEventDate(event: ResolvableEvent): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: event.timezone ?? 'UTC',
  }).formatToParts(new Date(event.startsAt));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function catalogCandidatesForEvent(event: ResolvableEvent): EventLinkCandidate[] {
  const artist = normalize(event.artist ?? event.name);
  const eventName = normalize(event.name);
  const date = localEventDate(event);
  return officialCatalog
    .filter((entry) => {
      const catalogArtist = normalize(entry.artist);
      return (catalogArtist === artist || eventName.includes(catalogArtist))
        && entry.countryCode === event.countryCode
        && entry.dates.includes(date);
    })
    .map((entry) => ({
      url: entry.url,
      sourceId: entry.sourceId,
      sourceEventId: `${entry.artist}:${date}:${entry.countryCode}`,
      role: entry.role,
      authority: entry.authority,
      discoveredBy: 'official-catalog',
      data: {
        artist: entry.artist,
        name: entry.name,
        startsAt: entry.startsAt?.[date] ?? `${date}T00:00:00`,
        venue: entry.venue,
        countryCode: entry.countryCode,
      },
    }));
}
