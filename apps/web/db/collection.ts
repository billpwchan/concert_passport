import { createHash, randomUUID } from 'node:crypto';
import { getDb } from './index.ts';
import { classifySourceFailure, safeSourceMessage, sourceRetryDelay } from '../lib/collection/policy.ts';
import type { ConnectorHealth } from '../lib/domain/types.ts';

export function consumeProviderBudget(provider: string, maximum: number, now = Date.now()): boolean {
  const day = new Date(now).toISOString().slice(0, 10);
  const db = getDb();
  db.prepare('DELETE FROM provider_daily_usage WHERE day < ?').run(new Date(now - 8 * 86400000).toISOString().slice(0, 10));
  return db.prepare(`INSERT INTO provider_daily_usage(provider,day,requests) VALUES(?,?,1)
    ON CONFLICT(provider,day) DO UPDATE SET requests=requests+1 WHERE requests < ?`).run(provider,day,maximum).changes > 0;
}
export function sourceReady(provider: string, now = Date.now()): boolean {
  const row = getDb().prepare('SELECT next_attempt_at AS nextAt FROM source_runtime WHERE source_id=?').get(provider) as {nextAt:number}|undefined;
  return !row || row.nextAt <= now;
}
export function recordSourceOutcome(provider: string, input: {error?: string; count?: number; durationMs?: number; retryAfterMs?: number; pageOnly?: boolean}, now = Date.now()) {
  const db=getDb();
  const old=db.prepare('SELECT failures FROM source_runtime WHERE source_id=?').get(provider) as {failures:number}|undefined;
  const kind=input.error ? classifySourceFailure(input.error) : undefined;
  const failures=kind ? (old?.failures??0)+1 : 0;
  db.prepare(`INSERT INTO source_runtime(source_id,status,last_attempt_at,last_success_at,next_attempt_at,failures,last_error,items_seen,duration_ms)
    VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(source_id) DO UPDATE SET status=excluded.status,last_attempt_at=excluded.last_attempt_at,
    last_success_at=COALESCE(excluded.last_success_at,source_runtime.last_success_at),next_attempt_at=excluded.next_attempt_at,
    failures=excluded.failures,last_error=excluded.last_error,items_seen=excluded.items_seen,duration_ms=excluded.duration_ms`)
    .run(provider,input.pageOnly?'partial':kind??'healthy',now,kind?null:now,kind && kind !== 'parse_error' && !input.pageOnly ? now+sourceRetryDelay(kind,failures,input.retryAfterMs):0,failures,input.error?safeSourceMessage(input.error):null,input.count??0,input.durationMs??0);
}
export function observedConnectorHealth(config: ConnectorHealth, now = Date.now()): ConnectorHealth {
  if (config.status !== 'connected') return config;
  const row=getDb().prepare('SELECT status,last_attempt_at AS checkedAt,last_success_at AS successAt,last_error AS error FROM source_runtime WHERE source_id=?').get(config.id === 'predicthq' ? 'predicthq-api' : config.id === 'ticketmaster-discovery' ? 'ticketmaster-api' : config.id) as {status:string;checkedAt:number;successAt?:number;error?:string}|undefined;
  return {...config,status: !row ? 'unchecked' : row.status==='healthy' && now-row.checkedAt<24*3600000 ? 'connected' : row.status==='authentication' ? 'authentication_failed' : row.status==='rate_limited' ? 'rate_limited' : row.status==='healthy' ? 'stale' : 'degraded',
    detail:row?.error??(!row?'No successful collection observed':config.detail),checkedAt:row?.checkedAt,lastSuccessAt:row?.successAt};
}

