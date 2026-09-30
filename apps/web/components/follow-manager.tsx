'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePreferences } from './preferences-provider';

type Follow = {artist: string; market: string};
export function FollowManager() {
  const { t } = usePreferences();
  const [follows, setFollows] = useState<Follow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/v1/follows', { signal: controller.signal }).then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => setFollows(data.follows)).catch(() => { if (!controller.signal.aborted) setMessage(t('journal.error')); });
    return () => controller.abort();
  }, [t]);
  async function change(follow: Follow, remove = false) {
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/v1/follows', { method: remove ? 'DELETE' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(follow) });
      if (!response.ok) throw new Error();
      setFollows(current => remove ? current.filter(f => !(f.artist === follow.artist && f.market === follow.market)) : [follow, ...current.filter(f => !(f.artist.toLowerCase() === follow.artist.toLowerCase() && f.market === follow.market))]);
    } catch { setMessage(t('journal.error')); } finally { setBusy(false); }
  }
  return <section className="follow-manager"><header><span className="editorial-eyebrow">ON YOUR RADAR</span><h2>{t('journal.follows')}</h2><p>{t('journal.followBody')}</p></header>
    <form onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); void change({ artist: String(data.get('artist')).trim(), market: String(data.get('market')) }); }}>
      <label><span>{t('passport.artist')}</span><input name="artist" required maxLength={100} placeholder="aespa, IU, TWICE…" /></label>
      <label><span>{t('passport.market')}</span><select name="market">{['ALL','SG','HK','TW','JP','KR','TH','MY','PH','ID','VN','AU','NZ'].map(m => <option key={m} value={m}>{m === 'ALL' ? t('journal.allMarkets') : m}</option>)}</select></label>
      <button className="button-primary" disabled={busy}>{t('journal.follow')} ＋</button>
    </form>
    <ul>{follows.map(f => <li key={`${f.artist}:${f.market}`}><Link href={`/atlas?artist=${encodeURIComponent(f.artist)}&market=${f.market}`}>{f.artist} <small>{f.market}</small> ↗</Link><button disabled={busy} onClick={() => void change(f, true)} aria-label={`${t('journal.unfollow')} ${f.artist}`}>×</button></li>)}</ul>
    <p role="status">{message}</p>
  </section>;
}
