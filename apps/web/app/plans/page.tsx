import { PageHeader } from '@/components/page-header';
import { PlansDirectory } from '@/components/plans-directory';
import { getJourneysForCurrentSession } from '@/lib/server/journeys';

export const metadata = {
  title: 'Plans — Concert Passport',
  description: 'Every protected concert journey, from registration to show day.',
};

export default async function PlansPage() {
  const journeys = await getJourneysForCurrentSession();
  return (
    <>
      <PageHeader
        eyebrowKey="plans.eyebrow"
        titleKey="plans.title"
        descriptionKey="plans.description"
      />
      <PlansDirectory journeys={journeys} />
    </>
  );
}
