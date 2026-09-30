'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { CanonicalEventRecord } from '@/db/events';
import { eventLifecycleMessageKeys } from '@/lib/domain/event-status';
import type { EditorialShow } from '@/lib/editorial/spotlights';
import { usePreferences } from './preferences-provider';
import styles from './editorial-show-overview.module.css';

export function EditorialShowOverview({
  show,
  performances,
  initialSavedIds,
}: {
  show: EditorialShow;
  performances: CanonicalEventRecord[];
  initialSavedIds: string[];
}) {
  const { dateLocale, t } = usePreferences();
  const [savedIds, setSavedIds] = useState(() => new Set(initialSavedIds));
  const [pendingId, setPendingId] = useState<string>();
  const dateFormatter = new Intl.DateTimeFormat(dateLocale, {
    dateStyle: 'full', timeZone: show.timezone,
  });
  const localDate = show.endsAt
    ? dateFormatter.formatRange(new Date(show.startsAt), new Date(show.endsAt))
    : new Intl.DateTimeFormat(dateLocale, {
      dateStyle: 'full', timeStyle: 'short', timeZone: show.timezone,
    }).format(new Date(show.startsAt));

  async function togglePerformance(eventId: string) {
    if (pendingId) return;
    const saved = savedIds.has(eventId);
    setPendingId(eventId);
    try {
      const response = await fetch('/api/v1/plans', {
        method: saved ? 'DELETE' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });
      if (!response.ok) return;
      setSavedIds((current) => {
        const next = new Set(current);
        if (saved) next.delete(eventId); else next.add(eventId);
        return next;
      });
    } finally {
      setPendingId(undefined);
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.image} style={{ backgroundImage: `url("${show.image}")` }} role="img" aria-label={`${show.artist} ${show.tour}`} />
        <div className={styles.copy} data-long-artist={show.artist.length > 9 ? 'true' : undefined}>
          <Link href="/atlas">← {t('event.back')}</Link>
          <span>{show.market} · {show.city.toUpperCase()}</span>
          <h1>{show.artist}</h1>
          <p>{show.tour}</p>
          <div className={styles.actions}>
            {performances.length === 1 ? (
              <button type="button" disabled={Boolean(pendingId)} onClick={() => void togglePerformance(performances[0].id)}>
                {t(savedIds.has(performances[0].id) ? 'saved.remove' : 'event.save')}
              </button>
            ) : null}
            <a href={show.href} target="_blank" rel="noreferrer">{t('event.openOfficial')} ↗</a>
          </div>
        </div>
      </section>

      <section className={styles.facts}>
        <dl>
          <div><dt>{t('event.date')}</dt><dd>{localDate}</dd></div>
          <div><dt>{t('event.city')}</dt><dd>{show.city}</dd></div>
          <div><dt>{t('event.venue')}</dt><dd>{show.venue}</dd></div>
          <div><dt>{t('event.source')}</dt><dd>{show.sourceName}</dd></div>
        </dl>
        <div className={styles.next}>
          <span>{t('event.source')}</span>
          <h2>{t('event.officialReady')}</h2>
          <p>{t('event.officialDescription')}</p>
          <a href={show.href} target="_blank" rel="noreferrer">{t('event.openOfficial')} ↗</a>
        </div>
      </section>

      <section className={styles.performances}>
        <header><span>{t('event.performances')}</span><strong>{String(performances.length).padStart(2, '0')}</strong></header>
        {performances.length ? performances.map((performance) => {
          const saved = savedIds.has(performance.id);
          const date = new Intl.DateTimeFormat(dateLocale, {
            dateStyle: 'full', timeStyle: 'short', timeZone: performance.timezone ?? show.timezone,
          }).format(new Date(performance.startsAt));
          return (
            <article key={performance.id}>
              <Link href={`/events/${encodeURIComponent(performance.id)}`}>
                <time>{date}</time>
                <span>{performance.venue ?? show.venue} · {t(eventLifecycleMessageKeys[performance.lifecycleStatus ?? 'scheduled'])}</span>
              </Link>
              <button type="button" disabled={Boolean(pendingId)} onClick={() => void togglePerformance(performance.id)}>
                {t(saved ? 'saved.remove' : 'event.save')}
              </button>
            </article>
          );
        }) : <p className={styles.performancePending}>{t('event.performancePending')}</p>}
      </section>
    </div>
  );
}
