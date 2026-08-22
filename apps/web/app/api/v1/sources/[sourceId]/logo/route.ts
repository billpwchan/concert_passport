import { sourceRegistry } from '@/lib/sources/registry';

export const revalidate = 604_800;
let logoFetchQueue: Promise<void> = Promise.resolve();

function queueLogoFetch<T>(task: () => Promise<T>): Promise<T> {
  const result = logoFetchQueue.then(task, task);
  logoFetchQueue = result.then(() => undefined, () => undefined);
  return result;
}

async function fetchLogo(url: string): Promise<{ body: ArrayBuffer; contentType: string } | undefined> {
  try {
    const response = await fetch(url, {
      headers: { accept: 'image/avif,image/webp,image/png,image/*' },
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
    });
    const contentType = response.headers.get('content-type') ?? '';
    if (!response.ok || !contentType.startsWith('image/')) return undefined;
    const body = await response.arrayBuffer();
    return body.byteLength > 128 ? { body, contentType } : undefined;
  } catch {
    return undefined;
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ sourceId: string }> },
): Promise<Response> {
  const sourceId = decodeURIComponent((await context.params).sourceId).toLowerCase();
  const source = sourceRegistry.find(
    (item) => item.id.toLowerCase() === sourceId || item.host.toLowerCase() === sourceId,
  );
  if (!source) return new Response(null, { status: 404 });

  const logoHost = new URL(source.url).hostname;
  const googleUrl = `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(`https://${logoHost}`)}`;
  const logo = await queueLogoFetch(async () => (
    await fetchLogo(googleUrl)
      ?? await fetchLogo(`https://icons.duckduckgo.com/ip3/${logoHost}.ico`)
  ));
  if (!logo) return new Response(null, { status: 404 });
  return new Response(logo.body, {
    headers: {
      'content-type': logo.contentType,
      'cache-control': 'public, max-age=604800, stale-while-revalidate=2592000',
      'x-content-type-options': 'nosniff',
    },
  });
}
