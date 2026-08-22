import { createAccount } from '@/db/auth';
import { authRateLimit } from '@/lib/server/auth-rate-limit';
import { createBrowserSession, normalizeEmail } from '@/lib/server/auth';
import { hashPassword, validatePassword } from '@/lib/security/password';
import { hasSameOrigin } from '@/lib/server/request-security';
import { getPrivateSession } from '@/lib/server/session';

export async function POST(request: Request): Promise<Response> {
  if (!hasSameOrigin(request)) return Response.json({ code: 'invalid_request' }, { status: 403 });
  const limit = authRateLimit(request, 'register');
  if (!limit.allowed) return Response.json({ code: 'rate_limited' }, { status: 429, headers: { 'retry-after': String(limit.retryAfter) } });

  const body = (await request.json()) as { email?: string; password?: string; displayName?: string };
  const email = normalizeEmail(body.email ?? '');
  const password = body.password ?? '';
  const displayName = (body.displayName ?? '').trim().slice(0, 60);
  if (!/^\S+@\S+\.\S+$/.test(email)) return Response.json({ code: 'invalid_email' }, { status: 400 });
  const passwordError = validatePassword(password);
  if (passwordError) return Response.json({ code: 'invalid_password' }, { status: 400 });
  if (displayName.length < 2) return Response.json({ code: 'invalid_display_name' }, { status: 400 });

  const privateSession = getPrivateSession(request);
  try {
    const account = createAccount({
      userId: privateSession.user.userId,
      email,
      passwordHash: hashPassword(password),
      displayName,
    });
    const session = createBrowserSession(account.userId);
    const response = Response.json({
      user: {
        userId: account.userId,
        email: account.email,
        displayName: account.displayName,
        role: account.role,
        status: account.status,
      },
    }, { status: 201 });
    response.headers.append('set-cookie', session.cookie);
    if (privateSession.setCookie) response.headers.append('set-cookie', privateSession.setCookie);
    return response;
  } catch (error) {
    if (String(error).includes('UNIQUE constraint failed')) {
      return Response.json({ code: 'email_exists' }, { status: 409 });
    }
    throw error;
  }
}
