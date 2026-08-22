'use client';

import { useState } from 'react';
import type { ConcertJourney } from '@/lib/domain/types';
import { formatVenueTime } from '@/lib/domain/lifecycle';
import {
  milestoneDescriptionKey,
  milestoneStateKey,
  milestoneTitleKey,
} from '@/lib/i18n/domain';
import { usePreferences } from './preferences-provider';

export function JourneyLifecycle({ journey }: { journey: ConcertJourney }) {
  const { dateLocale, t } = usePreferences();
  const [completedIds, setCompletedIds] = useState(
    () => new Set(journey.milestones.filter((item) => item.state === 'completed').map((item) => item.id)),
  );
  const [message, setMessage] = useState('');

  async function toggle(milestoneId: string) {
    const next = new Set(completedIds);
    const completed = !next.has(milestoneId);
    if (completed) next.add(milestoneId);
    else next.delete(milestoneId);
    setCompletedIds(next);
    setMessage(t('common.saving'));
    const response = await fetch(`/api/v1/plans/${journey.id}/milestones/${milestoneId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ state: completed ? 'completed' : 'todo' }),
    });
    setMessage(response.ok ? t('journey.updated') : t('common.previewSaved'));
  }

  return (
    <section className="lifecycle-panel">
      <div className="section-heading lifecycle-heading">
        <div><span>{t('journey.lifecycleEyebrow')}</span><h2>{t('journey.lifecycleTitle')}</h2></div>
        <span className="save-feedback" aria-live="polite">{message}</span>
      </div>
      <div className="lifecycle-list">
        {journey.milestones.map((milestone, index) => {
          const complete = completedIds.has(milestone.id);
          const state = complete ? 'completed' : milestone.state;
          return (
            <article className={`lifecycle-item ${state}`} key={milestone.id}>
              <div className="lifecycle-track">
                <button
                  type="button"
                  onClick={() => toggle(milestone.id)}
                  aria-label={`${complete ? t('common.undo') : t('common.markCompleted')} · ${t(milestoneTitleKey(milestone.type))}`}
                  aria-pressed={complete}
                >
                  {complete ? '✓' : String(index + 1).padStart(2, '0')}
                </button>
                <i aria-hidden="true" />
              </div>
              <div className="lifecycle-copy">
                <span>{t(milestoneStateKey(state))}</span>
                <h3>{t(milestoneTitleKey(milestone.type))}</h3>
                <p>{t(milestoneDescriptionKey(milestone.type))}</p>
                {milestone.requires?.length ? (
                  <small>{t(milestone.requires.length === 1 ? 'journey.prerequisite' : 'journey.prerequisites', { count: milestone.requires.length })}</small>
                ) : null}
              </div>
              <time>
                <strong>{formatVenueTime(milestone.startsAt, milestone.timezone, dateLocale)}</strong>
                <span>
                  {milestone.endsAt
                    ? `${t('common.closes')} · ${formatVenueTime(milestone.endsAt, milestone.timezone, dateLocale)}`
                    : `${t('common.venueTime')} · ${milestone.timezone}`}
                </span>
              </time>
              <button className="lifecycle-action" type="button" onClick={() => toggle(milestone.id)}>
                {complete ? t('common.completed') : t('common.markCompleted')}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
