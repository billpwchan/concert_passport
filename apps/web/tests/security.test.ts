import assert from 'node:assert/strict';
import test from 'node:test';
import { hashPassword, validatePassword, verifyPassword } from '../lib/security/password.ts';
import { hasSameOrigin } from '../lib/server/request-security.ts';
import { isSafeStoredMediaUrl } from '../lib/server/media-url.ts';

test('stores passwords as salted scrypt hashes and compares in constant time', () => {
  const encoded = hashPassword('a long concert passphrase');
  assert.match(encoded, /^scrypt\$65536\$8\$1\$/);
  assert.equal(encoded.includes('a long concert passphrase'), false);
  assert.equal(verifyPassword('a long concert passphrase', encoded), true);
  assert.equal(verifyPassword('a different passphrase', encoded), false);
});

test('remote media storage rejects local and credential-bearing targets', () => {
  assert.equal(isSafeStoredMediaUrl('https://images.example.com/tour.webp'), true);
  assert.equal(isSafeStoredMediaUrl('https://127.0.0.1/private'), false);
  assert.equal(isSafeStoredMediaUrl('https://localhost/private'), false);
  assert.equal(isSafeStoredMediaUrl('https://user:pass@images.example.com/tour.webp'), false);
  assert.equal(isSafeStoredMediaUrl('http://images.example.com/tour.webp'), false);
});

test('accepts passphrases and rejects short passwords', () => {
  assert.equal(validatePassword('short'), 'Password must be at least 12 characters.');
  assert.equal(validatePassword('correct horse battery staple'), undefined);
});

test('rejects cross-origin state changes', () => {
  assert.equal(hasSameOrigin(new Request('https://concert.example/api', {
    headers: { origin: 'https://concert.example' },
  })), true);
  assert.equal(hasSameOrigin(new Request('https://concert.example/api', {
    headers: { origin: 'https://lookalike.example' },
  })), false);
});
