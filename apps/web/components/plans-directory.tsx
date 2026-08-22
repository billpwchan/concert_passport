'use client';

import Link from 'next/link';
import type { ConcertJourney } from '@/lib/domain/types';
import { formatVenueTime, getJourneyProgress, getNextMilestone } from '@/lib/domain/lifecycle';
import { cityKey, milestoneTitleKey } from '@/lib/i18n/domain';
import { usePreferences } from './preferences-provider';

export function PlansDirectory({ journeys }: { journeys: ConcertJourney[] }) {
  const { dateLocale, t } = usePreferences();

  return (
    <div className="page-body plans-page">
      <div className="directory-caption">
        <span>{t('plans.active', { count: journeys.length })}</span>
        <span>{t('common.venueTime')}</span>
      </div>
      <section className="plans-table" aria-label={t('plans.eyebrow')}>
        <div className="plans-table-head" aria-hidden="true">
          <span>{t('plans.artistTour')}</span>
          <span>{t('plans.destination')}</span>
          <span>{t('plans.performance')}</span>
          <span>{t('plans.progress')}</span>
          <span>{t('plans.nextAction')}</span>
          <span />
        </div>
        <div className="plans-table-body">
          {journeys.map((journey) => {
            const progress = getJourneyProgress(journey);
            const next = getNextMilestone(journey, new Date('2026-08-22T11:42:00+08:00'));
            const ratio = Math.round((progress.complete / progress.total) * 100);
            const translatedCity = cityKey(journey.venue.city);
            return (
              <Link className="plan-row" href={`/plans/${journey.slug}`} key={journey.id}>
                <span className="plan-identity">
                  <i style={{ background: journey.artist.accent }} />
                  <span><strong>{journey.artist.name}</strong><small>{journey.tourName}</small></span>
                </span>
                <span className="plan-destination-cell">
                  <strong>{translatedCity ? t(translatedCity) : journey.venue.city}</strong>
                  <small>{journey.venue.name}</small>
                </span>
                <time>{formatVenueTime(journey.performanceStartsAt, journey.venue.timezone, dateLocale)}</time>
                <span className="plan-progress-cell">
                  <span><i style={{ width: `${Math.max(6, ratio)}%` }} /></span>
                  <small>{progress.complete}/{progress.total} {t('common.steps')}</small>
                </span>
                <span className="plan-next-cell">
                  <strong>{next ? t(milestoneTitleKey(next.type)) : t('plans.ready')}</strong>
                  <small>{next ? formatVenueTime(next.startsAt, next.timezone, dateLocale) : ''}</small>
                </span>
                <span className="row-arrow" aria-hidden="true">→</span>
              </Link>
            );
          })}
        </div>
      </section>
      <p className="data-footnote">{t('plans.demoDisclaimer')}</p>
    </div>
  );
}
