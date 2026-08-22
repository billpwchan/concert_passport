import 'server-only';

import { cookies } from 'next/headers';
import { getMilestoneStates } from '@/db/repository';
import { demoJourneys } from '@/lib/domain/demo';
import { applyMilestoneStates, type StoredMilestoneState } from '@/lib/domain/journey-state';
import type { ConcertJourney } from '@/lib/domain/types';
import { getPrivateSessionUserId } from './session';

export async function getJourneysForCurrentSession(): Promise<ConcertJourney[]> {
  const cookieStore = await cookies();
  const userId = getPrivateSessionUserId(cookieStore.get('cp_session')?.value);
  if (!userId) return demoJourneys;

  return Promise.all(
    demoJourneys.map(async (journey) => {
      const rows = (await getMilestoneStates(userId, journey.id)) as StoredMilestoneState[];
      return applyMilestoneStates(journey, rows);
    }),
  );
}
