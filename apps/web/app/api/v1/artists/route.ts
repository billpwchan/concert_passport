import {
  getArtistCatalogSummary,
  getMarketCoverage,
  searchArtistCatalog,
} from '@/db/artists';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const query = new URL(request.url).searchParams.get('q')?.trim().slice(0, 80) ?? '';
  return Response.json({
    artists: query.length
      ? searchArtistCatalog(query, 8).map((artist) => ({
          id: artist.id,
          name: artist.canonicalName,
          type: artist.artistType,
          countryCode: artist.countryCode,
          aliases: artist.aliases.slice(0, 4),
          verified: artist.status === 'verified',
        }))
      : [],
    summary: getArtistCatalogSummary(),
    markets: getMarketCoverage(),
  }, {
    headers: { 'cache-control': query ? 'public, max-age=300' : 'public, max-age=900' },
  });
}
