import { AtlasExplorer } from '@/components/atlas-explorer';
import { PageHeader } from '@/components/page-header';
import { getJourneysForCurrentSession } from '@/lib/server/journeys';

export const metadata = {
  title: 'Atlas — Concert Passport',
  description: 'Find K-pop shows across your Asia travel windows.',
};

export default async function AtlasPage() {
  const windowStartsAt = new Date().toISOString();
  const journeys = await getJourneysForCurrentSession();
  return (
    <>
      <PageHeader
        eyebrowKey="atlas.eyebrow"
        titleKey="atlas.title"
        descriptionKey="atlas.description"
      />
      <AtlasExplorer journeys={journeys} windowStartsAt={windowStartsAt} />
    </>
  );
}
