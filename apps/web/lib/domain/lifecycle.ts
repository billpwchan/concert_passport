import type { ConcertJourney, Milestone } from './types';

const ALERT_OFFSETS_MINUTES = [24 * 60, 120, 10, 0] as const;

export function getNextMilestone(
  journey: ConcertJourney,
  now = new Date(),
): Milestone | undefined {
  return [...journey.milestones]
    .filter((milestone) => milestone.state !== 'completed')
    .filter((milestone) => new Date(milestone.endsAt ?? milestone.startsAt) >= now)
    .sort(
      (left, right) =>
        new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
    )[0];
}

export function getJourneyProgress(journey: ConcertJourney): {
  complete: number;
  total: number;
} {
  return {
    complete: journey.milestones.filter((item) => item.state === 'completed').length,
    total: journey.milestones.length,
  };
}

export function createAlertSchedule(milestone: Milestone): string[] {
  const target = new Date(milestone.endsAt ?? milestone.startsAt).getTime();
  return ALERT_OFFSETS_MINUTES.map((minutes) =>
    new Date(target - minutes * 60_000).toISOString(),
  );
}

export function formatVenueTime(
  iso: string,
  timezone: string,
  locale = 'en-GB',
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(new Date(iso))
    .replace(',', ' ·');
}

export function sumDistanceKm(values: Array<{ travelDistanceKm: number }>): number {
  return values.reduce((total, item) => total + item.travelDistanceKm, 0);
}
