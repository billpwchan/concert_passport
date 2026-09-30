import { getDb } from './index.ts';
import { upsertProfile } from './repository.ts';

export type PassportEntryRecord = {
  id: string;
  eventId?: string;
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
      accent, event_id AS eventId
    FROM attendance_records WHERE user_id = ? AND deleted_at IS NULL ORDER BY datetime(attended_at) ASC
  `).all(userId) as PassportEntryRecord[];
  return rows.map((row) => ({ ...row }));
}

export function updatePassportEntry(userId: string, id: string, input: import('../lib/domain/passport-input.ts').PassportInput): boolean {
  return getDb().prepare(`UPDATE attendance_records SET artist_name=?, event_name=?, attended_at=?,
    timezone=NULL, venue=?, city=?, country_code=?, travel_distance_km=?, updated_at=?
    WHERE id=? AND user_id=? AND deleted_at IS NULL`).run(input.artist, input.eventName ?? null,
    input.attendedAt, input.venue ?? null, input.city, input.market, input.travelDistanceKm, Date.now(), id, userId).changes > 0;
}

export function setPassportEntryRemoved(userId: string, id: string, removed: boolean): boolean {
  return getDb().prepare('UPDATE attendance_records SET deleted_at=?, updated_at=? WHERE id=? AND user_id=?')
    .run(removed ? Date.now() : null, Date.now(), id, userId).changes > 0;
}

/** Atomic INSERT/restore makes retries and double clicks safe. A saved event is required. */
export function attendSavedEvent(userId: string, eventId: string, now = Date.now()): string | undefined {
  const db = getDb();
  const event = db.prepare(`SELECT e.* FROM canonical_events e JOIN saved_events s ON s.event_id=e.id
    WHERE e.id=? AND s.user_id=? AND datetime(e.starts_at)<=datetime(?, 'unixepoch')
    AND e.lifecycle_status NOT IN ('cancelled','postponed','deleted')
    AND NOT EXISTS (SELECT 1 FROM event_publication_quarantine q WHERE q.event_id=e.id AND q.released_at IS NULL)`).get(eventId, userId, now / 1000) as
    {artist: string; name: string; starts_at: string; timezone: string; venue: string; city: string; country_code: string} | undefined;
  if (!event?.artist || !event.city) return;
  const id = crypto.randomUUID();
  db.prepare(`INSERT INTO attendance_records (id,user_id,artist_name,event_name,attended_at,timezone,venue,city,
    country_code,travel_distance_km,accent,created_at,updated_at,event_id)
    VALUES (?,?,?,?,?,?,?,?,?,0,?,?,?,?)
    ON CONFLICT(user_id,event_id) WHERE event_id IS NOT NULL DO UPDATE SET deleted_at=NULL, updated_at=excluded.updated_at`)
    .run(id,userId,event.artist,event.name,event.starts_at,event.timezone,event.venue,event.city,event.country_code,
      accentFor(event.artist),now,now,eventId);
  return (db.prepare('SELECT id FROM attendance_records WHERE user_id=? AND event_id=?').get(userId,eventId) as {id:string}).id;
}
