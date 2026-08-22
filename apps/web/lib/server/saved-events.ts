import 'server-only';

import { cookies } from 'next/headers';
import { getSavedEvents } from '@/db/events';
import { getCurrentAccount } from './auth';
import { getPrivateSessionUserId } from './session';

export async function getSavedEventsForCurrentSession() {
  const account = await getCurrentAccount();
  const cookieStore = await cookies();
  const userId = account?.userId ?? getPrivateSessionUserId(cookieStore.get('cp_session')?.value);
  return userId ? getSavedEvents(userId) : [];
}
