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
        eyebrowKey="sources.eyebrow"
        titleKey="sources.title"
        descriptionKey="sources.description"
      />
      <SourceDirectory
        sources={sourceRegistry.filter(
          (source) => source.category !== 'event_api' && source.category !== 'artist_identity',
        )}
        connectors={eventSourceAdapters.map((adapter) => adapter.health())}
      />
    </>
  );
}
