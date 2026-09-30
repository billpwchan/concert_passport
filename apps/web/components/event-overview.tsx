'use client';
import Link from 'next/link';
import type { getEventEnrichment } from '@/db/coverage';
import { SourceCorrectionForm } from './source-correction-form';
import type { CanonicalEventRecord, EventChange } from '@/db/events';
import type { MessageKey } from '@/lib/i18n';
import { formatVenueTime } from '@/lib/domain/lifecycle';
import { eventFreshness, hasConfirmedPerformanceTime } from '@/lib/domain/discovery';
import { eventLinkActionKey, linkSourceName, verifiedEventHref } from '@/lib/domain/event-link';
import { EventArtwork } from './event-artwork';
import { SaveEventButton } from './save-event-button';
import { usePreferences } from './preferences-provider';

export function EventOverview({ event, initialSaved, changes = [], enrichment, timingConflict = false }: { timingConflict?: boolean; event: CanonicalEventRecord; initialSaved: boolean; changes?: EventChange[]; enrichment?: ReturnType<typeof getEventEnrichment> }) {
  const { dateLocale, t } = usePreferences();
  const href = event.publicationQuarantined ? undefined : verifiedEventHref(event);
  const formatCheck = (value?: number | string) => value && Number.isFinite(new Date(value).getTime()) ? new Intl.DateTimeFormat(dateLocale, { dateStyle: 'medium', timeStyle: 'short', timeZone: event.timezone ?? 'UTC' }).format(new Date(value)) : t('explore.unknown');
  const stopped = event.lifecycleStatus === 'cancelled' || event.lifecycleStatus === 'postponed' || event.lifecycleStatus === 'deleted';
  if (event.publicationQuarantined) return <div className="page-body discovery-empty"><h1>{t('event.reviewTitle')}</h1><p>{t('event.reviewDescription')}</p>{initialSaved ? <SaveEventButton eventId={event.id} initialSaved /> : null}<Link href="/plans">{t('explore.savedTitle')} →</Link></div>;
  return <div className="page-body show-detail">
    <Link className="back-link" href="/atlas">← {t('event.back')}</Link>
    <section className="show-detail-hero">
      <div className="show-detail-visual"><EventArtwork name={event.artist ?? event.name} market={event.countryCode} src={event.imageUrl ? `/api/v1/events/${encodeURIComponent(event.id)}/image?v=31` : undefined} priority sizes="(max-width: 760px) 100vw, 650px" />
        {event.imageUrl && event.imageSourceUrl ? <a className="art-credit" href={event.imageSourceUrl} target="_blank" rel="noreferrer">{event.imageAttribution ?? t(event.imageKind === 'artist' ? 'collection.artistPhoto' : 'collection.eventArt')} ↗</a> : null}</div>
      <div className="show-detail-intro"><span className="editorial-eyebrow">{event.city ?? event.countryCode} / LIVE</span><h1>{event.artist ?? event.name}</h1><p>{event.name}</p>
        {event.lifecycleStatus ? <span className={`status-tag ${stopped ? 'warning' : ''}`}>{t(`eventStatus.${event.lifecycleStatus}`)}</span> : null}
        <dl className="show-detail-facts"><div><dt>{t('event.date')}</dt><dd>{hasConfirmedPerformanceTime(event) ? formatVenueTime(event.startsAt, event.timezone ?? 'UTC', dateLocale, true) : `${event.startsAt.slice(0, 10)} · ${t('explore.timePending')}`}</dd><small>{event.timezone ?? 'UTC'}</small></div><div><dt>{t('event.venue')}</dt><dd>{event.venue ?? t('plans.venuePending')}</dd><small>{event.city ?? event.countryCode}</small></div></dl>
        {timingConflict && <p className="timing-conflict" role="status">{t('journal.conflict')}</p>}
        <div className="detail-actions"><SaveEventButton eventId={event.id} initialSaved={initialSaved} />{!stopped && !timingConflict && hasConfirmedPerformanceTime(event) ? <a className="button-secondary" href={`/api/v1/events/${encodeURIComponent(event.id)}/calendar`}>{t('explore.calendar')} ↓</a> : null}</div>
        <small className="muted-copy">{t('explore.calendarNote')}</small>
      </div>
    </section>
    <div className="detail-workspace">
      <section className="detail-evidence"><span className="editorial-eyebrow">THE DETAILS THAT MATTER</span><h2>{t('explore.evidence')}</h2>
        <dl className="evidence-list"><div><dt>{t('event.source')}</dt><dd>{linkSourceName(event.provider) ?? event.provider}</dd></div>
          <div><dt>{t('explore.checked')}</dt><dd>{formatCheck(event.dataVerifiedAt)}<small className={`freshness-${eventFreshness(event.dataVerifiedAt)}`}>{t(`freshness.${eventFreshness(event.dataVerifiedAt)}`)}</small></dd></div>
          <div><dt>{t('explore.linkChecked')}</dt><dd>{formatCheck(event.bestLinkVerifiedAt)}</dd></div>
          <div><dt>{t('explore.sale')}</dt><dd>{enrichment?.saleStartsAt ? formatCheck(enrichment.saleStartsAt) : t('explore.saleUnknown')}</dd></div>
        </dl>
        {enrichment ? <div className="enriched-notice"><h3>{t('collection.announcement')}</h3>
          {enrichment.description ? <p>{enrichment.description}</p> : null}
          {enrichment.price ? <p>{t('collection.publishedPrice')} {enrichment.currency} {enrichment.price}</p> : null}
          {enrichment.saleStartsAt ? <p>{t('collection.saleStarts')} {formatCheck(enrichment.saleStartsAt)}</p> : null}
          <a className="text-link" href={enrichment.sourceUrl} target="_blank" rel="noreferrer">{t('collection.original')} ↗</a><small>{t('collection.lastCheck')} {formatCheck(enrichment.observedAt)}</small>
        </div> : null}
        <h3>{t('explore.changes')}</h3>
        {changes.length ? <ol className="event-changes">{changes.map((change) => <li key={change.id}><time>{formatCheck(change.observedAt)}</time><strong>{change.fields.map((field) => t(`change.${field}` as MessageKey)).join(' · ')}</strong></li>)}</ol> : <p className="muted-copy">{t('explore.noChanges')}</p>}
      <details className="event-correction"><summary>{t('collection.correctEvent')}</summary><SourceCorrectionForm eventId={event.id} /></details>
      </section>
      <aside className="ticket-destination"><span className="editorial-eyebrow">OFFICIAL DESTINATION</span><h2>{t(href ? 'event.ticketing' : 'event.linkPending')}</h2><p>{t(href ? 'explore.inventoryNote' : 'event.pendingDescription')}</p>
        {href ? <><div className="seller-identity"><span aria-hidden="true">↗</span><div><strong>{linkSourceName(event.bestLinkSource)}</strong><small>{new URL(href).hostname}</small></div></div><a className="button-primary" href={href} target="_blank" rel="noreferrer">{t(eventLinkActionKey(event.bestLinkRole))} ↗</a></> : <Link className="button-secondary" href="/sources">{t('explore.coverage')}</Link>}
        <p className="muted-copy">{t('explore.catalogNote')}</p>
      </aside>
    </div>
  </div>;
}
