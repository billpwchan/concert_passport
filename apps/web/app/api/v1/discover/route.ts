import { discoverAcrossSources, eventSourceAdapters } from '@/lib/sources/adapters';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const query = {
    artist: url.searchParams.get('artist') ?? undefined,
    city: url.searchParams.get('city') ?? undefined,
    countryCode: url.searchParams.get('countryCode') ?? undefined,
    startDateTime: url.searchParams.get('startDateTime') ?? undefined,
    endDateTime: url.searchParams.get('endDateTime') ?? undefined,
  };
  const result = await discoverAcrossSources(query);

  return Response.json({
    ...result,
    connectors: eventSourceAdapters.map((adapter) => adapter.health()),
    generatedAt: new Date().toISOString(),
  });
}
