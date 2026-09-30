import { load } from 'cheerio';
import { sourceRegistry } from '../sources/registry.ts';
import { canonicalizeCandidateUrl } from '../sources/link-resolution/trusted-sources.ts';

export type CollectionSource={id:string;market:string;name:string;seeds:string[];hosts:string[];eventPath:RegExp};
// Explicitly bounded public roots; these are collector configurations, not a claim of coverage.
export const collectionSources:CollectionSource[]=sourceRegistry
  .filter(source=>source.markets.length===1 && ['promoter','ticketing','venue'].includes(source.category))
  .map(source=>({id:`official:${source.id}`,market:source.markets[0],name:source.name,
    seeds:source.id==='the-star-sg' ? [source.url]
      : source.id==='livenation-tw' ? [source.url,'https://www.livenation.com.tw/en/event/allevents']
      : source.id==='livenation-jp' ? ['https://www.livenationhip.co.jp/'] : source.id==='livenation-sg' ? [source.url,'https://www.livenation.sg/asian'] : [source.url],
    hosts:[new URL(source.url).hostname,source.host,...(source.id==='livenation-jp'?['www.livenationhip.co.jp']:[])],
    eventPath:/\/(?:all-events|event|events|concert|concerts|activity|performance|shows?|tour|tickets?|product|goods|program|artist|whats-on)(?:\/|-|\?|$)|-tickets-edp\d+/i}));
for (const source of collectionSources) if(source.id.startsWith('official:livenation-')) source.seeds.unshift(new URL('/api/search/events?PageSize=50&Page=1&IncludeCancelled=true&IncludePostponed=true',source.seeds[0]).toString());
export function collectionSource(id:string){return collectionSources.find(source=>source.id===id);}
export function permittedPage(value:string,source:CollectionSource):string|undefined {
  try {
    const url=new URL(canonicalizeCandidateUrl(value));
    if(url.protocol!=='https:'||url.username||url.password||(url.port&&url.port!=='443'))return;
    if(!source.hosts.some(host=>url.hostname===host || url.hostname===`www.${host}`))return;
    if(/\.(?:pdf|jpg|png|gif|webp|svg|zip|mp4|css|js)(?:$|\?)/i.test(url.pathname))return;
    if(/\b(?:logout|checkout|cart|payment|login|register|account|purchase)\b/i.test(url.pathname))return;
    if(/[\"<>\\]/.test(decodeURIComponent(url.pathname)) || /https?:\/\//i.test(url.pathname))return;
    if(url.toString().length>1000)return;
    return url.toString();
  }catch{return;}
}
export function discoverPageLinks(html:string,base:string,source:CollectionSource):string[]{
  const links=new Set<string>();
  const $ = load(html);
  $('a[href]').each((_, element) => {
    if (links.size >= 100) return false;
    try {
      const value = permittedPage(new URL($(element).attr('href')!, base).toString(), source);
      if (value && source.eventPath.test(new URL(value).pathname)) links.add(value);
    } catch { /* Broken links are not frontier work. */ }
  });
  return [...links];
}
