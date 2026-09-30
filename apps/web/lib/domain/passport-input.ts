import { APAC_COUNTRY_CODES } from '../sources/query.ts';

export type PassportInput = {
  artist: string; eventName?: string; attendedAt: string; venue?: string;
  city: string; market: string; travelDistanceKm: number;
};

/** Manual memories retain their calendar date: no invented noon or timezone shift. */
export function passportInput(value: unknown, now = Date.now()): PassportInput | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  const body = value as Record<string, unknown>;
  const limits: Record<string, number> = { artist: 100, eventName: 160, venue: 120, city: 100, market: 3, attendedAt: 40 };
  for (const [key, limit] of Object.entries(limits)) {
    if (body[key] !== undefined && (typeof body[key] !== 'string' || (body[key] as string).length > limit)) return;
  }
  const artist = String(body.artist ?? '').trim();
  const city = String(body.city ?? '').trim();
  const market = String(body.market ?? '').toUpperCase();
  const attendedAt = String(body.attendedAt ?? '');
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(attendedAt);
  if (!dateOnly && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.test(attendedAt)) return;
  const calendar = attendedAt.slice(0,10);
  const calendarTime = Date.parse(calendar);
  if (!Number.isFinite(calendarTime) || new Date(calendarTime).toISOString().slice(0,10) !== calendar) return;
  if (!dateOnly && (Number(attendedAt.slice(11,13)) > 23 || Number(attendedAt.slice(14,16)) > 59 || Number(attendedAt.slice(17,19)) > 59)) return;
  const timestamp = Date.parse(attendedAt);
  if (!Number.isFinite(timestamp) || (dateOnly && new Date(timestamp).toISOString().slice(0, 10) !== attendedAt)) return;
  if (timestamp > now + (dateOnly ? 14 * 3_600_000 : 0) || timestamp < Date.UTC(1900, 0, 1)) return;
  const distance = body.travelDistanceKm ?? 0;
  if (!artist || !city || !APAC_COUNTRY_CODES.has(market) || typeof distance !== 'number' || !Number.isFinite(distance) || distance < 0 || distance > 100_000) return;
  return { artist, city, market, attendedAt, eventName: String(body.eventName ?? '').trim() || undefined, venue: String(body.venue ?? '').trim() || undefined, travelDistanceKm: distance };
}
