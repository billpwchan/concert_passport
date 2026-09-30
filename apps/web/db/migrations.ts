import type { DatabaseSync } from 'node:sqlite';
import { ambiguousArtistNames } from '../lib/domain/ambiguous-artist-names.ts';

type Migration = {
  version: number;
  name: string;
  run: (database: DatabaseSync) => void;
};

function columnNames(database: DatabaseSync, table: string): Set<string> {
  return new Set(
    (database.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>)
      .map((column) => column.name),
  );
}

function addColumns(
  database: DatabaseSync,
  table: string,
  columns: ReadonlyArray<readonly [string, string]>,
): void {
  const existing = columnNames(database, table);
  for (const [name, definition] of columns) {
    if (!existing.has(name)) database.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
  }
}

const migrations: Migration[] = [
  {
    version: 1,
    name: 'event_media_columns',
    run(database) {
      addColumns(database, 'canonical_events', [
        ['image_url', 'TEXT'],
        ['image_width', 'INTEGER'],
        ['image_height', 'INTEGER'],
        ['image_attribution', 'TEXT'],
        ['image_source_url', 'TEXT'],
        ['image_fallback', 'INTEGER NOT NULL DEFAULT 0'],
      ]);
    },
  },
  {
    version: 2,
    name: 'media_rights_columns',
    run(database) {
      addColumns(database, 'artist_media', [
        ['creator', 'TEXT'],
        ['license_name', 'TEXT'],
        ['license_url', 'TEXT'],
        ['usage_policy', "TEXT NOT NULL DEFAULT 'linked_preview'"],
      ]);
    },
  },
  {
    version: 3,
    name: 'verified_event_link_columns',
    run(database) {
      addColumns(database, 'canonical_events', [
        ['best_link_url', 'TEXT'],
        ['best_link_role', 'TEXT'],
        ['best_link_source', 'TEXT'],
        ['best_link_score', 'INTEGER'],
        ['best_link_verified_at', 'INTEGER'],
        ['data_authority_score', 'INTEGER NOT NULL DEFAULT 40'],
        ['data_source_id', 'TEXT'],
        ['data_verified_at', 'INTEGER'],
      ]);
    },
  },
  {
    version: 4,
    name: 'v27_identity_and_media_repairs',
    run(database) {
      database.exec(`
        DELETE FROM artist_media WHERE is_fallback = 1;
        UPDATE canonical_events
        SET official_url = '/events/' || id
        WHERE provider = 'predicthq'
          AND official_url LIKE 'https://www.predicthq.com/events/%';
        INSERT OR IGNORE INTO market_discovery_state (market_code, updated_at) VALUES
          ('SG', 0), ('HK', 0), ('JP', 0), ('TW', 0), ('TH', 0), ('KR', 0),
          ('MY', 0), ('PH', 0), ('ID', 0), ('VN', 0), ('AU', 0), ('NZ', 0);
      `);
      const ambiguousNames = [...ambiguousArtistNames];
      database.prepare(`
        DELETE FROM artist_media
        WHERE provider = 'ticketmaster-discovery'
          AND normalized_name IN (${ambiguousNames.map(() => '?').join(', ')})
      `).run(...ambiguousNames);
      database.exec(`
        DELETE FROM artist_sources
        WHERE source_id = 'wikidata' AND external_id = 'Q27951671'
          AND artist_id IN (
            SELECT id FROM artist_catalog
            WHERE normalized_name = 'lucy' AND artist_type = 'group'
          );
        UPDATE artist_catalog
        SET source_count = (SELECT COUNT(*) FROM artist_sources WHERE artist_id = artist_catalog.id)
        WHERE normalized_name = 'lucy';
        DELETE FROM canonical_events
        WHERE id IN ('predicthq:YsfShULyDLBFpbhPsq', 'predicthq:wsFPHNbrcq9Bmie9rN');
      `);
    },
  },
  {
    version: 5,
    name: 'automation_control_plane_and_event_lifecycle',
    run(database) {
      addColumns(database, 'canonical_events', [
        ['lifecycle_status', "TEXT NOT NULL DEFAULT 'scheduled'"],
        ['status_changed_at', 'INTEGER'],
      ]);
      addColumns(database, 'event_source_links', [
        ['source_status', "TEXT NOT NULL DEFAULT 'scheduled'"],
      ]);
      database.exec(`
        CREATE TABLE IF NOT EXISTS scheduler_jobs (
          job_name TEXT PRIMARY KEY NOT NULL,
          lease_owner TEXT,
          lease_expires_at INTEGER,
          last_started_at INTEGER,
          last_finished_at INTEGER,
          last_status TEXT NOT NULL DEFAULT 'idle',
          last_error TEXT,
          last_result_json TEXT,
          consecutive_failures INTEGER NOT NULL DEFAULT 0,
          updated_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_scheduler_jobs_lease
          ON scheduler_jobs(lease_expires_at);

        CREATE TABLE IF NOT EXISTS provider_change_sync_state (
          provider TEXT PRIMARY KEY NOT NULL,
          cursor_at TEXT,
          window_end_at TEXT,
          resume_url TEXT,
          last_status TEXT NOT NULL DEFAULT 'idle',
          items_seen INTEGER NOT NULL DEFAULT 0,
          items_changed INTEGER NOT NULL DEFAULT 0,
          last_error TEXT,
          last_started_at INTEGER,
          last_finished_at INTEGER,
          updated_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_canonical_events_lifecycle_date
          ON canonical_events(lifecycle_status, starts_at);
      `);
    },
  },
  {
    version: 6,
    name: 'publication_quarantine_for_identity_safety',
    run(database) {
      database.exec(`
        CREATE TABLE IF NOT EXISTS event_publication_quarantine (
          event_id TEXT PRIMARY KEY NOT NULL,
          reason TEXT NOT NULL,
          evidence_json TEXT NOT NULL DEFAULT '{}',
          created_at INTEGER NOT NULL,
          released_at INTEGER,
          FOREIGN KEY (event_id) REFERENCES canonical_events(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_event_publication_quarantine_active
          ON event_publication_quarantine(released_at, created_at DESC);

        INSERT OR IGNORE INTO event_publication_quarantine
          (event_id, reason, evidence_json, created_at)
        SELECT id, 'artist_identity_mismatch',
          json_object('artist', artist, 'eventName', name, 'provider', provider),
          CAST(strftime('%s', 'now') AS INTEGER) * 1000
        FROM canonical_events
        WHERE (
          (lower(COALESCE(artist, '')) = 'belle' AND lower(name) LIKE 'belle and sebastian%')
          OR (lower(COALESCE(artist, '')) = 'shannon' AND lower(name) LIKE 'shannon noll%')
          OR (lower(COALESCE(artist, '')) = 'fia' AND lower(name) LIKE 'fia - the love me tour%')
          OR (lower(COALESCE(artist, '')) = 'nfl' AND lower(name) LIKE 'nfl%kickoff%')
        );

        DELETE FROM artist_provider_identities
        WHERE provider = 'ticketmaster-discovery' AND artist_id IN (
          SELECT id FROM artist_catalog
          WHERE lower(canonical_name) IN ('belle', 'shannon', 'fia', 'nfl')
        );
        DELETE FROM provider_artist_lookup_cache
        WHERE provider = 'ticketmaster-discovery'
          AND lower(normalized_name) IN ('belle', 'shannon', 'fia', 'nfl');
        UPDATE artist_identity_candidates
        SET status = 'needs_review',
          last_error = 'Existing name-only provider binding revoked by identity safety migration',
          next_check_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000 + 15552000000
        WHERE provider = 'ticketmaster-discovery'
          AND lower(artist_name) IN ('belle', 'shannon', 'fia', 'nfl');

        UPDATE event_link_evidence
        SET validation_state = 'quarantined',
          failure_code = COALESCE(failure_code, 'historical_proof_missing'),
          next_check_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000,
          updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
        WHERE validation_state = 'verified'
          AND source_id <> 'ticketmaster-discovery'
          AND COALESCE(json_extract(evidence_json, '$.discoveredBy'), '') <> 'ticketmaster'
          AND (http_status IS NULL OR http_status < 200 OR http_status >= 300);

        UPDATE canonical_events AS event
        SET best_link_url = NULL, best_link_role = NULL, best_link_source = NULL,
          best_link_score = NULL, best_link_verified_at = NULL,
          updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
        WHERE EXISTS (
          SELECT 1 FROM event_link_evidence invalid
          WHERE invalid.event_id = event.id
            AND invalid.canonical_url = event.best_link_url
            AND invalid.validation_state <> 'verified'
        ) AND NOT EXISTS (
          SELECT 1 FROM event_link_evidence valid
          WHERE valid.event_id = event.id
            AND valid.canonical_url = event.best_link_url
            AND valid.validation_state = 'verified'
        );
      `);
    },
  },
  {
    version: 7,
    name: 'durable_discovery_cache',
    run(database) {
      database.exec(`CREATE TABLE IF NOT EXISTS discovery_cache (
        cache_key TEXT PRIMARY KEY NOT NULL, payload_json TEXT NOT NULL,
        checked_at INTEGER NOT NULL, expires_at INTEGER NOT NULL
      )`);
    },
  },
  {
    version: 8,
    name: 'curated_calendar_observation_provenance',
    run(database) {
      const snapshotAt = Date.parse('2026-08-25T04:22:00Z');
      database.prepare(`UPDATE event_source_links SET last_checked_at = ?, last_seen_at = ?
        WHERE source_id = 'official-event-calendar'`).run(snapshotAt, snapshotAt);
      database.prepare(`UPDATE canonical_events AS e SET last_seen_at = COALESCE(
        (SELECT MAX(s.last_checked_at) FROM event_source_links s
          WHERE s.event_id = e.id AND s.source_id <> 'official-event-calendar'), ?)
        WHERE EXISTS (SELECT 1 FROM event_source_links s WHERE s.event_id = e.id AND s.source_id = 'official-event-calendar')`)
        .run(snapshotAt);
      database.exec(`UPDATE event_link_evidence SET validation_state = 'stale',
        failure_code = 'curated_reference_requires_live_verification', next_check_at = 0
        WHERE source_id = 'official-event-calendar';
        UPDATE canonical_events SET best_link_url = NULL, best_link_role = NULL, best_link_source = NULL,
          best_link_score = NULL, best_link_verified_at = NULL
        WHERE best_link_source = 'official-event-calendar';`);
    },
  },
  {
    version: 9,
    name: 'continuous_collection_evidence_and_runtime',
    run(database) {
      addColumns(database, 'source_submissions', [['event_id','TEXT'],['note','TEXT']]);
      // These imported name-only identities lack enough evidence to distinguish K-pop acts from namesakes.
      database.exec(`INSERT OR IGNORE INTO event_publication_quarantine(event_id,reason,evidence_json,created_at)
        SELECT e.id,'ambiguous_artist_identity_requires_evidence',json_object('artist',e.artist,'provider',e.provider),CAST(strftime('%s','now') AS INTEGER)*1000
        FROM canonical_events e WHERE lower(e.artist) IN ('solar','hana') AND e.provider='predicthq'
        AND NOT EXISTS(SELECT 1 FROM event_source_links s WHERE s.event_id=e.id AND s.source_id<>'predicthq' AND s.confidence='official');`);
      database.exec(`
        CREATE TABLE IF NOT EXISTS source_runtime (
          source_id TEXT PRIMARY KEY,status TEXT NOT NULL,last_attempt_at INTEGER NOT NULL,
          last_success_at INTEGER,next_attempt_at INTEGER NOT NULL DEFAULT 0,failures INTEGER NOT NULL DEFAULT 0,
          last_error TEXT,items_seen INTEGER NOT NULL DEFAULT 0,duration_ms INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS provider_daily_usage (
          provider TEXT NOT NULL,day TEXT NOT NULL,requests INTEGER NOT NULL,PRIMARY KEY(provider,day)
        );
        CREATE TABLE IF NOT EXISTS collection_frontier (
          url TEXT PRIMARY KEY,source_id TEXT NOT NULL,market TEXT NOT NULL,kind TEXT NOT NULL,depth INTEGER NOT NULL,
          next_check_at INTEGER NOT NULL,last_checked_at INTEGER,last_status INTEGER,last_error TEXT,
          etag TEXT,last_modified TEXT,content_hash TEXT,failures INTEGER NOT NULL DEFAULT 0,
          lease_owner TEXT,lease_until INTEGER,created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_frontier_due ON collection_frontier(next_check_at,lease_until,source_id);
        CREATE TABLE IF NOT EXISTS source_documents (
          id TEXT PRIMARY KEY,url TEXT NOT NULL,source_id TEXT NOT NULL,content_hash TEXT NOT NULL,http_status INTEGER NOT NULL,
          body TEXT NOT NULL,headers_json TEXT NOT NULL,first_seen_at INTEGER NOT NULL,last_seen_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_documents_url ON source_documents(url,last_seen_at);
        CREATE TABLE IF NOT EXISTS collection_candidates (
          document_id TEXT NOT NULL,source_key TEXT NOT NULL,event_id TEXT,status TEXT NOT NULL,reason TEXT,
          payload_json TEXT NOT NULL,observed_at INTEGER NOT NULL,PRIMARY KEY(document_id,source_key),
          FOREIGN KEY(document_id) REFERENCES source_documents(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS event_enrichment (
          event_id TEXT PRIMARY KEY,document_id TEXT NOT NULL,source_url TEXT NOT NULL,
          date_precision TEXT NOT NULL DEFAULT 'time',description TEXT,sale_starts_at TEXT,
          price_text TEXT,currency TEXT,availability TEXT,offer_url TEXT,observed_at INTEGER NOT NULL,
          FOREIGN KEY(event_id) REFERENCES canonical_events(id) ON DELETE CASCADE,
          FOREIGN KEY(document_id) REFERENCES source_documents(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS artist_media_proofs (
          normalized_name TEXT NOT NULL,image_url TEXT NOT NULL,identity_id TEXT NOT NULL,relation TEXT NOT NULL,observed_at INTEGER NOT NULL,
          PRIMARY KEY(normalized_name,image_url)
        );
        CREATE VIEW IF NOT EXISTS published_artist_media AS
          SELECT m.* FROM artist_media m WHERE m.is_fallback = 0
          AND NOT EXISTS(SELECT 1 FROM media_asset_quarantine q WHERE q.image_url=m.image_url)
          AND (
            (m.provider='wikimedia-commons' AND m.usage_policy='commons_licensed' AND m.license_name IS NOT NULL
              AND EXISTS(SELECT 1 FROM artist_media_proofs p WHERE p.normalized_name=m.normalized_name AND p.image_url=m.image_url AND p.identity_id=m.provider_artist_id AND p.relation='wikidata:P18')
              AND EXISTS(SELECT 1 FROM artist_sources s JOIN artist_catalog a ON a.id=s.artist_id
                WHERE a.normalized_name=m.normalized_name AND s.source_id='wikidata' AND s.external_id=m.provider_artist_id))
            OR (m.provider='ticketmaster-discovery' AND EXISTS(SELECT 1 FROM artist_provider_identities p JOIN artist_catalog a ON a.id=p.artist_id
              WHERE a.normalized_name=m.normalized_name AND p.provider=m.provider AND p.provider_artist_id=m.provider_artist_id))
          );
        CREATE TABLE IF NOT EXISTS event_media_proofs (
          event_id TEXT NOT NULL,image_url TEXT NOT NULL,source_url TEXT NOT NULL,scope TEXT NOT NULL,
          content_hash TEXT,observed_at INTEGER NOT NULL,state TEXT NOT NULL DEFAULT 'verified',
          PRIMARY KEY(event_id,image_url),FOREIGN KEY(event_id) REFERENCES canonical_events(id) ON DELETE CASCADE
        );
      `);
    },
  },
  {
    version: 10,
    name: 'passport_event_links_and_recoverable_removal',
    run(database) {
      database.exec(`
        ALTER TABLE attendance_records ADD COLUMN event_id TEXT REFERENCES canonical_events(id) ON DELETE SET NULL;
        ALTER TABLE attendance_records ADD COLUMN deleted_at INTEGER;
        CREATE UNIQUE INDEX idx_attendance_user_event ON attendance_records(user_id, event_id) WHERE event_id IS NOT NULL;
      `);
    },
  },
];

export function runMigrations(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL UNIQUE,
      applied_at INTEGER NOT NULL
    );
  `);
  const applied = new Set(
    (database.prepare('SELECT version FROM schema_migrations').all() as Array<{ version: number }>)
      .map((row) => row.version),
  );
  const insert = database.prepare(
    'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)',
  );
  for (const migration of migrations) {
    if (applied.has(migration.version)) continue;
    database.exec('BEGIN IMMEDIATE');
    try {
      migration.run(database);
      insert.run(migration.version, migration.name, Date.now());
      database.exec('COMMIT');
    } catch (error) {
      database.exec('ROLLBACK');
      throw error;
    }
  }
}
