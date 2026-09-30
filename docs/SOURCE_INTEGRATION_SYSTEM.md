# Source Integration System

## Coverage contract

Concert Passport does not equate a source directory with live ingestion. The runtime has four distinct source roles:

| Role | Current implementation | Authority |
| --- | --- | --- |
| Artist identity graph | MusicBrainz and Wikidata scheduled imports | names, aliases, type, origin and activity evidence only |
| Licensed event discovery | Ticketmaster Discovery and PredictHQ | dated event candidates and provider metadata |
| Official tour discovery | Live Nation artist calendars | complete structured tour dates and promoter event links when regional APIs omit a show |
| Official ticket/promoter destinations | market-specific allowlisted registry | exact handoff destination and event-level corroboration |
| Automatic web discovery | private SearXNG plus deterministic inspection | candidate discovery only; never grants authority by itself |

Counts are generated from the registry and database. They must not be repeated as fixed marketing claims.

## Self-evolving K-pop graph

The launch list is a cold-start seed, not the catalog boundary. Scheduled identity syncs page through K-pop-tagged MusicBrainz artists and direct K-pop genre entities in Wikidata. Each observation is merged into `artist_catalog`, `artist_aliases`, and `artist_sources` using stable external IDs, normalized aliases, source confidence, and provenance.

```text
MusicBrainz ─┐
             ├─► identity evidence ─► artist graph ─► adaptive artist queue
Wikidata ────┘                              ▲                  │
                                            │                  ▼
user follows ─► demand priority             │        licensed event APIs
                                            │                  │
market sweeps ─► explicit K-pop event ──────┘                  ▼
                                                   canonical event catalog
                                                            │
                                     ┌──────────────────────┼──────────────────────┐
                                     ▼                      ▼                      ▼
                                exact links            link resolver         market coverage
```

New acts can enter automatically through:

1. a K-pop identity reference with an external ID and qualifying tags;
2. a provider event explicitly classified as K-pop;
3. a member follow, which immediately creates a high-priority observed identity;
4. a new alias or source mapping attached to an existing identity.

An unknown event name without K-pop evidence is not silently promoted into the graph or public K-pop catalog. A structured provider identity can remain in the durable candidate queue until another source, explicit provider classification, or member demand supplies the missing evidence. No publication path depends on a manual review queue.

## Adaptive scheduling

The scheduler spends calls according to expected user value instead of rotating every artist equally:

- followed and recently active artists are checked first;
- artists with upcoming events return to the queue after six hours;
- high-priority artists without events are checked daily;
- medium-priority artists are checked every three days;
- the long tail is revisited every fourteen days;
- every batch reserves explicit capacity for hot, never-checked, and longest-overdue cohorts;
- one APAC market-wide sweep runs each ingestion cycle and each market is revisited every four hours;
- identity cursors persist per source, so a restart resumes the graph scan instead of returning to page one.

Provider runs are isolated. A failed identity or event provider records a partial result and does not discard successful evidence from another provider. The next run retries from the last safe cursor.

Forward searches are complemented by a resumable PredictHQ update feed over a fixed `updated.*` window and `active,deleted` states. Bounded pagination stores its continuation URL; the cursor advances only after the complete window commits. Every forward status and explicit deletion passes through the same authority reconciliation: a reported source cannot override an official source, and equally authoritative cancellation conflicts fail visible.

## Canonical event and link pipeline

Every accepted provider record is idempotently upserted into `canonical_events`. `event_source_links` retains all provider relationships and `event_versions` records material changes. The automatic link resolver then:

1. prefers exact official provider URLs;
2. searches through the private metasearch service when an event lacks a usable ticket page;
3. filters candidates through the official-host registry;
4. inspects the destination and scores artist, city, venue, date, ticket intent and source authority;
5. publishes a direct handoff only above the deterministic acceptance threshold;
6. quarantines conflicts automatically and retries them with backoff.

There is no operator approval state. Ambiguous evidence fails closed, stays on the internal event page, and is rescored when new evidence arrives. Seller login, queues, CAPTCHA, checkout and ticket purchase remain outside the platform.

## Data model

- `artist_catalog` — canonical identity, status, confidence, priority and adaptive refresh timestamps;
- `artist_aliases` — normalized multilingual aliases used by search and event matching;
- `artist_sources` — source-specific external ID, confidence and observation time;
- `artist_catalog_sync_state` — durable source cursor, counts and failure state;
- `market_discovery_state` — per-market sweep freshness, event count and last failure;
- `canonical_events` — current normalized event projection;
- `event_source_links` — provider record, URL, authority, observations and source lifecycle status;
- `event_versions` — immutable snapshots of material changes;
- `ingestion_runs` and `connector_run_items` — scheduled-run health and counts;
- `provider_change_sync_state` — fixed update window, cursor, continuation and change-feed health;
- `scheduler_jobs` — cross-process lease, last result and consecutive failure state;
- `schema_migrations` — ordered transactional schema history;
- `artist_follows` — demand signal that immediately changes catalog priority;
- `artist_media` — exact-match provider media with attribution and refresh state.

## Correctness gates

An automatic connector must provide stable identity, idempotent refresh behavior, explicit time semantics, source provenance, deterministic conflict handling, rate-limit compliance, observability and bounded retries. A known host is not sufficient: the event-level page still has to match the artist, place, date and ticket intent.

Service objectives before a commercial coverage claim:

- connected event discovery freshness within 30 minutes;
- critical sale-window freshness within ten minutes only where a contracted source permits it;
- field-level provenance and source timezone for every critical milestone;
- versioned material changes and alert rescheduling within one refresh cycle;
- measured per-market recall, not a binary “supported” badge;
- no sample events, invented ticket links, or silent fallback to stale provider data.

MusicBrainz access must use a meaningful user agent and remain below its published rate limit. Wikidata queries stay bounded, paged, cached and deliberately narrow to avoid placing open infrastructure under unbounded load.
