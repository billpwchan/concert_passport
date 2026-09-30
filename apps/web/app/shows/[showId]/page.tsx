import { notFound } from 'next/navigation';
import { EditorialShowOverview } from '@/components/editorial-show-overview';
import { getUpcomingCatalogEvents } from '@/db/events';
import { editorialShowCoversEvent, editorialShows } from '@/lib/editorial/spotlights';
import { getSavedEventsForCurrentSession } from '@/lib/server/saved-events';

export function generateMetadata({ params }: { params: Promise<{ showId: string }> }) {
  return params.then(({ showId }) => {
    const show = editorialShows.find((item) => item.id === showId);
    return show ? {
      title: `${show.artist} · ${show.city} — Concert Passport`,
      description: `${show.tour} · ${show.dateLabel} · ${show.venue}`,
    } : {};
  });
}

export default async function EditorialShowPage({ params }: { params: Promise<{ showId: string }> }) {
  const { showId } = await params;
  const show = editorialShows.find((item) => item.id === showId);
  if (!show) notFound();
  const performances = getUpcomingCatalogEvents(
    500,
    new Date(Date.parse(show.startsAt) - 60_000),
  ).filter((event) => editorialShowCoversEvent(show, event));
  const saved = new Set((await getSavedEventsForCurrentSession()).map((event) => event.id));
  return (
    <EditorialShowOverview
      show={show}
      performances={performances}
      initialSavedIds={performances.filter((event) => saved.has(event.id)).map((event) => event.id)}
    />
  );
}
