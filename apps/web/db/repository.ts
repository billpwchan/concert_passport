import { getDb } from './index.ts';

type UserIdentity = {
  userId: string;
  email: string;
  displayName: string;
};

export async function upsertProfile(user: UserIdentity): Promise<void> {
  const now = Date.now();
  getDb().prepare(`
    INSERT INTO profiles (user_id, email, display_name, home_timezone, created_at, updated_at)
    VALUES (?, ?, ?, 'Asia/Singapore', ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      email = excluded.email,
      display_name = excluded.display_name,
      updated_at = excluded.updated_at
  `).run(user.userId, user.email, user.displayName, now, now);
}

export async function setMilestoneState(input: {
  user: UserIdentity;
  journeyId: string;
  milestoneId: string;
  state: 'todo' | 'completed' | 'skipped';
}): Promise<void> {
  await upsertProfile(input.user);
  const now = Date.now();
  getDb().prepare(`
    INSERT INTO plan_milestone_states
      (user_id, journey_id, milestone_id, state, completed_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, journey_id, milestone_id) DO UPDATE SET
      state = excluded.state,
      completed_at = excluded.completed_at,
      updated_at = excluded.updated_at
  `).run(
    input.user.userId,
    input.journeyId,
    input.milestoneId,
    input.state,
    input.state === 'completed' ? now : null,
    now,
  );
}

export async function getMilestoneStates(userId: string, journeyId: string) {
  return getDb().prepare(`
    SELECT milestone_id AS milestoneId, state, completed_at AS completedAt, updated_at AS updatedAt
    FROM plan_milestone_states
    WHERE user_id = ? AND journey_id = ?
  `).all(userId, journeyId);
}

export async function submitSource(input: {
  user: UserIdentity;
  url: string;
  host: string;
}): Promise<string> {
  await upsertProfile(input.user);
  const id = crypto.randomUUID();
  getDb().prepare(`
    INSERT INTO source_submissions (id, user_id, url, host, status, submitted_at)
    VALUES (?, ?, ?, ?, 'automatic_check', ?)
  `).run(id, input.user.userId, input.url, input.host, Date.now());
  return id;
}
