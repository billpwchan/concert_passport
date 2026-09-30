'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { CanonicalEventRecord, SavedEventRecord } from '@/db/events';
import { primaryEventHref } from '@/lib/domain/event-link';
import type { DiscoveredEvent, MarketCode } from '@/lib/domain/types';
import { editorialShowCoversEvent, editorialShows } from '@/lib/editorial/spotlights';
import { usePreferences } from './preferences-provider';
import styles from './show-finder.module.css';

const markets: Array<'ALL' | MarketCode> = ['ALL','TW','HK','SG','JP','KR','TH','MY','PH','ID','VN','AU','NZ'];
const fallbackPalettes = [['#695cff','#ff315f'],['#007c82','#c9fbff'],['#ef5b24','#ffe16b'],['#8c31d8','#ff9dcc'],['#083b92','#61dafb']] as const;

function fallbackPalette(value:string){const hash=[...value].reduce((sum,character)=>sum+character.charCodeAt(0),0);return fallbackPalettes[hash%fallbackPalettes.length];}

type FinderShow = {
  id: string;
  canonicalId?: string;
  editorialId?: string;
  artist: string;
  tour: string;
  city: string;
  market: string;
  venue: string;
  startsAt: string;
  dateLabel: string;
  status: string;
  image: string;
  href: string;
  external: boolean;
};

type DiscoveryPayload = { events: DiscoveredEvent[]; errors: Array<{provider:string;message:string}>; error?:string };

function ShowLink({ show, children }: { show: FinderShow; children: React.ReactNode }) {
  return show.external
    ? <a href={show.href} target="_blank" rel="noreferrer">{children}</a>
    : <Link href={show.href}>{children}</Link>;
}

function formatDate(startsAt: string, locale: string, timezone = 'UTC') {
  return new Intl.DateTimeFormat(locale,{day:'2-digit',month:'short',timeZone:timezone}).format(new Date(startsAt)).toUpperCase();
}

