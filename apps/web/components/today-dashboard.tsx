'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { ConcertJourney } from '@/lib/domain/types';
import { formatVenueTime, getJourneyProgress, getNextMilestone } from '@/lib/domain/lifecycle';
import { cityKey, milestoneTitleKey } from '@/lib/i18n/domain';
import { usePreferences } from './preferences-provider';

function remainingLabel(targetIso: string, now: number): string {
  const remaining = Math.max(0, new Date(targetIso).getTime() - now);
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1_000);
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

export function TodayDashboard({ journeys }: { journeys: ConcertJourney[] }) {
  const { dateLocale, t } = usePreferences();
  const primaryJourney = journeys[0];
  const primaryMilestone = getNextMilestone(
    primaryJourney,
    new Date('2026-08-22T11:42:00+08:00'),
  )!;
  const [now, setNow] = useState(() => Date.now());
  const [completed, setCompleted] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'preview'>('idle');
  const [sourcesOpen, setSourcesOpen] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const countdown = useMemo(
    () => remainingLabel(primaryMilestone.endsAt ?? primaryMilestone.startsAt, now),
    [now, primaryMilestone.endsAt, primaryMilestone.startsAt],
  );

  async function markCompleted() {
    const nextCompleted = !completed;
    setCompleted(nextCompleted);
    setSaveState('saving');
    const response = await fetch(
      `/api/v1/plans/${primaryJourney.id}/milestones/${primaryMilestone.id}`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ state: nextCompleted ? 'completed' : 'todo' }),
      },
    );
    setSaveState(response.ok ? 'saved' : 'preview');
  }

  const translatedCity = cityKey(primaryJourney.venue.city);
  const progress = getJourneyProgress(primaryJourney);

  return (
    <div className="page-body today-page">
      <section className={`priority-action ${completed ? 'is-complete' : ''}`}>
        <div className="priority-rail" aria-hidden="true" />
        <div className="priority-content">
          <div className="priority-meta">
            <span className="status-label"><i />{t('home.nextAction')}</span>
            <span>{t('home.verifiedWindow')} · {t('common.illustrative')}</span>
          </div>

          <div className="priority-main">
            <div className="priority-copy">
              <p>{primaryJourney.artist.name} · {translatedCity ? t(translatedCity) : primaryJourney.venue.city}</p>
              <h2>{completed ? t('home.registrationComplete') : t(milestoneTitleKey(primaryMilestone.type))}</h2>
              <span>{primaryJourney.tourName} · {primaryJourney.venue.name}</span>
            </div>
            <div className="deadline-clock">
              <span>{t('home.windowClosesIn')}</span>
              <strong aria-live="off">{countdown}</strong>
              <small>
                {formatVenueTime(primaryMilestone.endsAt!, primaryMilestone.timezone, dateLocale)} · {t('common.venueTime')}
              </small>
            </div>
          </div>

          <div className="priority-actions">
            <Link className="button-primary" href={`/plans/${primaryJourney.slug}`}>
              {t('home.reviewRegistration')} <span aria-hidden="true">→</span>
            </Link>
            <button className="button-quiet" type="button" onClick={markCompleted}>
              {completed ? t('common.undo') : t('common.markCompleted')}
            </button>
            <span className="save-feedback" aria-live="polite">
              {saveState === 'saving' && t('common.saving')}
              {saveState === 'saved' && t('common.saved')}
              {saveState === 'preview' && t('common.previewSaved')}
            </span>
          </div>

          <div className="evidence-bar">
            <span className="verification-seal" aria-hidden="true">✓</span>
            <span>{t('home.evidenceCount', { count: primaryJourney.sources.length })}</span>
            <span className="evidence-names">{primaryJourney.sources.map((source) => source.name).join(' · ')}</span>
            <button type="button" onClick={() => setSourcesOpen(!sourcesOpen)} aria-expanded={sourcesOpen}>
              {sourcesOpen ? t('common.hideSources') : t('common.viewSources')}
            </button>
          </div>

          {sourcesOpen ? (
            <div className="evidence-list">
              {primaryJourney.sources.map((source) => (
                <a href={source.url} target="_blank" rel="noreferrer" key={source.id}>
                  <span><strong>{source.name}</strong><small>{source.host}</small></span>
                  <small>{formatVenueTime(source.checkedAt, primaryJourney.venue.timezone, dateLocale)} ↗</small>
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <div className="today-columns">
        <section className="content-section upcoming-section">
          <div className="section-heading">
            <div><span>{t('home.upcoming')}</span><h2>{t('home.nextWindows')}</h2></div>
            <Link href="/plans">{t('common.viewAll')} <span aria-hidden="true">→</span></Link>
          </div>
          <div className="event-list">
            {journeys.slice(0, 4).map((journey) => {
              const milestone = getNextMilestone(journey, new Date('2026-08-22T11:42:00+08:00'));
              if (!milestone) return null;
              const translatedJourneyCity = cityKey(journey.venue.city);
              return (
                <Link className="event-row" href={`/plans/${journey.slug}`} key={journey.id}>
                  <span className="event-date">
                    {formatVenueTime(milestone.startsAt, milestone.timezone, dateLocale).split(' ·')[0]}
                  </span>
                  <span className="artist-swatch" style={{ '--artist-color': journey.artist.accent } as React.CSSProperties} />
                  <span className="event-artist"><strong>{journey.artist.name}</strong><small>{journey.tourName}</small></span>
                  <span className="event-place">{translatedJourneyCity ? t(translatedJourneyCity) : journey.venue.city}</span>
                  <span className="event-milestone"><strong>{t(milestoneTitleKey(milestone.type))}</strong><small>{formatVenueTime(milestone.startsAt, milestone.timezone, dateLocale)}</small></span>
                  <span className="row-arrow" aria-hidden="true">→</span>
                </Link>
              );
            })}
          </div>
        </section>

        <aside className="journey-overview">
          <div className="section-heading compact">
            <div><span>{t('home.protectedJourney')}</span><h2>{translatedCity ? t(translatedCity) : primaryJourney.venue.city}</h2></div>
            <span className="progress-fraction">{progress.complete}/{progress.total}</span>
          </div>

          <div className="route-lineup" aria-label="Singapore to Hong Kong">
            <span>SIN</span><i><b style={{ width: `${Math.max(12, progress.complete / progress.total * 100)}%` }} /></i><span>HKG</span>
          </div>
          <dl className="journey-facts-compact">
            <div><dt>{t('plans.performance')}</dt><dd>{formatVenueTime(primaryJourney.performanceStartsAt, primaryJourney.venue.timezone, dateLocale)}</dd></div>
            <div><dt>{t('journey.venue')}</dt><dd>{primaryJourney.venue.name}</dd></div>
          </dl>
          <ol className="mini-lifecycle">
            {primaryJourney.milestones.slice(0, 4).map((milestone) => (
              <li className={milestone.state} key={milestone.id}>
                <i />
                <span><strong>{t(milestoneTitleKey(milestone.type))}</strong><small>{formatVenueTime(milestone.startsAt, milestone.timezone, dateLocale)}</small></span>
              </li>
            ))}
          </ol>
          <Link className="text-link" href={`/plans/${primaryJourney.slug}`}>{t('home.openJourney')} →</Link>

          <Link className="passport-inline" href="/passport">
            <span><small>{t('home.passportPrompt')}</small><strong>{t('home.showsAcrossCities', { shows: 18, cities: 7 })}</strong></span>
            <span aria-hidden="true">→</span>
          </Link>
        </aside>
      </div>

      <p className="data-footnote">{t('home.deadlineNote')}</p>
    </div>
  );
}
