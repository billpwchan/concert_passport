import { getDb } from './index';

export type AccountRecord = {
  userId: string;
  email: string;
  passwordHash: string;
  displayName: string;
  role: 'member' | 'operator' | 'admin';
  status: 'active' | 'suspended';
};

export function createAccount(input: {
  userId: string;
  email: string;
  passwordHash: string;
  displayName: string;
}): AccountRecord {
  const now = Date.now();
  const db = getDb();
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(`
      INSERT INTO profiles (user_id, email, display_name, home_timezone, created_at, updated_at)
      VALUES (?, ?, ?, 'Asia/Singapore', ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        email = excluded.email,
        display_name = excluded.display_name,
        updated_at = excluded.updated_at
    `).run(input.userId, input.email, input.displayName, now, now);
    db.prepare(`
      INSERT INTO accounts
        (user_id, email, password_hash, display_name, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'member', 'active', ?, ?)
    `).run(input.userId, input.email, input.passwordHash, input.displayName, now, now);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  return getAccountByEmail(input.email)!;
}

export function getAccountByEmail(email: string): AccountRecord | undefined {
  const row = getDb().prepare(`
    SELECT user_id AS userId, email, password_hash AS passwordHash,
      display_name AS displayName, role, status
    FROM accounts WHERE email = ? COLLATE NOCASE
  `).get(email) as AccountRecord | undefined;
  return row ? { ...row } : undefined;
}

export function createAuthSession(tokenHash: string, userId: string, expiresAt: number): void {
  const now = Date.now();
  getDb().prepare(`
    INSERT INTO auth_sessions (token_hash, user_id, created_at, last_seen_at, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(tokenHash, userId, now, now, expiresAt);
  getDb().prepare('UPDATE accounts SET last_login_at = ?, updated_at = ? WHERE user_id = ?')
    .run(now, now, userId);
}

export function getAccountBySession(tokenHash: string): Omit<AccountRecord, 'passwordHash'> | undefined {
  const now = Date.now();
  const account = getDb().prepare(`
    SELECT a.user_id AS userId, a.email, a.display_name AS displayName, a.role, a.status
    FROM auth_sessions s
    JOIN accounts a ON a.user_id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ? AND a.status = 'active'
  `).get(tokenHash, now) as Omit<AccountRecord, 'passwordHash'> | undefined;
  if (account) {
    getDb().prepare('UPDATE auth_sessions SET last_seen_at = ? WHERE token_hash = ?')
      .run(now, tokenHash);
  }
  return account ? { ...account } : undefined;
}

export function deleteAuthSession(tokenHash: string): void {
  getDb().prepare('DELETE FROM auth_sessions WHERE token_hash = ?').run(tokenHash);
}

export function mergeAnonymousState(anonymousUserId: string, accountUserId: string): void {
  if (anonymousUserId === accountUserId) return;
  const db = getDb();
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(`
      INSERT INTO plan_milestone_states
        (user_id, journey_id, milestone_id, state, completed_at, updated_at)
      SELECT ?, journey_id, milestone_id, state, completed_at, updated_at
      FROM plan_milestone_states WHERE user_id = ?
      ON CONFLICT(user_id, journey_id, milestone_id) DO UPDATE SET
        state = excluded.state,
        completed_at = excluded.completed_at,
        updated_at = MAX(plan_milestone_states.updated_at, excluded.updated_at)
    `).run(accountUserId, anonymousUserId);
    db.prepare(`
      INSERT OR IGNORE INTO saved_events (user_id, event_id, created_at)
      SELECT ?, event_id, created_at FROM saved_events WHERE user_id = ?
    `).run(accountUserId, anonymousUserId);
    db.prepare(`
      INSERT OR IGNORE INTO artist_follows
        (user_id, artist_name, market_code, created_at, updated_at)
      SELECT ?, artist_name, market_code, created_at, updated_at
      FROM artist_follows WHERE user_id = ?
    `).run(accountUserId, anonymousUserId);
    db.prepare(`
      UPDATE attendance_records SET user_id = ? WHERE user_id = ?
    `).run(accountUserId, anonymousUserId);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
