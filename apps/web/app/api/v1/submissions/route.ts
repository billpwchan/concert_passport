import { getDb } from '@/db';
import { getCanonicalEvent } from '@/db/events';
import { enqueuePage } from '@/db/collection';
import { upsertProfile } from '@/db/repository';
import { getDataSession } from '@/lib/server/data-session';
import { hasSameOrigin } from '@/lib/server/request-security';
import { discoverRateLimit } from '@/lib/server/rate-limit';
import { collectionSources, permittedPage } from '@/lib/collection/manifest';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 if(!hasSameOrigin(request))return Response.json({error:'Invalid origin'},{status:403});
 if(!discoverRateLimit(request).allowed)return Response.json({error:'Try again later'},{status:429});
 const body=await request.json().catch(()=>null) as {url?:unknown;eventId?:unknown;note?:unknown}|null;
 if(!body||typeof body.url!=='string'||body.url.length>1000||typeof body.note!=='string'||body.note.length>1000||!body.note.trim()
   ||(body.eventId!==undefined&&(typeof body.eventId!=='string'||!getCanonicalEvent(body.eventId))))return Response.json({error:'Invalid submission'},{status:400});
 let parsed:URL;try{parsed=new URL(body.url);}catch{return Response.json({error:'Invalid source URL'},{status:400});}
 if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.port)return Response.json({error:'Use a public HTTPS source URL'},{status:400});
 const source=collectionSources.find(source=>permittedPage(body.url as string,source));
 if(!source)return Response.json({error:'Please use an official source from the source directory'},{status:400});
 const session=getDataSession(request);await upsertProfile(session.user);const db=getDb();
 const count=db.prepare('SELECT COUNT(*) AS n FROM source_submissions WHERE user_id=? AND submitted_at>?').get(session.user.userId,Date.now()-86400000) as {n:number};
 if(count.n>=10)return Response.json({error:'Daily submission limit reached'},{status:429});
 const url=permittedPage(body.url,source)!;const id=crypto.randomUUID();
 db.prepare(`INSERT INTO source_submissions(id,user_id,url,host,status,submitted_at,event_id,note) VALUES(?,?,?,?,?,?,?,?)`)
 .run(id,session.user.userId,url,parsed.hostname,'queued',Date.now(),body.eventId??null,body.note.trim());
 enqueuePage({url,sourceId:source.id,market:source.market,kind:'event',depth:1});
 // Reports request reinspection; they never directly overwrite or suppress public information.
 db.prepare('UPDATE collection_frontier SET next_check_at=MIN(next_check_at,?) WHERE url=?').run(Date.now(),url);
 const response=Response.json({id,status:'queued'},{status:202});if(session.setCookie)response.headers.append('set-cookie',session.setCookie);return response;
}