export function officialCollectionHealth(now = Date.now()): ConnectorHealth {
  const row = getDb().prepare(`SELECT MAX(last_attempt_at) AS checkedAt,
    MAX(last_success_at) AS successAt,
    SUM(CASE WHEN last_success_at >= ? THEN 1 ELSE 0 END) AS recentSources
    FROM source_runtime WHERE source_id LIKE 'official:%'`).get(now - 24 * 3600000) as {
      checkedAt: number | null; successAt: number | null; recentSources: number | null;
    };
  return {
    id: 'official-collection', name: 'Official public sources',
    status: !row.checkedAt ? 'unchecked' : !row.successAt ? 'degraded'
      : now - row.successAt > 24 * 3600000 ? 'stale' : 'connected',
    detail: `${row.recentSources ?? 0} sources checked successfully in 24 hours. Individual event verification times vary. No API key required.`,
    checkedAt: row.checkedAt ?? undefined, lastSuccessAt: row.successAt ?? undefined,
  };
}
export type CrawlTarget={url:string;sourceId:string;market:string;kind:'index'|'event'|'sitemap';depth:number;etag?:string;modified?:string;contentHash?:string;failures:number;owner:string};
export function enqueuePage(input:Omit<CrawlTarget,'owner'|'failures'|'etag'|'modified'|'contentHash'>, now=Date.now()):boolean {
  const db=getDb();
  // A source cannot crowd out every other market or grow the frontier without bound.
  const count=db.prepare('SELECT COUNT(*) AS n FROM collection_frontier WHERE source_id=?').get(input.sourceId) as {n:number};
  if(count.n>=1500)return false;
  return db.prepare(`INSERT OR IGNORE INTO collection_frontier(url,source_id,market,kind,depth,next_check_at,created_at)
    VALUES(?,?,?,?,?,?,?)`).run(input.url,input.sourceId,input.market,input.kind,input.depth,now,now).changes>0;
}
export function claimPage(now=Date.now(), sourceIds?: readonly string[]):CrawlTarget|undefined {
  if (sourceIds?.length === 0) return undefined;
  const filter = sourceIds ? `AND f.source_id IN (${sourceIds.map(() => '?').join(',')})` : '';
  const db=getDb();const owner=randomUUID();
  // One leased URL per source; prioritize sources least recently checked and then their due pages.
  return db.prepare(`UPDATE collection_frontier SET lease_owner=?,lease_until=? WHERE url=(
    SELECT f.url FROM collection_frontier f LEFT JOIN source_runtime s ON s.source_id=f.source_id
    WHERE f.next_check_at<=? AND COALESCE(f.lease_until,0)<=? AND COALESCE(s.next_attempt_at,0)<=?
      AND NOT EXISTS(SELECT 1 FROM collection_frontier active WHERE active.source_id=f.source_id AND active.lease_until>?)
    ${filter}
    ORDER BY COALESCE(s.last_attempt_at,0),
      CASE WHEN EXISTS(SELECT 1 FROM canonical_events e WHERE (e.official_url=f.url OR e.best_link_url=f.url)
        AND datetime(e.starts_at) BETWEEN datetime('now') AND datetime('now','+14 days')) THEN 0
      WHEN EXISTS(SELECT 1 FROM canonical_events e JOIN artist_follows a ON lower(a.artist_name)=lower(e.artist)
        WHERE (e.official_url=f.url OR e.best_link_url=f.url) AND (a.market_code='ALL' OR a.market_code=e.country_code)) THEN 1 ELSE 2 END,
      f.next_check_at, CASE f.kind WHEN 'index' THEN 0 ELSE 1 END LIMIT 1
    ) RETURNING url,source_id AS sourceId,market,kind,depth,etag,last_modified AS modified,content_hash AS contentHash,failures,lease_owner AS owner`)
    .get(owner,now+90000,now,now,now,now,...(sourceIds??[])) as CrawlTarget|undefined;
}
export function finishPage(target:CrawlTarget,input:{status:number;hash?:string;etag?:string;modified?:string;error?:string;nextAt:number},now=Date.now()) {
  return getDb().prepare(`UPDATE collection_frontier SET last_checked_at=?,last_status=?,content_hash=COALESCE(?,content_hash),
    etag=COALESCE(?,etag),last_modified=COALESCE(?,last_modified),failures=?,last_error=?,next_check_at=?,lease_owner=NULL,lease_until=NULL
    WHERE url=? AND lease_owner=?`).run(now,input.status,input.hash??null,input.etag??null,input.modified??null,input.error?target.failures+1:0,
    input.error?safeSourceMessage(input.error):null,input.nextAt,target.url,target.owner).changes>0;
}
export function recordDocument(input:{url:string;sourceId:string;status:number;body:string;headers?:Record<string,string>},now=Date.now()):string {
  const db=getDb();const hash=createHash('sha256').update(input.body).digest('hex');
  const id=createHash('sha256').update(input.url+'|'+hash).digest('hex');
  db.prepare(`INSERT INTO source_documents(id,url,source_id,content_hash,http_status,body,headers_json,first_seen_at,last_seen_at)
    VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET last_seen_at=excluded.last_seen_at`).run(id,input.url,input.sourceId,hash,input.status,input.body,JSON.stringify(input.headers??{}),now,now);
  // Keep the latest three bounded snapshots of each URL for replay and change review.
  db.prepare(`DELETE FROM source_documents WHERE url=? AND id NOT IN(SELECT id FROM source_documents WHERE url=? ORDER BY last_seen_at DESC LIMIT 3)`).run(input.url,input.url);
  const stored = db.prepare('SELECT COALESCE(SUM(length(CAST(body AS BLOB))),0) AS bytes FROM source_documents').get() as {bytes:number};
  if (stored.bytes > 128 * 1024 * 1024) {
    // Retain the hash/parsed evidence when raw HTML ages out; metadata FKs remain valid.
    const old = db.prepare('SELECT id,length(CAST(body AS BLOB)) AS size FROM source_documents WHERE id<>? AND length(body)>0 ORDER BY last_seen_at LIMIT 100').all(id) as Array<{id:string;size:number}>;
    let bytes=stored.bytes;for(const row of old){if(bytes<=128*1024*1024)break;db.prepare("UPDATE source_documents SET body='' WHERE id=?").run(row.id);bytes-=row.size;}
  }
  return id;
}
export function recordCandidate(input:{documentId:string;sourceKey:string;eventId?:string;status:string;reason?:string;payload:unknown},now=Date.now()) {
  getDb().prepare(`INSERT INTO collection_candidates(document_id,source_key,event_id,status,reason,payload_json,observed_at)
    VALUES(?,?,?,?,?,?,?) ON CONFLICT(document_id,source_key) DO UPDATE SET event_id=excluded.event_id,status=excluded.status,
    reason=excluded.reason,payload_json=excluded.payload_json,observed_at=excluded.observed_at`)
    .run(input.documentId,input.sourceKey,input.eventId??null,input.status,input.reason??null,JSON.stringify(input.payload),now);
}
