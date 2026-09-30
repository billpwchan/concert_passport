import ItzyTaipeiExperience from '@/app/_show-experiences/itzy-taipei-2026/page';
import { getUpcomingCatalogEvents } from '@/db/events';
import { editorialShowCoversEvent, editorialShows } from '@/lib/editorial/spotlights';
import { getSavedEventsForCurrentSession } from '@/lib/server/saved-events';

export default async function ItzyTaipeiPage() {
  const show = editorialShows.find((item) => item.id === 'itzy-taipei-2026')!;
  const event = getUpcomingCatalogEvents(
    500,
    new Date(Date.parse(show.startsAt) - 60_000),
  ).find((candidate) => editorialShowCoversEvent(show, candidate));
  const saved = event
    ? (await getSavedEventsForCurrentSession()).some((candidate) => candidate.id === event.id)
    : false;
  return <ItzyTaipeiExperience canonicalEventId={event?.id} initialSaved={saved} />;
}
