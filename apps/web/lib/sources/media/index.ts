import { getArtistMedia, getArtistImageSource, type ArtistMediaRecord } from '@/db/media';
import { syncArtistMediaFromTicketmaster } from './ticketmaster';
import { syncArtistMediaFromWikimedia } from './wikimedia';

export async function syncArtistMedia(artistName:string,force=false):Promise<ArtistMediaRecord|undefined>{
 const errors:string[]=[];
 try{
   await syncArtistMediaFromTicketmaster(artistName,force);
   if(getArtistImageSource(artistName)?.provider==='ticketmaster-discovery')return getArtistMedia(artistName);
 }catch(error){errors.push(error instanceof Error?error.message:'Ticketmaster media failed');}
 try{await syncArtistMediaFromWikimedia(artistName,force);}
 catch(error){errors.push(error instanceof Error?error.message:'Wikimedia media failed');}
 if(getArtistImageSource(artistName))return getArtistMedia(artistName);
 if(errors.length)throw new Error(errors.join('; '));
 return undefined;
}
