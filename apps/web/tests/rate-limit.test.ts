import assert from 'node:assert/strict';
import test from 'node:test';

import { discoverRateLimit } from '../lib/server/rate-limit.ts';

test('limits repeated discovery requests per forwarded client', () => {
  const request = new Request('https://concert-passport.test/api/v1/discover', {
    headers: { 'x-forwarded-for': '203.0.113.10' },
  });
  const now = Date.parse('2026-08-22T00:00:00Z');
  for (let index = 0; index < 20; index += 1) {
    assert.equal(discoverRateLimit(request, now).allowed, true);
  }
  const blocked = discoverRateLimit(request, now);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfter, 60);
  assert.equal(discoverRateLimit(request, now + 60_001).allowed, true);
});
