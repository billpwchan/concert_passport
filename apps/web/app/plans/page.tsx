import { PageHeader } from '@/components/page-header';
import { SavedShowsDirectory } from '@/components/saved-shows-directory';
import { getSavedEventsForCurrentSession } from '@/lib/server/saved-events';

export const metadata = {
  title: 'Plans — Concert Passport',
  description: 'Saved shows, ticket windows and official event links.',
};

export default async function PlansPage() {
  const events = await getSavedEventsForCurrentSession();
  return (
    <>
      <PageHeader
        eyebrowKey="plans.eyebrow"
        titleKey="plans.title"
        descriptionKey="plans.description"
      />
      <div className="page-body plans-platform-page">
        <SavedShowsDirectory events={events} />
      </div>
    </>
  );
}
