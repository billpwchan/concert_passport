'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import type { CanonicalEventRecord } from '@/db/events';
import { formatVenueTime } from '@/lib/domain/lifecycle';
import { eventLinkActionKey, linkSourceName, verifiedEventHref } from '@/lib/domain/event-link';
import { usePreferences } from './preferences-provider';

export function EventOverview({
  event,
  initialSaved,
}: {
  event: CanonicalEventRecord;
  initialSaved: boolean;
}) {
  const { dateLocale, t } = usePreferences();
  const [saved, setSaved] = useState(initialSaved);
  const verifiedHref = verifiedEventHref(event);
  const linkSource = linkSourceName(event.bestLinkSource);

  async function save() {
    const response = await fetch('/api/v1/plans', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ eventId: event.id }),
    });
    if (response.ok) setSaved(true);
  }

  return (
    <div className="page-body event-page">
      <Link className="back-link" href="/atlas">← {t('event.back')}</Link>
      <section className={`event-hero${event.imageUrl ? ' has-media' : ''}`}>
        {event.imageUrl ? (
          <>
            <Image
              className="event-hero-image"
              src={`/api/v1/events/${encodeURIComponent(event.id)}/image`}
              alt=""
              fill
              priority
              unoptimized
              sizes="(max-width: 760px) 100vw, 1440px"
            />
            <span className="event-hero-scrim" aria-hidden="true" />
          </>
        ) : null}
        <div className="event-hero-copy">
          <span className="section-label">{event.countryCode ?? t('event.listing')}</span>
          <h1>{event.artist ?? event.name}</h1>
          <p>{event.name}</p>
        </div>
        <button className="button-primary" type="button" onClick={() => void save()} disabled={saved}>
          {t(saved ? 'event.saved' : 'event.save')}
        </button>
        {event.imageUrl && event.imageSourceUrl ? (
          <a className="media-credit" href={event.imageSourceUrl} target="_blank" rel="noreferrer">
            {event.imageAttribution ?? 'Image · Ticketmaster'} ↗
          </a>
        ) : null}
      </section>

      <section className="event-facts">
        <dl>
          <div><dt>{t('event.date')}</dt><dd>{formatVenueTime(event.startsAt, event.timezone ?? 'UTC', dateLocale)}</dd></div>
          <div><dt>{t('event.city')}</dt><dd>{event.city ?? event.countryCode ?? '—'}</dd></div>
          <div><dt>{t('event.venue')}</dt><dd>{event.venue ?? t('plans.venuePending')}</dd></div>
          <div><dt>{t('event.source')}</dt><dd>{linkSource ?? (event.provider === 'ticketmaster-discovery' ? 'Ticketmaster' : 'PredictHQ')}</dd></div>
        </dl>
        <div className="event-ticket-link">
          <span className="section-label">{t('event.ticketing')}</span>
          {verifiedHref ? (
            <>
              <h2>{t(event.bestLinkRole === 'ticket' ? 'event.ticketReady' : 'event.officialReady')}</h2>
              <p>{t(event.bestLinkRole === 'ticket' ? 'event.ticketDescription' : 'event.officialDescription')}</p>
              <a className="button-secondary" href={verifiedHref} target="_blank" rel="noreferrer">{t(eventLinkActionKey(event.bestLinkRole))} ↗</a>
            </>
          ) : (
            <>
              <h2>{t('event.linkPending')}</h2>
              <p>{t('event.pendingDescription')}</p>
              <a className="provider-attribution" href="https://www.predicthq.com/" target="_blank" rel="noreferrer">{t('event.dataBy')} ↗</a>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
