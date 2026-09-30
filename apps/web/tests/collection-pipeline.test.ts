import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { robotsAllows, boundedResponseText, fetchOfficialPage } from '../lib/collection/http.ts';
import { extractOfficialEvents } from '../lib/collection/parser.ts';
import { collectionSources, discoverPageLinks, permittedPage } from '../lib/collection/manifest.ts';
import { classifySourceFailure, sourceRetryDelay } from '../lib/collection/policy.ts';
import { parseEventPage } from '../lib/sources/link-resolution/page-inspector.ts';
process.env.CONCERT_PASSPORT_DB_PATH=join(tmpdir(),`cp-collection-${crypto.randomUUID()}.sqlite`);
const source=collectionSources.find(item=>item.id==='official:livenation-tw')!;
const page='https://www.livenation.com.tw/event/123';
const node={ '@type':'MusicEvent',url:page,name:'IVE World Tour',performer:{'@type':'MusicGroup',name:'IVE'},startDate:'2027-02-10T18:00:00+08:00',
 location:{'@type':'Place',name:'Taipei Arena',address:{addressCountry:'TW',addressLocality:'Taipei'}},image:'https://media.example.com/ive-tour.jpg',
 offers:{url:'https://tixcraft.com/activity/detail/ive',price:'2800',priceCurrency:'TWD',validFrom:'2026-12-01T10:00:00+08:00'}};
const html=(value:unknown)=>`<script type="application/ld+json">${JSON.stringify(value)}</script>`;

