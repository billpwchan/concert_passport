import { getAccountFromRequest } from './auth';
import { getPrivateSession, type PrivateSession } from './session';

export function getDataSession(request: Request): PrivateSession {
  const account = getAccountFromRequest(request);
  if (account) {
    return {
      user: {
        userId: account.userId,
        email: account.email,
        displayName: account.displayName,
      },
    };
  }
  return getPrivateSession(request);
}
