import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EventOverview } from '@/components/event-overview';
import { getCanonicalEvent } from '@/db/events';
import { getSavedEventsForCurrentSession } from '@/lib/server/saved-events';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventId: string }>;
}): Promise<Metadata> {
  const event = getCanonicalEvent(decodeURIComponent((await params).eventId));
  return event
    ? { title: `${event.artist ?? event.name} — Concert Passport`, description: event.name }
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
  return <EventOverview event={event} initialSaved={savedEvents.some((saved) => saved.id === event.id)} />;
}
