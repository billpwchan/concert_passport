import type { DiscoveryQuery } from '@/lib/domain/types';

export const APAC_COUNTRY_CODES = new Set([
  'AU', 'HK', 'ID', 'JP', 'KR', 'MY', 'NZ', 'PH', 'SG', 'TH', 'TW', 'VN',
]);

export class DiscoveryInputError extends Error {}

function textValue(params: URLSearchParams, name: string, maxLength: number): string | undefined {
  const value = params.get(name)?.trim();
  if (!value) return undefined;
  if (value.length > maxLength) throw new DiscoveryInputError(`${name} is too long`);
  return value;
}

function dateValue(params: URLSearchParams, name: string): string | undefined {
  const value = textValue(params, name, 40);
  if (!value) return undefined;
  if (!Number.isFinite(Date.parse(value))) throw new DiscoveryInputError(`${name} is not a valid date`);
  // Ticketmaster Discovery accepts UTC timestamps to whole-second precision.
  return new Date(value).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function normalizeDiscoveryQuery(params: URLSearchParams): DiscoveryQuery {
  const artist = textValue(params, 'artist', 80);
  const city = textValue(params, 'city', 80);
  const countryCode = textValue(params, 'countryCode', 2)?.toUpperCase();
  if (countryCode && !APAC_COUNTRY_CODES.has(countryCode)) {
    throw new DiscoveryInputError('countryCode must be an Asia-Pacific market');
  }
  if (!artist && !countryCode && !city) {
    throw new DiscoveryInputError('Enter an artist name or choose a market');
  }

  const startDateTime = dateValue(params, 'startDateTime');
  const endDateTime = dateValue(params, 'endDateTime');
  if (startDateTime && endDateTime) {
    const start = Date.parse(startDateTime);
    const end = Date.parse(endDateTime);
    if (end < start) throw new DiscoveryInputError('endDateTime must be after startDateTime');
    if (end - start > 370 * 86_400_000) {
      throw new DiscoveryInputError('Date range must be 370 days or less');
    }
  }

  return { artist, city, countryCode, startDateTime, endDateTime };
}
