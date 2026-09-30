'use client';
import Link from 'next/link';
import type { CollectionCoverage } from '@/db/coverage';
import { usePreferences } from './preferences-provider';
export function CoverageDashboard({coverage}:{coverage:CollectionCoverage}){
 const {t,dateLocale}=usePreferences();
 const checked=(value?:number)=>value?new Intl.DateTimeFormat(dateLocale,{dateStyle:'short',timeStyle:'short'}).format(new Date(value)):t('collection.never');
 return <section className="coverage-dashboard">
   <header><span className="editorial-eyebrow">LIVE COLLECTION</span><h2>{t('collection.title')}</h2><p>{t('collection.description')}</p></header>
   <div className="coverage-metrics">{([
     ['collection.catalog',coverage.quality.upcoming],['collection.recent',coverage.quality.checkedRecently??0],
     ['collection.official',coverage.quality.withOfficialLink??0],['collection.pending',coverage.queue.due??0]
   ] as const).map(([key,value])=><div key={key}><strong>{value}</strong><span>{t(key)}</span></div>)}</div>
   <details className="collection-sources"><summary>{t('collection.inspect')}</summary><div className="collection-source-grid">{coverage.sources.map(source=><article key={source.id}>
     <div><strong>{source.name}</strong><span>{source.market}</span></div><p>{t(source.status==='healthy'?'collection.observed':source.status==='unchecked'?'collection.never':source.status==='authentication'?'collection.authFailed':source.status==='blocked'?'collection.blocked':source.status==='parse_error'?'collection.review':'collection.retry')}</p>
     <small>{t('collection.lastCheck')} {checked(source.checkedAt)}</small><small>{t('collection.pages',{checked:source.checkedPages??0,total:source.pages})}</small><a href={source.url} target="_blank" rel="noreferrer">{t('collection.original')} ↗</a>
   </article>)}</div></details>
   {coverage.updates.length?<details className="collection-updates"><summary>{t('collection.changes')}</summary><ol>{coverage.updates.map((row,index)=>{const update=row as {eventId:string;artist:string;name:string;observedAt:number};return<li key={`${update.eventId}-${index}`}><time>{checked(update.observedAt)}</time><Link href={`/events/${encodeURIComponent(update.eventId)}`}>{update.artist??update.name} →</Link></li>;})}</ol></details>:null}
 </section>;
}
