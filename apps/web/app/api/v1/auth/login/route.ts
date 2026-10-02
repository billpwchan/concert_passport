import { getAccountByEmail, mergeAnonymousState } from '@/db/auth';
import { authRateLimit } from '@/lib/server/auth-rate-limit';
import { createBrowserSession, normalizeEmail } from '@/lib/server/auth';
import { verifyPassword } from '@/lib/security/password';
import { hasSameOrigin } from '@/lib/server/request-security';
import { getPrivateSession } from '@/lib/server/session';

export async function POST(request: Request): Promise<Response> {
  if (!hasSameOrigin(request)) return Response.json({ code: 'invalid_request' }, { status: 403 });
  const limit = authRateLimit(request, 'login');
  if (!limit.allowed) return Response.json({ code: 'rate_limited' }, { status: 429, headers: { 'retry-after': String(limit.retryAfter) } });
  const body = await request.json().catch(() => null) as { email?: unknown; password?: unknown } | null;
  const email = body?.email ?? '';
  const password = body?.password ?? '';
  if (!body || typeof body !== 'object' || typeof email !== 'string' || typeof password !== 'string') {
    return Response.json({ code: 'invalid_request' }, { status: 400 });
  }
  const account = getAccountByEmail(normalizeEmail(email));
  if (!account || account.status !== 'active' || !verifyPassword(password, account.passwordHash)) {
    return Response.json({ code: 'invalid_credentials' }, { status: 401 });
  }
  const privateSession = getPrivateSession(request);
  mergeAnonymousState(privateSession.user.userId, account.userId);
  const session = createBrowserSession(account.userId);
  const response = Response.json({ user: { userId: account.userId, email: account.email, displayName: account.displayName, role: account.role, status: account.status } });
  response.headers.append('set-cookie', session.cookie);
  if (privateSession.setCookie) response.headers.append('set-cookie', privateSession.setCookie);
  return response;
}
