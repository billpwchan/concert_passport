import { paidEventApisEnabled } from './data-mode.ts';
import { consumeProviderBudget, sourceReady, recordSourceOutcome } from '../../db/collection.ts';
export type TicketmasterImage = {
  url: string;
  ratio?: '16_9' | '3_2' | '4_3' | string;
  width?: number;
  height?: number;
  fallback?: boolean;
  attribution?: string;
};

export type SelectedTicketmasterImage = {
  url: string;
  width: number;
  height: number;
  attribution?: string;
  fallback: boolean;
};

let requestGate: Promise<void> = Promise.resolve();
let nextRequestAt = 0;

function apiKey(): string | undefined {
  return paidEventApisEnabled() ? process.env.TICKETMASTER_API_KEY?.trim() || undefined : undefined;
}

export function ticketmasterConfigured(): boolean {
  return Boolean(apiKey());
}

function consumeDailyBudget(): void {
  const budget = boundedInteger(process.env.TICKETMASTER_DAILY_REQUEST_BUDGET, 4500, 1, 5000);
  if (!consumeProviderBudget('ticketmaster-discovery', budget)) throw new Error('Ticketmaster daily request budget reached');
}

function boundedInteger(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, Math.floor(parsed))) : fallback;
}

async function waitForRequestSlot(): Promise<void> {
  const minimumInterval = boundedInteger(process.env.TICKETMASTER_MIN_INTERVAL_MS, 230, 0, 1_000);
  const slot = requestGate.then(async () => {
    const delay = Math.max(0, nextRequestAt - Date.now());
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    nextRequestAt = Date.now() + minimumInterval;
  });
  requestGate = slot.catch(() => undefined);
  await slot;
}

export function isAllowedTicketmasterImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLocaleLowerCase('en-US');
    return url.protocol === 'https:'
      && (hostname === 'ticketm.net'
        || hostname.endsWith('.ticketm.net')
        || hostname === 'ticketmaster.com'
        || hostname.endsWith('.ticketmaster.com'));
  } catch {
    return false;
  }
}

export function selectTicketmasterImage(
  images: TicketmasterImage[] | undefined,
): SelectedTicketmasterImage | undefined {
  return (images ?? [])
    .filter((image) => (
      isAllowedTicketmasterImageUrl(image.url)
      && image.fallback !== true
      && Number(image.width ?? 0) >= 640
      && Number(image.height ?? 0) >= 360
    ))
    .sort((left, right) => {
      const leftScore = (left.ratio === '16_9' ? 5_000_000 : 0)
        + Number(left.width ?? 0) * Number(left.height ?? 0);
      const rightScore = (right.ratio === '16_9' ? 5_000_000 : 0)
        + Number(right.width ?? 0) * Number(right.height ?? 0);
      return rightScore - leftScore;
    })
    .map((image) => ({
      url: image.url,
      width: Number(image.width),
      height: Number(image.height),
      attribution: image.attribution,
      fallback: Boolean(image.fallback),
    }))[0];
}

export async function ticketmasterRequest<T>(
  pathname: string,
  params: URLSearchParams,
): Promise<T | undefined> {
  const key = apiKey();
  if (!key) return undefined;
  if (!sourceReady('ticketmaster-api')) throw new Error('Ticketmaster is waiting for its scheduled retry');
  params.set('apikey', key);
  const retries = boundedInteger(process.env.TICKETMASTER_MAX_RETRIES, 1, 0, 2);

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    consumeDailyBudget();
    await waitForRequestSlot();
    const response = await fetch(`https://app.ticketmaster.com${pathname}?${params}`, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });
    if (response.ok) { recordSourceOutcome('ticketmaster-api', {}); return response.json() as Promise<T>; }
    if (response.status !== 429 || attempt === retries) {
      recordSourceOutcome('ticketmaster-api', { error: `Ticketmaster responded ${response.status}` });
      throw new Error(`Ticketmaster responded ${response.status}`);
    }
    const retryAfterSeconds = Number(response.headers.get('retry-after') ?? 0);
    const retryDelay = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
      ? Math.min(retryAfterSeconds * 1_000, 5_000)
      : 1_000 * (attempt + 1);
    await new Promise((resolve) => setTimeout(resolve, retryDelay));
  }

  throw new Error('Ticketmaster request failed');
}
