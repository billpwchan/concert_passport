'use client';

import Link from 'next/link';
import type { ConcertJourney } from '@/lib/domain/types';
import { formatVenueTime } from '@/lib/domain/lifecycle';
import { cityKey } from '@/lib/i18n/domain';
import { JourneyLifecycle } from './journey-lifecycle';
import { usePreferences } from './preferences-provider';

export function JourneyOverview({ journey }: { journey: ConcertJourney }) {
  const { dateLocale, t } = usePreferences();
  const translatedCity = cityKey(journey.venue.city);

  return (
    <div className="journey-page">
      <header className="journey-header">
        <div className="journey-context">
          <Link href="/plans">← {t('journey.allPlans')}</Link>
          <span>{t('journey.demoLabel')}</span>
        </div>
        <div className="journey-title-row">
          <div>
            <p>{journey.artist.koreanName} · {journey.artist.agency}</p>
            <h1>{journey.artist.name}</h1>
            <h2>{journey.tourName}</h2>
          </div>
          <div className="destination-block">
            <span>{journey.venue.market}</span>
            <strong>{translatedCity ? t(translatedCity) : journey.venue.city}</strong>
          </div>
        </div>
        <dl className="journey-facts">
          <div><dt>{t('journey.performance')}</dt><dd>{formatVenueTime(journey.performanceStartsAt, journey.venue.timezone, dateLocale)}</dd><small>{journey.venue.timezone}</small></div>
          <div><dt>{t('journey.venue')}</dt><dd>{journey.venue.name}</dd><small>{translatedCity ? t(translatedCity) : journey.venue.city}</small></div>
          <div><dt>{t('journey.seller')}</dt><dd>{journey.officialSeller}</dd><small>{journey.officialSellerHost}</small></div>
          <div><dt>{t('journey.ticketLimit')}</dt><dd>{journey.ticketLimit ? t('journey.perAccount', { count: journey.ticketLimit }) : '—'}</dd><small>{t('journey.confirmEventPage')}</small></div>
        </dl>
      </header>

      <div className="journey-content-grid">
        <JourneyLifecycle journey={journey} />
        <aside className="journey-aside">
          <section className="aside-section source-ledger">
            <span className="section-label">{t('journey.sourceLedger')}</span>
            <h2>{t('journey.whyTrust')}</h2>
            <div className="source-ledger-list">
              {journey.sources.map((source) => (
                <a href={source.url} target="_blank" rel="noreferrer" key={source.id}>
                  <span className="verification-seal" aria-hidden="true">✓</span>
                  <span><strong>{source.name}</strong><small>{source.host}</small></span>
                  <span aria-hidden="true">↗</span>
                </a>
              ))}
            </div>
            <p>{t('journey.sourceNote')}</p>
          </section>

          <section className="aside-section ticket-checklist">
            <span className="section-label">{t('journey.ticketKit')}</span>
            <h2>{t('journey.readyBeforeQueue')}</h2>
            <ul>
              <li className="done"><i>✓</i>{t('journey.membershipConfirmed')}</li>
              <li className="done"><i>✓</i>{t('journey.registrationTracked')}</li>
              <li><i>·</i>{t('journey.codePrivate')}</li>
              <li><i>·</i>{t('journey.oneDevice')}</li>
            </ul>
            <a className="button-secondary" href={`https://${journey.officialSellerHost}`} target="_blank" rel="noreferrer">
              {t('journey.openSeller')} <span aria-hidden="true">↗</span>
            </a>
          </section>
        </aside>
      </div>
    </div>
  );
}
