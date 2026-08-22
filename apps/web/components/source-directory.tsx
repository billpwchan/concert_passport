'use client';

import { useMemo, useState } from 'react';
import type { ConnectorHealth, SourceChannel } from '@/lib/domain/types';

export function SourceDirectory({
  sources,
  connectors,
}: {
  sources: SourceChannel[];
  connectors: ConnectorHealth[];
}) {
  const [market, setMarket] = useState('ALL');
  const [category, setCategory] = useState('ALL');
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [submissionState, setSubmissionState] = useState('');
  const visible = useMemo(
    () => sources.filter((source) =>
      (market === 'ALL' || source.markets.includes(market as never)) &&
      (category === 'ALL' || source.category === category)),
    [category, market, sources],
  );

  async function submitOfficialLink(event: React.FormEvent) {
    event.preventDefault();
    setSubmissionState('Submitting…');
    const response = await fetch('/api/v1/submissions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: submissionUrl }),
    });
    setSubmissionState(response.ok ? 'Added to the verification queue' : 'Sign in to submit an official link');
    if (response.ok) setSubmissionUrl('');
  }

  return (
    <>
      <section className="connector-strip">
        {connectors.map((connector) => (
          <article key={connector.id}>
            <i className={connector.status} />
            <div><strong>{connector.name}</strong><span>{connector.detail}</span></div>
          </article>
        ))}
        <article>
          <i className="connected" />
          <div><strong>Official link registry</strong><span>{sources.length} curated channels across 9 markets</span></div>
        </article>
      </section>

      <section className="source-workspace">
        <aside className="source-filters">
          <p className="eyebrow">MARKET</p>
          {['ALL', 'SG', 'HK', 'TW', 'TH', 'KR', 'MY', 'PH', 'ID', 'AU'].map((item) => (
            <button className={market === item ? 'active' : ''} onClick={() => setMarket(item)} key={item}>{item}</button>
          ))}
          <p className="eyebrow category-label">CHANNEL</p>
          {['ALL', 'fan_platform', 'promoter', 'ticketing', 'event_api', 'artist_identity'].map((item) => (
            <button className={category === item ? 'active' : ''} onClick={() => setCategory(item)} key={item}>{item.replaceAll('_', ' ')}</button>
          ))}
        </aside>

        <div className="source-directory">
          <div className="source-directory-head"><span>{visible.length} CHANNELS</span><strong>Curated K-pop information coverage</strong></div>
          <div className="source-table">
            {visible.map((source) => (
              <a href={source.url} target="_blank" rel="noreferrer" className="source-row" key={source.id}>
                <span className={`source-tier tier-${source.tier}`}>T{source.tier}</span>
                <div><strong>{source.name}</strong><span>{source.host}</span></div>
                <div className="source-markets">{source.markets.join(' · ')}</div>
                <div className="source-capabilities">{source.capabilities.join(' · ')}</div>
                <span className={`source-status ${source.status}`}>{source.status.replaceAll('_', ' ')}</span>
                <span className="source-open">↗</span>
              </a>
            ))}
          </div>
        </div>

        <aside className="submission-card">
          <p className="eyebrow">MISSING A NOTICE?</p>
          <h3>Send the official link.</h3>
          <p>We verify the host, extract the lifecycle facts, and keep the source attached to every deadline.</p>
          <form onSubmit={submitOfficialLink}>
            <input
              type="url"
              required
              placeholder="https://official-source.com/…"
              value={submissionUrl}
              onChange={(event) => setSubmissionUrl(event.target.value)}
            />
            <button type="submit">Submit for verification</button>
          </form>
          <small>{submissionState || 'No social screenshots become critical alerts without review.'}</small>
        </aside>
      </section>
    </>
  );
}
