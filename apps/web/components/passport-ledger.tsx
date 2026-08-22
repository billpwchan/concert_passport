'use client';

import { useState } from 'react';
import type { PassportEntryRecord } from '@/db/passport';
import type { MarketCode } from '@/lib/domain/types';
import { BrandMark } from './brand-mark';
import { usePreferences } from './preferences-provider';

const markets: MarketCode[] = ['SG', 'HK', 'TW', 'TH', 'KR', 'MY', 'PH', 'ID', 'VN', 'JP', 'AU'];

export function PassportLedger({
  entries,
  displayName,
}: {
  entries: PassportEntryRecord[];
  displayName?: string;
}) {
  const { dateLocale, t } = usePreferences();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const distance = entries.reduce((total, entry) => total + entry.travelDistanceKm, 0);
  const artists = new Set(entries.map((entry) => entry.artist.toLocaleLowerCase('en-US'))).size;
  const cities = new Set(entries.map((entry) => `${entry.city}:${entry.market}`)).size;
  const years = entries.map((entry) => new Date(entry.attendedAt).getFullYear());

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const data = new FormData(event.currentTarget);
    const response = await fetch('/api/v1/passport', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        artist: data.get('artist'),
        eventName: data.get('eventName'),
        attendedAt: `${data.get('attendedAt')}T12:00:00Z`,
        venue: data.get('venue'),
        city: data.get('city'),
        market: data.get('market'),
        travelDistanceKm: Number(data.get('travelDistanceKm') ?? 0),
      }),
    });
    if (response.ok) window.location.reload();
    else {
      setMessage(t('passport.saveError'));
      setBusy(false);
    }
  }

  return (
    <div className="page-body passport-page">
      <section className="passport-record">
        <div className="passport-document-head">
          <BrandMark className="passport-record-mark" />
          <div><span>{t('passport.document')}</span><strong>CP · {String(entries.length).padStart(6, '0')}</strong></div>
          <div><span>{t('passport.issuedTo')}</span><strong>{displayName ?? t('passport.privateOwner')}</strong></div>
          <div><span>{t('passport.recordType')}</span><strong>{t('passport.privateRecord')}</strong></div>
        </div>

        <dl className="passport-stats">
          <div><dt>{t('common.shows')}</dt><dd>{entries.length}</dd></div>
          <div><dt>{t('common.artists')}</dt><dd>{artists}</dd></div>
          <div><dt>{t('common.cities')}</dt><dd>{cities}</dd></div>
          <div><dt>{t('common.distance')}</dt><dd>{distance.toLocaleString(dateLocale)} <small>{t('common.km')}</small></dd></div>
          <div><dt>{t('passport.firstStamp')}</dt><dd>{years.length ? Math.min(...years) : '—'}</dd></div>
          <div><dt>{t('passport.latestStamp')}</dt><dd>{years.length ? Math.max(...years) : '—'}</dd></div>
        </dl>
      </section>

      <div className="passport-layout">
        <section className="stamp-ledger">
          <div className="section-heading">
            <div><span>{t('passport.selectedStamps', { count: entries.length })}</span><h2>{t('passport.firstSeen')}</h2></div>
          </div>
          {entries.length ? (
            <div className="stamp-list">
              {entries.map((entry, index) => (
                <article className="stamp-row" key={entry.id}>
                  <span className="stamp-index">{String(index + 1).padStart(2, '0')}</span>
                  <span className="stamp-seal" style={{ '--stamp-color': entry.accent } as React.CSSProperties} aria-hidden="true"><i>{entry.market}</i></span>
                  <span className="stamp-artist"><strong>{entry.artist}</strong><small>{entry.eventName ?? entry.venue ?? '—'}</small></span>
                  <span className="stamp-city"><strong>{entry.city}</strong><small>{entry.market}</small></span>
                  <time>{new Intl.DateTimeFormat(dateLocale, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(entry.attendedAt))}</time>
                  <span className="stamp-distance">{entry.travelDistanceKm.toLocaleString(dateLocale)} {t('common.km')}</span>
                </article>
              ))}
            </div>
          ) : (
            <div className="passport-empty">
              <h3>{t('passport.emptyTitle')}</h3>
              <p>{t('passport.emptyDescription')}</p>
            </div>
          )}
        </section>

        <aside className="passport-entry-panel">
          <span className="section-label">{t('passport.addEyebrow')}</span>
          <h2>{t('passport.addTitle')}</h2>
          <p>{t('passport.addDescription')}</p>
          <form onSubmit={submit}>
            <label><span>{t('passport.artist')}</span><input name="artist" required minLength={2} maxLength={100} /></label>
            <label><span>{t('passport.eventName')}</span><input name="eventName" maxLength={160} /></label>
            <label><span>{t('passport.date')}</span><input name="attendedAt" type="date" max={new Date().toISOString().slice(0, 10)} required /></label>
            <div className="passport-form-row">
              <label><span>{t('passport.city')}</span><input name="city" required minLength={2} maxLength={100} /></label>
              <label><span>{t('passport.market')}</span><select name="market" defaultValue="SG">{markets.map((market) => <option value={market} key={market}>{market}</option>)}</select></label>
            </div>
            <label><span>{t('passport.venue')}</span><input name="venue" maxLength={120} /></label>
            <label><span>{t('passport.distanceInput')}</span><input name="travelDistanceKm" type="number" min="0" max="100000" step="1" defaultValue="0" /></label>
            <button className="button-primary" type="submit" disabled={busy}>{t(busy ? 'passport.savingEntry' : 'passport.saveEntry')}</button>
            <small className="form-message" role="status">{message}</small>
          </form>
        </aside>
      </div>
    </div>
  );
}
