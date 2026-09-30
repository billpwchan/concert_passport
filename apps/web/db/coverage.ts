import { announcementText } from '../lib/collection/plain-text.ts';
import { getDb } from './index.ts';
import { collectionSources } from '../lib/collection/manifest.ts';
export function getCollectionCoverage(now=Date.now()){
 const db=getDb();
 const quality=db.prepare(`SELECT COUNT(*) AS upcoming,
   SUM(CASE WHEN best_link_url IS NOT NULL THEN 1 ELSE 0 END) AS withOfficialLink,
   SUM(CASE WHEN data_verified_at>=? THEN 1 ELSE 0 END) AS checkedRecently,
   SUM(CASE WHEN venue IS NOT NULL AND timezone IS NOT NULL THEN 1 ELSE 0 END) AS withPlaceAndTimezone
   FROM canonical_events e WHERE datetime(starts_at)>=datetime(?) AND lifecycle_status NOT IN('cancelled','deleted')
   AND NOT EXISTS(SELECT 1 FROM event_publication_quarantine q WHERE q.event_id=e.id AND q.released_at IS NULL)`)
   .get(now-72*3600000,new Date(now).toISOString()) as {upcoming:number;withOfficialLink:number;checkedRecently:number;withPlaceAndTimezone:number};
 const queue=db.prepare(`SELECT COUNT(*) AS total,SUM(CASE WHEN next_check_at<=? THEN 1 ELSE 0 END) AS due,
   SUM(CASE WHEN last_checked_at IS NULL THEN 1 ELSE 0 END) AS unseen FROM collection_frontier`).get(now) as {total:number;due:number;unseen:number};
 const candidates=db.prepare(`SELECT status,COUNT(*) AS count FROM collection_candidates GROUP BY status`).all() as Array<{status:string;count:number}>;
 const sources=collectionSources.map(source=>{
   const state=db.prepare(`SELECT status,last_attempt_at AS checkedAt,last_success_at AS successAt,next_attempt_at AS nextAt,items_seen AS accepted
     FROM source_runtime WHERE source_id=?`).get(source.id) as {status:string;checkedAt:number;successAt?:number;nextAt:number;accepted:number}|undefined;
   const counts=db.prepare(`SELECT COUNT(*) AS pages,SUM(CASE WHEN last_checked_at IS NOT NULL THEN 1 ELSE 0 END) AS checkedPages,
     SUM(CASE WHEN next_check_at<=? THEN 1 ELSE 0 END) AS due FROM collection_frontier WHERE source_id=?`).get(now,source.id) as {pages:number;checkedPages:number;due:number};
   return{id:source.id,name:source.name,market:source.market,url:source.seeds.find(url=>!url.includes('/api/'))??source.seeds[0],...counts,...state,status:state?.status??'unchecked'};
 });
 const jobs=db.prepare('SELECT job_name AS name,last_status AS status,last_finished_at AS finishedAt FROM scheduler_jobs').all();
 const updates=db.prepare(`SELECT v.event_id AS eventId,e.artist,e.name,v.observed_at AS observedAt,v.changed_fields_json AS fields
   FROM event_versions v JOIN canonical_events e ON e.id=v.event_id
   WHERE datetime(e.starts_at)>=datetime(?) AND NOT EXISTS(SELECT 1 FROM event_publication_quarantine q WHERE q.event_id=e.id AND q.released_at IS NULL)
   ORDER BY v.observed_at DESC LIMIT 12`).all(new Date(now).toISOString());
 const reviewReasons=db.prepare(`SELECT reason,COUNT(*) AS count FROM collection_candidates WHERE status='needs_review' GROUP BY reason ORDER BY count DESC`).all();
 const result={generatedAt:now,quality,queue,candidates,reviewReasons,sources,jobs,updates};
 // node:sqlite returns null-prototype rows; React server-to-client props require plain objects.
 return JSON.parse(JSON.stringify(result)) as typeof result;
}
export type CollectionCoverage=ReturnType<typeof getCollectionCoverage>;
export function getEventEnrichment(id:string){
 const row=getDb().prepare(`SELECT source_url AS sourceUrl,date_precision AS datePrecision,description,sale_starts_at AS saleStartsAt,
   price_text AS price,currency,availability,observed_at AS observedAt FROM event_enrichment WHERE event_id=?`).get(id) as {
   sourceUrl:string;datePrecision:'date'|'time';description?:string;saleStartsAt?:string;price?:string;currency?:string;availability?:string;observedAt:number
 }|undefined;
 return row ? {...row, description: row.description ? announcementText(row.description) : undefined} : undefined;
}
