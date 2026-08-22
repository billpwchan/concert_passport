'use client';

import { useMemo, useState } from 'react';
import type { ConnectorHealth, MarketCode, SourceChannel } from '@/lib/domain/types';
import type { MessageKey } from '@/lib/i18n';
import {
  sourceCapabilityKey,
  sourceCategoryKey,
  sourceStatusKey,
} from '@/lib/i18n/domain';
import { usePreferences } from './preferences-provider';

const markets: Array<'ALL' | MarketCode> = ['ALL', 'SG', 'HK', 'TW', 'TH', 'KR', 'MY', 'PH', 'ID', 'VN', 'JP', 'AU'];
const categories: Array<'ALL' | SourceChannel['category']> = [
  'ALL',
  'fan_platform',
  'promoter',
  'ticketing',
  'event_api',
  'artist_identity',
];

const connectorStatusKeys: Record<ConnectorHealth['status'], MessageKey> = {
  connected: 'sources.connected',
  configuration_required: 'sources.configurationRequired',
  partnership_required: 'sources.partnershipRequired',
};

export function SourceDirectory({
  sources,
  connectors,
}: {
  sources: SourceChannel[];
  connectors: ConnectorHealth[];
}) {
  const { t } = usePreferences();
  const [market, setMarket] = useState<'ALL' | MarketCode>('ALL');
  const [category, setCategory] = useState<'ALL' | SourceChannel['category']>('ALL');
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [submissionState, setSubmissionState] = useState<MessageKey | null>(null);
  const marketCount = new Set(sources.flatMap((source) => source.markets)).size;
  const visible = useMemo(
    () => sources.filter((source) =>
      (market === 'ALL' || source.markets.includes(market)) &&
      (category === 'ALL' || source.category === category)),
    [category, market, sources],
  );

  async function submitOfficialLink(event: React.FormEvent) {
    event.preventDefault();
    setSubmissionState('sources.submitting');
    const response = await fetch('/api/v1/submissions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: submissionUrl }),
    });
    setSubmissionState(response.ok ? 'sources.queued' : 'sources.signInRequired');
    if (response.ok) setSubmissionUrl('');
  }

  return (
    <div className="page-body sources-page">
      <section className="connector-strip" aria-label={t('sources.title')}>
        {connectors.map((connector) => (
          <div className="connector-item" key={connector.id}>
            <i className={connector.status} aria-hidden="true" />
            <span><strong>{connector.name}</strong><small>{t(connectorStatusKeys[connector.status])}</small></span>
          </div>
        ))}
        <div className="connector-item registry">
          <i className="connected" aria-hidden="true" />
          <span>
            <strong>{t('sources.officialRegistry')}</strong>
            <small>{t('sources.acrossMarkets', { channels: sources.length, markets: marketCount })}</small>
          </span>
        </div>
      </section>

      <section className="source-filters" aria-label={t('sources.officialRegistry')}>
        <div className="filter-group">
          <span>{t('sources.market')}</span>
          <div>
            {markets.map((item) => (
              <button
                className={market === item ? 'active' : ''}
                type="button"
                onClick={() => setMarket(item)}
                aria-pressed={market === item}
                key={item}
              >
                {item === 'ALL' ? t('common.allMarkets') : item}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-group channel-filter">
          <span>{t('sources.channel')}</span>
          <div>
            {categories.map((item) => (
              <button
                className={category === item ? 'active' : ''}
                type="button"
                onClick={() => setCategory(item)}
                aria-pressed={category === item}
                key={item}
              >
                {item === 'ALL' ? t('sources.allChannels') : t(sourceCategoryKey(item))}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="source-layout">
        <section className="source-directory">
          <div className="directory-caption">
            <span>{t('sources.curatedCount', { count: visible.length })}</span>
            <strong>{t('sources.officialRegistry')}</strong>
          </div>
          <div className="source-table-head" aria-hidden="true">
            <span />
            <span>{t('sources.tableChannel')}</span>
            <span>{t('sources.tableMarkets')}</span>
            <span>{t('sources.tableCoverage')}</span>
            <span>{t('sources.tableAccess')}</span>
            <span />
          </div>
          <div className="source-table">
            {visible.map((source) => (
              <a href={source.url} target="_blank" rel="noreferrer" className="source-row" key={source.id}>
                <span className={`source-tier tier-${source.tier}`}>T{source.tier}</span>
                <span className="source-identity"><strong>{source.name}</strong><small>{source.host}</small></span>
                <span className="source-markets">{source.markets.join(' · ')}</span>
                <span className="source-capabilities">{source.capabilities.map((item) => t(sourceCapabilityKey(item))).join(' · ')}</span>
                <span className={`source-status ${source.status}`}>{t(sourceStatusKey(source.status))}</span>
                <span className="row-arrow" aria-hidden="true">↗</span>
              </a>
            ))}
            {!visible.length ? <p className="empty-state">{t('common.noResults')}</p> : null}
          </div>
        </section>

        <aside className="submission-panel">
          <span className="section-label">{t('sources.missingNotice')}</span>
          <h2>{t('sources.sendLink')}</h2>
          <p>{t('sources.submitDescription')}</p>
          <form onSubmit={submitOfficialLink}>
            <label>
              <span className="sr-only">URL</span>
              <input
                type="url"
                required
                placeholder={t('sources.urlPlaceholder')}
                value={submissionUrl}
                onChange={(event) => setSubmissionUrl(event.target.value)}
              />
            </label>
            <button className="button-primary" type="submit">{t('sources.submit')}</button>
          </form>
          <small aria-live="polite">{submissionState ? t(submissionState) : t('sources.reviewNote')}</small>
        </aside>
      </div>
    </div>
  );
}
