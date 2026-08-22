import type { ConcertJourney } from './types';

export type StoredMilestoneState = {
  milestoneId: string;
  state: string;
};

export function applyMilestoneStates(
  journey: ConcertJourney,
  rows: StoredMilestoneState[],
): ConcertJourney {
  const completedIds = new Set(
    rows.filter((row) => row.state === 'completed').map((row) => row.milestoneId),
  );
  const resetIds = new Set(
    rows.filter((row) => row.state === 'todo').map((row) => row.milestoneId),
  );

  return {
    ...journey,
    milestones: journey.milestones.map((milestone) => ({
      ...milestone,
      state: completedIds.has(milestone.id)
        ? 'completed'
        : resetIds.has(milestone.id) && milestone.state === 'completed'
          ? 'upcoming'
          : milestone.state,
    })),
  };
}
