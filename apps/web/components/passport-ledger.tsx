'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { PassportEntryRecord } from '@/db/passport';
import type { MarketCode } from '@/lib/domain/types';
import { usePreferences } from './preferences-provider';
import styles from './passport-ledger.module.css';

const markets: MarketCode[] = ['SG', 'HK', 'TW', 'TH', 'KR', 'MY', 'PH', 'ID', 'VN', 'JP', 'AU', 'NZ'];

export function PassportLedger({ entries, displayName }: { entries: PassportEntryRecord[]; displayName?: string }) {
  const { dateLocale, t } = usePreferences();
  const router = useRouter();
  const reduced = useReducedMotion();
  const [editing, setEditing] = useState<PassportEntryRecord | null>(null);
  const [removed, setRemoved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const distance = entries.reduce((total, entry) => total + entry.travelDistanceKm, 0);
  const artists = new Set(entries.map((entry) => entry.artist.toLocaleLowerCase('en-US'))).size;
  const cities = new Set(entries.map((entry) => `${entry.city}:${entry.market}`)).size;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const data = new FormData(event.currentTarget);
    const form = event.currentTarget;
    try {
      const response = await fetch('/api/v1/passport', {
        method: editing ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: editing?.id, artist: data.get('artist'), eventName: data.get('eventName'),
          attendedAt: data.get('attendedAt'), venue: data.get('venue'), city: data.get('city'), market: data.get('market'),
          travelDistanceKm: Number(data.get('travelDistanceKm') ?? 0) }),
      });
      if (!response.ok) throw new Error();
      form.reset(); setEditing(null); setMessage(t('journal.saved')); router.refresh();
    } catch { setMessage(t('journal.error')); }
    finally { setBusy(false); }
  }
  async function remove(id: string, restore = false) {
    setBusy(true);
    try {
      const response = await fetch('/api/v1/passport', { method: restore ? 'PATCH' : 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, restore }) });
      if (!response.ok) throw new Error();
      setRemoved(restore ? null : id); if (editing?.id === id) setEditing(null); router.refresh();
    } catch { setMessage(t('journal.error')); }
    finally { setBusy(false); }
  }

  return (
    <div className={styles.passport}>
      <section className={styles.hero}>
        <span className={styles.eyebrow}>{t('passport.heroEyebrow')}</span>
        <motion.h1 initial={reduced ? false : { opacity: 0, y: 35 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .85, ease: [0.16, 1, 0.3, 1] }}>
          {t('passport.heroTitle')}
        </motion.h1>
        <p className={styles.owner}>{t('passport.ownerSummary', { owner: displayName ?? t('passport.ownerDefault'), count: entries.length })}</p>

        <dl className={styles.stats}>
          <div><dt>{t('passport.statsShows')}</dt><dd>{entries.length}</dd></div>
          <div><dt>{t('passport.statsArtists')}</dt><dd>{artists}</dd></div>
          <div><dt>{t('passport.statsCities')}</dt><dd>{cities}</dd></div>
          <div><dt>{t('passport.statsDistance')}</dt><dd>{distance.toLocaleString(dateLocale)} <small>{t('common.km')}</small></dd></div>
        </dl>
      </section>

      <section className={styles.archive}>
        <div className={styles.tools}><p>{t('journal.privacy')}</p><a href="/api/v1/passport?download=1" download title={t('journal.exportNote')}>{t('journal.export')} ↓</a></div>
        {removed && <div className={styles.undo} role="status"><button type="button" disabled={busy} onClick={() => void remove(removed, true)}>{t('journal.undo')} ↶</button></div>}
        <header className={styles.archiveHead}>
          <div><span>{t('passport.archiveEyebrow')}</span><h2>{t('passport.archiveTitle')}</h2></div>
          <Link href="/atlas">{t('passport.findNext')} ↗</Link>
        </header>

        {entries.length ? (
          <div className={styles.stampGrid}>
            {entries.map((entry, index) => (
              <motion.article className={styles.stampCard} style={{ '--stamp': entry.accent } as React.CSSProperties} initial={reduced ? false : { opacity: 0, y: 36 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .18 }} transition={{ delay: Math.min(index * .07, .25), duration: .65, ease: [0.16, 1, 0.3, 1] }} key={entry.id}>
                <div className={styles.stampTop}><span>CP—{entry.market}</span><span>{String(index + 1).padStart(2, '0')}</span></div>
                <div className={styles.cardActions}><a href="#passport-entry" onClick={() => { setEditing(entry); setMessage(''); }}>{t('journal.edit')}</a><button type="button" disabled={busy} onClick={() => void remove(entry.id)}>{t('journal.remove')}</button></div>
                <div className={styles.stampSeal}>{entry.market}</div>
                <strong className={styles.stampArtist}>{entry.artist}</strong>
                <span className={styles.stampEvent}>{entry.eventName ?? entry.venue ?? entry.city}</span>
                <footer className={styles.stampFoot}>
                  <span>{entry.city.toUpperCase()}</span>
                  <time>{new Intl.DateTimeFormat(dateLocale, { day: '2-digit', month: 'short', year: 'numeric', timeZone: entry.timezone || 'UTC' }).format(new Date(entry.attendedAt)).toUpperCase()}</time>
                </footer>
              </motion.article>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <div className={styles.emptyCopy}>
              <span>{t('passport.emptyEyebrow')}</span>
              <h3>{t('passport.emptyShortTitle')}</h3>
              <p>{t('passport.emptyShortDescription')}</p>
            </div>
            <div className={styles.emptyVisual} aria-hidden="true">
              <div className={styles.blankStamp}><span><i>CONCERT PASSPORT</i><i>CP—001</i></span><strong>01</strong><small>YOUR FIRST SHOW</small></div>
            </div>
          </div>
        )}
      </section>

      <section className={styles.entry} id="passport-entry">
        <div className={styles.entryIntro}>
          <span>{t('passport.addNightEyebrow')}</span>
          <h2>{t('passport.addShortTitle')}</h2>
          <p>{t('passport.addShortDescription')}</p>
        </div>
        <form onSubmit={submit} key={editing?.id ?? 'new'}>
          <label><span>{t('passport.artist')}</span><input name="artist" defaultValue={editing?.artist ?? ''} required minLength={2} maxLength={100} /></label>
          <label><span>{t('passport.eventName')}</span><input name="eventName" defaultValue={editing?.eventName ?? ''} maxLength={160} /></label>
          <label><span>{t('passport.date')}</span><input name="attendedAt" defaultValue={editing?.attendedAt.slice(0, 10)} type="date" max={new Date().toISOString().slice(0, 10)} required /></label>
          <label><span>{t('passport.city')}</span><input name="city" defaultValue={editing?.city ?? ''} required minLength={2} maxLength={100} /></label>
          <label><span>{t('passport.market')}</span><select name="market" defaultValue={editing?.market ?? 'SG'}>{markets.map((market) => <option value={market} key={market}>{t(`market.${market}`)}</option>)}</select></label>
          <label><span>{t('passport.venue')}</span><input name="venue" defaultValue={editing?.venue ?? ''} maxLength={120} /></label>
          <label className={styles.full}><span>{t('passport.distanceInput')}</span><input name="travelDistanceKm" type="number" min="0" max="100000" step="1" defaultValue={editing?.travelDistanceKm ?? 0} /></label>
          <button type="submit" disabled={busy}>{t(busy ? 'passport.savingEntry' : editing ? 'journal.apply' : 'passport.saveEntry')}</button>
          {editing && <button type="button" onClick={() => setEditing(null)}>{t('journal.cancel')}</button>}
          <small className={styles.message} role="status">{message}</small>
        </form>
      </section>
    </div>
  );
}
