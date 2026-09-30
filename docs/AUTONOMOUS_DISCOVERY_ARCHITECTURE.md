# Autonomous Discovery and Event Intelligence

## Purpose

Concert Passport is not a static list of concerts. It is a continuously reconciled projection of artist identities, provider events, official destinations, media evidence, and fan intent. Automation may discover and rank evidence; it must not invent an artist, date, venue, ticket state, link, or image.

The operating loop has four independent questions:

1. **Who exists?** Maintain a source-backed K-pop identity graph.
2. **What was announced or changed?** Search both known artists and complete APAC markets, then consume provider updates and deletions.
3. **Which records describe the same show?** Reconcile sources into one canonical event without losing provenance.
4. **What can safely be shown or opened?** Publish media and outbound links only after identity and authority checks.

## Production data flow

```text
MusicBrainz ─┐
             ├── identity evidence ──► artist graph ──► adaptive due queue ─┐
Wikidata ────┘                                                             │
                                                                            ├─► artist searches
member follows ───────────────► demand priority ────────────────────────────┤
                                                                            │
12-market sweep ─► provider performer IDs ─► identity candidate resolver ───┤
                                                                            ▼
Ticketmaster + PredictHQ + Live Nation + exact official calendars ─► normalized events
                                                                            │
PredictHQ updated/deleted feed ─► resumable cursor + tombstones ────────────┤
                                                                            ▼
                                      source links ─► canonical reconciliation
                                                           │
                                  ┌────────────────────────┼────────────────────────┐
                                  ▼                        ▼                        ▼
                           lifecycle state          official-link proof       media identity
                                  │                        │                        │
                                  └────────────────────────┴────────────────────────┘
                                                           ▼
                                            Web / API / saved journey / Passport
```

## 1. Artist identity acquisition

### Entry paths

- MusicBrainz pages through Korean artists carrying positive K-pop tag evidence.
- Wikidata pages through entities explicitly typed as a person or musical group in the K-pop genre.
- A provider market sweep can nominate an unknown structured performer ID for exact identity resolution.
- A member follow creates an observed, high-priority identity; it does not make that identity verified.

Every accepted observation retains its source and external ID. Display names and multilingual aliases are searchable projections, never primary keys. A type conflict between a known group and a same-name person fails closed. Short ambiguous names require stronger title and performer evidence.

### Continuous coverage

Identity cursors persist in SQLite and advance only after a successful page. A failed source does not reset the other source or return either scan to page zero. The bootstrap artist list only prevents a cold-start empty product.

At the current six-hour identity cadence, a full MusicBrainz pass is normally measured in days and a full Wikidata pass in roughly one to two weeks, depending on source size and availability. Market sweeps provide a faster second path for a new act that already has an announced APAC event.

## 2. Adaptive event discovery

The due queue has an explicit per-run budget rather than an unbounded crawl. Capacity is reserved for three cohorts:

- 50% for high-priority and recently active artists;
- 25% for never-checked identities when the batch is large enough;
- the remainder for the longest-overdue long tail.

Unused cohort capacity is filled from the longest-overdue queue. Artists with a future event return after six hours; high-priority empty results after one day; medium priority after three days; the long tail after fourteen days. Followed artists are promoted only when their canonical artist is due, so follows cannot bypass provider budgets indefinitely.

One due APAC market is also swept per ingestion run. All twelve launch markets retain their own last-sweep, next-sweep, event count, and error state. This market-first path is essential: it can observe a performer that the identity graph has not learned yet.

## 3. Event change detection

Full future-date searches find new events, but they are not a reliable deletion protocol. The runtime therefore also consumes PredictHQ's documented `updated.*` window with `state=active,deleted`. The implementation:

- fixes the upper time boundary for the entire page sequence;
- persists the next page URL when a bounded run cannot finish;
- validates every resume URL against the exact HTTPS API host and events path;
- advances the cursor only after the fixed window completes;
- overlaps the next cursor by five minutes and relies on idempotent provider IDs;
- converts deleted reasons into cancelled, postponed, or deleted tombstones.

