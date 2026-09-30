import { announcementText } from './plain-text.ts';
import { starVenueNodes } from './public-pages.ts';
import { liveNationNodes, liveNationRecordsToNodes, thaiTicketPerformances } from './site-structures.ts';
import { createHash } from 'node:crypto';
import type { DiscoveredEvent } from '../domain/types.ts';
import { permittedPage, type CollectionSource } from './manifest.ts';
import { isSafeStoredMediaUrl } from '../server/media-url.ts';
import { verifiedTimestamp } from '../../db/link-resolution.ts';

type Obj=Record<string,unknown>;
export type ExtractedEvent={key:string;event:DiscoveredEvent;precision:'date'|'time';rangeEnd?:string;description?:string;saleStartsAt?:string;price?:string;currency?:string;availability?:string;offerUrl?:string;proof:Obj};
const zone:Record<string,string>={SG:'Asia/Singapore',HK:'Asia/Hong_Kong',TW:'Asia/Taipei',TH:'Asia/Bangkok',KR:'Asia/Seoul',MY:'Asia/Kuala_Lumpur',PH:'Asia/Manila',JP:'Asia/Tokyo',VN:'Asia/Ho_Chi_Minh',NZ:'Pacific/Auckland'};
const countryNames:Record<string,string>={singapore:'SG',taiwan:'TW','台灣':'TW','台湾':'TW','hong kong':'HK',thailand:'TH',malaysia:'MY',philippines:'PH',japan:'JP','south korea':'KR','korea':'KR',australia:'AU','new zealand':'NZ',indonesia:'ID',vietnam:'VN'};
const object=(v:unknown):Obj=>v&&typeof v==='object'&&!Array.isArray(v)?v as Obj:{};
const str=(v:unknown):string|undefined=>typeof v==='string'&&v.trim()?v.trim():undefined;
function text(v:unknown):string|undefined{if(Array.isArray(v))return text(v[0]);return str(v)??str(object(v).name)??str(object(v).url)??str(object(v)['@id']);}
const plain=(v:unknown,max:number)=>text(v) ? announcementText(text(v)!,max) : undefined;
export function structuredEventNodes(html:string):Obj[]{
  const nodes:Obj[]=[];let visited=0;
  const walk=(v:unknown,depth=0)=>{if(depth>14||++visited>12000)return;if(Array.isArray(v)){v.forEach(x=>walk(x,depth+1));return;}
    if(!v||typeof v!=='object')return;const row=v as Obj;const types=Array.isArray(row['@type'])?row['@type']:[row['@type']];
    if(types.some(t=>typeof t==='string'&&/^(?:https?:\/\/schema.org\/)?(?:MusicEvent|Event|Festival)$/.test(t)))nodes.push(row);
    for(const key of ['@graph','itemListElement','item','subEvent','subEvents','mainEntity'])if(row[key])walk(row[key],depth+1);
  };
  for(const match of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi))try{walk(JSON.parse(match[1]));}catch{/* Failure is tracked if a page yields no supported event. */}
  return nodes;
}
export function extractOfficialEvents(html:string,pageUrl:string,source:CollectionSource):{events:ExtractedEvent[];rejected:Array<{key:string;reason:string;proof:Obj}>}{
  let nodes=structuredEventNodes(html);
  if (source.id === 'official:the-star-sg' && !nodes.length) nodes = starVenueNodes(html, pageUrl);
  if(source.id.startsWith('official:livenation-') && new URL(pageUrl).pathname==='/api/search/events') {
    const response=JSON.parse(html); if(response.hasError || !Array.isArray(response.documents))throw new Error('Invalid official event schema');
    nodes=liveNationRecordsToNodes(response.documents,pageUrl);
  }
  if(source.id.startsWith('official:livenation-'))nodes=[...nodes,...liveNationNodes(html,pageUrl)];
  if(new URL(pageUrl).hostname.endsWith('thaiticketmajor.com'))nodes=nodes.flatMap(node=>thaiTicketPerformances(html,node,pageUrl));
  const events:ExtractedEvent[]=[];const rejected:Array<{key:string;reason:string;proof:Obj}>=[];
  for(const [index,row]of nodes.entries()){
    const key=text(row['@id'])??text(row.url)??String(index);const name=plain(row.name,250);const date=text(row.startDate);
    const loc=object(Array.isArray(row.location)?row.location[0]:row.location);const address=object(loc.address);
    const rawCountry=text(address.addressCountry)?.toLowerCase();const market=rawCountry?(countryNames[rawCountry]??rawCountry.toUpperCase()):source.market;
    const declaredZone=text(row._ianaTimeZone);
    const localZone=declaredZone && /^(?:Asia|Australia|Pacific)\/[A-Za-z_]+$/.test(declaredZone) ? declaredZone : zone[market];
    const precision: 'date'|'time'=date&&/^\d{4}-\d{2}-\d{2}$/.test(date)?'date':'time';
    // AU/ID require an explicit offset because country alone cannot establish their time zone.
    const startsAt=date?(precision==='date'?date:/(?:Z|[+-]\d{2}:\d{2})$/.test(date)?date:localZone?verifiedTimestamp(date,localZone):undefined):undefined;
    let url:string|undefined;try{url=permittedPage(new URL(text(row.url)??pageUrl,pageUrl).toString(),source);}catch{}
    if(!name||!startsAt||!Number.isFinite(Date.parse(startsAt))||!url||market!==source.market||!plain(loc.name,200)){
      rejected.push({key,reason:'missing_or_conflicting_event_identity',proof:row});continue;
    }
    // A date-only record is retained explicitly. Product consumers must not invent a start time.
    const performer=Array.isArray(row.performer)?row.performer[0]:row.performer;
    const performerType=text(object(performer)['@type']);
    const performerName=plain(performer,120);
    const artist=performerName===name ? undefined : performerName;
    const imageRaw=text(Array.isArray(row.image)?row.image[0]:row.image);let imageUrl:string|undefined;
    try{const candidate=new URL(imageRaw??'',url).toString();if(imageRaw&&isSafeStoredMediaUrl(candidate)&&!/(?:logo|placeholder|default|favicon)/i.test(candidate))imageUrl=candidate;}catch{}
    const offers=object(Array.isArray(row.offers)?row.offers[0]:row.offers);
    const prices=(Array.isArray(row.offers)?row.offers:[row.offers]).map(x=>Number(text(object(x).price)??text(object(x).lowPrice))).filter(x=>Number.isFinite(x)&&x>0);
    const price=prices.length ? Math.min(...prices)===Math.max(...prices) ? String(prices[0]) : `${Math.min(...prices)}–${Math.max(...prices)}` : undefined;
    let offerUrl:string|undefined;try{const candidate=new URL(text(offers.url)??'',url);if(text(offers.url)&&candidate.protocol==='https:'&&!candidate.username&&!candidate.password)offerUrl=candidate.toString();}catch{}
    const status=text(row.eventStatus)?.toLowerCase()??'';
    const providerEventId=createHash('sha256').update(text(row['@id']) ?? (nodes.filter(node=>text(node.url)===text(row.url)).length===1 ? url : url+'|'+startsAt)).digest('hex').slice(0,24);
    const event:DiscoveredEvent={provider:source.id,providerEventId,name,artist,artistType:performerType==='MusicGroup'?'group':performerType==='Person'?'person':'unknown',
      startsAt,timezone:localZone ?? startsAt.match(/([+-]\d{2}:\d{2})$/)?.[1],venue:plain(loc.name,200),city:plain(address.addressLocality,100),countryCode:market,officialUrl:url,
      confidence:'official',sourceObservedAt:Date.now(),bestLinkUrl:url,bestLinkRole:'event',bestLinkSource:source.id.replace(/^official:/,''),bestLinkScore:94,bestLinkVerifiedAt:new Date().toISOString(),
      lifecycleStatus:status.includes('cancel')?'cancelled':status.includes('postpon')?'postponed':status.includes('reschedul')?'rescheduled':'scheduled',
      imageUrl,imageSourceUrl:imageUrl?url:undefined,imageAttribution:imageUrl?source.name:undefined};
    events.push({key,event,precision,rangeEnd:text(row._dateRangeEnd),description:plain(row.description,400),saleStartsAt:text(offers.validFrom),price,currency:source.market==='TH' && text(offers.priceCurrency)==='TH' ? 'THB' : text(offers.priceCurrency),availability:text(offers.availability),offerUrl,proof:row});
  }
  return{events,rejected};
}
