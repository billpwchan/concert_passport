import type { EventLifecycleStatus } from './types.ts';

export type EventLifecycleEvidence = {
  lifecycleStatus: EventLifecycleStatus;
  confidence: string;
};

function authorityScore(confidence: string): number {
  if (confidence === 'official') return 100;
  if (confidence === 'verified') return 75;
  return 40;
}

export function resolveCanonicalLifecycle(
  evidence: EventLifecycleEvidence[],
  fallback: EventLifecycleStatus = 'scheduled',
): EventLifecycleStatus {
  if (!evidence.length) return fallback;
  const highestAuthority = Math.max(...evidence.map((item) => authorityScore(item.confidence)));
  const statuses = new Set(evidence
    .filter((item) => authorityScore(item.confidence) === highestAuthority)
    .map((item) => item.lifecycleStatus));

  // Non-destructive schedule changes should remain visible. Cancellation/deletion
  // hides a show only when every equally authoritative source is also inactive.
  if (statuses.has('rescheduled')) return 'rescheduled';
  if (statuses.has('postponed')) return 'postponed';
  if (statuses.has('scheduled')) return 'scheduled';
  if (statuses.has('offsale')) return 'offsale';
  if (statuses.has('cancelled')) return 'cancelled';
  return statuses.has('deleted') ? 'deleted' : fallback;
}
