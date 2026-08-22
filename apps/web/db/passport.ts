import { getDb } from './index';
import { upsertProfile } from './repository';

export type PassportEntryRecord = {
  id: string;
  artist: string;
  eventName?: string;
  attendedAt: string;
  timezone?: string;
  venue?: string;
  city: string;
  market: string;
  travelDistanceKm: number;
  accent: string;
};

const accents = ['#6753e8', '#18794e', '#b26a00', '#b54775', '#1677a3', '#7b5b35'];

function accentFor(value: string): string {
  const index = [...value].reduce((total, character) => total + character.codePointAt(0)!, 0) % accents.length;
  return accents[index];
}

export async function createPassportEntry(input: {
  user: { userId: string; email: string; displayName: string };
  artist: string;
  eventName?: string;
  attendedAt: string;
  venue?: string;
  city: string;
  market: string;
  travelDistanceKm: number;
}): Promise<string> {
  await upsertProfile(input.user);
  const id = crypto.randomUUID();
  const now = Date.now();
  getDb().prepare(`
    INSERT INTO attendance_records
      (id, user_id, artist_name, event_name, attended_at, venue, city, country_code,
       travel_distance_km, accent, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, input.user.userId, input.artist, input.eventName ?? null, input.attendedAt,
    input.venue ?? null, input.city, input.market, input.travelDistanceKm,
    accentFor(input.artist), now, now,
  );
  return id;
}

export function getPassportEntries(userId: string): PassportEntryRecord[] {
  const rows = getDb().prepare(`
    SELECT id, artist_name AS artist, event_name AS eventName, attended_at AS attendedAt,
      timezone, venue, city, country_code AS market, travel_distance_km AS travelDistanceKm,
      accent
    FROM attendance_records WHERE user_id = ? ORDER BY datetime(attended_at) ASC
  `).all(userId) as PassportEntryRecord[];
  return rows.map((row) => ({ ...row }));
}