test('frontier is restricted to configured public hosts and event paths',()=>{
 assert.equal(permittedPage('https://www.livenation.com.tw.evil.test/event/1',source),undefined);
 assert.equal(permittedPage('https://www.livenation.com.tw:8443/event/1',source),undefined);
 assert.equal(permittedPage('https://www.livenation.com.tw/checkout',source),undefined);
 assert.deepEqual(discoverPageLinks('<a href="/event/123?utm_source=x">Show</a><a href="/login">login</a><a href="https://evil.test/event/1">bad</a>',page,source),[page]);
});
test('robots policies select the specific agent and most specific matching path',()=>{
 const rules='User-agent: *\nDisallow: /\nUser-agent: ConcertPassportCollector\nDisallow: /private\nAllow: /private/public\nDisallow: /*?secret=';
 assert.equal(robotsAllows(rules,'/event/1'),true);
 assert.equal(robotsAllows(rules,'/private/x'),false);
 assert.equal(robotsAllows(rules,'/private/public/show'),true);
 assert.equal(robotsAllows(rules,'/event?secret=x'),false);
});
test('stream bounds apply without Content-Length and disallowed redirects never fetch the target',async()=>{
 const body=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(10));controller.enqueue(new Uint8Array(10));controller.close();}});
 await assert.rejects(boundedResponseText(new Response(body),15),/body_size/);
 const original=globalThis.fetch;const visited:string[]=[];
 globalThis.fetch=async(input)=>{const url=String(input);visited.push(url);return url.endsWith('/robots.txt')?new Response('',{status:404}):new Response(null,{status:302,headers:{location:'http://127.0.0.1/secret'}});};
 try{await assert.rejects(fetchOfficialPage(source,page),/untrusted_redirect/);assert.equal(visited.length,2);}finally{globalThis.fetch=original;}
});
test('structured extraction retains each performance, precise dates, poster scope and offer evidence',()=>{
 const second={...node,url:page+'/2',startDate:'2027-02-11',image:'https://media.example.com/logo.png'};
 const result=extractOfficialEvents(html({'@type':'ItemList',itemListElement:[{item:node},{item:second}]}),page,source);
 assert.equal(result.events.length,2);assert.equal(result.events[1].precision,'date');
 assert.equal(result.events[1].event.startsAt,'2027-02-11');assert.equal(result.events[1].event.imageUrl,undefined);
 assert.equal(result.events[0].currency,'TWD');assert.equal(result.events[0].price,'2800');
 assert.equal(extractOfficialEvents(html({...node,location:{...node.location,address:{addressCountry:'JP'}}}),page,source).rejected.length,1);
 const corrected=extractOfficialEvents(html({...node,startDate:'2027-02-10T19:00:00+08:00'}),page,source);
 assert.equal(corrected.events[0].event.providerEventId,result.events[0].event.providerEventId);
});
test('link inspection never assigns another event or generic page art from a multi-event page',()=>{
 const mixed=html([node,{...node,name:'TWICE Tour',performer:{name:'TWICE'},startDate:'2027-02-12T18:00:00+08:00',image:'https://media.example.com/twice.jpg'}]);
 const expected={id:'ive',artist:'IVE',name:'IVE Tour',startsAt:node.startDate,timezone:'Asia/Taipei'};
 assert.equal(parseEventPage(mixed,page,expected).data.imageUrl,node.image);
 assert.equal(parseEventPage(mixed,page,{...expected,artist:'BTS'}).data.imageUrl,undefined);
 assert.equal(parseEventPage('<meta property="og:image" content="https://media.example.com/site.jpg">',page).data.imageUrl,undefined);
});
test('runtime tracks failed authentication, persists quota and leases work across connections',async()=>{
 const {consumeProviderBudget,recordSourceOutcome,observedConnectorHealth,sourceReady,enqueuePage,claimPage,finishPage}=await import('../db/collection.ts');
 const {getDb}=await import('../db/index.ts');const now=Date.now();
 assert.equal(classifySourceFailure('PredictHQ responded 401'),'authentication');
 recordSourceOutcome('predicthq-api',{error:'PredictHQ responded 401'},now);
 const health=observedConnectorHealth({id:'predicthq',name:'PredictHQ',status:'connected',detail:'Configured'},now);
 assert.equal(health.status,'authentication_failed');assert.equal(sourceReady('predicthq-api',now+60000),false);
 assert.equal(sourceReady('predicthq-api',now+sourceRetryDelay('authentication',1)+1),true);
 assert.equal(consumeProviderBudget('test',2,now),true);assert.equal(consumeProviderBudget('test',2,now),true);assert.equal(consumeProviderBudget('test',2,now),false);
 const another=new DatabaseSync(process.env.CONCERT_PASSPORT_DB_PATH!,{readOnly:true});assert.equal((another.prepare("SELECT requests FROM provider_daily_usage WHERE provider='test'").get() as {requests:number}).requests,2);another.close();
 enqueuePage({url:page,sourceId:source.id,market:'TW',depth:1,kind:'event'},now);
 const claim=claimPage(now)!;assert.ok(claim.owner);assert.equal(claimPage(now),undefined);
 assert.equal(finishPage({...claim,owner:'wrong'},{status:200,nextAt:now+60000},now),false);
 assert.equal(finishPage(claim,{status:200,nextAt:now+60000},now),true);
 assert.equal(getDb().prepare('PRAGMA integrity_check').get()?.integrity_check,'ok');
});
test('official collection publishes verified identity, queues unresolved performers and replays unchanged pages',async()=>{
 const {getDb}=await import('../db/index.ts');const {seedOfficialFrontier,runOfficialCollection}=await import('../lib/collection/runner.ts');
 const {getCanonicalEvent,getUpcomingCatalogEvents}=await import('../db/events.ts');
 seedOfficialFrontier();const db=getDb();
 db.prepare('UPDATE collection_frontier SET next_check_at=?').run(Date.now()+86400000);
 db.prepare('UPDATE collection_frontier SET next_check_at=0 WHERE url=?').run(page);
 const original=globalThis.fetch;
 globalThis.fetch=async(input)=>String(input).endsWith('/robots.txt')?new Response('',{status:404}):new Response(html([node,{...node,url:page+'/unknown',name:'Unknown group',performer:{'@type':'MusicGroup',name:'Unconfirmed Artist'}}]),{headers:{'content-type':'text/html',etag:'fixture-1'}});
 try{
   const run=await runOfficialCollection({limit:1});assert.equal(run.failed,0);assert.equal(run.published,1);assert.equal(run.review,1);
   const row=db.prepare("SELECT event_id AS id FROM collection_candidates WHERE status='published'").get() as {id:string};
   assert.equal(getCanonicalEvent(row.id)?.imageUrl,node.image);assert.equal(getUpcomingCatalogEvents().some(event=>event.name==='Unknown group'),false);
   assert.equal((db.prepare('SELECT currency FROM event_enrichment WHERE event_id=?').get(row.id) as {currency:string}).currency,'TWD');
   db.prepare('UPDATE collection_frontier SET next_check_at=0 WHERE url=?').run(page);
   globalThis.fetch=async()=>new Response(null,{status:304});
   assert.equal((await runOfficialCollection({limit:1})).unchanged,1);
 }finally{globalThis.fetch=original;}
});

