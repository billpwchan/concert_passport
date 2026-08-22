import type {
  EventLinkAuthority,
  EventLinkRole,
  EventLinkState,
} from '../../domain/types.ts';

export type ResolvableEvent = {
  id: string;
  name: string;
  artist?: string;
  startsAt: string;
  timezone?: string;
  venue?: string;
  city?: string;
  countryCode?: string;
};

export type CandidateEventData = {
  name?: string;
  artist?: string;
  startsAt?: string;
  venue?: string;
  city?: string;
  countryCode?: string;
  saleStartsAt?: string;
};

export type EventLinkCandidate = {
  url: string;
  sourceId: string;
  sourceEventId?: string;
  role: EventLinkRole;
  authority: EventLinkAuthority;
  data: CandidateEventData;
  discoveredBy: 'ticketmaster' | 'official-catalog' | 'brave' | 'searxng' | 'submission';
};

export type CandidateInspection = {
  requestedUrl: string;
  canonicalUrl: string;
  httpStatus?: number;
  fetched: boolean;
  contentHash?: string;
  data: CandidateEventData;
  offerUrl?: string;
  failureCode?: string;
};

export type ScoredCandidate = EventLinkCandidate & {
  inspection: CandidateInspection;
  canonicalUrl: string;
  resolvedRole: EventLinkRole;
  score: number;
  state: EventLinkState;
  reasons: string[];
  conflicts: string[];
};

export type LinkResolutionStats = {
  eventsChecked: number;
  linksVerified: number;
  linksQuarantined: number;
  fieldsReconciled: number;
  errors: Array<{ eventId: string; message: string }>;
};
