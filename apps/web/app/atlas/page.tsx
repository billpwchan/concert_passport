import { AtlasExplorer } from '@/components/atlas-explorer';
import { PageHeader } from '@/components/page-header';
import { demoJourneys } from '@/lib/domain/demo';

export const metadata = {
  title: 'Atlas — Concert Passport',
  description: 'Find K-pop shows across your Asia travel windows.',
};

export default function AtlasPage() {
  return (
    <>
      <PageHeader
        eyebrow="ASIA · TRAVEL WINDOW"
        title="Where the next show meets your next trip."
        description="Compare cities, dates, and the next ticket action without losing the regional view."
        side={<div className="atlas-summary"><strong>4</strong><span>cities in range</span></div>}
      />
      <AtlasExplorer journeys={demoJourneys} />
    </>
  );
}
