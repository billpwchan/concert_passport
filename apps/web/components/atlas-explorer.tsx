'use client';
import Link from 'next/link';
import { eventLocation } from '@/lib/domain/event-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CanonicalEventRecord, SavedEventRecord } from '@/db/events';
import type { DiscoveredEvent, MarketCode } from '@/lib/domain/types';
import { deduplicateEvents, matchesDiscovery } from '@/lib/domain/discovery';
import { marketKey } from '@/lib/i18n/domain';
import { formatVenueTime } from '@/lib/domain/lifecycle';
import { hasConfirmedPerformanceTime } from '@/lib/domain/discovery';
import { ConcertMap, type AtlasMapPoint } from './concert-map';
import { EventCard } from './event-card';
import { usePreferences } from './preferences-provider';

const markets: Array<'ALL' | MarketCode> = ['ALL', 'SG', 'HK', 'TW', 'TH', 'KR', 'MY', 'PH', 'ID', 'VN', 'AU', 'JP', 'NZ'];
type Payload = { events: DiscoveredEvent[]; errors: unknown[]; degraded?: boolean; error?: string };
export function AtlasExplorer({ savedEvents, catalogEvents, windowStartsAt, initialArtist = '', initialMarket = 'ALL', initialDates }: {
  savedEvents: SavedEventRecord[]; catalogEvents: CanonicalEventRecord[]; windowStartsAt: string; initialArtist?: string; initialMarket?: string; initialDates?: { days?: string; from?: string; until?: string; weekend?: string };
}) {
  const { t, dateLocale } = usePreferences();
  const [artist, setArtist] = useState(initialArtist);
  const [market, setMarket] = useState(markets.includes(initialMarket as MarketCode) ? initialMarket : 'ALL');
  const [days, setDays] = useState([0, 30, 90, 365].includes(Number(initialDates?.days)) ? Number(initialDates?.days) : 365);
  const [from, setFrom] = useState(/^\d{4}-\d{2}-\d{2}$/.test(initialDates?.from ?? '') ? initialDates!.from! : windowStartsAt.slice(0, 10));
  const [until, setUntil] = useState(/^\d{4}-\d{2}-\d{2}$/.test(initialDates?.until ?? '') ? initialDates!.until! : new Date(Date.parse(windowStartsAt) + 30 * 86400000).toISOString().slice(0, 10));
  const [compared, setCompared] = useState<CanonicalEventRecord[]>([]);
  const [weekend, setWeekend] = useState(initialDates?.weekend === '1');
  const [view, setView] = useState<'list' | 'map'>('list');
  const [live, setLive] = useState<{ key: string; events: CanonicalEventRecord[]; degraded: boolean }>();
  const [searchKey, setSearchKey] = useState<string>();
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string>();
  const [savedIds, setSavedIds] = useState(new Set(savedEvents.map((event) => event.id)));
  const [follows, setFollows] = useState<Array<{ artist: string; market: string }>>([]);
  const [following, setFollowing] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const requestVersion = useRef(0);
  const queryKey = `${artist.trim().toLowerCase()}|${market}|${days}|${from}|${until}`;
  const searching = searchKey === queryKey;
  const setSearching = (value: boolean) => setSearchKey(value ? queryKey : undefined);
  const currentKey = useRef(queryKey);
  useEffect(() => { currentKey.current = queryKey; requestVersion.current++; controller.current?.abort(); }, [queryKey]);
  useEffect(() => { const ac = new AbortController(); void fetch('/api/v1/follows', { signal: ac.signal }).then((r) => r.json()).then((p) => setFollows(p.follows ?? [])).catch(() => {}); return () => { ac.abort(); controller.current?.abort(); }; }, []);
  useEffect(() => {
    const params = new URLSearchParams();
    if (artist.trim()) params.set('artist', artist.trim());
    if (market !== 'ALL') params.set('market', market);
    if (days !== 365) params.set('days', String(days));
    if (days === 0) { params.set('from', from); params.set('until', until); }
    if (weekend) params.set('weekend', '1');
    window.history.replaceState(null, '', `/atlas${params.size ? `?${params}` : ''}`);
  }, [artist, market, days, from, until, weekend]);
  const followed = follows.some((item) => item.artist.toLowerCase() === artist.trim().toLowerCase() && item.market === market);
  const validDates = days !== 0 || (Boolean(from && until) && until >= from && Date.parse(until) - Date.parse(from) <= 365 * 86400000);
  const activeLive = live?.key === queryKey ? live : undefined;
  const visible = useMemo(() => {
    const start = days === 0 ? new Date(Date.parse(`${from}T00:00:00Z`) - 14 * 3600000) : new Date(windowStartsAt);
    const end = days === 0 ? new Date(Date.parse(`${until}T23:59:59Z`) + 12 * 3600000) : new Date(start.getTime() + days * 86400000);
    if (!validDates) return [];
    const pool = activeLive?.events ?? deduplicateEvents([...savedEvents, ...catalogEvents]);
    return pool.filter((event) => matchesDiscovery(event, { artist: artist.trim() || undefined,
      countryCode: market === 'ALL' ? undefined : market, startDateTime: start.toISOString(), endDateTime: end.toISOString() }))
      .filter((event) => !event.publicationQuarantined && !['cancelled', 'deleted'].includes(event.lifecycleStatus ?? ''))
      .filter((event) => days !== 0 || (() => { const localDay = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: event.timezone ?? 'UTC' }).format(new Date(event.startsAt)); return localDay >= from && localDay <= until; })())
      .filter((event) => !weekend || ['Sat', 'Sun'].includes(new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: event.timezone ?? 'UTC' }).format(new Date(event.startsAt))));
  }, [activeLive, artist, catalogEvents, days, market, savedEvents, weekend, windowStartsAt, from, until, validDates]);
  const located = useMemo(() => visible.flatMap(event => { const location = eventLocation(event); return location ? [{event, location}] : []; }), [visible]);
  const mapPoints = useMemo<AtlasMapPoint[]>(() => {
    const points = new Map<string, AtlasMapPoint & {count:number}>();
    for (const {event, location} of located) {
      const key = location.precision === 'city' ? `${location.latitude}:${location.longitude}` : event.id;
      const previous = points.get(key);
      if (previous) { previous.count++; previous.artist = `${previous.city} · ${previous.count}`; }
      else points.set(key, {id:event.id,...location,city:event.city ?? '',artist:event.artist ?? event.name,accent:location.precision === 'city' ? '#a36b4e' : '#506548',approximate:location.precision === 'city',count:1});
    }
    return [...points.values()];
  }, [located]);
  const selectOnMap = useCallback((id: string) => { setSelectedId(id); document.getElementById(`show-${id}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); document.getElementById(`show-${id}`)?.focus({ preventScroll: true }); }, []);

  async function search() {
    if (!validDates) { setError(t('explore.dateError')); return; }
    if (!artist.trim() && market === 'ALL') { setError(t('atlas.artistRequired')); return; }
    controller.current?.abort();
    const ac = new AbortController(); controller.current = ac;
    const version = ++requestVersion.current; const key = queryKey;
    setSearching(true); setError('');
    const start = days === 0 ? new Date(Date.parse(`${from}T00:00:00Z`) - 14 * 3600000).toISOString() : `${windowStartsAt.slice(0, 10)}T00:00:00Z`;
    const params = new URLSearchParams({ artist: artist.trim(), startDateTime: start, endDateTime: days === 0 ? new Date(Date.parse(`${until}T23:59:59Z`) + 12 * 3600000).toISOString() : new Date(Date.parse(start) + days * 86400000).toISOString() });
    if (market !== 'ALL') params.set('countryCode', market);
    try {
      const response = await fetch(`/api/v1/discover?${params}`, { signal: ac.signal });
      const payload = await response.json() as Payload;
      if (!response.ok) throw new Error(payload.error ?? t('atlas.searchFailed'));
      if (version !== requestVersion.current || key !== currentKey.current) return;
      setLive({ key, events: payload.events.filter((event) => Boolean(event.canonicalId)).map((event) => ({ ...event, id: event.canonicalId! })), degraded: Boolean(payload.degraded || payload.errors?.length) });
    } catch (err) {
      if (!ac.signal.aborted && version === requestVersion.current) setError(err instanceof Error ? err.message : t('atlas.searchFailed'));
    } finally { if (version === requestVersion.current) setSearching(false); }
  }
  async function follow() {
    if (!artist.trim() || following || followed) return;
    const target = { artist: artist.trim(), market }; setFollowing(true); setError('');
    try {
      const response = await fetch('/api/v1/follows', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(target) });
      if (!response.ok) throw new Error();
      setFollows((items) => [...items, target]);
    } catch { setError(t('explore.actionFailed')); } finally { setFollowing(false); }
  }
  return <div className="page-body discovery-explorer">
    <form className="explore-search" onSubmit={(event) => { event.preventDefault(); void search(); }}>
      <label className="explore-artist"><span>{t('atlas.searchLabel')}</span><input value={artist} onChange={(event) => setArtist(event.target.value)} placeholder={t('explore.searchHint')} maxLength={80} /></label>
      <label><span>{t('atlas.marketLabel')}</span><select value={market} onChange={(event) => setMarket(event.target.value)}>{markets.map((item) => <option value={item} key={item}>{t(marketKey(item))}</option>)}</select></label>
      <label><span>{t('explore.dateRange')}</span><select value={days} onChange={(event) => setDays(Number(event.target.value))}><option value={365}>{t('explore.anyDate')}</option><option value={30}>{t('explore.month')}</option><option value={90}>{t('explore.quarter')}</option><option value={0}>{t('explore.customDates')}</option></select></label>
      <button className="button-primary" type="submit" disabled={searching}>{t(searching ? 'atlas.searching' : 'explore.refresh')} ↗</button>
    </form>
    {days === 0 ? <div className="custom-dates"><label>{t('explore.from')}<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label>{t('explore.to')}<input type="date" min={from} value={until} onChange={(event) => setUntil(event.target.value)} /></label>{!validDates ? <p role="alert">{t('explore.dateError')}</p> : null}</div> : null}
    <div className="explore-chips">{(['ALL', 'SG', 'KR', 'JP', 'TW', 'TH', 'HK'] as const).map((item) => <button key={item} type="button" aria-pressed={market === item} onClick={() => setMarket(item)}>{t(marketKey(item))}</button>)}<label><input type="checkbox" checked={weekend} onChange={(event) => setWeekend(event.target.checked)} />{t('explore.weekend')}</label></div>
    <div className="explore-feedback" aria-live="polite">{error ? <p role="alert">{error}</p> : null}{activeLive?.degraded ? <p>{t('explore.degraded')}</p> : null}</div>
    <div className="explore-toolbar"><div><span className="editorial-eyebrow">K-POP / ASIA PACIFIC</span><h2>{t('explore.results', { count: visible.length })}</h2></div>
      <div className="view-switch" aria-label={t('atlas.title')}><button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>▦ {t('explore.list')}</button><button type="button" aria-pressed={view === 'map'} onClick={() => setView('map')}>◎ {t('explore.map')}</button></div>
    </div>
    {artist.trim().length >= 1 ? <div className="follow-search"><div><strong>{artist.trim()}</strong><p>{t('explore.followNote')}</p></div><button className="button-secondary" type="button" disabled={followed || following} onClick={() => void follow()}>{t(followed ? 'atlas.following' : 'atlas.followArtist')} {followed ? '✓' : '+'}</button></div> : null}
    {compared.length ? <section className="compare-panel" aria-label={t('explore.compareTitle')}><header><div><h3>{t('explore.compareTitle')}</h3><p>{t('explore.compareHint')}</p></div><button className="button-quiet" type="button" onClick={() => setCompared([])}>{t('explore.clearCompare')} ×</button></header><div className="compare-columns">{compared.map((event) => <div key={event.id}><strong>{event.artist ?? event.name}</strong><span>{event.city ?? event.countryCode}</span><time>{hasConfirmedPerformanceTime(event) ? formatVenueTime(event.startsAt, event.timezone ?? 'UTC', dateLocale, true) : event.startsAt.slice(0, 10)}</time><small>{event.venue ?? t('plans.venuePending')}</small><Link className="text-link" href={`/events/${encodeURIComponent(event.id)}`}>{t('explore.details')} →</Link></div>)}</div></section> : null}
    <div className={`explore-layout ${view === 'map' ? 'with-map' : ''}`} aria-busy={searching}>
      {view === 'map' ? <section className="explore-map"><ConcertMap points={mapPoints} selectedId={selectedId} onSelect={selectOnMap} />{located.some(row => row.location.precision === 'city') && <p>{t('journal.cityApprox')} <a href="https://www.wikidata.org/wiki/Wikidata:Main_Page" target="_blank" rel="noreferrer">Wikidata ↗</a></p>}{located.length < visible.length ? <p>{t('explore.mapMissing', { count: visible.length - located.length })}</p> : null}</section> : null}
      <div className="show-grid">{visible.map((event) => <EventCard key={event.id} event={event} saved={savedIds.has(event.id)} selected={selectedId === event.id} comparing={compared.some((item) => item.id === event.id)} onCompare={() => setCompared((items) => items.some((item) => item.id === event.id) ? items.filter((item) => item.id !== event.id) : items.length < 3 ? [...items, event] : items)} onSelect={() => setSelectedId(event.id)} onSave={(saved) => setSavedIds((ids) => { const next = new Set(ids); if (saved) next.add(event.id); else next.delete(event.id); return next; })} />)}</div>
    </div>
    {!visible.length ? <div className="discovery-empty"><span className="empty-orbit" aria-hidden="true">↗</span><h3>{t('explore.emptyTitle')}</h3><p>{t('explore.emptyBody')}</p><button className="button-secondary" type="button" onClick={() => { setArtist(''); setMarket('ALL'); setDays(365); setWeekend(false); setLive(undefined); }}>{t('explore.reset')}</button></div> : null}
    <p className="coverage-note">{t('explore.catalogNote')} <Link href="/sources">{t('explore.coverage')}</Link></p>
  </div>;
}