export function ShowFinder({ catalogEvents, savedEvents, nowIso }: { catalogEvents: CanonicalEventRecord[]; savedEvents: SavedEventRecord[]; nowIso: string }) {
  const searchParams = useSearchParams();
  const { dateLocale, t } = usePreferences();
  const [mode,setMode] = useState<'artist'|'trip'>(()=>searchParams.get('mode')==='trip'?'trip':'artist');
  const [artist,setArtist] = useState(()=>searchParams.get('artist')?.slice(0,100)??'');
  const [market,setMarket] = useState<'ALL'|MarketCode>(()=>markets.includes(searchParams.get('market') as 'ALL'|MarketCode)?searchParams.get('market') as 'ALL'|MarketCode:'ALL');
  const [startDate,setStartDate] = useState(nowIso.slice(0,10));
  const [endDate,setEndDate] = useState(()=>new Date(Date.parse(nowIso)+365*86_400_000).toISOString().slice(0,10));
  const [live,setLive] = useState<DiscoveredEvent[]>([]);
  const [searched,setSearched] = useState(false);
  const [searching,setSearching] = useState(false);
  const [message,setMessage] = useState('');
  const [savedCatalog,setSavedCatalog] = useState(()=>new Set(savedEvents.map(event=>event.id)));

  const initialShows = useMemo<FinderShow[]>(()=>{
    const editorial:FinderShow[] = editorialShows.map(show=>{
      const canonicalId=catalogEvents.find(event=>editorialShowCoversEvent(show,event))?.id;
      const internalHref=show.external?`/shows/${encodeURIComponent(show.id)}`:show.href;
      return {id:show.id,editorialId:show.id,canonicalId,artist:show.artist,tour:show.tour,city:show.city,market:show.market,venue:show.venue,startsAt:show.startsAt,dateLabel:show.dateLabel,status:t('event.listing'),image:show.image,href:internalHref,external:false};
    });
    const catalog = catalogEvents.filter(event=>!editorialShows.some(show=>editorialShowCoversEvent(show,event))).map<FinderShow>(event=>{
      const target=primaryEventHref(event);
      return {id:event.id,canonicalId:event.id,artist:event.artist??event.name,tour:event.name,city:event.city??event.countryCode??'—',market:event.countryCode??'—',venue:event.venue??'',startsAt:event.startsAt,dateLabel:formatDate(event.startsAt,dateLocale,event.timezone),status:t(event.bestLinkRole==='ticket'?'common.officialTickets':event.bestLinkRole?'common.officialEvent':'event.listing'),image:`/api/v1/events/${encodeURIComponent(event.id)}/image`,href:target.href,external:target.external};
    });
    return [...editorial,...catalog].sort((a,b)=>Date.parse(a.startsAt)-Date.parse(b.startsAt));
  },[catalogEvents,dateLocale,t]);

  const liveShows = useMemo<FinderShow[]>(()=>live.map(event=>{
    const target=primaryEventHref(event);
    return {id:`${event.provider}-${event.providerEventId}`,canonicalId:event.canonicalId,artist:event.artist??(artist||event.name),tour:event.name,city:event.city??event.countryCode??'—',market:event.countryCode??'—',venue:event.venue??'',startsAt:event.startsAt,dateLabel:formatDate(event.startsAt,dateLocale,event.timezone),status:t(event.bestLinkRole==='ticket'?'common.officialTickets':event.bestLinkRole?'common.officialEvent':'event.listing'),image:event.canonicalId?`/api/v1/events/${encodeURIComponent(event.canonicalId)}/image`:`/api/v1/artists/${encodeURIComponent(event.artist??artist??event.name)}/image`,href:target.href,external:target.external};
  }),[artist,dateLocale,live,t]);

  const base = searched ? liveShows : initialShows;
  const artistQuery=artist.trim().toLocaleLowerCase('en-US');
  const subjectMatches=mode==='artist'&&artistQuery
    ? base.filter(show=>show.artist.trim().toLocaleLowerCase('en-US')===artistQuery)
    : base;
  const visible = (market==='ALL'?subjectMatches:subjectMatches.filter(show=>show.market===market)).filter(show=>Date.parse(show.startsAt)>=Date.parse(`${startDate}T00:00:00Z`)&&Date.parse(show.startsAt)<=Date.parse(`${endDate}T23:59:59Z`));

  async function runSearch() {
    if(mode==='artist'&&!artist.trim()){setMessage(t('finder.artistRequired'));return;}
    if(mode==='trip'&&market==='ALL'){setMessage(t('finder.marketRequired'));return;}
    setSearching(true);setMessage('');
    const params=new URLSearchParams({startDateTime:`${startDate}T00:00:00.000Z`,endDateTime:`${endDate}T23:59:59.999Z`});
    if(mode==='artist'&&artist.trim())params.set('artist',artist.trim());
    if(market!=='ALL')params.set('countryCode',market);
    try{
      const response=await fetch(`/api/v1/discover?${params}`);
      const payload=await response.json() as DiscoveryPayload;
      if(!response.ok)throw new Error(payload.error??t('finder.searchUnavailable'));
      setLive(payload.events);setSearched(true);
      if(!payload.events.length)setMessage(t('finder.noDates'));
    }catch(error){setMessage(error instanceof Error?error.message:t('finder.searchUnavailable'));}
    finally{setSearching(false);}
  }

  async function toggleSave(show:FinderShow){
    if(show.canonicalId){
      const isSaved=savedCatalog.has(show.canonicalId);
      const response=await fetch('/api/v1/plans',{method:isSaved?'DELETE':'POST',headers:{'content-type':'application/json'},body:JSON.stringify({eventId:show.canonicalId})});
      if(response.ok)setSavedCatalog(current=>{
        const next=new Set(current);
        if(isSaved)next.delete(show.canonicalId!);else next.add(show.canonicalId!);
        return next;
      });
      return;
    }
    // Editorial multi-day cards are containers. Users choose and save an exact
    // canonical performance inside the Show Hub.
  }

  return (
    <div className={styles.finder}>
      <section className={styles.searchPanel}>
        <div className={styles.modeSwitch}>
          <button className={mode==='artist'?styles.active:''} type="button" onClick={()=>{setMode('artist');setSearched(false);}}>{t('finder.byArtist')}</button>
          <button className={mode==='trip'?styles.active:''} type="button" onClick={()=>{setMode('trip');setSearched(false);}}>{t('finder.byTrip')}</button>
        </div>
        <div className={`${styles.form} ${mode==='trip'?styles.tripForm:''}`}>
          {mode==='artist'?<label className={styles.field}><span>{t('finder.artist')}</span><input value={artist} onChange={event=>{setArtist(event.target.value);setSearched(false);}} onKeyDown={event=>{if(event.key==='Enter')void runSearch();}} placeholder="ITZY, IVE, BTS…" /></label>:null}
          <label className={styles.field}><span>{t('finder.market')}</span><select value={market} onChange={event=>{setMarket(event.target.value as 'ALL'|MarketCode);setSearched(false);}}>{markets.map(item=><option value={item} key={item}>{item==='ALL'?t('market.ALL'):item}</option>)}</select></label>
          <label className={styles.field}><span>{t('finder.dates')}</span><span className={styles.dates}><input type="date" value={startDate} onChange={event=>setStartDate(event.target.value)}/><i>—</i><input type="date" min={startDate} value={endDate} onChange={event=>setEndDate(event.target.value)}/></span></label>
          <button className={styles.submit} type="button" onClick={()=>void runSearch()} disabled={searching}>{t(searching?'finder.searching':'finder.search')}<span>↗</span></button>
        </div>
        <p className={styles.status} role="status">{message}</p>
      </section>

      <section className={styles.results}>
        <header className={styles.resultHead}><div><span>{t(searched?'finder.liveResults':'finder.upcoming')}</span><h2>{searched?t('finder.resultsFor',{subject:artist||market}):t('home.upcomingTitle')}</h2></div><div className={styles.marketChips}>{markets.slice(0,8).map(item=><button className={market===item?styles.active:''} type="button" onClick={()=>{setMarket(item);if(!searched)setSearched(false);}} key={item}>{item==='ALL'?t('market.ALL'):item}</button>)}</div></header>
        <motion.div className={styles.grid} layout>
          {visible.map((show,index)=>{
            const saved=Boolean(show.canonicalId&&savedCatalog.has(show.canonicalId));
            const [fallbackA,fallbackB]=fallbackPalette(show.artist);
            return <motion.article className={styles.card} layout initial={{opacity:0,y:35}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.15}} transition={{delay:Math.min(index*.05,.24),duration:.65,ease:[.16,1,.3,1]}} key={show.id}>
              <ShowLink show={show}><div className={styles.visual}>{show.image?<div className={styles.image} style={{backgroundImage:`url("${show.image}")`}} role="img" aria-label={`${show.artist} ${show.tour}`}/>:<div className={styles.imageFallback} style={{'--fallback-a':fallbackA,'--fallback-b':fallbackB} as React.CSSProperties} role="img" aria-label={show.artist}><strong>{show.artist}</strong><span>{show.market} · {show.dateLabel}</span></div>}<em>{show.status.toUpperCase()}</em><time>{show.dateLabel} · {new Date(show.startsAt).getUTCFullYear()}</time></div><div className={styles.copy}><span><strong>{show.artist}</strong><small>{show.city} · {show.venue}</small></span><i>{show.external?'↗':'→'}</i></div></ShowLink>
              {!show.editorialId?<button className={`${styles.save} ${saved?styles.saved:''}`} type="button" onClick={()=>void toggleSave(show)} aria-label={t(saved?'finder.saved':'finder.save')}>{saved?'✓':'+'}</button>:null}
            </motion.article>;
          })}
          {!visible.length?<div className={styles.empty}><h3>{t('finder.noDates')}</h3><p>{t('finder.emptyHint')}</p></div>:null}
        </motion.div>
      </section>

      <section className={styles.intro}>
        <div className={styles.introCopy}><span className={styles.eyebrow}>{t('finder.eyebrow')}</span><h1>{t('finder.title')}</h1><p>{t('finder.description')}</p></div>
        <div className={styles.introCollage} aria-hidden="true">
          {[editorialShows[1],editorialShows[0],editorialShows[5]].map((show)=><div className={styles.collageCard} style={{backgroundImage:`url("${show.image}")`}} key={show.id}><span><i>{show.artist}</i><i>{show.dateLabel}</i></span></div>)}
        </div>
      </section>
    </div>
  );
}
