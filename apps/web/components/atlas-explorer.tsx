'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import type { CanonicalEventRecord, SavedEventRecord } from '@/db/events';
import type { DiscoveredEvent, MarketCode } from '@/lib/domain/types';
import { formatTravelDateRange, formatVenueTime } from '@/lib/domain/lifecycle';
import { eventLinkMessageKey, primaryEventHref } from '@/lib/domain/event-link';
import { cityKey, marketKey } from '@/lib/i18n/domain';
import { ConcertMap, type AtlasMapPoint } from './concert-map';
import { usePreferences } from './preferences-provider';

const MARKET_OPTIONS: Array<'ALL' | MarketCode> = [
  'ALL', 'SG', 'HK', 'TW', 'TH', 'KR', 'MY', 'PH', 'ID', 'VN', 'AU', 'JP',
];

type DiscoveryPayload = {
  events: DiscoveredEvent[];
  errors: Array<{ provider: string; message: string }>;
  artistMedia?: {
    artistName: string;
    imagePath: string;
    width: number;
    height: number;
    attribution?: string;
    sourceUrl: string;
    updatedAt: string;
  };
};

type AtlasResult = {
  id: string;
  canonicalId?: string;
  saved?: boolean;
  href: string;
  external: boolean;
  artist: string;
  subtitle: string;
  city: string;
  market: string;
  startsAt: string;
  timezone?: string;
  stage: string;
  provider: string;
  accent: string;
  latitude?: number;
  longitude?: number;
  imagePath?: string;
};

