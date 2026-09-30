import {
  completeArtistIdentityCandidate,
  ensureCoreArtistCatalog,
  getDueArtistIdentityCandidates,
  getArtistCatalogSyncState,
  observeArtistIdentityCandidates,
  recordArtistEvidence,
  saveArtistCatalogSyncState,
} from '../../../db/artists.ts';
import type { DiscoveredEvent } from '../../domain/types.ts';
import { fetchExactKoreanArtistEvidence, fetchMusicBrainzKpopPage } from './musicbrainz.ts';
import { fetchWikidataKpopPage } from './wikidata.ts';

type SourceResult = {
  sourceId: string;
  seen: number;
  accepted: number;
  nextOffset: number;
  total?: number;
  error?: string;
};

async function syncMusicBrainz(): Promise<SourceResult> {
  const sourceId = 'musicbrainz';
  const startedAt = Date.now();
  const state = getArtistCatalogSyncState(sourceId);
  try {
    const page = await fetchMusicBrainzKpopPage(state.cursorOffset);
    const accepted = page.evidence.filter((evidence) => recordArtistEvidence(evidence)).length;
    saveArtistCatalogSyncState({
      sourceId, cursorOffset: page.nextOffset, totalCount: page.total,
      status: 'completed', itemsSeen: page.seen, itemsAccepted: accepted, startedAt,
    });
    return { sourceId, seen: page.seen, accepted, nextOffset: page.nextOffset, total: page.total };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'MusicBrainz sync failed';
    saveArtistCatalogSyncState({
      sourceId, cursorOffset: state.cursorOffset, totalCount: state.totalCount,
      status: 'failed', itemsSeen: 0, itemsAccepted: 0, error: message, startedAt,
    });
    return { sourceId, seen: 0, accepted: 0, nextOffset: state.cursorOffset, error: message };
  }
}

async function syncWikidata(): Promise<SourceResult> {
  const sourceId = 'wikidata';
  const startedAt = Date.now();
  const state = getArtistCatalogSyncState(sourceId);
  try {
    const page = await fetchWikidataKpopPage(state.cursorOffset);
    const accepted = page.evidence.filter((evidence) => recordArtistEvidence(evidence)).length;
    saveArtistCatalogSyncState({
      sourceId, cursorOffset: page.nextOffset, status: 'completed',
      itemsSeen: page.seen, itemsAccepted: accepted, startedAt,
    });
    return { sourceId, seen: page.seen, accepted, nextOffset: page.nextOffset };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Wikidata sync failed';
    saveArtistCatalogSyncState({
      sourceId, cursorOffset: state.cursorOffset, status: 'failed',
      itemsSeen: 0, itemsAccepted: 0, error: message, startedAt,
    });
    return { sourceId, seen: 0, accepted: 0, nextOffset: state.cursorOffset, error: message };
  }
}

export async function syncArtistCatalog(): Promise<{
  status: 'completed' | 'partial' | 'failed';
  sources: SourceResult[];
}> {
  ensureCoreArtistCatalog();
  const sources = await Promise.all([syncMusicBrainz(), syncWikidata()]);
  const failures = sources.filter((source) => source.error).length;
  return {
    status: failures === 0 ? 'completed' : failures === sources.length ? 'failed' : 'partial',
    sources,
  };
}

export async function resolveMarketArtistCandidates(
  events: DiscoveredEvent[],
  limit = 6,
): Promise<number> {
  observeArtistIdentityCandidates(events);
  const candidates = getDueArtistIdentityCandidates(limit);
  const deadline = Date.now() + 35_000;
  for (const event of candidates) {
    if (Date.now() >= deadline) break;
    try {
      const evidence = await fetchExactKoreanArtistEvidence(event.artistName, event.artistType);
      if (evidence) {
        recordArtistEvidence(evidence);
        completeArtistIdentityCandidate(
          event,
          'needs_review',
          'Stable cross-source provider identity evidence is required before binding',
        );
      } else completeArtistIdentityCandidate(event, 'no_match');
    } catch (error) {
      completeArtistIdentityCandidate(
        event,
        'error',
        error instanceof Error ? error.message : 'Identity resolution failed',
      );
    }
  }
  return 0;
}

export async function resolveExactKoreanArtistIdentity(
  name: string,
  expectedType?: 'group' | 'person' | 'unknown',
  providerIdentity?: { provider: string; providerArtistId: string },
): Promise<boolean> {
  const evidence = await fetchExactKoreanArtistEvidence(name, expectedType);
  const artist = evidence ? recordArtistEvidence(evidence) : undefined;
  if (!artist) return false;
  // Name, country, genre and type can prove catalog scope, but they cannot prove that
  // a provider attraction belongs to that exact artist. Provider bindings require a
  // durable cross-source identifier or a reviewed attestation, neither of which this
  // resolver has.
  return !providerIdentity;
}
