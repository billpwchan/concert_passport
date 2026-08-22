import assert from 'node:assert/strict';
import test from 'node:test';
import { demoJourneys } from '../lib/domain/demo.ts';
import { applyMilestoneStates } from '../lib/domain/journey-state.ts';

test('applies persisted completion without mutating demo data', () => {
  const journey = demoJourneys[0];
  const pending = journey.milestones.find((milestone) => milestone.state !== 'completed');
  assert.ok(pending);

  const merged = applyMilestoneStates(journey, [
    { milestoneId: pending.id, state: 'completed' },
  ]);

  assert.equal(merged.milestones.find((milestone) => milestone.id === pending.id)?.state, 'completed');
  assert.notEqual(
    journey.milestones.find((milestone) => milestone.id === pending.id)?.state,
    'completed',
  );
});

test('restores a demo-completed milestone when the user reopens it', () => {
  const journey = demoJourneys[0];
  const completed = journey.milestones.find((milestone) => milestone.state === 'completed');
  assert.ok(completed);

  const merged = applyMilestoneStates(journey, [
    { milestoneId: completed.id, state: 'todo' },
  ]);

  assert.equal(merged.milestones.find((milestone) => milestone.id === completed.id)?.state, 'upcoming');
});
