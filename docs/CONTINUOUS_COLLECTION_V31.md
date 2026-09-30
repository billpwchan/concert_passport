# Continuous collection — v31

> September 30 update: [keyless collection is now the default](KEYLESS_DATA.md). Commercial API jobs are opt-in; per-page access failures no longer stop an otherwise working source.

The catalog is a projection of observed source documents rather than a maintained static calendar. The product keeps one dark appearance. Discovery, filtering, comparison, saving, source inspection and calendar export form the main journey.

## Collection and evidence

- A source manifest seeds official promoter and seller roots. Live Nation public search uses the same X-Site / X-Culture headers as its website, with bounded pagination. Existing official links and submitted corrections seed the same queue.
- SQLite persists URL frontiers, due dates, leases, conditional validators, HTTP outcomes, document hashes, original bodies and parsed candidates. Restarts preserve unfinished work and source failures.
- Parsers support JSON-LD, Live Nation serialized public event records and ThaiTicketMajor individual performance rows. Third-party scripts are parsed as data, never executed. Captured public source excerpts provide replay tests.
- Publication requires an established artist, market, venue and date. Ambiguous names need a durable matching provider identity. Unknown artists, conflicting records and unresolved multi-day schedules remain in review.
- Canonical reconciliation preserves source records and material versions. Distinct performances and conflicting venues remain separate. Missing or unreachable pages never cancel an event. An absent lifecycle statement does not revive inactive records.
- Images need event-scoped evidence or established artist identity. Event artwork comes from the event object, not a navigation logo or related-artist image. Wikimedia photos require the artist's Wikidata P18 relationship and attribution. Changed images stale superseded proofs; event-image proofs expire after 30 days without verification.

Date-only records remain date-only and cannot export invented calendar times. Live Nation eventSortDateUtc / 23:59 values are sorting placeholders. Multi-day listings do not create inferred performances; they can corroborate artwork for existing performances only when artist, country, official URL and local date range match. Their unresolved schedule remains in review.

## Automatic updates

The isolated worker requests an official-collection batch every five minutes: at most eight pages per batch, a 50-second loop budget and bounded in-flight requests. Persistent scheduler leases prevent overlap. Artist identity, provider ingestion, links and artist media retain separate jobs.

Pages refresh approximately every six hours, two hours within 14 days of a performance, or 30 minutes within two days. Historical pages back off to seven days. A source cannot occupy every lease. Conditional 304 responses replay retained evidence so newly established artists can become publishable without pretending a new document appeared.

Authentication failures cool down for six hours; unavailable sources and rate limits back off exponentially. Robots restrictions stop collection. Parse errors delay their page without disabling the entire host. Bodies are limited to 1.5 MB; up to three snapshots per URL are retained under a 128 MB global raw-body budget. Hashes and extracted evidence survive body pruning. Each source is capped at 1,500 URLs and each public index at 1,000 entries per pass.

`/sources` and `GET /api/v1/coverage` expose actual checks, failures, queued pages and changes. Configured credentials are distinct from successful requests. The installed PredictHQ credential returned HTTP 401 during the September 6 audit; independent official collection continues, and this credential is no longer displayed as working.

## Corrections and operations

Source and event pages accept same-origin, rate-limited correction submissions on configured official HTTPS hosts. Reports enter the verification queue and never directly overwrite public data. Sale information includes its source and observation time; it is not a real-time inventory promise. Source badges use name abbreviations rather than unrelated favicons presented as official logos.

Internal authorized routes: `/api/internal/collection/run`, `/api/internal/artist-catalog/run`, `/api/internal/ingestion/run`, `/api/internal/link-resolution/run`, `/api/internal/media/run`.

Audit tables: `source_runtime`, `collection_frontier`, `source_documents`, `collection_candidates`, `event_enrichment`, `event_media_proofs`, `artist_media_proofs`. Do not log provider credentials.

Migration 9 preserves accounts, saves, follows, attendance and sessions. Deployment uses a consistent SQLite backup, private candidate database, tagged image, atomic release symlink and health-gated app/worker restart. Rollback restores the previous image; the additive schema can remain. Never replace production with a local preview database.

## Coverage limits

This does not claim complete Asia-Pacific coverage. Some sellers block automation, need a commercial feed, or use unsupported structures. Those states are visible. Festival lineups and ambiguous newcomers may need additional identity evidence. No search result still does not prove there is no concert. Production observations belong in the deployment report, separately from implementation claims.