test('conflicting venues and unproven artist photos cannot become one trusted event image',async()=>{
 const{upsertDiscoveredEvents,getCanonicalEvent}=await import('../db/events.ts');const{getDb}=await import('../db/index.ts');
 const common={artist:'TWICE',name:'TWICE Tour',startsAt:'2027-03-01T11:00:00Z',timezone:'Asia/Singapore',city:'Singapore',countryCode:'SG',confidence:'official' as const};
 const first=upsertDiscoveredEvents([{...common,venue:'Venue A',provider:'predicthq',providerEventId:'venue-a',officialUrl:'/events/a',imageUrl:'https://media.example.com/unproven.jpg'}])[0];
 const second=upsertDiscoveredEvents([{...common,venue:'Venue B',provider:source.id,providerEventId:'venue-b',officialUrl:'https://www.livenation.com.tw/event/b'}])[0];
 assert.notEqual(first.canonicalId,second.canonicalId);assert.equal(getCanonicalEvent(first.canonicalId!)?.imageUrl,null);
 const db=getDb();db.prepare(`INSERT INTO event_media_proofs(event_id,image_url,source_url,scope,observed_at) VALUES(?,?,?,'event',?)`)
 .run(first.canonicalId!,'https://media.example.com/proven.jpg','https://www.livenation.sg/event/a',Date.now());
 assert.equal(getCanonicalEvent(first.canonicalId!)?.imageUrl,'https://media.example.com/proven.jpg');
});

test('replays captured Live Nation Flight and public index without sorting-time or date-range invention', async()=>{
 const {readFileSync}=await import('node:fs');
 const row=JSON.parse(readFileSync(new URL('./fixtures/collection/livenation-itzy-sg.json',import.meta.url),'utf8'));
 const flight='<script>self.__next_f.push('+JSON.stringify([1,'text containing a newline\n'+JSON.stringify({event:row})])+')</script>';
 const {collectionSource}=await import('../lib/collection/manifest.ts');
 const result=extractOfficialEvents(flight,'https://www.livenation.sg/event/itzy-tickets-edp1682922',collectionSource('official:livenation-sg')!);
 assert.equal(result.events[0].event.startsAt,'2026-10-03T10:00:00Z');
 assert.match(result.events[0].event.name,/<TUNNEL VISION>/);assert.match(result.events[0].event.imageUrl!,/e13c1b61/);
 const api=readFileSync(new URL('./fixtures/collection/livenation-ive-tw.json',import.meta.url),'utf8');
 const dateRange=extractOfficialEvents(api,'https://www.livenation.com.tw/api/search/events?PageSize=50',source).events[0];
 assert.equal(dateRange.event.startsAt,'2026-09-11');assert.equal(dateRange.precision,'date');assert.equal(dateRange.rangeEnd,'2026-09-13');
 assert.equal(dateRange.event.imageUrl,JSON.parse(api).documents[0].image);
});

