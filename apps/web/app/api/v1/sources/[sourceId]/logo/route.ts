import { sourceRegistry } from '@/lib/sources/registry';
export async function GET(_request:Request,context:{params:Promise<{sourceId:string}>}){
 const id=decodeURIComponent((await context.params).sourceId).toLowerCase();
 const source=sourceRegistry.find(item=>item.id.toLowerCase()===id||item.host.toLowerCase()===id);
 if(!source)return new Response(null,{status:404});
 const initials=source.name.replace(/[^\p{L}\p{N}]+/gu,' ').split(' ').filter(Boolean).slice(0,2).map(word=>word[0]).join('').toUpperCase();
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#202326"/><text x="32" y="38" fill="#d8d9d5" font-family="sans-serif" font-size="20" text-anchor="middle">${initials}</text></svg>`;
 return new Response(svg,{headers:{'content-type':'image/svg+xml','cache-control':'public, max-age=86400','x-content-type-options':'nosniff','x-concert-passport-logo-kind':'source-monogram'}});
}
