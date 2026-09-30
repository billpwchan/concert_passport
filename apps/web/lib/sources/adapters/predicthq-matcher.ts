import { isAmbiguousArtistName } from '../../domain/ambiguous-artist-names.ts';

type PredictHqArtistEvent = {
  title: string;
  entities?: Array<{ name: string; type: string }>;
};

type ArtistType = 'group' | 'person' | 'unknown';

function normalizeSearchText(value: string): string {
  return value.toLocaleLowerCase('en-US').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

const LIVE_INTENT_PREFIX = /^(?:\d+(?:st|nd|rd|th)?\s+)?(world tour|asia tour|arena tour|tour|concert|fancon|fan concert|fan meeting|fanmeeting|showcase|the stage|live in)\b/;

function entityTypeMatches(entityType: string, expectedArtistType: ArtistType): boolean {
  if (expectedArtistType === 'unknown') return entityType === 'person' || entityType === 'organization';
  if (expectedArtistType === 'group') return entityType === 'organization';
  return entityType === 'person';
}

export function matchesPredictHqArtistQuery(
  event: PredictHqArtistEvent,
  artist?: string,
  expectedArtistType: ArtistType = 'unknown',
): boolean {
  if (!artist) return true;
  const needle = normalizeSearchText(artist);
  const shortNeedle = needle.replace(/ (bts|exo|shinee)$/, '');
  const identities = new Set([needle, shortNeedle]);
  const normalizedTitle = normalizeSearchText(event.title);
  const matchTitle = normalizedTitle.replace(/^20\d{2}\s+/, '');
  const exactTitle = identities.has(matchTitle);
  const performerEntities = (event.entities ?? []).filter((entity) => (
    entity.type === 'person' || entity.type === 'organization'
  ));
  const conflictingPerformer = expectedArtistType !== 'unknown' && performerEntities.some((entity) => (
    identities.has(normalizeSearchText(entity.name))
    && !entityTypeMatches(entity.type, expectedArtistType)
  ));
  if (conflictingPerformer) return false;
  const performerMatch = performerEntities.some((entity) => (
    entityTypeMatches(entity.type, expectedArtistType)
    && identities.has(normalizeSearchText(entity.name))
  ));
  if (exactTitle) return true;
  const titleHasArtistLedLiveIntent = [...identities].some((identity) => (
    matchTitle.startsWith(`${identity} `) && LIVE_INTENT_PREFIX.test(matchTitle.slice(identity.length + 1))
  ));
  if (isAmbiguousArtistName(shortNeedle)) return titleHasArtistLedLiveIntent;
  if (performerMatch) return true;
  return titleHasArtistLedLiveIntent;
}
