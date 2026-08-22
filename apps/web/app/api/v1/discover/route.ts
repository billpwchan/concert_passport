import { discoverAcrossSources, eventSourceAdapters } from '@/lib/sources/adapters';
import { DiscoveryInputError, normalizeDiscoveryQuery } from '@/lib/sources/query';
import { discoverRateLimit } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';

type CacheEntry = {
  expiresAt: number;
  payload: Awaited<ReturnType<typeof discoverAcrossSources>>;
};

const resultCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60_000;
const MAX_CACHE_ENTRIES = 100;

export async function GET(request: Request): Promise<Response> {
  const rateLimit = discoverRateLimit(request);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: 'Too many live searches. Try again shortly.' },
      { status: 429, headers: { 'retry-after': String(rateLimit.retryAfter) } },
    );
  }
  const url = new URL(request.url);
  let query;
  try {
    query = normalizeDiscoveryQuery(url.searchParams);
  } catch (error) {
    if (error instanceof DiscoveryInputError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  const cacheKey = JSON.stringify(query);
  const cached = resultCache.get(cacheKey);
  const cacheHit = Boolean(cached && cached.expiresAt > Date.now());
  const result = cacheHit
    ? cached!.payload
    : await discoverAcrossSources(query);

  if (!cacheHit) {
    if (resultCache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = resultCache.keys().next().value;
      if (oldestKey) resultCache.delete(oldestKey);
    }
    resultCache.set(cacheKey, { payload: result, expiresAt: Date.now() + CACHE_TTL_MS });
  }

  return Response.json({
    ...result,
    connectors: eventSourceAdapters.map((adapter) => adapter.health()),
    generatedAt: new Date().toISOString(),
    cached: cacheHit,
  }, {
    headers: {
      'cache-control': 'private, max-age=60',
      'x-ratelimit-remaining': String(rateLimit.remaining),
    },
  });
}
