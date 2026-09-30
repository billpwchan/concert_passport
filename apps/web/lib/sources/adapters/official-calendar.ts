import type { DiscoveredEvent, DiscoveryQuery } from '@/lib/domain/types';
import type { EventSourceAdapter } from './types';

type OfficialCalendarEvent = Omit<DiscoveredEvent, 'provider' | 'confidence'>;

const officialCalendar: OfficialCalendarEvent[] = [
  {
    providerEventId: 'itzy-taipei-2026-09-05',
    name: 'ITZY 3RD WORLD TOUR <TUNNEL VISION> in TAIPEI',
    artist: 'ITZY', startsAt: '2026-09-05T18:00:00+08:00', timezone: 'Asia/Taipei',
    venue: 'Taipei Arena', city: 'Taipei', countryCode: 'TW',
    officialUrl: 'https://tixcraft.com/activity/detail/26_itzytpe',
  },
  ...[
    { day: '11', time: '19:00' },
    { day: '12', time: '18:00' },
    { day: '13', time: '18:00' },
  ].map(({ day, time }) => ({
    providerEventId: `ive-taipei-2026-09-${day}`,
    name: 'IVE WORLD TOUR <SHOW WHAT I AM> IN TAIPEI',
    artist: 'IVE', startsAt: `2026-09-${day}T${time}:00+08:00`, timezone: 'Asia/Taipei',
    venue: 'Taipei Arena', city: 'Taipei', countryCode: 'TW',
    officialUrl: 'https://tixcraft.com/activity/detail/26_ive',
  })),
  {
    providerEventId: 'mamamoo-melbourne-2026-09-22',
    name: 'MAMAMOO 2026 WORLD TOUR <4WARD> in MELBOURNE',
    artist: 'MAMAMOO', startsAt: '2026-09-22T19:00:00+10:00', timezone: 'Australia/Melbourne',
    venue: 'John Cain Arena', city: 'Melbourne', countryCode: 'AU',
    officialUrl: 'https://premier.ticketek.com.au/shows/show.aspx?eg=MMLNA&ep=MMLNA&sh=OAMOFWM26',
  },
  {
    providerEventId: 'bts-kaohsiung-2026-11-22',
    name: "BTS WORLD TOUR 'ARIRANG' IN KAOHSIUNG",
    artist: 'BTS', startsAt: '2026-11-22T19:00:00+08:00', timezone: 'Asia/Taipei',
    venue: 'Kaohsiung National Stadium', city: 'Kaohsiung', countryCode: 'TW',
    officialUrl: 'https://tixcraft.com/activity/detail/26_btskns',
  },
  {
    providerEventId: 'bts-kuala-lumpur-2026-12-13',
    name: "BTS WORLD TOUR 'ARIRANG' IN KUALA LUMPUR",
    artist: 'BTS', startsAt: '2026-12-13T19:30:00+08:00', timezone: 'Asia/Kuala_Lumpur',
    venue: 'TM Stadium Nasional', city: 'Kuala Lumpur', countryCode: 'MY',
    officialUrl: 'https://www.livenation.my/event/bts-world-tour-arirang-in-kuala-lumpur-kuala-lumpur-tickets-edp1675786',
  },
  ...['19', '20', '22'].map((day) => ({
    providerEventId: `bts-singapore-2026-12-${day}`,
    name: "BTS WORLD TOUR 'ARIRANG' IN SINGAPORE",
    artist: 'BTS', startsAt: `2026-12-${day}T19:00:00+08:00`, timezone: 'Asia/Singapore',
    venue: 'National Stadium', city: 'Singapore', countryCode: 'SG',
    officialUrl: 'https://ticketmaster.sg/activity/detail/26sg_bts',
  })),
  {
    providerEventId: 'babymonster-manila-2026-09-05',
    name: '2026-27 BABYMONSTER WORLD TOUR [춤 (CHOOM)] IN MANILA',
    artist: 'BABYMONSTER', startsAt: '2026-09-05T19:00:00+08:00', timezone: 'Asia/Manila',
    venue: 'SM Mall of Asia Arena', city: 'Pasay', countryCode: 'PH',
    officialUrl: 'https://www.livenation.ph/event/2026-27-babymonster-world-tour-%EC%B6%A4-choom-in-manila-pasay-tickets-edp1673040',
  },
  {
    providerEventId: 'babymonster-jakarta-2026-10-17',
    name: '2026-27 BABYMONSTER WORLD TOUR [춤 (CHOOM)] IN JAKARTA',
    artist: 'BABYMONSTER', startsAt: '2026-10-17T18:30:00+07:00', timezone: 'Asia/Jakarta',
    venue: 'Indonesia Arena', city: 'Jakarta', countryCode: 'ID',
    officialUrl: 'https://weverse.io/babymonster/notice/35647',
  },
  ...['07', '08'].map((day) => ({
    providerEventId: `babymonster-bangkok-2026-11-${day}`,
    name: '2026-27 BABYMONSTER WORLD TOUR [춤 (CHOOM)] IN BANGKOK',
    artist: 'BABYMONSTER', startsAt: `2026-11-${day}T18:00:00+07:00`, timezone: 'Asia/Bangkok',
    venue: 'IMPACT Arena', city: 'Bangkok', countryCode: 'TH',
    officialUrl: 'https://www.thaiticketmajor.com/concert/2026-27-babymonster-world-tour-choom-in-bangkok.html',
  })),
  {
    providerEventId: 'babymonster-melbourne-2026-12-11',
    name: '2026-27 BABYMONSTER WORLD TOUR [춤 (CHOOM)] IN MELBOURNE',
    artist: 'BABYMONSTER', startsAt: '2026-12-11T19:00:00+11:00', timezone: 'Australia/Melbourne',
    venue: 'Rod Laver Arena', city: 'Melbourne', countryCode: 'AU',
    officialUrl: 'https://rodlaverarena.com.au/event/babymonster-world-tour-choom-melbourne-2026/',
  },
  {
    providerEventId: 'babymonster-sydney-2026-12-13',
    name: '2026-27 BABYMONSTER WORLD TOUR [춤 (CHOOM)] IN SYDNEY',
    artist: 'BABYMONSTER', startsAt: '2026-12-13T19:00:00+11:00', timezone: 'Australia/Sydney',
    venue: 'Afterpay Arena', city: 'Sydney', countryCode: 'AU',
    officialUrl: 'https://premier.ticketek.com.au/Shows/Show.aspx?sh=LVMBRLYS26',
  },
];

