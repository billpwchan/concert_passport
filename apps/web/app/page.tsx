import { PageHeader } from '@/components/page-header';
import { TodayDashboard } from '@/components/today-dashboard';
import { demoJourneys } from '@/lib/domain/demo';

export default function Home() {
  return (
    <>
      <PageHeader
        eyebrow="SATURDAY · 22 AUGUST"
        title="Everything important, in order."
        description="Your protected K-pop journeys across Asia — with every prerequisite, deadline, and source in one place."
        side={
          <div className="home-time">
            <span>HOME TIME</span>
            <strong>11:42 SGT</strong>
          </div>
        }
      />
      <TodayDashboard journeys={demoJourneys} />
    </>
  );
}
