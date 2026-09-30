'use client';
import type { CollectionCoverage } from '@/db/coverage';
import { SourceCorrectionForm } from './source-correction-form';
import { CoverageDashboard } from './coverage-dashboard';

import { useMemo, useState } from 'react';
import type { ConnectorHealth, MarketCode, SourceChannel } from '@/lib/domain/types';
import {
  sourceCapabilityKey,
  sourceCategoryKey,
} from '@/lib/i18n/domain';
import { usePreferences } from './preferences-provider';
import { SourceLogo } from './source-logo';

const markets: Array<'ALL' | MarketCode> = ['ALL', 'SG', 'HK', 'TW', 'TH', 'KR', 'MY', 'PH', 'ID', 'VN', 'JP', 'AU', 'NZ'];
const categories: Array<'ALL' | SourceChannel['category']> = [
  'ALL',
  'fan_platform',
  'promoter',
  'ticketing',
];

export function SourceDirectory({
  sources,
  connectors, coverage,
}: {
  sources: SourceChannel[]; coverage: CollectionCoverage;
  connectors: ConnectorHealth[];
}) {
  const { t } = usePreferences();
  const [market, setMarket] = useState<'ALL' | MarketCode>('ALL');
  const [category, setCategory] = useState<'ALL' | SourceChannel['category']>('ALL');
  const marketCount = new Set(sources.flatMap((source) => source.markets)).size;
  const visible = useMemo(
    () => sources.filter((source) =>
      (market === 'ALL' || source.markets.includes(market)) &&
      (category === 'ALL' || source.category === category)),
    [category, market, sources],
  );

  return (
    <div className="page-body sources-page">
      <CoverageDashboard coverage={coverage} />
      <section className="connector-strip" aria-label={t('sources.title')}>
        {connectors.map((connector) => (
          <div className="connector-item" key={connector.id}>
            <i className={connector.status} aria-hidden="true" />
            <span>
              <strong>{connector.name.replace(' API', '')}</strong>
              <small>{t(connector.status === 'connected' ? 'collection.observed' : connector.status === 'authentication_failed' ? 'collection.authFailed' : connector.status === 'unchecked' ? 'collection.never' : 'collection.retry')}</small>
            </span>
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
            <span />
          </div>
          <div className="source-table">
            {visible.map((source) => (
              <a href={source.url} target="_blank" rel="noreferrer" className="source-row" key={source.id}>
                <SourceLogo host={source.host} name={source.name} />
                <span className="source-identity"><strong>{source.name}</strong><small>{source.host}</small></span>
                <span className="source-markets">{source.markets.join(' · ')}</span>
                <span className="source-capabilities">{source.capabilities.map((item) => t(sourceCapabilityKey(item))).join(' · ')}</span>
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
          <SourceCorrectionForm />
        </aside>
      </div>
    </div>
  );
}
