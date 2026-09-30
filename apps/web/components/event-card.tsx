'use client';
import Link from 'next/link';
import type { CanonicalEventRecord } from '@/db/events';
import { eventFreshness, hasConfirmedPerformanceTime } from '@/lib/domain/discovery';
import { eventDetailHref, eventLinkMessageKey } from '@/lib/domain/event-link';
import { formatVenueTime } from '@/lib/domain/lifecycle';
import { EventArtwork } from './event-artwork';
import { SaveEventButton } from './save-event-button';
import { usePreferences } from './preferences-provider';

export function EventCard({ event, saved = false, selected = false, onSelect, onSave, comparing = false, onCompare }: {
  event: CanonicalEventRecord; saved?: boolean; selected?: boolean; onSelect?: () => void; onSave?: (saved: boolean) => void; comparing?: boolean; onCompare?: () => void;
}) {
  const { t, dateLocale } = usePreferences();
  if (event.publicationQuarantined) return <article className="show-card"><div className="show-card-body"><h3>{t('event.reviewTitle')}</h3><p className="muted-copy">{t('event.reviewDescription')}</p><div className="show-card-footer"><Link className="text-link" href={eventDetailHref(event)}>{t('explore.details')} →</Link>{saved ? <SaveEventButton eventId={event.id} initialSaved compact onChange={onSave} /> : null}</div></div></article>;
  return <article className={`show-card${!event.imageUrl ? ' show-card-text' : ''}${selected ? ' is-selected' : ''}`} id={`show-${event.id}`} tabIndex={-1} onMouseEnter={onSelect} onFocus={onSelect}>
    {event.imageUrl && <Link className="show-card-art" href={eventDetailHref(event)} aria-label={`${event.artist ?? event.name} · ${t('explore.details')}`}>
      <EventArtwork name={event.artist ?? event.name} market={event.countryCode} src={!event.publicationQuarantined && event.imageUrl ? `/api/v1/events/${encodeURIComponent(event.id)}/image?v=31` : undefined} />
      <span className="show-market">{event.city ?? event.countryCode ?? 'APAC'}</span>
    </Link>}
    <div className="show-card-body">
      <div className="show-card-meta"><time dateTime={event.startsAt}>{hasConfirmedPerformanceTime(event) ? formatVenueTime(event.startsAt, event.timezone ?? 'UTC', dateLocale, true) : `${event.startsAt.slice(0, 10)} · ${t('explore.timePending')}`}</time><span>{event.countryCode}</span></div>
      <Link href={eventDetailHref(event)}><h3>{event.artist ?? event.name}</h3><p>{event.name}</p></Link>
      <p className="show-venue">{event.venue ?? t('plans.venuePending')}</p>
      <div className="show-card-footer"><span className={`trust-label ${event.bestLinkRole ? 'verified' : ''}`}>{event.lifecycleStatus && event.lifecycleStatus !== 'scheduled' ? t(`eventStatus.${event.lifecycleStatus}`) : t(eventLinkMessageKey(event.bestLinkRole))}
        <small>{t(`freshness.${eventFreshness(event.dataVerifiedAt)}`)}</small></span>
        <SaveEventButton eventId={event.id} initialSaved={saved} compact onChange={onSave} />
      </div>
      {onCompare ? <button className="compare-button" type="button" aria-pressed={comparing} onClick={onCompare}>{t(comparing ? 'explore.comparing' : 'explore.compare')} {comparing ? '✓' : '＋'}</button> : null}
    </div>
  </article>;
}
