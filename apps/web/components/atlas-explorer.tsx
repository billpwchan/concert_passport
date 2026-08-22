'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import type { ConcertJourney, DiscoveredEvent, MarketCode } from '@/lib/domain/types';
import { formatTravelDateRange, formatVenueTime, getNextMilestone } from '@/lib/domain/lifecycle';
import { cityKey, marketKey, milestoneTitleKey } from '@/lib/i18n/domain';
import { ConcertMap, type AtlasMapPoint } from './concert-map';
import { usePreferences } from './preferences-provider';

const MARKET_OPTIONS: Array<'ALL' | MarketCode> = [
  'ALL', 'SG', 'HK', 'TW', 'TH', 'KR', 'MY', 'PH', 'ID', 'VN', 'AU', 'JP',
];

type DiscoveryPayload = {
  events: DiscoveredEvent[];
  errors: Array<{ provider: string; message: string }>;
};

type AtlasResult = {
  id: string;
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
};

export function AtlasExplorer({
  journeys,
  windowStartsAt,
}: {
  journeys: ConcertJourney[];
  windowStartsAt: string;
}) {
  const { dateLocale, t } = usePreferences();
  const [market, setMarket] = useState<'ALL' | MarketCode>('ALL');
  const [artist, setArtist] = useState('');
  const [liveEvents, setLiveEvents] = useState<DiscoveredEvent[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [selectedId, setSelectedId] = useState<string>();

  const travelWindow = useMemo(() => {
    const start = new Date(windowStartsAt);
    const end = new Date(start.getTime() + 180 * 86_400_000);
    return {
      start: start.toISOString(),
      end: end.toISOString(),
      label: formatTravelDateRange(start.toISOString(), end.toISOString(), dateLocale),
    };
  }, [dateLocale, windowStartsAt]);

  const demoResults = useMemo<AtlasResult[]>(
    () => journeys
      .filter((journey) => market === 'ALL' || journey.venue.market === market)
      .filter((journey) => journey.artist.name.toLowerCase().includes(artist.trim().toLowerCase()))
      .map((journey) => {
        const next = getNextMilestone(journey, new Date());
        return {
          id: `demo-${journey.id}`,
          href: `/plans/${journey.slug}`,
          external: false,
          artist: journey.artist.name,
          subtitle: journey.tourName,
          city: journey.venue.city,
          market: journey.venue.market,
          startsAt: journey.performanceStartsAt,
          timezone: journey.venue.timezone,
          stage: next ? t(milestoneTitleKey(next.type)) : t('atlas.showConfirmed'),
          provider: t('common.illustrative'),
          accent: journey.artist.accent,
          latitude: journey.venue.latitude,
          longitude: journey.venue.longitude,
        };
      }),
    [artist, journeys, market, t],
  );

  const liveResults = useMemo<AtlasResult[]>(
    () => liveEvents.map((event) => ({
      id: `live-${event.provider}-${event.providerEventId}`,
      href: event.officialUrl,
      external: true,
      artist: event.artist ?? (artist.trim() || event.name),
      subtitle: event.name,
      city: event.city ?? event.venue ?? event.countryCode ?? '—',
      market: event.countryCode ?? market,
      startsAt: event.startsAt,
      timezone: event.timezone,
      stage: t('atlas.liveListing'),
      provider: event.provider === 'ticketmaster-discovery' ? 'Ticketmaster' : 'PredictHQ',
      accent: event.provider === 'ticketmaster-discovery' ? '#4338ca' : '#18794e',
      latitude: event.latitude,
      longitude: event.longitude,
    })),
    [artist, liveEvents, market, t],
  );

  const visible = searched ? liveResults : demoResults;
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
      setSearched(true);
      setSelectedId(payload.events[0] ? `live-${payload.events[0].provider}-${payload.events[0].providerEventId}` : undefined);
      if (payload.errors.length && !payload.events.length) setSearchError(t('atlas.providersUnavailable'));
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : t('atlas.searchFailed'));
    } finally {
      setSearching(false);
    }
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
            <span><i className="artist" />{searched ? t('atlas.liveData') : t('atlas.savedPlans')}</span>
          </div>
        </section>

        <aside className="atlas-results">
          <div className="results-heading">
            <div><span>{visible.length} {t('common.matches')}</span><h2>{searched ? t('atlas.liveResults') : t('atlas.savedInWindow')}</h2></div>
          </div>
          <div className="atlas-result-list">
            {visible.map((event) => {
              const translatedCity = cityKey(event.city);
              const content = (
                <>
                  <span className="result-code">{event.market}</span>
                  <span className="result-copy">
                    <small>{translatedCity ? t(translatedCity) : event.city}</small>
                    <strong>{event.artist}</strong>
                    <span>{event.subtitle}</span>
                  </span>
                  <span className="result-time">
                    <strong>{formatVenueTime(event.startsAt, event.timezone ?? 'UTC', dateLocale)}</strong>
                    <small>{event.stage} · {event.provider}</small>
                  </span>
                  <span className="row-arrow" aria-hidden="true">↗</span>
                </>
              );
              const className = `atlas-result-row${selectedId === event.id ? ' is-selected' : ''}`;
              return event.external ? (
                <a id={`atlas-result-${event.id}`} className={className} href={event.href} target="_blank" rel="noreferrer" onMouseEnter={() => setSelectedId(event.id)} key={event.id}>{content}</a>
              ) : (
                <Link id={`atlas-result-${event.id}`} className={className} href={event.href} onMouseEnter={() => setSelectedId(event.id)} key={event.id}>{content}</Link>
              );
            })}
            {!visible.length ? <p className="empty-state">{searched ? t('atlas.noLiveResults') : t('common.noResults')}</p> : null}
          </div>
          <p className="result-note">{searched ? t('atlas.liveNote') : t('atlas.demoNote')}</p>
        </aside>
      </div>
    </div>
  );
}
