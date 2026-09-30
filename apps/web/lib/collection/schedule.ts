import { getDb } from '../../db/index.ts';
import type { ExtractedEvent } from './parser.ts';
/** A date range cannot establish separate performances or replace their previously recorded clock times. */
export function corroboratedPerformances(item: ExtractedEvent, artist: string): Array<{canonicalId:string}> {
  const start=item.event.startsAt.slice(0,10), end=item.rangeEnd??start;
  const rows=getDb().prepare(`SELECT id,starts_at AS startsAt,timezone,best_link_url AS url,official_url AS officialUrl
    FROM canonical_events WHERE artist=? AND country_code=? AND lifecycle_status NOT IN ('cancelled','deleted')
    AND NOT EXISTS(SELECT 1 FROM event_publication_quarantine q WHERE q.event_id=canonical_events.id AND q.released_at IS NULL)`)
    .all(artist,item.event.countryCode??'') as Array<{id:string;startsAt:string;timezone?:string;url?:string;officialUrl:string}>;
  const clean=(url?:string)=>{try{const u=new URL(url??'');return u.origin+decodeURI(u.pathname).replace(/\/$/,'');}catch{return '';}};
  return rows.filter(row=>{
    if(![row.url,row.officialUrl].some(url=>[item.event.officialUrl,item.offerUrl].filter(Boolean).some(target=>clean(url)===clean(target))))return false;
    let day=row.startsAt.slice(0,10);
    try{if(row.startsAt.includes('T'))day=new Intl.DateTimeFormat('en-CA',{timeZone:row.timezone??item.event.timezone??'UTC',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(row.startsAt));}catch{return false;}
    return day>=start&&day<=end;
  }).map(row=>({canonicalId:row.id}));
}