export function AtlasExplorer({
  savedEvents,
  catalogEvents,
  windowStartsAt,
}: {
  savedEvents: SavedEventRecord[];
  catalogEvents: CanonicalEventRecord[];
  windowStartsAt: string;
}) {
  const { dateLocale, t } = usePreferences();
  const [market, setMarket] = useState<'ALL' | MarketCode>('ALL');
  const [artist, setArtist] = useState('');
  const [liveEvents, setLiveEvents] = useState<DiscoveredEvent[]>([]);
  const [artistMedia, setArtistMedia] = useState<DiscoveryPayload['artistMedia']>();
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [selectedId, setSelectedId] = useState<string>();
  const [savedIds, setSavedIds] = useState(() => new Set(savedEvents.map((event) => event.id)));
  const [followed, setFollowed] = useState(false);

  const travelWindow = useMemo(() => {
    const start = new Date(windowStartsAt);
    const end = new Date(start.getTime() + 365 * 86_400_000);
    return {
      start: start.toISOString(),
      end: end.toISOString(),
      label: formatTravelDateRange(start.toISOString(), end.toISOString(), dateLocale),
    };
  }, [dateLocale, windowStartsAt]);

  const savedResults = useMemo<AtlasResult[]>(
    () => savedEvents
      .filter((event) => market === 'ALL' || event.countryCode === market)
      .map((event) => ({
        id: `saved-${event.id}`,
        ...primaryEventHref(event),
        saved: true,
        artist: event.artist ?? event.name,
        subtitle: event.name,
        city: event.city ?? event.venue ?? event.countryCode ?? '—',
        market: event.countryCode ?? '—',
        startsAt: event.startsAt,
        timezone: event.timezone,
        stage: t('atlas.saved'),
        provider: t(eventLinkMessageKey(event.bestLinkRole)),
        accent: '#4338ca',
        latitude: event.latitude,
        longitude: event.longitude,
        imagePath: event.imageUrl ? `/api/v1/events/${encodeURIComponent(event.id)}/image` : undefined,
      })),
    [market, savedEvents, t],
  );

  const liveResults = useMemo<AtlasResult[]>(
    () => liveEvents.map((event) => ({
      id: `live-${event.provider}-${event.providerEventId}`,
      canonicalId: event.canonicalId,
      ...primaryEventHref(event),
      artist: event.artist ?? (artist.trim() || event.name),
      subtitle: event.name,
      city: event.city ?? event.venue ?? event.countryCode ?? '—',
      market: event.countryCode ?? market,
      startsAt: event.startsAt,
      timezone: event.timezone,
      stage: t('atlas.liveListing'),
      provider: t(eventLinkMessageKey(event.bestLinkRole)),
      accent: event.bestLinkRole ? '#4338ca' : '#18794e',
      latitude: event.latitude,
      longitude: event.longitude,
      imagePath: event.imageUrl && event.canonicalId
        ? `/api/v1/events/${encodeURIComponent(event.canonicalId)}/image`
        : undefined,
    })),
    [artist, liveEvents, market, t],
  );

  const catalogResults = useMemo<AtlasResult[]>(
    () => catalogEvents
      .filter((event) => market === 'ALL' || event.countryCode === market)
      .filter((event) => !savedEvents.some((saved) => saved.id === event.id))
      .map((event) => ({
        id: `catalog-${event.id}`,
        canonicalId: event.id,
        ...primaryEventHref(event),
        artist: event.artist ?? event.name,
        subtitle: event.name,
        city: event.city ?? event.venue ?? event.countryCode ?? '—',
        market: event.countryCode ?? '—',
        startsAt: event.startsAt,
        timezone: event.timezone,
        stage: t('atlas.catalogListing'),
        provider: t(eventLinkMessageKey(event.bestLinkRole)),
        accent: event.bestLinkRole ? '#4338ca' : '#18794e',
        latitude: event.latitude,
        longitude: event.longitude,
        imagePath: event.imageUrl ? `/api/v1/events/${encodeURIComponent(event.id)}/image` : undefined,
      })),
    [catalogEvents, market, savedEvents, t],
  );

  const visible = useMemo(
    () => (searched ? liveResults : [...savedResults, ...catalogResults]),
    [catalogResults, liveResults, savedResults, searched],
  );
  const mapPoints = useMemo<AtlasMapPoint[]>(
    () => visible
      .filter((event) => Number.isFinite(event.latitude) && Number.isFinite(event.longitude))
      .map((event) => ({
        id: event.id,
        latitude: event.latitude!,
        longitude: event.longitude!,
        artist: event.artist,
        city: event.city,
        accent: event.accent,
      })),
    [visible],
  );

  async function searchLive() {
    const term = artist.trim();
    if (term.length < 2) {
      setSearchError(t('atlas.artistRequired'));
      return;
    }
    setSearching(true);
    setSearchError('');
    const params = new URLSearchParams({
      artist: term,
      startDateTime: travelWindow.start,
      endDateTime: travelWindow.end,
    });
    if (market !== 'ALL') params.set('countryCode', market);

    try {
      const response = await fetch(`/api/v1/discover?${params.toString()}`);
      const payload = (await response.json()) as DiscoveryPayload & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? t('atlas.searchFailed'));
      setLiveEvents(payload.events);
      setArtistMedia(payload.artistMedia);
      setSearched(true);
      setSelectedId(payload.events[0] ? `live-${payload.events[0].provider}-${payload.events[0].providerEventId}` : undefined);
      if (payload.errors.length && !payload.events.length) setSearchError(t('atlas.providersUnavailable'));
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : t('atlas.searchFailed'));
    } finally {
      setSearching(false);
    }
  }

  async function saveShow(event: AtlasResult) {
    if (!event.canonicalId || savedIds.has(event.canonicalId)) return;
    const response = await fetch('/api/v1/plans', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ eventId: event.canonicalId }),
    });
    if (response.ok) setSavedIds((current) => new Set(current).add(event.canonicalId!));
  }

  async function followSearch() {
    const term = artist.trim();
    if (term.length < 2) {
      setSearchError(t('atlas.artistRequired'));
      return;
    }
    const response = await fetch('/api/v1/follows', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ artist: term, market }),
    });
    if (response.ok) setFollowed(true);
  }

  const handleMapSelect = useCallback((id: string) => {
    setSelectedId(id);
    window.setTimeout(() => document.getElementById(`atlas-result-${id}`)?.focus({ preventScroll: true }), 0);
  }, []);

  return (
    <div className="page-body atlas-page">
      <section className="filter-bar" aria-label={t('atlas.marketLabel')}>
        <label className="search-field">
          <span>{t('atlas.searchLabel')}</span>
          <input
            value={artist}
            onChange={(event) => { setArtist(event.target.value); setSearched(false); }}
            onKeyDown={(event) => { if (event.key === 'Enter') void searchLive(); }}
            placeholder={t('atlas.searchPlaceholder')}
          />
        </label>
        <label className="select-field">
          <span>{t('atlas.marketLabel')}</span>
          <select value={market} onChange={(event) => { setMarket(event.target.value as typeof market); setSearched(false); }}>
            {MARKET_OPTIONS.map((item) => <option value={item} key={item}>{t(marketKey(item))}</option>)}
          </select>
        </label>
        <div className="date-filter"><span>{t('atlas.travelDates')}</span><strong>{travelWindow.label}</strong></div>
        <div className="search-action-cell">
          <button className="button-primary" type="button" onClick={() => void searchLive()} disabled={searching}>
            {searching ? t('atlas.searching') : t('atlas.searchAction')}
          </button>
        </div>
      </section>
      <p className="atlas-search-status" aria-live="polite">{searchError}</p>

      <div className="atlas-workspace">
        <section className="atlas-map-shell" aria-label={t('atlas.title')}>
          <ConcertMap points={mapPoints} selectedId={selectedId} onSelect={handleMapSelect} />
          <div className="map-key">
            <span><i className="artist" />{searched ? t('atlas.liveData') : t('atlas.upcomingAsiaLegend')}</span>
          </div>
        </section>

        <aside className="atlas-results">
          <div className="results-heading">
            <div><span>{visible.length} {t('common.matches')}</span><h2>{searched ? t('atlas.liveResults') : t('atlas.savedInWindow')}</h2></div>
            {searched ? (
              <button className="follow-artist-button" type="button" onClick={() => void followSearch()} disabled={followed}>
                {followed ? t('atlas.following') : t('atlas.followArtist')}
              </button>
            ) : null}
          </div>
          {searched && artistMedia ? (
            <section className="artist-media-strip">
              <Image src={artistMedia.imagePath} alt="" fill unoptimized sizes="(max-width: 760px) 100vw, 620px" />
              <span className="artist-media-scrim" aria-hidden="true" />
              <div>
                <small>{t('atlas.artistProfile')}</small>
                <strong>{artistMedia.artistName}</strong>
                <span>{t('atlas.imageUpdated')} · {new Intl.DateTimeFormat(dateLocale, { month: 'short', day: '2-digit' }).format(new Date(artistMedia.updatedAt))}</span>
              </div>
              <a href={artistMedia.sourceUrl} target="_blank" rel="noreferrer">{t('atlas.openArtistSource')} ↗</a>
            </section>
          ) : null}
          <div className="atlas-result-list">
            {visible.map((event) => {
              const translatedCity = cityKey(event.city);
              const content = (
                <>
                  <span className={`result-visual${event.imagePath ? ' has-image' : ''}`}>
                    {event.imagePath ? <Image src={event.imagePath} alt="" fill unoptimized sizes="72px" /> : null}
                    <i>{event.market}</i>
                  </span>
                  <span className="result-copy">
                    <small>{translatedCity ? t(translatedCity) : event.city}</small>
                    <strong>{event.artist}</strong>
                    <span>{event.subtitle}</span>
                  </span>
                  <span className="result-time">
                    <strong>{formatVenueTime(event.startsAt, event.timezone ?? 'UTC', dateLocale)}</strong>
                    <small>{event.stage} · {event.provider}</small>
                  </span>
                </>
              );
              const className = `atlas-result-row${selectedId === event.id ? ' is-selected' : ''}`;
              return event.external ? (
                <div id={`atlas-result-${event.id}`} tabIndex={-1} className={`${className} atlas-live-result`} onMouseEnter={() => setSelectedId(event.id)} key={event.id}>
                  <a className="atlas-result-main" href={event.href} target="_blank" rel="noreferrer">{content}</a>
                  <button className="save-show-button" type="button" onClick={() => void saveShow(event)} disabled={!event.canonicalId || savedIds.has(event.canonicalId)}>
                    {event.saved || (event.canonicalId && savedIds.has(event.canonicalId)) ? t('atlas.saved') : t('atlas.saveShow')}
                  </button>
                  <a className="row-arrow" href={event.href} target="_blank" rel="noreferrer" aria-label={t('atlas.openOfficial')}>↗</a>
                </div>
              ) : (
                <div id={`atlas-result-${event.id}`} tabIndex={-1} className={`${className} atlas-live-result`} onMouseEnter={() => setSelectedId(event.id)} key={event.id}>
                  <Link className="atlas-result-main" href={event.href}>{content}</Link>
                  <button className="save-show-button" type="button" onClick={() => void saveShow(event)} disabled={event.saved || !event.canonicalId || savedIds.has(event.canonicalId)}>
                    {event.saved || (event.canonicalId && savedIds.has(event.canonicalId)) ? t('atlas.saved') : t('atlas.saveShow')}
                  </button>
                  <Link className="row-arrow" href={event.href} aria-label={t('atlas.openListing')}>→</Link>
                </div>
              );
            })}
            {!visible.length ? <p className="empty-state">{searched ? t('atlas.noLiveResults') : t('atlas.catalogEmpty')}</p> : null}
          </div>
          <p className="result-note">{searched ? t('atlas.liveNote') : t('atlas.catalogNote')}</p>
        </aside>
      </div>
    </div>
  );
}