Ticketmaster and Live Nation structured statuses are normalized to scheduled, off-sale, postponed, rescheduled, or cancelled whenever the provider returns the event. Ticketmaster's supported discovery statuses and PredictHQ's active/deleted update pattern are documented by their official APIs: [Ticketmaster Discovery API](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/) and [PredictHQ update guidance](https://docs.predicthq.com/integrations/integration-guides/keep-data-updated-via-api).

A tombstone and every forward status update pass through the same source-authority reconciliation. A reported source cannot cancel an event that an official source still schedules. Equally authoritative conflicts fail visible: cancellation/deletion hides a show only when no peer reports an active state, while postponed and rescheduled notices remain visible. Cancelled and deleted shows leave public discovery but remain addressable for saved journeys and audit. A later authoritative active observation can restore the canonical state.

## 4. Canonical reconciliation

Provider records are idempotent by `(provider, provider_event_id)`. Canonical reconciliation uses artist identity, venue/place, local performance date, time precision, and provider authority. It deliberately distinguishes multiple same-day performances when both sources supply exact times.

`event_source_links` retains every contributing provider record and its current source status. `canonical_events` is the current product projection. `event_versions` records material normalized changes, including lifecycle transitions. This separation is what lets the product correct a show without losing the evidence that caused the correction.

## 5. Link and media publication

An official platform host is necessary but not sufficient for an outbound link. The resolver checks the page against artist, date, market, venue, ticket intent, and source role. Conflicting evidence is quarantined with bounded retry rather than published optimistically.

Media follows the same identity discipline. Event art must belong to the accepted provider event. Artist art must bind to an exact provider attraction or curated structured identity. Reused URLs across different artists, generic fallbacks, low-confidence search results, and unsupported remote hosts are quarantined. No image is safer than a false celebrity image.

## 6. AI engineering boundary

The current truth path is deterministic by design. A language or vision model is not an authority for identity, date, lifecycle, ticket availability, rights, or URL publication. This keeps source outages and model changes from silently changing the catalog.

AI can add value in a bounded evidence-assistant layer:

- extract candidate fields from an otherwise unstructured official announcement into a strict schema;
- propose multilingual aliases that must resolve back to a stable source identity;
- cluster likely duplicate candidates for deterministic reconciliation;
- classify image composition, focal area, text density, and probable fallback art without deciding rights;
- summarize anomaly queues and explain why evidence conflicts.

Every model output must include the exact source fragment or image reference it used, model/prompt version, structured confidence, and an abstention path. It writes to a candidate/evidence table, never directly to `canonical_events`, official links, or published media. Deterministic validators still check host ownership, artist identity, market, local date, time zone, and source authority.

Before any model enters the production loop, evaluate it on a frozen multilingual set covering same-name artists, one-character stage names, translated cities, multiple same-day performances, postponed/cancelled notices, misleading seller pages, tour posters with embedded dates, and cross-artist image reuse. Track precision at the auto-accept boundary, abstention rate, per-language regression, evidence-grounding failures, latency, and cost. A model or prompt change ships like a connector change: versioned, replayed in shadow mode, and gated by measured false-publication risk.

## 7. Scheduler control plane

The isolated worker has four bounded cadences:

| Job | Default cadence | Failure behavior |
| --- | ---: | --- |
| identity catalog | 6 hours | source-isolated result; retry partial work within 15 minutes and endpoint failure within 5 minutes |
| event ingestion and change sync | 20 minutes | partial connector results persist; retry partial work within 15 minutes and endpoint failure within 5 minutes |
| official-link resolution | 20 minutes | per-event quarantine/backoff; retry partial work within 15 minutes and endpoint failure within 5 minutes |
| artist media refresh | 6 hours | per-artist failure isolation; retry partial work within 15 minutes and endpoint failure within 5 minutes |

Intervals, batch sizes, pages, parallelism, request duration, and retry limits are bounded in code. Every endpoint requires the scheduler secret and acquires a database-backed lease. A second worker or a restart cannot run the same job concurrently while its lease is live. Job status, result summary, last error, last completion, and consecutive failures persist in `scheduler_jobs`.

The worker has no public ingress. The private metasearch service supplies link candidates only. The application is the sole writer and holds the database, migration, reconciliation, and publication rules.

## 8. Schema and recovery

Schema changes run through ordered `schema_migrations` transactions. A migration is recorded only after its transaction commits. Runtime startup no longer performs repeated ad-hoc repair deletes.

The current SQLite + WAL design is appropriate for one application writer, one host, and the present workload. Backups must include the SQLite database and should use a database-aware snapshot. Media cache is disposable; provider cursors, user state, source links, versions, and scheduler state are not.

## 9. Observability and service objectives

The operating dashboard should alert on state, not raw log volume:

- job age versus cadence, active/expired lease, consecutive failures, duration;
- provider success, partial failure, quota use, records seen and accepted;
- change-feed cursor lag, incomplete page chain age, tombstones applied;
- artist scan cursor age, identities learned, unresolved candidate age;
- due artists by hot/new/long-tail cohort and oldest overdue age;
- market last-sweep age, events found, and source coverage;
- duplicate merge rate, lifecycle reversals, link quarantine rate, cross-identity media quarantine;
- upcoming events without art, verified link, timezone, venue, or coordinates.

Initial operational targets:

- no scheduled job exceeds two normal cadences without an alert;
- change-feed cursor lag stays below 45 minutes when PredictHQ is healthy;
- every market is swept within six hours;
- no active lease exceeds its configured lease without investigation;
- no cancelled/deleted sole-source event appears in public discovery;
- no unresolved provider page or image becomes an official product claim.

## 10. Red-team findings and residual risks

The current refactor closes duplicate job execution, restart-unsafe cursors, unbounded environment tuning, permanent head-artist preference, startup repair mutations, and the absence of an authoritative deletion path for PredictHQ.

The remaining production risks are explicit:

1. **Source recall is contractual.** No public API guarantees every K-pop show. Direct promoter, venue, fan-club, and ticketing partnerships remain necessary for comprehensive coverage and critical on-sale changes.
2. **Ticketmaster search is not a deletion feed.** A missing search result is not treated as cancellation; only an explicit returned status changes lifecycle.
3. **SQLite is a single-writer boundary.** Horizontal application replicas, high write volume, or multi-region operation require PostgreSQL plus a durable queue and advisory/idempotency locks.
4. **Raw evidence is not yet immutable at field level.** Material normalized snapshots exist, but a future evidence store should retain bounded raw payload hashes, retrieval time, license, and per-field source choice.
5. **Notifications are not yet a reliable delivery system.** Lifecycle changes are persisted, but alert fan-out needs an outbox, deduplication key, user preference checks, retry audit, and mobile push design.
6. **Identity sources can lag debuts.** A targeted recent-debut feed or contracted label/artist roster source would reduce worst-case discovery latency.
7. **Media rights need active expiry/removal.** Current provenance is queryable, but takedown and contractual expiry should be first-class states.

These are scaling and partnership gates, not reasons to weaken current evidence rules.
