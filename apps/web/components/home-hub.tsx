'use client';
import Link from 'next/link';
import type { CanonicalEventRecord, SavedEventRecord } from '@/db/events';
import { eventDetailHref } from '@/lib/domain/event-link';
import { formatVenueTime } from '@/lib/domain/lifecycle';
import { eventFreshness, hasConfirmedPerformanceTime } from '@/lib/domain/discovery';
import { EventArtwork } from './event-artwork';
import { EventCard } from './event-card';
import { usePreferences } from './preferences-provider';

const destinations = [{city:'SEOUL',market:'KR'},{city:'TAIPEI',market:'TW'},{city:'SINGAPORE',market:'SG'},{city:'TOKYO',market:'JP'},{city:'BANGKOK',market:'TH'},{city:'HONG KONG',market:'HK'}];
export function HomeHub({ events, catalogEvents, nowIso }: { events: SavedEventRecord[]; catalogEvents: CanonicalEventRecord[]; signedIn: boolean; nowIso: string }) {
  const { t, dateLocale } = usePreferences();
  const savedIds = new Set(events.map(event => event.id));
  const nextSaved = events.filter(event => Date.parse(event.startsAt) >= Date.parse(nowIso)).slice(0, 3);
  const featured = catalogEvents.find(event => event.imageUrl && event.imageKind === 'event' && !event.timingConflict && !event.publicationQuarantined && ['fresh','aging'].includes(eventFreshness(event.dataVerifiedAt, Date.parse(nowIso))) && (!event.lifecycleStatus || event.lifecycleStatus === 'scheduled'));
  const artists = [...new Set(catalogEvents.map(event => event.artist).filter((artist): artist is string => Boolean(artist)))].slice(0,5);
  return <div className="page-body discovery-home">
    <section className={`editorial-hero${featured ? '' : ' no-feature'}`}>
      <div className="editorial-hero-copy">
        <span className="editorial-eyebrow">{t('explore.eyebrow')}</span>
        <h1>{t('explore.homeTitle')}</h1>
        <p>{t('explore.homeBody')}</p>
        <form action="/atlas" className="editorial-search">
          <label><span className="sr-only">{t('explore.searchHint')}</span><input name="artist" placeholder={t('explore.searchHint')} maxLength={80} /></label>
          <button type="submit" aria-label={t('explore.search')}>↗</button>
        </form>
        {artists.length > 0 && <div className="artist-picks"><span>{t('explore.trending')}</span>{artists.map(artist => <Link key={artist} href={`/atlas?artist=${encodeURIComponent(artist)}`}>{artist}</Link>)}</div>}
        <Link className="editorial-browse" href="/atlas">{t('explore.browse')} <span>→</span></Link>
      </div>
      {featured && <article className="featured-performance">
        <div className="feature-overline"><span>{t('explore.upcoming')}</span><span>{featured.city} / {featured.countryCode}</span></div>
        <Link className="feature-photo" href={eventDetailHref(featured)} aria-label={`${featured.artist} · ${t('explore.details')}`}>
          <EventArtwork name={featured.artist ?? featured.name} market={featured.countryCode} src={`/api/v1/events/${encodeURIComponent(featured.id)}/image?v=32`} priority sizes="(max-width:760px) 100vw, 720px" />
          <span className="feature-open" aria-hidden="true">↗</span>
        </Link>
        <div className="feature-caption"><Link href={eventDetailHref(featured)}><h2>{featured.artist ?? featured.name}</h2><p>{featured.name}</p></Link>
          <div><time dateTime={featured.startsAt}>{hasConfirmedPerformanceTime(featured) ? formatVenueTime(featured.startsAt,featured.timezone ?? 'UTC',dateLocale,true) : `${featured.startsAt.slice(0,10)} · ${t('explore.timePending')}`}</time><span>{featured.venue}</span></div>
        </div>
        {featured.imageSourceUrl && <a className="feature-credit" href={featured.imageSourceUrl} target="_blank" rel="noreferrer">{t(featured.imageKind === 'artist' ? 'collection.artistPhoto' : 'collection.eventArt')} ↗</a>}
      </article>}
    </section>
    <nav className="destination-index" aria-label={t('passport.market')}>{destinations.map(({city,market},i) => <Link href={`/atlas?market=${market}`} key={market}><small>0{i+1}</small><span>{city}</span><i>↗</i></Link>)}</nav>
    {nextSaved.length > 0 && <section className="discovery-section">
      <header className="discovery-section-head"><div><span className="editorial-eyebrow">YOUR SHORTLIST</span><h2>{t('explore.savedTitle')}</h2><p>{t('explore.savedBody')}</p></div><Link className="text-link" href="/plans">{t('home.allSavedShows')} →</Link></header>
      <div className="show-grid">{nextSaved.map(event => <EventCard key={event.id} event={event} saved />)}</div>
    </section>}
    <section className="discovery-section">
      <header className="discovery-section-head"><div><span className="editorial-eyebrow">{t('explore.curated')}</span><h2>{t('explore.upcoming')}</h2><p>{t('explore.upcomingBody')}</p></div><Link className="text-link" href="/atlas">{t('explore.viewAll')}</Link></header>
      {catalogEvents.length ? <div className="show-grid">{catalogEvents.slice(0,6).map(event => <EventCard key={event.id} event={event} saved={savedIds.has(event.id)} />)}</div>
        : <div className="discovery-empty"><h3>{t('explore.emptyTitle')}</h3><p>{t('explore.emptyBody')}</p><Link className="text-link" href="/sources">{t('explore.coverage')} →</Link></div>}
      <p className="coverage-note">{t('explore.catalogNote')} <Link href="/sources">{t('explore.coverage')}</Link></p>
    </section>
    <section className="journey-principles">{([1,2,3] as const).map(step => <div key={step}><span>0{step}</span><h3>{t(`explore.step${step}`)}</h3><p>{t(`explore.step${step}Body`)}</p></div>)}</section>
  </div>;
}
