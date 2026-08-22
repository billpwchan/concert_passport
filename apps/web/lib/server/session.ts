export const PRIVATE_SESSION_COOKIE = 'cp_session';
const SESSION_PATTERN = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;

export function getPrivateSessionUserId(value: string | undefined): string | undefined {
  return value && SESSION_PATTERN.test(value) ? value : undefined;
}

export type PrivateSession = {
  user: { userId: string; email: string; displayName: string };
  setCookie?: string;
};

export function getPrivateSession(request: Request): PrivateSession {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const existing = cookieHeader
    .split(';')
    .map((part) => part.trim().split('='))
    .find(([name]) => name === PRIVATE_SESSION_COOKIE)?.[1];
  const userId = getPrivateSessionUserId(existing) ?? crypto.randomUUID();
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';

  return {
    user: {
      userId,
      email: `${userId}@private.concert-passport`,
      displayName: 'Private listener',
    },
    setCookie: existing
      ? undefined
      : `${PRIVATE_SESSION_COOKIE}=${userId}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${secure}`,
  };
}
