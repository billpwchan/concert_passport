# Automatic event-link resolution

Concert Passport treats event discovery and official ticket resolution as two separate systems. PredictHQ can establish that a concert exists; it is never used as proof that a purchase URL is official.

## Resolution pipeline

1. **Discover candidates** from Ticketmaster Discovery, maintained official tour entry points, trusted seller/promoter catalogs, and—when configured—Brave Search or a private SearXNG instance.
2. **Restrict authority** to exact HTTPS domains in the source registry. Subdomains are accepted; lookalike suffixes, credentials in URLs, protocol downgrades and redirects to untrusted hosts are rejected.
3. **Inspect pages** for Schema.org `Event`, `Offer.url`, `Offer.validFrom`, canonical URLs and page identity. Responses are time- and size-bounded and stored only as a content hash plus normalized evidence.
4. **Match deterministically** on canonical artist identity, venue-local date, country, venue and event title. Authority contributes to the score but cannot replace artist and date identity.
5. **Publish automatically** when a single candidate clears the role threshold with no country/date conflict. The preferred order is ticket page, event page, then tour page.
6. **Quarantine automatically** when identity is incomplete or conflicting. Quarantine is a machine state: it uses exponential retry and never creates a human review queue.
7. **Reconcile fields automatically** when a higher-authority page supplies a stronger venue or timestamp. Seller > promoter > artist > venue > discovery. Every correction is appended to `event_versions` before it becomes canonical.
8. **Revalidate continuously**. The ingestion worker runs link resolution after each event sync. Verified links are refreshed on a 12-hour TTL; failed candidates retry with bounded backoff.

## Data model

`event_link_evidence` stores every candidate independently from `canonical_events`: source, URL role, authority, validation state, score, normalized evidence, response fingerprint, HTTP status, retry state and verification timestamps. The selected projection is written to explicit `best_link_*` fields; clients never infer trust from the discovery provider.

`link_resolution_runs` records automatic coverage and failures for operations. `event_versions` retains all authoritative event-field changes.

## Publication invariants

- A search result page, home page, resale page or similar-title page cannot become a ticket CTA.
- An exact trusted host is necessary but not sufficient.
- Artist and venue-local date must both match.
- Country conflict always quarantines the candidate.
- A structured `offers.url` on another trusted seller upgrades an event page to a direct ticket link.
- Credentials remain server-side; configuration state is not product copy.

## Expansion path

New markets are added as source policies and adapters, not frontend conditionals. Prefer seller APIs and structured feeds. Where no API exists, add an official catalog entry point and let the same page inspector and evidence scorer resolve leaf pages. Brave/SearXNG are discovery helpers only; their ranking never counts as verification evidence.
