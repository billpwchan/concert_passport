import assert from 'node:assert/strict';
import test from 'node:test';
import { exactArtistResult } from '../lib/sources/media/wikimedia.ts';
import { fallbackVisualResponse } from '../lib/server/visual-fallback.ts';

test('Wikidata media identity requires an exact artist label or alias', () => {
  const results = [
    { id: 'Q1', label: 'BTS station', description: 'railway station' },
    { id: 'Q2', label: 'Bangtan Boys', aliases: ['BTS'], description: 'South Korean boy band' },
  ];
  assert.equal(exactArtistResult(results, 'BTS')?.id, 'Q2');
  assert.equal(exactArtistResult(results, 'BT')?.id, undefined);
});

test('brand fallback is a cacheable image rather than an empty response', async () => {
  const response = fallbackVisualResponse({
    artist: 'BTS', city: 'Singapore', market: 'SG', localDate: '2026-12-19',
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /^image\/svg\+xml/);
  assert.equal(response.headers.get('x-concert-passport-media'), 'brand-fallback');
  const body = await response.text();
  assert.match(body, /BTS/);
  assert.match(body, /Singapore/);
});
