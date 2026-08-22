import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import {
  createAuthSession,
  deleteAuthSession,
  getAccountBySession,
  type AccountRecord,
} from '@/db/auth';
export { hashPassword, validatePassword, verifyPassword } from '@/lib/security/password';

export const AUTH_COOKIE = 'cp_auth';
const SESSION_DAYS = 30;

export type PublicAccount = Omit<AccountRecord, 'passwordHash'>;

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function createBrowserSession(userId: string): { cookie: string; expiresAt: number } {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = Date.now() + SESSION_DAYS * 86_400_000;
  createAuthSession(tokenHash(token), userId, expiresAt);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return {
    expiresAt,
    cookie: `${AUTH_COOKIE}=${token}; Path=/; Max-Age=${SESSION_DAYS * 86_400}; HttpOnly; SameSite=Lax; Priority=High${secure}`,
  };
}

export function clearBrowserSessionCookie(): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${AUTH_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Priority=High${secure}`;
}

function accountFromToken(token: string | undefined): PublicAccount | undefined {
  return token ? getAccountBySession(tokenHash(token)) : undefined;
}

export function getAccountFromRequest(request: Request): PublicAccount | undefined {
  const token = request.headers.get('cookie')?.split(';')
    .map((part) => part.trim().split('='))
    .find(([name]) => name === AUTH_COOKIE)?.[1];
  return accountFromToken(token);
}

export async function getCurrentAccount(): Promise<PublicAccount | undefined> {
  return accountFromToken((await cookies()).get(AUTH_COOKIE)?.value);
}

export function revokeRequestSession(request: Request): void {
  const token = request.headers.get('cookie')?.split(';')
    .map((part) => part.trim().split('='))
    .find(([name]) => name === AUTH_COOKIE)?.[1];
  if (token) deleteAuthSession(tokenHash(token));
}
