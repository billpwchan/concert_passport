import 'server-only';

import { cookies } from 'next/headers';
import { getPassportEntries } from '@/db/passport';
import { getCurrentAccount } from './auth';
import { getPrivateSessionUserId } from './session';

export async function getPassportEntriesForCurrentSession() {
  const account = await getCurrentAccount();
  const cookieStore = await cookies();
  const userId = account?.userId ?? getPrivateSessionUserId(cookieStore.get('cp_session')?.value);
  return userId ? getPassportEntries(userId) : [];
}
