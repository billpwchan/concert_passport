import type { CollectionSource } from './manifest.ts';
import { permittedPage } from './manifest.ts';
const AGENT='ConcertPassportCollector/1.0 (+https://concert-passport.52-198-144-26.sslip.io/sources)';
export function retryAfterDelay(value: string | null, now = Date.now()): number | undefined {
  if (!value?.trim()) return;
  const delay = /^\d+$/.test(value.trim()) ? Number(value) * 1000 : Date.parse(value) - now;
  return Number.isFinite(delay) && delay >= 0 ? delay : undefined;
}
export class SourceFetchError extends Error {
  status: number;
  retryAfterMs?: number;
  constructor(status: number, retryAfterMs?: number) {
    super(`http_${status}`);
    this.status = status;
    this.retryAfterMs = retryAfterMs;
    this.name = 'SourceFetchError';
  }
}
export async function boundedResponseText(response:Response,maximum=1500000):Promise<string>{
  if(Number(response.headers.get('content-length')??0)>maximum)throw new Error('unsupported_body_size');
  const reader=response.body?.getReader();if(!reader)return '';
  const chunks:Uint8Array[]=[];let size=0;
  try{while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.byteLength;
    if(size>maximum){await reader.cancel();throw new Error('unsupported_body_size');}chunks.push(chunk.value);}
  }finally{reader.releaseLock();}
  const buffer=new Uint8Array(size);let offset=0;for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.byteLength;}
  return new TextDecoder().decode(buffer);
}
/** Longest robots rule wins, Allow wins equal specificity. Unknown/unreachable policy fails closed. */
export function robotsAllows(body:string,path:string):boolean{
  const groups:Array<{agents:string[];rules:Array<{allow:boolean;path:string}>}>=[];
  let group:{agents:string[];rules:Array<{allow:boolean;path:string}>}|undefined;
  for(const raw of body.split(/\r?\n/)){
    const line=raw.replace(/#.*$/,'').trim();const sep=line.indexOf(':');if(sep<0)continue;
    const key=line.slice(0,sep).trim().toLowerCase();const value=line.slice(sep+1).trim();
    if(key==='user-agent'){
      if(!group||group.rules.length){group={agents:[],rules:[]};groups.push(group);}group.agents.push(value.toLowerCase());
    }else if(group&&(key==='allow'||key==='disallow')&&value)group.rules.push({allow:key==='allow',path:value});
  }
  const specific=groups.filter(g=>g.agents.some(a=>a!=='*'&&AGENT.toLowerCase().startsWith(a)));
  const applicable=specific.length?specific:groups.filter(g=>g.agents.includes('*'));
  const matched=applicable.flatMap(g=>g.rules).filter(rule=>{
    const expression=rule.path.replace(/[.+?^{}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*');
    try{return new RegExp('^'+expression).test(path);}catch{return false;}
  }).sort((a,b)=>b.path.replace(/[*$]/g,'').length-a.path.replace(/[*$]/g,'').length||Number(b.allow)-Number(a.allow));
  return matched[0]?.allow??true;
}
const robotsCache=new Map<string,{body:string;expires:number}>();
async function checkRobots(url:URL,source:CollectionSource){
  let cached=robotsCache.get(url.origin);
  if(!cached||cached.expires<Date.now()){
    let target=new URL('/robots.txt',url).toString();
    let response:Response|undefined;
    for(let redirects=0;redirects<3;redirects++){
      response=await fetch(target,{headers:{'user-agent':AGENT},redirect:'manual',signal:AbortSignal.timeout(8000),cache:'no-store'});
      if(response.status<300||response.status>=400)break;
      const location=response.headers.get('location');const next=location?permittedPage(new URL(location,target).toString(),source):undefined;
      if(!next||new URL(next).pathname!=='/robots.txt')throw new Error('robots_untrusted_redirect');target=next;
    }
    if(!response)throw new Error('robots_unavailable');
    if(!response.ok&&response.status!==404)throw new Error(`robots_unavailable_${response.status}`);
    const body=response.status===404?'':await boundedResponseText(response,128000);
    cached={body,expires:Date.now()+3600000};robotsCache.set(url.origin,cached);
  }
  if(!robotsAllows(cached.body,url.pathname+url.search))throw new Error('robots_disallowed');
  return cached.body.split(/\r?\n/).filter(line => /^sitemap:/i.test(line.trim())).slice(0, 5)
    .map(line => permittedPage(line.slice(line.indexOf(':') + 1).trim(), source))
    .filter((value): value is string => Boolean(value && /\.xml$/i.test(new URL(value).pathname)));
}
export async function fetchOfficialPage(source:CollectionSource,target:string,conditional?:{etag?:string;modified?:string}){
  const initial=permittedPage(target,source);if(!initial)throw new Error('untrusted_target');
  let url:string=initial;
  for(let redirects=0;redirects<4;redirects++){
    const sitemaps = await checkRobots(new URL(url),source);
    const headers:Record<string,string>={'user-agent':AGENT,accept:'text/html,application/xhtml+xml,application/json,application/xml,text/xml'};
    if(source.id.startsWith('official:livenation-') && new URL(url).pathname==='/api/search/events') { headers['X-Site']=new URL(url).hostname; headers['X-Culture']=({TW:'zh-TW',HK:'zh-HK',SG:'en-SG',MY:'en-MY',PH:'en-PH',KR:'ko-KR',JP:'ja-JP',TH:'th-TH'} as Record<string,string>)[source.market]??'en'; }
    if(conditional?.etag)headers['if-none-match']=conditional.etag;
    if(conditional?.modified)headers['if-modified-since']=conditional.modified;
    const response=await fetch(url,{headers,redirect:'manual',signal:AbortSignal.timeout(10000),cache:'no-store'});
    if(response.status===304)return{url,sitemaps,status:304,body:'',etag:response.headers.get('etag')??undefined,modified:response.headers.get('last-modified')??undefined};
    if(response.status>=300&&response.status<400){const location=response.headers.get('location');
      const next=location?permittedPage(new URL(location,url).toString(),source):undefined;
      if(!next)throw new Error('untrusted_redirect');url=next;conditional=undefined;continue;}
    if(!response.ok)throw new SourceFetchError(response.status, retryAfterDelay(response.headers.get('retry-after')));
    if(!/text\/html|application\/xhtml\+xml/i.test(response.headers.get('content-type')??'') && !(/\.xml$/i.test(new URL(url).pathname) && /(?:application|text)\/xml/i.test(response.headers.get('content-type')??'')) && !(source.id.startsWith('official:livenation-') && new URL(url).pathname==='/api/search/events' && /application\/json/i.test(response.headers.get('content-type')??'')))throw new Error('unsupported_content');
    return{url,sitemaps,status:response.status,body:await boundedResponseText(response),etag:response.headers.get('etag')??undefined,modified:response.headers.get('last-modified')??undefined};
  }
  throw new Error('redirect_limit');
}
