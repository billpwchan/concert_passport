'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { CanonicalEventRecord, SavedEventRecord } from '@/db/events';
import { formatVenueTime } from '@/lib/domain/lifecycle';
import { eventLinkActionKey, eventLinkMessageKey, primaryEventHref } from '@/lib/domain/event-link';
import { usePreferences } from './preferences-provider';

export function HomeHub({
  events,
  catalogEvents,
  signedIn,
}: {
  events: SavedEventRecord[];
  catalogEvents: CanonicalEventRecord[];
  signedIn: boolean;
}) {
  const { dateLocale, t } = usePreferences();
  const nextSaved = events.find((event) => new Date(event.startsAt) >= new Date());
  const next = nextSaved ?? catalogEvents.find((event) => new Date(event.startsAt) >= new Date());
  const schedule = catalogEvents.filter((event) => event.id !== next?.id).slice(0, 6);
  const nextTarget = next ? primaryEventHref(next) : undefined;
  return (
    <div className="page-body home-hub">
      {next ? (
        <section className="next-show-hero">
          <Image
            className="home-hero-image"
            src={next.imageUrl ? `/api/v1/events/${encodeURIComponent(next.id)}/image` : '/visuals/arena-awaiting-v1.jpg'}
            alt=""
            fill
            priority
            unoptimized={Boolean(next.imageUrl)}
            sizes="(max-width: 760px) 100vw, 1440px"
          />
          <span className="home-hero-scrim" aria-hidden="true" />
          <div className="home-hero-content">
            <span className="section-label">{t(nextSaved ? 'home.nextShow' : 'home.upcomingAsia')}</span>
            <p>{next.city ?? next.venue ?? next.countryCode} · {formatVenueTime(next.startsAt, next.timezone ?? 'UTC', dateLocale)}</p>
            <h1>{next.artist ?? next.name}</h1>
            <h2>{next.name}</h2>
            <div className="home-hero-actions">
              {nextTarget?.external ? (
                <a className="button-primary" href={nextTarget.href} target="_blank" rel="noreferrer">{t(eventLinkActionKey(next.bestLinkRole))} ↗</a>
              ) : (
                <Link className="button-primary" href={nextTarget?.href ?? '/atlas'}>{t('links.openListing')} →</Link>
              )}
              <Link className="button-secondary" href={nextSaved ? '/plans' : '/atlas'}>{t(nextSaved ? 'home.allSavedShows' : 'home.findShow')}</Link>
            </div>
          </div>
          {next.imageUrl && next.imageSourceUrl ? (
            <a className="media-credit" href={next.imageSourceUrl} target="_blank" rel="noreferrer">
              {next.imageAttribution ?? 'Image · Ticketmaster'} ↗
            </a>
          ) : null}
        </section>
      ) : (
        <section className="welcome-hero">
          <Image className="home-hero-image" src="/visuals/arena-awaiting-v1.jpg" alt="" fill priority sizes="(max-width: 760px) 100vw, 1440px" />
          <span className="home-hero-scrim" aria-hidden="true" />
          <div className="home-hero-content">
            <span className="section-label">{t('home.startEyebrow')}</span>
            <h1>{t('home.startTitle')}</h1>
            <p>{t('home.startDescription')}</p>
            <div className="home-hero-actions">
              <Link className="button-primary" href="/atlas">{t('home.findShow')}</Link>
              {!signedIn ? <Link className="button-secondary" href="/account">{t('home.createAccount')}</Link> : null}
            </div>
          </div>
        </section>
      )}
      <section className="home-schedule">
        <header className="home-schedule-head">
          <div>
            <span className="section-label">{t('home.scheduleEyebrow')}</span>
            <h2>{t('home.scheduleTitle')}</h2>
          </div>
          <p>{t('home.scheduleDescription')}</p>
        </header>
        <div className="home-show-list">
          {schedule.map((event) => {
            const target = primaryEventHref(event);
            const localDate = new Intl.DateTimeFormat(dateLocale, {
              day: '2-digit', month: 'short', timeZone: event.timezone ?? 'UTC',
            }).formatToParts(new Date(event.startsAt));
            const day = localDate.find((part) => part.type === 'day')?.value ?? '—';
            const month = localDate.find((part) => part.type === 'month')?.value ?? '';
            const content = (
              <>
                <time><strong>{day}</strong><small>{month}</small></time>
                <span className="home-show-place"><strong>{event.city ?? event.venue ?? event.countryCode ?? '—'}</strong><small>{event.countryCode ?? 'APAC'}</small></span>
                <span className="home-show-name"><strong>{event.artist ?? event.name}</strong><small>{event.name}</small></span>
                <span className="home-show-time"><strong>{formatVenueTime(event.startsAt, event.timezone ?? 'UTC', dateLocale)}</strong><small>{t(eventLinkMessageKey(event.bestLinkRole))}</small></span>
                <i aria-hidden="true">{target.external ? '↗' : '→'}</i>
              </>
            );
            return target.external ? (
              <a href={target.href} target="_blank" rel="noreferrer" key={event.id}>{content}</a>
            ) : (
              <Link href={target.href} key={event.id}>{content}</Link>
            );
          })}
          {!schedule.length ? <p className="home-schedule-empty">{t('home.scheduleEmpty')}</p> : null}
        </div>
        <footer className="home-schedule-actions">
          <p>{t('home.scheduleActionBody')}</p>
          <div><Link className="button-primary" href="/atlas">{t('home.searchAll')}</Link><Link className="button-quiet" href="/passport">{t('home.openPassport')} →</Link></div>
        </footer>
      </section>
    </div>
  );
}
