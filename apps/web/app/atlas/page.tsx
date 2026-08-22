import { AtlasExplorer } from '@/components/atlas-explorer';
import { PageHeader } from '@/components/page-header';
import { getUpcomingCatalogEvents } from '@/db/events';
import { getSavedEventsForCurrentSession } from '@/lib/server/saved-events';

export const metadata = {
  title: 'Atlas — Concert Passport',
  description: 'Find K-pop shows across your Asia travel windows.',
};

export default async function AtlasPage() {
  const windowStartsAt = new Date().toISOString();
  const [savedEvents, catalogEvents] = await Promise.all([
    getSavedEventsForCurrentSession(),
    Promise.resolve(getUpcomingCatalogEvents(36)),
  ]);
  return (
    <>
      <PageHeader
        eyebrowKey="atlas.eyebrow"
        titleKey="atlas.title"
        descriptionKey="atlas.description"
      />
      <AtlasExplorer savedEvents={savedEvents} catalogEvents={catalogEvents} windowStartsAt={windowStartsAt} />
    </>
  );
}
