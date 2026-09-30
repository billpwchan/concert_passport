import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { runMigrations } from './migrations.ts';

let database: DatabaseSync | undefined;

export function getDb(): DatabaseSync {
  if (database) return database;

  const databasePath =
    process.env.CONCERT_PASSPORT_DB_PATH ?? join(process.cwd(), 'data', 'concert-passport.sqlite');
  mkdirSync(dirname(databasePath), { recursive: true });

  database = new DatabaseSync(databasePath);
  database.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  database.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      user_id TEXT PRIMARY KEY NOT NULL,
      email TEXT NOT NULL,
      display_name TEXT NOT NULL,
      home_timezone TEXT NOT NULL DEFAULT 'Asia/Singapore',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS plan_milestone_states (
      user_id TEXT NOT NULL,
      journey_id TEXT NOT NULL,
      milestone_id TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'todo',
      completed_at INTEGER,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, journey_id, milestone_id),
      FOREIGN KEY (user_id) REFERENCES profiles(user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_plan_states_user_journey
      ON plan_milestone_states(user_id, journey_id);
    CREATE TABLE IF NOT EXISTS source_submissions (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      url TEXT NOT NULL,
      host TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'automatic_check',
      submitted_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES profiles(user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_source_submissions_status_date
      ON source_submissions(status, submitted_at);

    CREATE TABLE IF NOT EXISTS accounts (
      user_id TEXT PRIMARY KEY NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_login_at INTEGER,
      FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);

    CREATE TABLE IF NOT EXISTS auth_sessions (
      token_hash TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES accounts(user_id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_auth_sessions_expiry ON auth_sessions(expires_at);

    CREATE TABLE IF NOT EXISTS canonical_events (
      id TEXT PRIMARY KEY NOT NULL,
      provider TEXT NOT NULL,
      provider_event_id TEXT NOT NULL,
      name TEXT NOT NULL,
      artist TEXT,
      starts_at TEXT NOT NULL,
      timezone TEXT,
      venue TEXT,
      city TEXT,
      country_code TEXT,
      latitude REAL,
      longitude REAL,
      official_url TEXT NOT NULL,
      confidence TEXT NOT NULL,
      lifecycle_status TEXT NOT NULL DEFAULT 'scheduled',
      status_changed_at INTEGER,
      image_url TEXT,
      image_width INTEGER,
      image_height INTEGER,
      image_attribution TEXT,
      image_source_url TEXT,
      image_fallback INTEGER NOT NULL DEFAULT 0,
      best_link_url TEXT,
      best_link_role TEXT,
      best_link_source TEXT,
      best_link_score INTEGER,
      best_link_verified_at INTEGER,
      data_authority_score INTEGER NOT NULL DEFAULT 40,
      data_source_id TEXT,
      data_verified_at INTEGER,
      first_seen_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(provider, provider_event_id)
    );
    CREATE INDEX IF NOT EXISTS idx_canonical_events_artist_date
      ON canonical_events(artist, starts_at);

    CREATE TABLE IF NOT EXISTS artist_media (
      normalized_name TEXT PRIMARY KEY NOT NULL,
      artist_name TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_artist_id TEXT NOT NULL,
      image_url TEXT NOT NULL,
      image_width INTEGER NOT NULL,
      image_height INTEGER NOT NULL,
      image_attribution TEXT,
      creator TEXT,
      license_name TEXT,
      license_url TEXT,
      usage_policy TEXT NOT NULL DEFAULT 'linked_preview',
      source_url TEXT NOT NULL,
      is_fallback INTEGER NOT NULL DEFAULT 0,
      first_seen_at INTEGER NOT NULL,
      last_checked_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_artist_media_checked
      ON artist_media(last_checked_at DESC);

    CREATE TABLE IF NOT EXISTS media_asset_quarantine (
      image_url TEXT PRIMARY KEY NOT NULL,
      reason TEXT NOT NULL,
      artists_json TEXT NOT NULL DEFAULT '[]',
      first_seen_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS provider_artist_lookup_cache (
      provider TEXT NOT NULL,
      normalized_name TEXT NOT NULL COLLATE NOCASE,
      provider_artist_id TEXT,
      payload_json TEXT,
      status TEXT NOT NULL,
      checked_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      PRIMARY KEY (provider, normalized_name)
    );
    CREATE INDEX IF NOT EXISTS idx_provider_artist_lookup_expiry
      ON provider_artist_lookup_cache(provider, expires_at);

    CREATE TABLE IF NOT EXISTS artist_catalog (
      id TEXT PRIMARY KEY NOT NULL,
      canonical_name TEXT NOT NULL,
      normalized_name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      artist_type TEXT NOT NULL DEFAULT 'unknown',
      country_code TEXT,
      life_span_begin TEXT,
      life_span_end TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'observed',
      confidence_score INTEGER NOT NULL DEFAULT 0,
      priority_score INTEGER NOT NULL DEFAULT 40,
      aliases_json TEXT NOT NULL DEFAULT '[]',
      tags_json TEXT NOT NULL DEFAULT '[]',
      source_count INTEGER NOT NULL DEFAULT 1,
      first_seen_at INTEGER NOT NULL,
      last_verified_at INTEGER,
      next_identity_check_at INTEGER,
      next_event_check_at INTEGER,
      last_event_check_at INTEGER,
      last_event_seen_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_artist_catalog_event_queue
      ON artist_catalog(active, next_event_check_at, priority_score DESC);
    CREATE INDEX IF NOT EXISTS idx_artist_catalog_status
      ON artist_catalog(status, confidence_score DESC);

    CREATE TABLE IF NOT EXISTS artist_aliases (
      alias_normalized TEXT PRIMARY KEY NOT NULL COLLATE NOCASE,
      alias TEXT NOT NULL,
      artist_id TEXT NOT NULL,
      locale TEXT,
      source_id TEXT NOT NULL,
      confidence_score INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (artist_id) REFERENCES artist_catalog(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_artist_aliases_artist ON artist_aliases(artist_id);

    CREATE TABLE IF NOT EXISTS artist_sources (
      artist_id TEXT NOT NULL,
      source_id TEXT NOT NULL,
      external_id TEXT NOT NULL DEFAULT '',
      confidence_score INTEGER NOT NULL,
      first_seen_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL,
      PRIMARY KEY (artist_id, source_id),
      FOREIGN KEY (artist_id) REFERENCES artist_catalog(id) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_artist_sources_external
      ON artist_sources(source_id, external_id) WHERE external_id <> '';

    CREATE TABLE IF NOT EXISTS artist_catalog_sync_state (
      source_id TEXT PRIMARY KEY NOT NULL,
      cursor_offset INTEGER NOT NULL DEFAULT 0,
      total_count INTEGER,
      status TEXT NOT NULL DEFAULT 'idle',
      items_seen INTEGER NOT NULL DEFAULT 0,
      items_accepted INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      started_at INTEGER,
      finished_at INTEGER,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS artist_identity_candidates (
      provider TEXT NOT NULL,
      provider_artist_id TEXT NOT NULL,
      artist_name TEXT NOT NULL,
      artist_type TEXT NOT NULL DEFAULT 'unknown',
      event_title TEXT NOT NULL,
      market_code TEXT,
      priority_score INTEGER NOT NULL DEFAULT 40,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      next_check_at INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      first_seen_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL,
      last_checked_at INTEGER,
      PRIMARY KEY (provider, provider_artist_id)
    );
    CREATE INDEX IF NOT EXISTS idx_artist_identity_candidates_queue
      ON artist_identity_candidates(status, next_check_at, priority_score DESC);

    CREATE TABLE IF NOT EXISTS artist_provider_identities (
      provider TEXT NOT NULL,
      provider_artist_id TEXT NOT NULL,
      artist_id TEXT NOT NULL,
      artist_type TEXT NOT NULL DEFAULT 'unknown',
      confidence_score INTEGER NOT NULL,
      first_seen_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL,
      PRIMARY KEY (provider, provider_artist_id),
      FOREIGN KEY (artist_id) REFERENCES artist_catalog(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_artist_provider_identities_artist
      ON artist_provider_identities(artist_id, provider);

    CREATE TABLE IF NOT EXISTS market_discovery_state (
      market_code TEXT PRIMARY KEY NOT NULL,
      last_swept_at INTEGER,
      next_sweep_at INTEGER,
      events_seen INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS event_source_links (
      event_id TEXT NOT NULL,
      source_id TEXT NOT NULL,
      source_event_id TEXT NOT NULL,
      url TEXT NOT NULL,
      confidence TEXT NOT NULL,
      source_status TEXT NOT NULL DEFAULT 'scheduled',
      first_seen_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL,
      last_checked_at INTEGER NOT NULL,
      PRIMARY KEY (event_id, source_id, source_event_id),
      FOREIGN KEY (event_id) REFERENCES canonical_events(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_event_source_links_source
      ON event_source_links(source_id, last_seen_at DESC);

    CREATE TABLE IF NOT EXISTS event_link_evidence (
      id TEXT PRIMARY KEY NOT NULL,
      event_id TEXT NOT NULL,
      source_id TEXT NOT NULL,
      source_event_id TEXT,
      candidate_url TEXT NOT NULL,
      canonical_url TEXT NOT NULL,
      link_role TEXT NOT NULL,
      authority TEXT NOT NULL,
      validation_state TEXT NOT NULL,
      match_score INTEGER NOT NULL,
      evidence_json TEXT NOT NULL,
      content_hash TEXT,
      http_status INTEGER,
      failure_code TEXT,
      retry_count INTEGER NOT NULL DEFAULT 0,
      next_check_at INTEGER,
      first_seen_at INTEGER NOT NULL,
      last_checked_at INTEGER NOT NULL,
      last_verified_at INTEGER,
      updated_at INTEGER NOT NULL,
      UNIQUE(event_id, canonical_url),
      FOREIGN KEY (event_id) REFERENCES canonical_events(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_event_link_evidence_event_state
      ON event_link_evidence(event_id, validation_state, match_score DESC);
    CREATE INDEX IF NOT EXISTS idx_event_link_evidence_retry
      ON event_link_evidence(validation_state, next_check_at);

    CREATE TABLE IF NOT EXISTS link_resolution_runs (
      id TEXT PRIMARY KEY NOT NULL,
      trigger_type TEXT NOT NULL,
      status TEXT NOT NULL,
      events_checked INTEGER NOT NULL DEFAULT 0,
      links_verified INTEGER NOT NULL DEFAULT 0,
      links_quarantined INTEGER NOT NULL DEFAULT 0,
      fields_reconciled INTEGER NOT NULL DEFAULT 0,
      errors_json TEXT NOT NULL DEFAULT '[]',
      started_at INTEGER NOT NULL,
      finished_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_link_resolution_runs_started
      ON link_resolution_runs(started_at DESC);

    CREATE TABLE IF NOT EXISTS event_versions (
      id TEXT PRIMARY KEY NOT NULL,
      event_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      change_type TEXT NOT NULL,
      changed_fields_json TEXT NOT NULL,
      snapshot_json TEXT NOT NULL,
      observed_at INTEGER NOT NULL,
      FOREIGN KEY (event_id) REFERENCES canonical_events(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_event_versions_event_date
      ON event_versions(event_id, observed_at DESC);

    CREATE TABLE IF NOT EXISTS saved_events (
      user_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, event_id),
      FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
      FOREIGN KEY (event_id) REFERENCES canonical_events(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_saved_events_user ON saved_events(user_id, created_at);

    CREATE TABLE IF NOT EXISTS attendance_records (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      artist_name TEXT NOT NULL,
      event_name TEXT,
      attended_at TEXT NOT NULL,
      timezone TEXT,
      venue TEXT,
      city TEXT NOT NULL,
      country_code TEXT NOT NULL,
      travel_distance_km REAL NOT NULL DEFAULT 0,
      accent TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_attendance_user_date
      ON attendance_records(user_id, attended_at DESC);

    CREATE TABLE IF NOT EXISTS artist_follows (
      user_id TEXT NOT NULL,
      artist_name TEXT NOT NULL COLLATE NOCASE,
      market_code TEXT NOT NULL DEFAULT 'ALL',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, artist_name, market_code),
      FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ingestion_runs (
      id TEXT PRIMARY KEY NOT NULL,
      trigger_type TEXT NOT NULL,
      status TEXT NOT NULL,
      artists_checked INTEGER NOT NULL DEFAULT 0,
      events_seen INTEGER NOT NULL DEFAULT 0,
      errors_json TEXT NOT NULL DEFAULT '[]',
      started_at INTEGER NOT NULL,
      finished_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_ingestion_runs_started ON ingestion_runs(started_at DESC);

    CREATE TABLE IF NOT EXISTS connector_run_items (
      id TEXT PRIMARY KEY NOT NULL,
      run_id TEXT NOT NULL,
      connector_id TEXT NOT NULL,
      status TEXT NOT NULL,
      events_seen INTEGER NOT NULL DEFAULT 0,
      errors_seen INTEGER NOT NULL DEFAULT 0,
      recorded_at INTEGER NOT NULL,
      FOREIGN KEY (run_id) REFERENCES ingestion_runs(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_connector_run_items_connector_date
      ON connector_run_items(connector_id, recorded_at DESC);
  `);
  runMigrations(database);
  return database;
}
