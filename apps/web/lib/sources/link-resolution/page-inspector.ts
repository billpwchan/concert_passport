import { createHash } from 'node:crypto';
import { canonicalizeCandidateUrl, trustedSourceForUrl } from './trusted-sources.ts';
import type { CandidateEventData, CandidateInspection } from './types.ts';

const MAX_HTML_BYTES = 1_500_000;

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (Array.isArray(value)) return value.map(firstString).find(Boolean);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return firstString(record.url) ?? firstString(record['@id']);
  }
  return undefined;
}

function eventNodes(value: unknown, output: Array<Record<string, unknown>>): void {
  if (Array.isArray(value)) {
    value.forEach((item) => eventNodes(item, output));
    return;
  }
  if (!value || typeof value !== 'object') return;
  const record = value as Record<string, unknown>;
  const types = Array.isArray(record['@type']) ? record['@type'] : [record['@type']];
  if (types.some((type) => typeof type === 'string' && type.toLowerCase() === 'event')) output.push(record);
  if (record['@graph']) eventNodes(record['@graph'], output);
}

function locationData(value: unknown): Pick<CandidateEventData, 'venue' | 'city' | 'countryCode'> {
  if (!value || typeof value !== 'object') return {};
  const location = value as Record<string, unknown>;
  const address = location.address && typeof location.address === 'object'
    ? location.address as Record<string, unknown>
    : {};
  return {
    venue: firstString(location.name),
    city: firstString(address.addressLocality),
    countryCode: firstString(address.addressCountry),
  };
}

function offersData(value: unknown): { offerUrl?: string; saleStartsAt?: string } {
  const offers = Array.isArray(value) ? value : [value];
  for (const item of offers) {
    if (!item || typeof item !== 'object') continue;
    const offer = item as Record<string, unknown>;
    const offerUrl = firstString(offer.url);
    if (offerUrl) return { offerUrl, saleStartsAt: firstString(offer.validFrom) };
  }
  return {};
}

export function parseEventPage(html: string, finalUrl: string): Omit<CandidateInspection, 'requestedUrl' | 'httpStatus' | 'fetched' | 'contentHash'> {
  const nodes: Array<Record<string, unknown>> = [];
  const scripts = html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of scripts) {
    try {
      eventNodes(JSON.parse(match[1].trim()), nodes);
    } catch {
      // Invalid third-party JSON-LD is ignored; page metadata remains usable.
    }
  }
  const event = nodes[0];
  const offers = offersData(event?.offers);
  const canonicalMatch = html.match(/<link\b[^>]*rel=["'][^"']*canonical[^"']*["'][^>]*href=["']([^"']+)["']/i)
    ?? html.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["'][^"']*canonical[^"']*["']/i);
  const titleMatch = html.match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
    ?? html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const canonicalUrl = canonicalMatch?.[1]
    ? new URL(decodeHtml(canonicalMatch[1]), finalUrl).toString()
    : finalUrl;
  const location = locationData(event?.location);
  const performer = event?.performer;
  const artist = Array.isArray(performer)
    ? performer.map((item) => firstString(item && typeof item === 'object' ? (item as Record<string, unknown>).name : item)).find(Boolean)
    : firstString(performer && typeof performer === 'object' ? (performer as Record<string, unknown>).name : performer);
  return {
    canonicalUrl,
    data: {
      name: firstString(event?.name) ?? (titleMatch?.[1] ? decodeHtml(titleMatch[1]) : undefined),
      artist,
      startsAt: firstString(event?.startDate),
      ...location,
      saleStartsAt: offers.saleStartsAt,
    },
    offerUrl: offers.offerUrl ? new URL(offers.offerUrl, finalUrl).toString() : undefined,
  };
}

async function fetchTrustedHtml(initialUrl: string): Promise<{
  finalUrl: string;
  status: number;
  html: string;
}> {
  let current = canonicalizeCandidateUrl(initialUrl);
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    if (!trustedSourceForUrl(current)) throw new Error('untrusted_host');
    const response = await fetch(current, {
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'user-agent': 'ConcertPassportLinkResolver/1.0 (+https://concert-passport.52-198-144-26.sslip.io/sources)',
      },
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) throw new Error('redirect_without_location');
      current = new URL(location, current).toString();
      continue;
    }
    const contentType = response.headers.get('content-type') ?? '';
    const length = Number(response.headers.get('content-length') ?? 0);
    if (!response.ok) throw Object.assign(new Error(`http_${response.status}`), { status: response.status });
    if (!contentType.includes('text/html') || length > MAX_HTML_BYTES) throw new Error('unsupported_content');
    const html = (await response.text()).slice(0, MAX_HTML_BYTES);
    return { finalUrl: current, status: response.status, html };
  }
  throw new Error('too_many_redirects');
}

export async function inspectCandidatePage(url: string): Promise<CandidateInspection> {
  if (!trustedSourceForUrl(url)) {
    return { requestedUrl: url, canonicalUrl: url, fetched: false, data: {}, failureCode: 'untrusted_host' };
  }
  try {
    const result = await fetchTrustedHtml(url);
    const parsed = parseEventPage(result.html, result.finalUrl);
    let canonicalUrl = trustedSourceForUrl(parsed.canonicalUrl)
      ? canonicalizeCandidateUrl(parsed.canonicalUrl)
      : canonicalizeCandidateUrl(result.finalUrl);
    const requestedUrl = canonicalizeCandidateUrl(result.finalUrl);
    const requested = new URL(requestedUrl);
    const canonical = new URL(canonicalUrl);
    if (
      requested.hostname === canonical.hostname
      && requested.pathname.length > canonical.pathname.length + 5
      && requested.pathname.startsWith(canonical.pathname.replace(/\/$/, ''))
    ) {
      canonicalUrl = requestedUrl;
    }
    const offerUrl = parsed.offerUrl && trustedSourceForUrl(parsed.offerUrl)
      ? canonicalizeCandidateUrl(parsed.offerUrl)
      : undefined;
    return {
      requestedUrl: url,
      canonicalUrl,
      httpStatus: result.status,
      fetched: true,
      contentHash: createHash('sha256').update(result.html).digest('hex'),
      data: parsed.data,
      offerUrl,
    };
  } catch (error) {
    const status = typeof error === 'object' && error && 'status' in error ? Number(error.status) : undefined;
    return {
      requestedUrl: url,
      canonicalUrl: canonicalizeCandidateUrl(url),
      httpStatus: status,
      fetched: false,
      data: {},
      failureCode: error instanceof Error ? error.message : 'fetch_failed',
    };
  }
}
