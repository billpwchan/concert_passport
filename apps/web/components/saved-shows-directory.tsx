'use client';
import { AttendEventButton } from './attend-event-button';
import Link from 'next/link';
import type { SavedEventRecord } from '@/db/events';
import { EventCard } from './event-card';
import { usePreferences } from './preferences-provider';
export function SavedShowsDirectory({ events, nowIso, attendedIds }: { events: SavedEventRecord[]; nowIso: string; attendedIds: string[] }) {
  const { t } = usePreferences();
  const upcoming = events.filter((event) => Date.parse(event.startsAt) >= Date.parse(nowIso));
  const past = events.filter((event) => Date.parse(event.startsAt) < Date.parse(nowIso));
  return <section className="saved-shows-section">
    <div className="discovery-section-head"><div><span className="editorial-eyebrow">YOUR SHORTLIST</span><h1>{t('explore.savedTitle')}</h1><p>{t('explore.savedBody')}</p></div><strong>{events.length}</strong></div>
    {events.length ? <><div className="show-grid">{upcoming.map((event) => <EventCard key={event.id} event={event} saved />)}</div>
      {past.length ? <section className="past-shows"><header className="discovery-section-head"><h2>{t('explore.past')}</h2><Link className="text-link" href="/passport">{t('explore.record')}</Link></header><div className="show-grid">{past.map((event) => <div key={event.id}><EventCard event={event} saved />{!event.publicationQuarantined && !['cancelled', 'postponed'].includes(event.lifecycleStatus ?? '') && <AttendEventButton eventId={event.id} recorded={attendedIds.includes(event.id)} />}</div>)}</div></section> : null}</>
      : <div className="discovery-empty"><span className="empty-orbit" aria-hidden="true">＋</span><h3>{t('plans.emptyTitle')}</h3><p>{t('plans.emptyDescription')}</p><Link className="button-primary" href="/atlas">{t('explore.browse')} →</Link></div>}
  </section>;
}
