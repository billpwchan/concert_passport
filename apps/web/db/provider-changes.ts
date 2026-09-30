import type { EventLifecycleStatus } from '../lib/domain/types.ts';
import { resolveCanonicalLifecycle } from '../lib/domain/event-lifecycle.ts';
import { getDb } from './index.ts';

export type ProviderChangeSyncState = {
  cursorAt?: string;
  windowEndAt?: string;
  resumeUrl?: string;
};

export function getProviderChangeSyncState(provider: string): ProviderChangeSyncState {
  return (getDb().prepare(`
    SELECT cursor_at AS cursorAt, window_end_at AS windowEndAt, resume_url AS resumeUrl
    FROM provider_change_sync_state WHERE provider = ?
  `).get(provider) as ProviderChangeSyncState | undefined) ?? {};
}

export function saveProviderChangeSyncResult(input: {
  provider: string;
  cursorAt?: string;
  windowEndAt?: string;
  resumeUrl?: string;
  status: 'completed' | 'partial' | 'failed';
  itemsSeen: number;
  itemsChanged: number;
  error?: string;
  startedAt: number;
}): void {
  const now = Date.now();
  getDb().prepare(`
    INSERT INTO provider_change_sync_state
      (provider, cursor_at, window_end_at, resume_url, last_status,
       items_seen, items_changed, last_error, last_started_at, last_finished_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(provider) DO UPDATE SET
      cursor_at = excluded.cursor_at,
      window_end_at = excluded.window_end_at,
      resume_url = excluded.resume_url,
      last_status = excluded.last_status,
      items_seen = excluded.items_seen,
      items_changed = excluded.items_changed,
      last_error = excluded.last_error,
      last_started_at = excluded.last_started_at,
      last_finished_at = excluded.last_finished_at,
      updated_at = excluded.updated_at
  `).run(
    input.provider,
    input.cursorAt ?? null,
    input.windowEndAt ?? null,
    input.resumeUrl ?? null,
    input.status,
    input.itemsSeen,
    input.itemsChanged,
    input.error?.slice(0, 500) ?? null,
    input.startedAt,
    now,
    now,
  );
}

export function applyProviderEventTombstones(
  provider: string,
  tombstones: Array<{
    providerEventId: string;
    lifecycleStatus: EventLifecycleStatus;
    reason?: string;
    updatedAt?: string;
  }>,
  now = Date.now(),
): number {
  const database = getDb();
  let changed = 0;
  database.exec('BEGIN IMMEDIATE');
  try {
    for (const tombstone of tombstones) {
      const linked = database.prepare(`
        SELECT event_id AS eventId FROM event_source_links
        WHERE source_id = ? AND source_event_id = ?
        UNION
        SELECT id AS eventId FROM canonical_events
        WHERE provider = ? AND provider_event_id = ?
      `).all(
        provider,
        tombstone.providerEventId,
        provider,
        tombstone.providerEventId,
      ) as Array<{ eventId: string }>;
      database.prepare(`
        UPDATE event_source_links SET source_status = ?, last_checked_at = ?
        WHERE source_id = ? AND source_event_id = ?
      `).run(tombstone.lifecycleStatus, now, provider, tombstone.providerEventId);
      for (const { eventId } of linked) {
        const current = database.prepare(`
          SELECT lifecycle_status AS lifecycleStatus FROM canonical_events WHERE id = ?
        `).get(eventId) as { lifecycleStatus: EventLifecycleStatus } | undefined;
        if (!current) continue;
        const nextStatus = resolveCanonicalLifecycle(
          database.prepare(`
            SELECT source_status AS lifecycleStatus, confidence
            FROM event_source_links WHERE event_id = ?
          `).all(eventId) as Array<{ lifecycleStatus: EventLifecycleStatus; confidence: string }>,
          tombstone.lifecycleStatus,
        );
        if (nextStatus === current.lifecycleStatus) continue;
        const changedAt = tombstone.updatedAt && Number.isFinite(Date.parse(tombstone.updatedAt))
          ? Date.parse(tombstone.updatedAt)
          : now;
        database.prepare(`
          UPDATE canonical_events SET lifecycle_status = ?, status_changed_at = ?, updated_at = ?
          WHERE id = ?
        `).run(nextStatus, changedAt, now, eventId);
        database.prepare(`
          INSERT INTO event_versions
            (id, event_id, provider, change_type, changed_fields_json, snapshot_json, observed_at)
          VALUES (?, ?, ?, 'lifecycle_changed', '["lifecycleStatus"]', ?, ?)
        `).run(
          crypto.randomUUID(),
          eventId,
          provider,
          JSON.stringify({
            lifecycleStatus: nextStatus,
            previousLifecycleStatus: current.lifecycleStatus,
            reason: tombstone.reason,
            sourceEventId: tombstone.providerEventId,
          }),
          now,
        );
        changed += 1;
      }
    }
    database.exec('COMMIT');
    return changed;
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}
