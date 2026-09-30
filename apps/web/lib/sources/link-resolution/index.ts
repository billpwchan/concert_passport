import {
  finishLinkResolutionRun,
  getEventsForLinkResolution,
  publishBestLinkAndReconcile,
  recordLinkEvidence,
  startLinkResolutionRun,
} from '../../../db/link-resolution.ts';
import { inspectCandidatePage } from './page-inspector.ts';
import { scoreCandidate } from './matcher.ts';
import { discoverLinkCandidates } from './providers.ts';
import type { LinkResolutionStats, ScoredCandidate } from './types.ts';

const roleRank = { ticket: 3, event: 2, tour: 1 } as const;
const authorityRank = { seller: 5, promoter: 4, artist: 3, venue: 2, discovery: 1 } as const;

function bestCandidate(candidates: ScoredCandidate[]): ScoredCandidate | undefined {
  return candidates
    .filter((candidate) => candidate.state === 'verified')
    .sort((left, right) => (
      roleRank[right.resolvedRole] - roleRank[left.resolvedRole]
      || right.score - left.score
      || authorityRank[right.authority] - authorityRank[left.authority]
    ))[0];
}

export async function resolveUpcomingEventLinks(input: {
  limit?: number;
  triggerType?: string;
} = {}): Promise<{ runId: string; stats: LinkResolutionStats }> {
  const runId = startLinkResolutionRun(input.triggerType ?? 'scheduled');
  const stats: LinkResolutionStats = {
    eventsChecked: 0,
    linksVerified: 0,
    linksQuarantined: 0,
    fieldsReconciled: 0,
    errors: [],
  };
  try {
    const events = getEventsForLinkResolution(input.limit ?? 36);
    for (const event of events) {
      stats.eventsChecked += 1;
      try {
        const discovered = await discoverLinkCandidates(event);
        discovered.errors.forEach((message) => stats.errors.push({ eventId: event.id, message }));
        const scored: ScoredCandidate[] = [];
        for (const candidate of discovered.candidates.slice(0, 12)) {
          const inspection = await inspectCandidatePage(candidate.url, event);
          const result = scoreCandidate(event, candidate, inspection);
          recordLinkEvidence(event.id, result);
          scored.push(result);
          if (result.state === 'verified') stats.linksVerified += 1;
          else stats.linksQuarantined += 1;
        }
        const best = bestCandidate(scored);
        if (best) stats.fieldsReconciled += publishBestLinkAndReconcile(event, best);
      } catch (error) {
        stats.errors.push({
          eventId: event.id,
          message: error instanceof Error ? error.message : 'Link resolution failed',
        });
      }
    }
    const status = stats.errors.length ? 'partial' : 'completed';
    finishLinkResolutionRun(runId, status, stats);
    return { runId, stats };
  } catch (error) {
    stats.errors.push({ eventId: 'scheduler', message: error instanceof Error ? error.message : 'Link resolution failed' });
    finishLinkResolutionRun(runId, 'failed', stats);
    throw error;
  }
}
