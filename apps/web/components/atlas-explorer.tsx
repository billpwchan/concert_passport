'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { ConcertJourney, MarketCode } from '@/lib/domain/types';
import { formatVenueTime, getNextMilestone } from '@/lib/domain/lifecycle';

const markets: Array<{ code: 'ALL' | MarketCode; label: string }> = [
  { code: 'ALL', label: 'All Asia' },
  { code: 'SG', label: 'Singapore' },
  { code: 'HK', label: 'Hong Kong' },
  { code: 'TW', label: 'Taipei' },
  { code: 'TH', label: 'Bangkok' },
];

const mapPositions: Record<string, { x: number; y: number; code: string }> = {
  Singapore: { x: 49, y: 78, code: 'SIN' },
  'Hong Kong': { x: 67, y: 42, code: 'HKG' },
  Taipei: { x: 72, y: 30, code: 'TPE' },
  Bangkok: { x: 36, y: 62, code: 'BKK' },
};

export function AtlasExplorer({ journeys }: { journeys: ConcertJourney[] }) {
  const [market, setMarket] = useState<'ALL' | MarketCode>('ALL');
  const [artist, setArtist] = useState('');
  const visible = useMemo(
    () =>
      journeys.filter(
        (journey) =>
          (market === 'ALL' || journey.venue.market === market) &&
          journey.artist.name.toLowerCase().includes(artist.toLowerCase()),
      ),
    [artist, journeys, market],
  );

  return (
    <div className="atlas-layout">
      <section className="atlas-map" aria-label="Concert destinations in Asia">
        <div className="map-grid" aria-hidden="true" />
        <div className="map-range">
          <span>SEP</span><strong>22 AUG — 31 DEC 2026</strong><span>DEC</span>
        </div>
        <div className="home-node" style={{ left: '49%', top: '78%' }}>
          <i /> <span>HOME · SIN</span>
        </div>
        {visible.map((journey) => {
          const position = mapPositions[journey.venue.city];
          if (!position) return null;
          return (
            <Link
              className="map-event-node"
              href={`/plans/${journey.slug}`}
              style={{ left: `${position.x}%`, top: `${position.y}%`, '--node-accent': journey.artist.accent } as React.CSSProperties}
              key={journey.id}
              aria-label={`${journey.artist.name} in ${journey.venue.city}`}
            >
              <i /><span>{position.code}</span><strong>{journey.artist.name}</strong>
            </Link>
          );
        })}
        <div className="map-legend">
          <span><i className="followed" /> Followed artist</span>
          <span><i className="home" /> Home</span>
          <small>Illustrative events · official-source adapters are ready for live credentials</small>
        </div>
      </section>

      <aside className="atlas-results">
        <div className="atlas-controls">
          <label>
            <span>ARTIST</span>
            <input
              value={artist}
              onChange={(event) => setArtist(event.target.value)}
              placeholder="Search followed artists"
            />
          </label>
          <div className="market-tabs" aria-label="Filter by market">
            {markets.map((item) => (
              <button
                className={market === item.code ? 'active' : ''}
                type="button"
                onClick={() => setMarket(item.code)}
                key={item.code}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="atlas-result-heading">
          <span>{visible.length} MATCHES</span>
          <strong>Inside your travel window</strong>
        </div>

        <div className="atlas-cards">
          {visible.map((journey) => {
            const next = getNextMilestone(journey, new Date('2026-08-22T11:42:00+08:00'));
            return (
              <Link className="atlas-result-card" href={`/plans/${journey.slug}`} key={journey.id}>
                <span className="result-accent" style={{ background: journey.artist.accent }} />
                <div>
                  <span>{journey.venue.city.toUpperCase()} · {journey.venue.market}</span>
                  <strong>{journey.artist.name}</strong>
                  <small>{journey.tourName}</small>
                </div>
                <div className="result-date">
                  <strong>{formatVenueTime(journey.performanceStartsAt, journey.venue.timezone)}</strong>
                  <span>{next?.title ?? 'Show confirmed'}</span>
                </div>
                <span className="result-arrow">↗</span>
              </Link>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
