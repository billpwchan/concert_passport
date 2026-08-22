import { PageHeader } from '@/components/page-header';
import { SourceDirectory } from '@/components/source-directory';
import { eventSourceAdapters } from '@/lib/sources/adapters';
import { sourceRegistry } from '@/lib/sources/registry';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Sources — Concert Passport',
  description: 'Curated official K-pop announcement, promoter, and ticketing channels across Asia.',
};

export default function SourcesPage() {
  return (
    <>
      <PageHeader
        eyebrow="SOURCE NETWORK"
        title="Broad coverage. Narrow standards."
        description="We combine official fan notices, promoters, primary ticket sellers, and licensed APIs — while keeping the evidence attached to every deadline."
        side={<div className="source-count"><strong>{sourceRegistry.length}</strong><span>curated channels</span></div>}
      />
      <SourceDirectory
        sources={sourceRegistry}
        connectors={eventSourceAdapters.map((adapter) => adapter.health())}
      />
    </>
  );
}
