import data from './city-locations.json' with {type:'json'};
import type { DiscoveredEvent } from './types.ts';
const aliases:Record<string,string> = {'台北':'Taipei','臺北':'Taipei','台北市':'Taipei','臺北市':'Taipei','高雄':'Kaohsiung','高雄市':'Kaohsiung','香港':'Hong Kong','新加坡':'Singapore','首尔':'Seoul','首爾':'Seoul','서울':'Seoul','東京':'Tokyo','东京':'Tokyo','曼谷':'Bangkok','吉隆坡':'Kuala Lumpur'};
export function eventLocation(event: Pick<DiscoveredEvent,'latitude'|'longitude'|'city'|'countryCode'>): {latitude:number;longitude:number;precision:'venue'|'city'} | undefined {
  if (Number.isFinite(event.latitude) && Number.isFinite(event.longitude) && Math.abs(event.latitude!)<=90 && Math.abs(event.longitude!)<=180) return {latitude:event.latitude!,longitude:event.longitude!,precision:'venue'};
  const raw=event.city?.trim() ?? '';
  const city=aliases[raw] ?? raw;
  const entry=data.locations.find(row=>row.market===event.countryCode && row.city.toLowerCase()===city.toLowerCase());
  return entry ? {latitude:entry.latitude,longitude:entry.longitude,precision:'city'} : undefined;
}
