import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

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
      status TEXT NOT NULL DEFAULT 'pending',
      submitted_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES profiles(user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_source_submissions_status_date
      ON source_submissions(status, submitted_at);
  `);
  return database;
}
