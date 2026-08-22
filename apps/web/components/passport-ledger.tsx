'use client';

import type { Attendance } from '@/lib/domain/types';
import { sumDistanceKm } from '@/lib/domain/lifecycle';
import { cityKey } from '@/lib/i18n/domain';
import { usePreferences } from './preferences-provider';

export function PassportLedger({ attendances }: { attendances: Attendance[] }) {
  const { dateLocale, t } = usePreferences();
  const distance = sumDistanceKm(attendances);
  const showCount = 18;
  const artists = new Set(attendances.map((item) => item.artist.id)).size;
  const cities = new Set(attendances.map((item) => item.city)).size;
  const years = attendances.map((item) => new Date(item.attendedAt).getFullYear());
  const firstRiize = attendances.find((item) => item.artist.name === 'RIIZE');

  return (
    <div className="page-body passport-page">
      <section className="passport-record">
        <div className="passport-document-head">
          <span className="passport-mark" aria-hidden="true"><i /></span>
          <div><span>{t('passport.document')}</span><strong>CP · 000018</strong></div>
          <div><span>{t('passport.issuedTo')}</span><strong>BILL</strong></div>
          <div><span>{t('passport.home')}</span><strong>SIN · SG</strong></div>
        </div>

        <dl className="passport-stats">
          <div><dt>{t('common.shows')}</dt><dd>{showCount}</dd></div>
          <div><dt>{t('common.artists')}</dt><dd>{artists}</dd></div>
          <div><dt>{t('common.cities')}</dt><dd>{cities}</dd></div>
          <div><dt>{t('common.distance')}</dt><dd>{distance.toLocaleString(dateLocale)} <small>{t('common.km')}</small></dd></div>
          <div><dt>{t('passport.firstStamp')}</dt><dd>{Math.min(...years)}</dd></div>
          <div><dt>{t('passport.latestStamp')}</dt><dd>{Math.max(...years)}</dd></div>
        </dl>
      </section>

      <div className="passport-layout">
        <section className="stamp-ledger">
          <div className="section-heading">
            <div><span>{t('passport.selectedStamps', { count: attendances.length })}</span><h2>{t('passport.firstSeen')}</h2></div>
          </div>
          <div className="stamp-list">
            {attendances.map((attendance, index) => {
              const translatedCity = cityKey(attendance.city);
              return (
                <article className="stamp-row" key={attendance.id}>
                  <span className="stamp-index">{String(index + 1).padStart(2, '0')}</span>
                  <span className="stamp-seal" style={{ '--stamp-color': attendance.accent } as React.CSSProperties} aria-hidden="true">
                    <i>{attendance.market}</i>
                  </span>
                  <span className="stamp-artist"><strong>{attendance.artist.name}</strong><small>{attendance.venue}</small></span>
                  <span className="stamp-city"><strong>{translatedCity ? t(translatedCity) : attendance.city}</strong><small>{attendance.market}</small></span>
                  <time>{new Intl.DateTimeFormat(dateLocale, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(attendance.attendedAt))}</time>
                  <span className="stamp-distance">{attendance.travelDistanceKm.toLocaleString(dateLocale)} {t('common.km')}</span>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="artist-memory">
          <span className="section-label">{t('passport.artistTimeline')}</span>
          <h2>{t('passport.firstRiize')}</h2>
          {firstRiize ? (
            <>
              <time>{new Intl.DateTimeFormat(dateLocale, { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(firstRiize.attendedAt))}</time>
              <strong>{firstRiize.travelDistanceKm.toLocaleString(dateLocale)} <small>{t('common.km')}</small></strong>
              <p>{t('passport.travelledForMemory')}</p>
            </>
          ) : null}
          <div className="memory-route" aria-hidden="true"><span>SIN</span><i /><span>{firstRiize?.market ?? '—'}</span></div>
          <small>{t('passport.distanceNote')}</small>
        </aside>
      </div>
    </div>
  );
}