function normalize(value: string | undefined): string {
  return (value ?? '').normalize('NFKC').toLocaleLowerCase('en-US')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export const officialCalendarAdapter: EventSourceAdapter = {
  id: 'official-event-calendar',
  name: 'Verified official event calendars',
  health() {
    return {
      id: this.id,
      name: this.name,
      status: 'connected',
      detail: 'Exact-date official seller, promoter, venue and artist calendars',
    };
  },
  async discover(query: DiscoveryQuery): Promise<DiscoveredEvent[]> {
    const start = query.startDateTime ? Date.parse(query.startDateTime) : Number.NEGATIVE_INFINITY;
    const end = query.endDateTime ? Date.parse(query.endDateTime) : Number.POSITIVE_INFINITY;
    const artist = normalize(query.artist);
    return officialCalendar.filter((event) => {
      const startsAt = Date.parse(event.startsAt);
      return startsAt >= start && startsAt <= end
        && (!query.countryCode || event.countryCode === query.countryCode)
        && (!query.city || normalize(event.city) === normalize(query.city))
        && (!artist || normalize(event.artist) === artist);
    }).map((event) => ({
      ...event,
      provider: this.id,
      confidence: 'official',
      sourceObservedAt: Date.parse('2026-08-25T04:22:00Z'),
    }));
  },
};
