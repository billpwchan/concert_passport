export type EditorialShow = {
  id: string;
  artist: string;
  tour: string;
  city: string;
  market: string;
  venue: string;
  startsAt: string;
  endsAt?: string;
  timezone: string;
  sourceName: string;
  dateLabel: string;
  image: string;
  albumImage?: string;
  href: string;
  external: boolean;
  accent: string;
  glow: string;
};

export const editorialShows: EditorialShow[] = [
  {
    id: 'itzy-taipei-2026',
    artist: 'ITZY',
    tour: '3RD WORLD TOUR · TUNNEL VISION',
    city: 'Taipei',
    market: 'TW',
    venue: 'Taipei Arena',
    startsAt: '2026-09-05T19:00:00+08:00',
    timezone: 'Asia/Taipei',
    sourceName: 'Live Nation Taiwan',
    dateLabel: '05 SEP',
    image: '/editorial/itzy/taipei-tour.webp',
    albumImage: '/editorial/itzy/motto.webp',
    href: '/shows/itzy-taipei-2026',
    external: false,
    accent: '#ff315f',
    glow: '#b9fbff',
  },
  {
    id: 'ive-hong-kong-2026',
    artist: 'IVE',
    tour: 'WORLD TOUR · SHOW WHAT I AM',
    city: 'Hong Kong',
    market: 'HK',
    venue: 'AsiaWorld–Arena',
    startsAt: '2026-09-04T20:00:00+08:00',
    endsAt: '2026-09-06T23:59:59+08:00',
    timezone: 'Asia/Hong_Kong',
    sourceName: 'Live Nation Hong Kong',
    dateLabel: '04—06 SEP',
    image: '/editorial/ive/tour.webp',
    albumImage: '/editorial/ive/revive.webp',
    href: 'https://www.livenation.hk/en/event/ive-world-tour-show-what-i-am-in-hong-kong-hong-kong-tickets-edp1662577',
    external: true,
    accent: '#ff5b8b',
    glow: '#ffe978',
  },
  {
    id: 'ive-taipei-2026',
    artist: 'IVE',
    tour: 'WORLD TOUR · SHOW WHAT I AM',
    city: 'Taipei',
    market: 'TW',
    venue: 'Taipei Arena',
    startsAt: '2026-09-11T19:00:00+08:00',
    endsAt: '2026-09-13T23:59:59+08:00',
    timezone: 'Asia/Taipei',
    sourceName: 'Live Nation Taiwan',
    dateLabel: '11—13 SEP',
    image: '/editorial/ive/bang-bang.webp',
    albumImage: '/editorial/ive/tour.webp',
    href: 'https://www.livenation.com.tw/en/event/ive-world-tour-show-what-i-am-in-taipei-taipei-tickets-edp1663145',
    external: true,
    accent: '#ef4c85',
    glow: '#8dd8ff',
  },
  {
    id: 'lee-youngji-taipei-2026',
    artist: 'LEE YOUNGJI',
    tour: 'WORLD TOUR · 2.0',
    city: 'Taipei',
    market: 'TW',
    venue: 'Taipei Music Center',
    startsAt: '2026-09-19T19:00:00+08:00',
    endsAt: '2026-09-20T23:59:59+08:00',
    timezone: 'Asia/Taipei',
    sourceName: 'Live Nation Taiwan',
    dateLabel: '19—20 SEP',
    image: '/editorial/lee-youngji/taipei-tour.webp',
    href: 'https://www.livenation.com.tw/en/event/2026-lee-youngji-world-tour-2-0--taipei-tickets-edp1669737',
    external: true,
    accent: '#fd5f30',
    glow: '#fff1a8',
  },
  {
    id: 'itzy-singapore-2026',
    artist: 'ITZY',
    tour: '3RD WORLD TOUR · TUNNEL VISION',
    city: 'Singapore',
    market: 'SG',
    venue: 'Singapore Indoor Stadium',
    startsAt: '2026-10-03T18:00:00+08:00',
    timezone: 'Asia/Singapore',
    sourceName: 'Live Nation Singapore',
    dateLabel: '03 OCT',
    image: '/editorial/itzy/tunnel-vision.webp',
    albumImage: '/editorial/itzy/taipei-tour.webp',
    href: 'https://www.livenation.sg/itzy2026',
    external: true,
    accent: '#ff315f',
    glow: '#c9fbff',
  },
  {
    id: 'babymonster-singapore-2026',
    artist: 'BABYMONSTER',
    tour: 'WORLD TOUR · 춤 (CHOOM)',
    city: 'Singapore',
    market: 'SG',
    venue: 'Singapore Indoor Stadium',
    startsAt: '2026-11-28T18:00:00+08:00',
    endsAt: '2026-11-29T23:59:59+08:00',
    timezone: 'Asia/Singapore',
    sourceName: 'Live Nation Singapore',
    dateLabel: '28—29 NOV',
    image: '/editorial/babymonster/singapore-tour.webp',
    albumImage: '/editorial/babymonster/choom.webp',
    href: 'https://www.livenation.sg/event/2026-27-babymonster-world-tour-%EC%B6%A4-choom-in-singapore-singapore-tickets-edp1680505',
    external: true,
    accent: '#e8ff2b',
    glow: '#e2b7ff',
  },
];

function normalizedMatchField(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('en-US').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function editorialShowCoversEvent(
  show: EditorialShow,
  event: {
    artist?: string;
    name: string;
    countryCode?: string;
    city?: string;
    venue?: string;
    startsAt: string;
  },
): boolean {
  const artist = normalizedMatchField(event.artist ?? event.name);
  const showArtist = normalizedMatchField(show.artist);
  const eventTime = Date.parse(event.startsAt);
  const cityMatches = !event.city || normalizedMatchField(event.city) === normalizedMatchField(show.city);
  const eventVenue = event.venue ? normalizedMatchField(event.venue) : undefined;
  const showVenue = normalizedMatchField(show.venue);
  const venueMatches = !eventVenue || eventVenue === showVenue
    || eventVenue.includes(showVenue) || showVenue.includes(eventVenue);
  return artist === showArtist
    && show.market === event.countryCode
    && cityMatches
    && venueMatches
    && eventTime >= Date.parse(show.startsAt)
    && eventTime <= Date.parse(show.endsAt ?? show.startsAt);
}

export const editorialSources = [
  { label: 'ITZY · Taipei / Singapore', href: 'https://www.livenation.com.tw/en/event/itzy-3rd-world-tour-tunnel-vision-in-taipei-taipei-tickets-edp1684394' },
  { label: 'IVE · Hong Kong', href: 'https://www.livenation.hk/en/event/ive-world-tour-show-what-i-am-in-hong-kong-hong-kong-tickets-edp1662577' },
  { label: 'IVE · Taipei', href: 'https://www.livenation.com.tw/en/event/ive-world-tour-show-what-i-am-in-taipei-taipei-tickets-edp1663145' },
  { label: 'Lee Youngji · Taipei', href: 'https://www.livenation.com.tw/en/event/2026-lee-youngji-world-tour-2-0--taipei-tickets-edp1669737' },
  { label: 'BABYMONSTER · Singapore', href: 'https://www.livenation.sg/event/2026-27-babymonster-world-tour-%EC%B6%A4-choom-in-singapore-singapore-tickets-edp1680505' },
] as const;
