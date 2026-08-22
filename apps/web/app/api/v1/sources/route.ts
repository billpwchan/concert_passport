import { sourceRegistry } from '@/lib/sources/registry';
import { eventSourceAdapters } from '@/lib/sources/adapters';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  return Response.json({
    sources: sourceRegistry,
    connectors: eventSourceAdapters.map((adapter) => adapter.health()),
    policy: {
      automatedPurchase: false,
      unofficialResale: false,
      verifiedOfficialHandoff: true,
    },
  });
}
