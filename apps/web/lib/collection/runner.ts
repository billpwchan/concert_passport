import { conflictingPerformances } from './conflicts.ts';
import { sitemapLinks } from './public-pages.ts';
import { corroboratedPerformances } from './schedule.ts';
import { isAmbiguousArtistName } from '../domain/ambiguous-artist-names.ts';
import { createHash } from 'node:crypto';
import { getDb } from '../../db/index.ts';
import { claimPage, enqueuePage, finishPage, recordCandidate, recordDocument, recordSourceOutcome } from '../../db/collection.ts';
import { upsertDiscoveredEvents } from '../../db/events.ts';
import { retainKnownKpopEvents } from '../../db/artists.ts';
import { collectionSources, collectionSource, discoverPageLinks, permittedPage } from './manifest.ts';
import { fetchOfficialPage, SourceFetchError } from './http.ts';
import { extractOfficialEvents } from './parser.ts';
import { classifySourceFailure, pageRefreshDelay, sourceRetryDelay } from './policy.ts';

export function seedOfficialFrontier(sourceIds?: readonly string[]) {
  const sources = sourceIds ? collectionSources.filter(source => sourceIds.includes(source.id)) : collectionSources;
  for(const source of sources)for(const url of source.seeds)enqueuePage({url,sourceId:source.id,market:source.market,kind: /\.xml$/i.test(new URL(url).pathname) ? 'sitemap' : 'index',depth:0});
  // Existing observed URLs make official re-verification independent of API access and search engines.
  const known=getDb().prepare(`SELECT DISTINCT url FROM event_source_links WHERE url LIKE 'https://%'
    UNION SELECT best_link_url AS url FROM canonical_events WHERE best_link_url LIKE 'https://%'`).all() as Array<{url:string}>;
  for(const row of known)for(const source of sources){const url=permittedPage(row.url,source);if(url&&source.eventPath.test(new URL(url).pathname)){
    enqueuePage({url,sourceId:source.id,market:source.market,kind:'event',depth:1});break;}}
}
export async function runOfficialCollection(options:{limit?:number;maxMs?:number;sourceIds?:readonly string[]}={}){
  seedOfficialFrontier(options.sourceIds);const started=Date.now();const maximum=Math.min(12,Math.max(1,options.limit??8));const deadline=started+Math.min(90000,options.maxMs??50000);
  const stats={pages:0,published:0,review:0,unchanged:0,queued:0,failed:0};
  while(stats.pages<maximum&&Date.now()<deadline){
    const target=claimPage(Date.now(), options.sourceIds);if(!target)break;stats.pages++;const source=collectionSource(target.sourceId);if(!source)continue;
    const began=Date.now();
    try{
      let result=await fetchOfficialPage(source,target.url,target);
      if(result.status===304){
        stats.unchanged++;
        const stored=getDb().prepare('SELECT body FROM source_documents WHERE url=? AND length(body)>0 ORDER BY last_seen_at DESC LIMIT 1').get(target.url) as {body:string}|undefined;
        result=stored ? {...result,status:200,body:stored.body} : await fetchOfficialPage(source,target.url);
        if(result.status===304)throw new Error('Conditional response without a retained document');
      }
      const hash=createHash('sha256').update(result.body).digest('hex');
      const documentId=recordDocument({url:target.url,sourceId:source.id,status:result.status,body:result.body,
        headers:{etag:result.etag??'',lastModified:result.modified??''}});
      for (const url of result.sitemaps ?? []) {
        if (enqueuePage({url, sourceId: source.id, market: source.market, kind: 'sitemap', depth: 0})) stats.queued++;
      }
      if (target.kind === 'sitemap') {
        for (const entry of sitemapLinks(result.body, source)) {
          if (entry.kind === 'sitemap' && target.depth >= 2) continue;
          if (enqueuePage({...entry, sourceId: source.id, market: source.market, depth: target.depth + 1})) stats.queued++;
        }
        finishPage(target, {status: result.status, hash, etag: result.etag, modified: result.modified, nextAt: Date.now() + 6 * 3600000});
        recordSourceOutcome(source.id, {count: 0, durationMs: Date.now() - began});
        continue;
      }
      if(target.depth<2 && new URL(result.url).pathname !== '/api/search/events')for(const url of discoverPageLinks(result.body,result.url,source))
        if(enqueuePage({url,sourceId:source.id,market:source.market,kind:'event',depth:target.depth+1}))stats.queued++;
      if(source.id.startsWith('official:livenation-') && new URL(result.url).pathname==='/api/search/events') {
        const listing=JSON.parse(result.body);
        if(listing.hasError || !Array.isArray(listing.documents))throw new Error('Invalid official event schema');
        for(const row of listing.documents){try{const url=permittedPage(new URL(row.url,result.url).toString(),source);if(url&&enqueuePage({url,sourceId:source.id,market:source.market,kind:'event',depth:1}))stats.queued++;}catch{}}
        const next=new URL(result.url),page=Number(next.searchParams.get('Page')??1);
        if(Number(listing.total)>page*50 && page<20){next.searchParams.set('Page',String(page+1));if(enqueuePage({url:next.toString(),sourceId:source.id,market:source.market,kind:'index',depth:0}))stats.queued++;}
        if(Number(listing.total)>1000)throw new Error('Partial official index exceeds bounded pagination');
      }
      const parsed=extractOfficialEvents(result.body,result.url,source);
      let soonest:string|undefined;let latestPast:string|undefined;let nextSale:string|undefined;let published=0;
      for(const rejected of parsed.rejected){stats.review++;recordCandidate({documentId,sourceKey:rejected.key,status:'needs_review',reason:rejected.reason,payload:rejected.proof});}
      for(const item of parsed.events){
        if (Date.parse(item.event.startsAt) < Date.now() && (!latestPast || Date.parse(item.event.startsAt) > Date.parse(latestPast))) latestPast = item.event.startsAt;
        if (item.saleStartsAt && Date.parse(item.saleStartsAt) > Date.now() - 2 * 3600000 && (!nextSale || Date.parse(item.saleStartsAt) < Date.parse(nextSale))) nextSale = item.saleStartsAt;
        if(Date.parse(item.event.startsAt)>=Date.now()&&(!soonest||Date.parse(item.event.startsAt)<Date.parse(soonest)))soonest=item.event.startsAt;
        if(Date.parse(item.event.startsAt)<Date.now()-7*86400000){recordCandidate({documentId,sourceKey:item.key,status:'historical',payload:item.proof});continue;}
        const boundArtist = item.proof._ticketmasterArtistId ? getDb().prepare(`SELECT a.canonical_name AS name,a.artist_type AS artistType FROM artist_provider_identities p JOIN artist_catalog a ON a.id=p.artist_id WHERE p.provider='ticketmaster-discovery' AND p.provider_artist_id=?`).get(String(item.proof._ticketmasterArtistId)) as {name:string;artistType:'group'|'person'|'unknown'}|undefined : undefined;
        if(boundArtist && boundArtist.name.toLowerCase()===item.event.artist?.toLowerCase())item.event.artistType=boundArtist.artistType;
        const accepted=retainKnownKpopEvents([item.event]);
        if(!accepted.length || accepted.some(event=>event.artist && isAmbiguousArtistName(event.artist) && boundArtist?.name !== event.artist)){stats.review++;recordCandidate({documentId,sourceKey:item.key,status:'needs_review',reason:'artist_identity_not_established',payload:item.proof});continue;}
        if(!item.proof.eventStatus){
          const previous=getDb().prepare(`SELECT lifecycle_status AS status FROM canonical_events WHERE artist=? AND country_code=? AND datetime(starts_at)=datetime(?) AND lifecycle_status IN ('cancelled','deleted','postponed','offsale') LIMIT 1`).get(accepted[0].artist!,item.event.countryCode!,item.event.startsAt) as {status:'cancelled'|'deleted'|'postponed'|'offsale'}|undefined;
          if(previous)accepted[0].lifecycleStatus=previous.status;
        }
        const conflicts = item.precision === 'time' ? conflictingPerformances(accepted[0]) : [];
        if (conflicts.length) {
          for (const eventId of conflicts) recordCandidate({documentId,sourceKey:item.key+'|conflict|'+eventId,eventId,status:'needs_review',reason:'conflicting_performance_time',payload:item.proof});
          stats.review++; continue;
        }
        const isRange=Boolean(item.rangeEnd && item.rangeEnd>item.event.startsAt.slice(0,10));
        const corroborated=item.precision==='date' || isRange ? corroboratedPerformances(item,accepted[0].artist!) : [];
        if(isRange){stats.review++;recordCandidate({documentId,sourceKey:item.key,status:'needs_review',reason:'individual_performance_times_not_published',payload:item.proof});}
        const targets=isRange ? corroborated : corroborated.length===1 ? corroborated : upsertDiscoveredEvents(accepted);
        for(const canonical of targets){const id=canonical?.canonicalId;if(!id)throw new Error('canonical_persistence_failed');
        const db=getDb();
        db.prepare(`INSERT INTO event_enrichment(event_id,document_id,source_url,date_precision,description,sale_starts_at,price_text,currency,availability,offer_url,observed_at)
          VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(event_id) DO UPDATE SET document_id=excluded.document_id,source_url=excluded.source_url,
          date_precision=excluded.date_precision,description=excluded.description,sale_starts_at=excluded.sale_starts_at,price_text=excluded.price_text,
          currency=excluded.currency,availability=excluded.availability,offer_url=excluded.offer_url,observed_at=excluded.observed_at`)
          .run(id,documentId,item.event.officialUrl,item.precision,item.description??null,item.saleStartsAt??null,item.price??null,item.currency??null,item.availability??null,item.offerUrl??null,Date.now());
        db.prepare("UPDATE event_media_proofs SET state='stale' WHERE event_id=? AND source_url=? AND image_url<>?").run(id,item.event.officialUrl,item.event.imageUrl??'');
        if(item.event.imageUrl)db.prepare(`INSERT INTO event_media_proofs(event_id,image_url,source_url,scope,content_hash,observed_at)
          VALUES(?,?,?,'event',?,?) ON CONFLICT(event_id,image_url) DO UPDATE SET source_url=excluded.source_url,content_hash=excluded.content_hash,observed_at=excluded.observed_at,state='verified'`)
          .run(id,item.event.imageUrl,item.event.officialUrl,hash,Date.now());
        recordCandidate({documentId,sourceKey:item.key+'|'+id,eventId:id,status:'published',payload:item.proof});stats.published++;published++;
        }
      }
      const parseError=target.kind==='event'&&!parsed.events.length?'No supported structured event; page retained for review':undefined;
      if(parseError)stats.failed++;
      if(parseError)recordCandidate({documentId,sourceKey:'page',status:'needs_review',reason:'structured_event_missing',payload:{url:result.url}});
      finishPage(target,{status:result.status,hash,etag:result.etag,modified:result.modified,error:parseError,nextAt:Date.now()+pageRefreshDelay(target.kind === 'event' ? soonest ?? latestPast : undefined, Date.now(), target.kind === 'event' ? nextSale : undefined)});
      recordSourceOutcome(source.id,{count:published,error:parseError,durationMs:Date.now()-began});
      getDb().prepare('UPDATE source_submissions SET status=? WHERE url=? AND status=?').run(parseError ? 'needs_review' : published ? 'checked' : 'needs_review',target.url,'queued');
    }catch(error){const message=error instanceof Error?error.message:'collection_failed';stats.failed++;
      finishPage(target,{status:Number(message.match(/http_(\d+)/)?.[1]??0),error:message,nextAt:Date.now()+sourceRetryDelay(classifySourceFailure(message),target.failures+1,error instanceof SourceFetchError ? error.retryAfterMs : undefined)});
      // A blocked/deleted detail page must not stop the same site's working public index.
      // 429, transport failures and 5xx still cool down the source as a whole.
      const pageOnly = (error instanceof SourceFetchError && [403,404,410].includes(error.status))
        || /robots_disallowed|unsupported_content|untrusted_target/.test(message);
      recordSourceOutcome(source.id,{error:message,durationMs:Date.now()-began,retryAfterMs:error instanceof SourceFetchError ? error.retryAfterMs : undefined,pageOnly});}
  }
  return{...stats,durationMs:Date.now()-started};
}
