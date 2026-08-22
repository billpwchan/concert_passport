import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SCRYPT_N = 65_536;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

export function validatePassword(value: string): string | undefined {
  if (value.length < 12) return 'Password must be at least 12 characters.';
  if (value.length > 128) return 'Password must be 128 characters or fewer.';
  return undefined;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 96 * 1024 * 1024,
  });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

export function verifyPassword(password: string, encoded: string): boolean {
  const [algorithm, n, r, p, saltValue, expectedValue] = encoded.split('$');
  if (algorithm !== 'scrypt' || !n || !r || !p || !saltValue || !expectedValue) return false;
  const expected = Buffer.from(expectedValue, 'base64url');
  const actual = scryptSync(password, Buffer.from(saltValue, 'base64url'), expected.length, {
    N: Number(n), r: Number(r), p: Number(p), maxmem: 96 * 1024 * 1024,
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
