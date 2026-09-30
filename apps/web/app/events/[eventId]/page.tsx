import { hasTimingConflict } from '@/lib/collection/conflicts';
import { getEventEnrichment } from '@/db/coverage';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EventOverview } from '@/components/event-overview';
import { getCanonicalEvent, getEventChanges } from '@/db/events';
import { getSavedEventsForCurrentSession } from '@/lib/server/saved-events';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventId: string }>;
}): Promise<Metadata> {
  const event = getCanonicalEvent(decodeURIComponent((await params).eventId));
  return event
    ? event.publicationQuarantined
      ? { title: 'Event review — Concert Passport', robots: { index: false, follow: false } }
      : { title: `${event.artist ?? event.name} — Concert Passport`, description: event.name }
    : { title: 'Event — Concert Passport' };
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const event = getCanonicalEvent(decodeURIComponent((await params).eventId));
  if (!event) notFound();
  const savedEvents = await getSavedEventsForCurrentSession();
  const initialSaved = savedEvents.some((saved) => saved.id === event.id);
  if (event.publicationQuarantined && !initialSaved) notFound();
  return <EventOverview timingConflict={hasTimingConflict(event.id)} enrichment={getEventEnrichment(event.id)} event={event} initialSaved={initialSaved} changes={getEventChanges(event.id)} />;
}
