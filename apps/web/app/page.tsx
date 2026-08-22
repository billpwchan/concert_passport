import { PageHeader } from '@/components/page-header';
import { TodayDashboard } from '@/components/today-dashboard';
import { getJourneysForCurrentSession } from '@/lib/server/journeys';

export default async function Home() {
  const journeys = await getJourneysForCurrentSession();
  return (
    <>
      <PageHeader
        eyebrowKey="home.eyebrow"
        titleKey="home.title"
        descriptionKey="home.description"
      />
      <TodayDashboard journeys={journeys} />
    </>
  );
}
