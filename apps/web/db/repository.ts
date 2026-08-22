import { and, eq } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { getDb } from './index';
import { planMilestoneStates, profiles, sourceSubmissions } from './schema';

type UserIdentity = {
  userId: string;
  email: string;
  displayName: string;
};

let initialization: Promise<unknown> | undefined;

function ensureUserStateSchema(): Promise<unknown> {
  if (initialization) return initialization;
  const d1 = env.DB;
  initialization = d1.batch([
    d1.prepare(`CREATE TABLE IF NOT EXISTS profiles (
      user_id TEXT PRIMARY KEY NOT NULL,
      email TEXT NOT NULL,
      display_name TEXT NOT NULL,
      home_timezone TEXT NOT NULL DEFAULT 'Asia/Singapore',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS plan_milestone_states (
      user_id TEXT NOT NULL,
      journey_id TEXT NOT NULL,
      milestone_id TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'todo',
      completed_at INTEGER,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, journey_id, milestone_id),
      FOREIGN KEY (user_id) REFERENCES profiles(user_id)
    )`),
    d1.prepare(`CREATE INDEX IF NOT EXISTS idx_plan_states_user_journey
      ON plan_milestone_states(user_id, journey_id)`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS source_submissions (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      url TEXT NOT NULL,
      host TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      submitted_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES profiles(user_id)
    )`),
    d1.prepare(`CREATE INDEX IF NOT EXISTS idx_source_submissions_status_date
      ON source_submissions(status, submitted_at)`),
  ]);
  return initialization;
}

export async function upsertProfile(user: UserIdentity): Promise<void> {
  await ensureUserStateSchema();
  const now = new Date();
  await getDb()
    .insert(profiles)
    .values({
      userId: user.userId,
      email: user.email,
      displayName: user.displayName,
      homeTimezone: 'Asia/Singapore',
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: { email: user.email, displayName: user.displayName, updatedAt: now },
    });
}

export async function setMilestoneState(input: {
  user: UserIdentity;
  journeyId: string;
  milestoneId: string;
  state: 'todo' | 'completed' | 'skipped';
}): Promise<void> {
  await upsertProfile(input.user);
  const now = new Date();
  await getDb()
    .insert(planMilestoneStates)
    .values({
      userId: input.user.userId,
      journeyId: input.journeyId,
      milestoneId: input.milestoneId,
      state: input.state,
      completedAt: input.state === 'completed' ? now : null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        planMilestoneStates.userId,
        planMilestoneStates.journeyId,
        planMilestoneStates.milestoneId,
      ],
      set: {
        state: input.state,
        completedAt: input.state === 'completed' ? now : null,
        updatedAt: now,
      },
    });
}

export async function getMilestoneStates(userId: string, journeyId: string) {
  await ensureUserStateSchema();
  return getDb()
    .select()
    .from(planMilestoneStates)
    .where(
      and(
        eq(planMilestoneStates.userId, userId),
        eq(planMilestoneStates.journeyId, journeyId),
      ),
    );
}

export async function submitSource(input: {
  user: UserIdentity;
  url: string;
  host: string;
}): Promise<string> {
  await ensureUserStateSchema();
  await upsertProfile(input.user);
  const id = crypto.randomUUID();
  await getDb().insert(sourceSubmissions).values({
    id,
    userId: input.user.userId,
    url: input.url,
    host: input.host,
    status: 'pending',
    submittedAt: new Date(),
  });
  return id;
}
