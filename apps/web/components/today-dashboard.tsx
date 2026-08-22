'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { ConcertJourney } from '@/lib/domain/types';
import { formatVenueTime, getJourneyProgress, getNextMilestone } from '@/lib/domain/lifecycle';

function remainingLabel(targetIso: string, now: number): string {
  const remaining = Math.max(0, new Date(targetIso).getTime() - now);
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1_000);
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

export function TodayDashboard({ journeys }: { journeys: ConcertJourney[] }) {
  const primaryJourney = journeys[0];
  const primaryMilestone = getNextMilestone(primaryJourney, new Date('2026-08-22T11:42:00+08:00'))!;
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

  return (
    <>
      <div className="content-grid today-grid">
        <div className="primary-column">
          <section className={`next-action ${completed ? 'action-completed' : ''}`}>
            <div className="action-topline">
              <span className="verified-label"><i /> NEXT ACTION · VERIFIED</span>
              <span className="preview-label">ILLUSTRATIVE TIMINGS</span>
            </div>

            <div className="action-heading">
              <div>
                <p>{primaryJourney.artist.name} · {primaryJourney.tourName}</p>
                <h2>{completed ? 'Registration marked complete' : primaryMilestone.title}</h2>
              </div>
              <span className="city-code">HKG</span>
            </div>

            <div className="countdown-block">
              <div>
                <span className="countdown-label">WINDOW CLOSES IN</span>
                <strong className="countdown">{countdown}</strong>
              </div>
              <div className="deadline-meta">
                <span>{formatVenueTime(primaryMilestone.endsAt!, primaryMilestone.timezone)}</span>
                <small>Venue time · Asia/Hong Kong</small>
              </div>
            </div>

            <div className="action-buttons">
              <Link className="primary-button" href={`/plans/${primaryJourney.slug}`}>
                Review registration <span>↗</span>
              </Link>
              <button className="secondary-button" type="button" onClick={markCompleted}>
                {completed ? 'Undo completion' : 'Mark completed'}
              </button>
            </div>

            <div className="source-line">
              <span className="source-seal">✓</span>
              <span>
                {primaryJourney.sources.map((source) => source.name).join(' + ')}
                <small>
                  {saveState === 'saving' && 'Saving…'}
                  {saveState === 'saved' && 'Saved to your protected journey'}
                  {saveState === 'preview' && 'Preview updated · sign in to persist changes'}
                  {saveState === 'idle' && 'Two first-party references in the source ledger'}
                </small>
              </span>
              <button type="button" onClick={() => setSourcesOpen(!sourcesOpen)}>
                {sourcesOpen ? 'Hide sources' : 'View sources'}
              </button>
            </div>

            {sourcesOpen ? (
              <div className="inline-sources">
                {primaryJourney.sources.map((source) => (
                  <a href={source.url} target="_blank" rel="noreferrer" key={source.id}>
                    <span>{source.name}</span>
                    <small>{source.host} · checked {formatVenueTime(source.checkedAt, primaryJourney.venue.timezone)}</small>
                  </a>
                ))}
              </div>
            ) : null}
          </section>

          <section className="section-block">
            <div className="section-heading">
              <div>
                <p className="eyebrow">COMING UP</p>
                <h3>Your next windows</h3>
              </div>
              <Link href="/plans">View all plans <span>→</span></Link>
            </div>
            <div className="upcoming-list">
              {journeys.slice(0, 4).map((journey) => {
                const milestone = getNextMilestone(journey, new Date('2026-08-22T11:42:00+08:00'));
                if (!milestone) return null;
                return (
                  <article className="upcoming-row" key={journey.id}>
                    <time>{formatVenueTime(milestone.startsAt, milestone.timezone).split(' ·')[0]}</time>
                    <span className="event-accent" style={{ background: journey.artist.accent }} />
                    <div className="event-identity">
                      <strong>{journey.artist.name}</strong>
                      <span>{journey.venue.city.toUpperCase()}</span>
                    </div>
                    <div className="event-action">
                      <span>{milestone.title}</span>
                      <strong>{formatVenueTime(milestone.startsAt, milestone.timezone)}</strong>
                    </div>
                    <Link href={`/plans/${journey.slug}`} aria-label={`Open ${journey.artist.name} plan`}>↗</Link>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="context-column">
          <section className="journey-card">
            <div className="journey-head">
              <div>
                <p className="eyebrow">PROTECTED JOURNEY</p>
                <h3>{primaryJourney.venue.city}</h3>
                <span>{primaryJourney.venue.name} · {formatVenueTime(primaryJourney.performanceStartsAt, primaryJourney.venue.timezone)}</span>
              </div>
              <span className="journey-number">{String(getJourneyProgress(primaryJourney).complete).padStart(2, '0')}</span>
            </div>

            <div className="route-plot" aria-label="Singapore to Hong Kong route preview">
              <span>SIN</span><span className="route-line"><i /></span><span>HKG</span>
              <small>{primaryJourney.travelDistanceKm?.toLocaleString()} km</small>
            </div>

            <div className="timeline">
              {primaryJourney.milestones.slice(0, 4).map((milestone) => (
                <div className={`timeline-row ${milestone.state}`} key={milestone.id}>
                  <span className="timeline-marker" />
                  <div>
                    <strong>{milestone.title}</strong>
                    <span>{formatVenueTime(milestone.startsAt, milestone.timezone)}</span>
                  </div>
                </div>
              ))}
            </div>
            <Link className="text-button" href={`/plans/${primaryJourney.slug}`}>Open full journey <span>→</span></Link>
          </section>

          <Link className="passport-teaser" href="/passport">
            <div>
              <p className="eyebrow">YOUR PASSPORT</p>
              <strong>18</strong>
              <span>shows across 7 cities</span>
            </div>
            <div className="stamp-preview">
              <span>LIVE</span><strong>SEOUL</strong><small>2025 · 06 · 21</small>
            </div>
          </Link>
        </aside>
      </div>
    </>
  );
}
