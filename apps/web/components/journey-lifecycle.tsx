'use client';

import { useState } from 'react';
import type { ConcertJourney } from '@/lib/domain/types';
import { formatVenueTime } from '@/lib/domain/lifecycle';

export function JourneyLifecycle({ journey }: { journey: ConcertJourney }) {
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
    setMessage('Saving…');
    const response = await fetch(`/api/v1/plans/${journey.id}/milestones/${milestoneId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ state: completed ? 'completed' : 'todo' }),
    });
    setMessage(response.ok ? 'Journey updated' : 'Preview updated · sign in to save');
  }

  return (
    <section className="lifecycle-panel">
      <div className="panel-heading">
        <div><p className="eyebrow">TICKET LIFECYCLE</p><h2>Every step, in order</h2></div>
        <span>{message}</span>
      </div>
      <div className="lifecycle-list">
        {journey.milestones.map((milestone, index) => {
          const complete = completedIds.has(milestone.id);
          return (
            <article className={`lifecycle-item ${complete ? 'completed' : milestone.state}`} key={milestone.id}>
              <div className="lifecycle-index">
                <span>{String(index + 1).padStart(2, '0')}</span><i />
              </div>
              <div className="lifecycle-copy">
                <span>{milestone.type.replaceAll('_', ' ').toUpperCase()}</span>
                <h3>{milestone.title}</h3>
                <p>{milestone.description}</p>
                {milestone.requires?.length ? <small>Requires {milestone.requires.length} completed prerequisite</small> : null}
              </div>
              <time>
                <strong>{formatVenueTime(milestone.startsAt, milestone.timezone)}</strong>
                <span>{milestone.endsAt ? `Closes ${formatVenueTime(milestone.endsAt, milestone.timezone)}` : milestone.timezone}</span>
              </time>
              <button type="button" onClick={() => toggle(milestone.id)}>
                {complete ? 'Completed ✓' : 'Mark complete'}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
