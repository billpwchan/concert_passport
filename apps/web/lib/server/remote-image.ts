import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { isAllowedTicketmasterImageUrl } from '@/lib/sources/ticketmaster-client';
import { isAllowedWikimediaImageUrl } from '@/lib/sources/media/wikimedia';
import { trustedSourceForUrl } from '@/lib/sources/link-resolution/trusted-sources';
import type { RemoteMediaSource } from '@/db/media';
import { isSafeStoredMediaUrl } from './media-url.ts';

const acceptedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_CACHE_BYTES = 512 * 1024 * 1024;
const CACHE_TTL_MS = 7 * 86_400_000;
let lastPrunedAt = 0;

type CachedImage = { body: Buffer; contentType: string };

function officialPageMediaAllowed(source: RemoteMediaSource): boolean {
  return Boolean(trustedSourceForUrl(source.sourceUrl)) && isSafeStoredMediaUrl(source.imageUrl);
}

function mediaCacheRoot(): string {
  if (process.env.CONCERT_PASSPORT_MEDIA_CACHE_PATH) {
    return process.env.CONCERT_PASSPORT_MEDIA_CACHE_PATH;
  }
  const databasePath = process.env.CONCERT_PASSPORT_DB_PATH
    ?? join(process.cwd(), 'data', 'concert-passport.sqlite');
  return join(dirname(databasePath), 'media-cache');
}

function cachePaths(imageUrl: string) {
  const key = createHash('sha256').update(imageUrl).digest('hex');
  const root = mediaCacheRoot();
  return { root, body: join(root, `${key}.bin`), meta: join(root, `${key}.json`) };
}

async function readCachedImage(imageUrl: string): Promise<CachedImage | undefined> {
  const paths = cachePaths(imageUrl);
  try {
    const [body, metadata, bodyStats] = await Promise.all([
      readFile(/* turbopackIgnore: true */ paths.body),
      readFile(/* turbopackIgnore: true */ paths.meta, 'utf8'),
      stat(/* turbopackIgnore: true */ paths.body),
    ]);
    const parsed = JSON.parse(metadata) as { contentType?: string; sourceUrl?: string };
    if (bodyStats.mtimeMs + CACHE_TTL_MS < Date.now()
      || body.byteLength < 256
      || body.byteLength > MAX_IMAGE_BYTES
      || parsed.sourceUrl !== imageUrl
      || !acceptedTypes.has(parsed.contentType ?? '')) return undefined;
    return { body, contentType: parsed.contentType! };
  } catch {
    return undefined;
  }
}

async function pruneMediaCache(root: string): Promise<void> {
  if (Date.now() - lastPrunedAt < 60 * 60_000) return;
  lastPrunedAt = Date.now();
  try {
    const files = (await readdir(root)).filter((file) => file.endsWith('.bin'));
    const entries = await Promise.all(files.map(async (file) => {
      const filePath = join(root, file);
      const fileStat = await stat(filePath);
      return { file, filePath, size: fileStat.size, mtimeMs: fileStat.mtimeMs };
    }));
    let total = entries.reduce((sum, entry) => sum + entry.size, 0);
    for (const entry of entries.sort((left, right) => left.mtimeMs - right.mtimeMs)) {
      if (total <= MAX_CACHE_BYTES) break;
      await Promise.allSettled([
        unlink(entry.filePath),
        unlink(join(root, entry.file.replace(/\.bin$/, '.json'))),
      ]);
      total -= entry.size;
    }
  } catch {
    // A cache that cannot be pruned must never make a valid image unavailable.
  }
}

async function writeCachedImage(imageUrl: string, contentType: string, body: Buffer): Promise<void> {
  const paths = cachePaths(imageUrl);
  const suffix = `${process.pid}-${randomUUID()}`;
  const temporaryBody = `${paths.body}.${suffix}`;
  const temporaryMeta = `${paths.meta}.${suffix}`;
  try {
    await mkdir(paths.root, { recursive: true });
    await Promise.all([
      writeFile(temporaryBody, body, { mode: 0o600 }),
      writeFile(temporaryMeta, JSON.stringify({ sourceUrl: imageUrl, contentType }), { mode: 0o600 }),
    ]);
    await Promise.all([rename(temporaryBody, paths.body), rename(temporaryMeta, paths.meta)]);
    await pruneMediaCache(paths.root);
  } catch {
    await Promise.allSettled([unlink(temporaryBody), unlink(temporaryMeta)]);
  }
}

function imageResponse(image: CachedImage, cacheStatus: 'HIT' | 'MISS'): Response {
  const body = new Uint8Array(image.body.byteLength);
  body.set(image.body);
  return new Response(body, {
    headers: {
      'content-type': image.contentType,
      'cache-control': 'public, max-age=86400, stale-while-revalidate=604800',
      'x-content-type-options': 'nosniff',
      'x-concert-passport-cache': cacheStatus,
    },
  });
}

export async function proxyRemoteMediaImage(source: RemoteMediaSource): Promise<Response> {
  const allowed = isAllowedTicketmasterImageUrl(source.imageUrl)
    || isAllowedWikimediaImageUrl(source.imageUrl)
    || officialPageMediaAllowed(source);
  if (!allowed) return new Response(null, { status: 404 });
  const cached = await readCachedImage(source.imageUrl);
  if (cached) return imageResponse(cached, 'HIT');
  try {
    let target = source.imageUrl;
    let response: Response | undefined;
    for (let redirects = 0; redirects <= 3; redirects += 1) {
      if (!isSafeStoredMediaUrl(target)) return new Response(null, { status: 404 });
      response = await fetch(target, {
        headers: { accept: 'image/avif,image/webp,image/jpeg,image/png,image/*' },
        cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(8_000),
      });
      if (response.status < 300 || response.status >= 400) break;
      const location = response.headers.get('location');
      if (!location) return new Response(null, { status: 404 });
      target = new URL(location, target).toString();
    }
    if (!response) return new Response(null, { status: 404 });
    const contentType = (response.headers.get('content-type') ?? '').split(';')[0];
    const declaredSize = Number(response.headers.get('content-length') ?? 0);
    if (!response.ok || !acceptedTypes.has(contentType) || declaredSize > MAX_IMAGE_BYTES) {
      return new Response(null, { status: 404 });
    }
    if (!response.body) return new Response(null, { status: 404 });
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_IMAGE_BYTES) { await reader.cancel(); return new Response(null, { status: 404 }); }
      chunks.push(value);
    }
    const body = Buffer.concat(chunks, length);
    if (body.byteLength < 256 || body.byteLength > MAX_IMAGE_BYTES) return new Response(null, { status: 404 });
    void writeCachedImage(source.imageUrl, contentType, body);
    return imageResponse({ body, contentType }, 'MISS');
  } catch {
    return new Response(null, { status: 404 });
  }
}
