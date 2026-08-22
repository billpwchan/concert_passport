export type MarketCode =
  | 'SG'
  | 'HK'
  | 'JP'
  | 'TW'
  | 'TH'
  | 'KR'
  | 'MY'
  | 'PH'
  | 'ID'
  | 'VN'
  | 'AU';

export type Confidence = 'official' | 'verified' | 'reported' | 'unverified';

export type EventLinkRole = 'ticket' | 'event' | 'tour';
export type EventLinkAuthority = 'seller' | 'promoter' | 'artist' | 'venue' | 'discovery';
export type EventLinkState = 'verified' | 'quarantined' | 'stale';

export type MilestoneType =
  | 'announcement'
  | 'membership'
  | 'registration'
  | 'lottery'
  | 'lottery_result'
  | 'payment'
  | 'presale'
  | 'waiting_room'
  | 'general_sale'
  | 'ticket_delivery'
  | 'doors'
  | 'show';

export type MilestoneState =
  | 'completed'
  | 'active'
  | 'upcoming'
  | 'expired'
  | 'changed';

export type SourceReference = {
  id: string;
  name: string;
  url: string;
  host: string;
  confidence: Confidence;
  checkedAt: string;
};

export type Milestone = {
  id: string;
  type: MilestoneType;
  title: string;
  description: string;
  startsAt: string;
  endsAt?: string;
  timezone: string;
  state: MilestoneState;
  requires?: string[];
  sourceIds: string[];
  actionUrl?: string;
};

export type Artist = {
  id: string;
  name: string;
  koreanName?: string;
  agency: string;
  accent: string;
};

export type Venue = {
  id: string;
  name: string;
  city: string;
  market: MarketCode;
  timezone: string;
  latitude: number;
  longitude: number;
};

export type ConcertJourney = {
  id: string;
  slug: string;
  artist: Artist;
  tourName: string;
  venue: Venue;
  performanceStartsAt: string;
  milestones: Milestone[];
  sources: SourceReference[];
  officialSeller: string;
  officialSellerHost: string;
  ticketLimit?: number;
  travelDistanceKm?: number;
  demo: boolean;
};

export type Attendance = {
  id: string;
  artist: Artist;
  city: string;
  market: MarketCode;
  venue: string;
  attendedAt: string;
  travelDistanceKm: number;
  verification: 'self_attested' | 'ticket_import' | 'location_confirmed';
  accent: string;
};

export type ProviderStatus = 'live' | 'key_required' | 'partner_required' | 'verified_link';

export type SourceChannel = {
  id: string;
  name: string;
  category: 'fan_platform' | 'promoter' | 'ticketing' | 'event_api' | 'artist_identity';
  markets: MarketCode[];
  url: string;
  host: string;
  status: ProviderStatus;
  tier: 1 | 2 | 3;
  capabilities: Array<
    'announce' | 'registration' | 'lottery' | 'sale' | 'inventory' | 'purchase' | 'identity'
  >;
  notes: string;
};

export type DiscoveryQuery = {
  artist?: string;
  city?: string;
  countryCode?: string;
  startDateTime?: string;
  endDateTime?: string;
};

export type DiscoveredEvent = {
  canonicalId?: string;
  provider: string;
  providerEventId: string;
  name: string;
  artist?: string;
  startsAt: string;
  timezone?: string;
  venue?: string;
  city?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  officialUrl: string;
  confidence: Confidence;
  bestLinkUrl?: string;
  bestLinkRole?: EventLinkRole;
  bestLinkSource?: string;
  bestLinkScore?: number;
  bestLinkVerifiedAt?: string;
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageAttribution?: string;
  imageSourceUrl?: string;
  imageFallback?: boolean;
};

export type ConnectorHealth = {
  id: string;
  name: string;
  status: 'connected' | 'configuration_required' | 'partnership_required';
  detail: string;
};
