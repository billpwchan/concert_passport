import assert from 'node:assert/strict';
import test from 'node:test';

import { matchesPredictHqArtistQuery } from '../lib/sources/adapters/predicthq-matcher.ts';

test('requires performer identity for ambiguous short stage names', () => {
  assert.equal(matchesPredictHqArtistQuery({
    title: 'FULL MOON SOUND BATH',
    entities: [{ name: 'SPACE2B', type: 'venue' }],
  }, 'Moon'), false);
  assert.equal(matchesPredictHqArtistQuery({
    title: 'Moon Asia Tour',
    entities: [{ name: 'Moon', type: 'person' }],
  }, 'Moon'), true);
  assert.equal(matchesPredictHqArtistQuery({
    title: 'KEY TO LIT',
    entities: [{ name: 'KEY', type: 'person' }],
  }, 'KEY'), false);
  assert.equal(matchesPredictHqArtistQuery({
    title: 'Rain Sounds for Sleep',
  }, 'Rain'), false);
});

test('keeps exact artist words for distinctive names', () => {
  assert.equal(matchesPredictHqArtistQuery({
    title: 'IVE WORLD TOUR',
  }, 'IVE'), true);
  assert.equal(matchesPredictHqArtistQuery({
    title: 'The Big Giveaway Live',
  }, 'IVE'), false);
  assert.equal(matchesPredictHqArtistQuery({ title: 'Stray Kids World Tour RUN IT' }, 'Stray Kids'), true);
  assert.equal(matchesPredictHqArtistQuery({ title: '2026 LUCY 9TH CONCERT ISLAND' }, 'LUCY'), true);
  assert.equal(matchesPredictHqArtistQuery({ title: 'Drop D of lower' }, 'DROP'), false);
  assert.equal(matchesPredictHqArtistQuery({ title: 'PNAU and Alice Ivy' }, 'Alice'), false);
  assert.equal(matchesPredictHqArtistQuery({ title: 'Jay Chou World Tour' }, 'Jay'), false);
});

test('accepts an exact K-pop group organization entity without title repetition', () => {
  assert.equal(matchesPredictHqArtistQuery({
    title: 'Tunnel Vision World Tour',
    entities: [{ name: 'ITZY', type: 'organization' }],
  }, 'ITZY'), true);
  assert.equal(matchesPredictHqArtistQuery({
    title: 'Tunnel Vision World Tour',
    entities: [{ name: 'Unrelated Promoter', type: 'organization' }],
  }, 'ITZY'), false);
});

test('rejects prefix collisions and same-name performers of the wrong type', () => {
  assert.equal(matchesPredictHqArtistQuery({
    title: 'Deux Yan from: The Netherlands JAPAN TOUR in Osaka',
    entities: [{ name: 'Lhinen', type: 'organization' }],
  }, 'Deux', 'group'), false);
  assert.equal(matchesPredictHqArtistQuery({
    title: 'vurtnight Rrose',
    entities: [{ name: 'Lucy', type: 'person' }],
  }, 'LUCY', 'group'), false);
  assert.equal(matchesPredictHqArtistQuery({
    title: 'LUCY',
    entities: [{ name: 'Lucy', type: 'person' }],
  }, 'LUCY', 'group'), false);
  assert.equal(matchesPredictHqArtistQuery({
    title: '2026 LUCY 9TH CONCERT ISLAND',
    entities: [{ name: 'Lucy', type: 'organization' }],
  }, 'LUCY', 'group'), true);
});