test('replays ThaiTicketMajor Buddhist-calendar rounds as separate performances and full price range',async()=>{
 const {readFileSync}=await import('node:fs');const{collectionSource}=await import('../lib/collection/manifest.ts');
 const actual=readFileSync(new URL('./fixtures/collection/thaiticketmajor-babymonster.html',import.meta.url),'utf8');
 const result=extractOfficialEvents(actual,'https://www.thaiticketmajor.com/concert/2026-27-babymonster-world-tour-choom-in-bangkok.html',collectionSource('official:thaiticketmajor')!);
 assert.deepEqual(result.events.map(x=>x.event.startsAt),['2026-11-07T18:00:00+07:00','2026-11-08T18:00:00+07:00']);
 assert.equal(result.events[0].price,'2800–7300');assert.equal(result.events[0].currency,'THB');assert.notEqual(result.events[0].event.providerEventId,result.events[1].event.providerEventId);
});

test('coverage and enrichment are serializable server-to-client props', async()=>{
 const {getCollectionCoverage,getEventEnrichment}=await import('../db/coverage.ts');
 const coverage=getCollectionCoverage();
 const walk=(value:unknown)=>{if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object'){assert.equal(Object.getPrototypeOf(value),Object.prototype);Object.values(value).forEach(walk);}};
 walk(coverage);const id=coverage.updates[0] as {eventId?:string}|undefined;if(id?.eventId)walk(getEventEnrichment(id.eventId));
});

test('official seller cross-reference corroborates artwork without changing individual performance times',async()=>{
 const {readFileSync}=await import('node:fs');const{corroboratedPerformances}=await import('../lib/collection/schedule.ts');const{upsertDiscoveredEvents,getCanonicalEvent}=await import('../db/events.ts');
 const raw=readFileSync(new URL('./fixtures/collection/livenation-ive-tw.json',import.meta.url),'utf8');
 const item=extractOfficialEvents(raw,'https://www.livenation.com.tw/api/search/events',source).events[0];
 assert.equal(item.offerUrl,'https://tixcraft.com/activity/detail/26_ive');
 const saved=upsertDiscoveredEvents([{provider:'test-schedule',providerEventId:'ive-separate',artist:'IVE',name:'IVE Taipei',countryCode:'TW',venue:'Taipei Arena',startsAt:'2026-09-12T18:00:00+08:00',timezone:'Asia/Taipei',officialUrl:item.offerUrl!,confidence:'verified'}])[0];
 assert.ok(corroboratedPerformances(item,'IVE').some(x=>x.canonicalId===saved.canonicalId));
 assert.equal(getCanonicalEvent(saved.canonicalId!)?.startsAt,'2026-09-12T18:00:00+08:00');
 assert.equal(corroboratedPerformances({...item,offerUrl:'https://tixcraft.com/activity/detail/different'},'IVE').length,0);
});

test('an unknown provider performer type never turns an established group into a conflicting person',async()=>{
 const{readFileSync}=await import('node:fs');const{retainKnownKpopEvents,recordArtistEvidence}=await import('../db/artists.ts');
 recordArtistEvidence({canonicalName:'ITZY',artistType:'group',sourceId:'test-verified-identity',priorityScore:100,confidenceScore:100,tags:['K-pop']});
 const{liveNationRecordsToNodes}=await import('../lib/collection/site-structures.ts');
 const row=JSON.parse(readFileSync(new URL('./fixtures/collection/livenation-itzy-sg.json',import.meta.url),'utf8'));
 const event=extractOfficialEvents(html(liveNationRecordsToNodes([row],'https://www.livenation.sg/')),'https://www.livenation.sg/',(await import('../lib/collection/manifest.ts')).collectionSource('official:livenation-sg')!).events[0].event;
 assert.equal(event.artistType,'unknown');assert.equal(retainKnownKpopEvents([event]).length,1);
 assert.equal(retainKnownKpopEvents([{...event,artistType:'person'}]).length,0);
});
