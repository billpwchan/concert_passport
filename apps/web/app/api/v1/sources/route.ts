import { observedConnectorHealth, officialCollectionHealth } from '@/db/collection';
import { sourceRegistry } from '@/lib/sources/registry';
import { eventSourceAdapters } from '@/lib/sources/adapters';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  return Response.json({
    sources: sourceRegistry,
    connectors: [officialCollectionHealth(), ...eventSourceAdapters.map((adapter) => observedConnectorHealth(adapter.health()))],
    policy: {
      automatedPurchase: false,
      unofficialResale: false,
      verifiedOfficialHandoff: true,
    },
  });
}
