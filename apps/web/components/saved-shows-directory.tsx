'use client';

import Link from 'next/link';
import type { SavedEventRecord } from '@/db/events';
import { formatVenueTime } from '@/lib/domain/lifecycle';
import { eventLinkActionKey, primaryEventHref } from '@/lib/domain/event-link';
import { usePreferences } from './preferences-provider';

export function SavedShowsDirectory({ events }: { events: SavedEventRecord[] }) {
  const { dateLocale, t } = usePreferences();
  return (
    <section className="saved-shows-section">
      <div className="section-heading">
        <div><span>{t('plans.savedEyebrow')}</span><h2>{t('plans.savedTitle')}</h2></div>
        <strong>{events.length}</strong>
      </div>
      {events.length ? (
        <div className="saved-show-list">
          {events.map((event) => {
            const target = primaryEventHref(event);
            const content = (
              <>
              <span className="saved-show-date">{formatVenueTime(event.startsAt, event.timezone ?? 'UTC', dateLocale)}</span>
              <span><strong>{event.artist ?? event.name}</strong><small>{event.name}</small></span>
              <span><strong>{event.city ?? event.countryCode ?? '—'}</strong><small>{event.venue ?? t('plans.venuePending')}</small></span>
              <span className="official-link-label">
                {t(eventLinkActionKey(event.bestLinkRole))} {target.external ? '↗' : '→'}
              </span>
              </>
            );
            return target.external ? (
              <a href={target.href} target="_blank" rel="noreferrer" key={event.id}>{content}</a>
            ) : (
              <Link href={target.href} key={event.id}>{content}</Link>
            );
          })}
        </div>
      ) : (
        <div className="product-empty-state">
          <h3>{t('plans.emptyTitle')}</h3>
          <p>{t('plans.emptyDescription')}</p>
          <a className="button-primary" href="/atlas">{t('plans.findShows')}</a>
        </div>
      )}
    </section>
  );
}
