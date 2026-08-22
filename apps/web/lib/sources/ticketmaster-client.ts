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

let dailyUsage = { day: '', requests: 0 };

function apiKey(): string | undefined {
  return process.env.TICKETMASTER_API_KEY;
}

export function ticketmasterConfigured(): boolean {
  return Boolean(apiKey());
}

function consumeDailyBudget(): void {
  const day = new Date().toISOString().slice(0, 10);
  if (dailyUsage.day !== day) dailyUsage = { day, requests: 0 };
  const budget = Number(process.env.TICKETMASTER_DAILY_REQUEST_BUDGET ?? 4_500);
  if (dailyUsage.requests >= budget) throw new Error('Ticketmaster daily request budget reached');
  dailyUsage.requests += 1;
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
      && Number(image.width ?? 0) >= 640
      && Number(image.height ?? 0) >= 360
    ))
    .sort((left, right) => {
      const leftScore = (left.fallback ? 0 : 10_000_000)
        + (left.ratio === '16_9' ? 5_000_000 : 0)
        + Number(left.width ?? 0) * Number(left.height ?? 0);
      const rightScore = (right.fallback ? 0 : 10_000_000)
        + (right.ratio === '16_9' ? 5_000_000 : 0)
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
  consumeDailyBudget();
  params.set('apikey', key);
  const response = await fetch(`https://app.ticketmaster.com${pathname}?${params}`, {
    headers: { accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Ticketmaster responded ${response.status}`);
  return response.json() as Promise<T>;
}
