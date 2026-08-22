# Source Integration System

## The coverage contract

The registry contains 40 useful K-pop sources, but they are not 40 interchangeable APIs:

| Class | Current count | Product role | Current implementation |
| --- | ---: | --- | --- |
| Licensed event APIs | 2 | discover dated event records | Ticketmaster and PredictHQ adapters are live |
| Artist identity reference | 1 | normalize artist names and aliases | catalog reference only; adapter is not yet enabled |
| Official ticketing destinations | 27 | confirm seller, sale rules, inventory and purchase page | allowlisted outbound directory |
| Official promoter destinations | 8 | confirm announcement, venue and presale | allowlisted outbound directory |
| Official fan platforms | 2 | confirm membership and registration rules | allowlisted outbound directory |

“In the directory” therefore never means “continuously ingested.” The consumer UI presents the two live event connections separately from the 37 official destinations. A destination becomes an ingestion connector only after its access method, commercial terms, rate limits, attribution, field coverage and failure behaviour are recorded and approved.

## Why a one-shot scraper is not an integration

Ticket and fan platforms differ by authentication, locale, JavaScript rendering, anti-bot controls, terms, robots policy and event-level seller authority. A generic crawler could return data once while silently missing lottery windows, translating local times incorrectly, or breaking the next day. That is worse than a clearly labelled official handoff.

A production connector must satisfy all of these gates:

1. **Authority** — an API, feed, partner export or permitted structured page is approved for this use.
2. **Determinism** — the same provider record has a stable external ID and idempotent refresh behaviour.
3. **Semantics** — announcement, fan-club registration, lottery, result, payment, presale and general sale remain distinct fields.
4. **Time correctness** — every deadline has an absolute instant, source timezone and observed publication time.
5. **Provenance** — every published field can point to a source record and last check.
6. **Change handling** — material changes create a version and can reschedule reminders; they are never silently overwritten.
7. **Operations** — budgets, retry policy, freshness target, error rate and a manual fallback owner are defined.

## Implemented pipeline

```text
core artist catalog + member follows
                 │
                 ▼
        bounded refresh scheduler
                 │
        ┌────────┴───────────────┐
        ▼                        ▼
 Ticketmaster API           PredictHQ API
   │           │                  │
   │      attraction media        │
   │           │                  │
   └──── normalized events ───────┐
                                    ▼
                         canonical event catalog
                                    │
                 ┌──────────────────┼──────────────────┐
                 ▼                  ▼                  ▼
          source links        event versions      connector runs
                 │                  │                  │
                 └──────────────► review/alerts ◄──────┘
                                    │
                                    ▼
                       search / Atlas / saved plans
```

The worker rotates through a curated 76-act K-pop catalog in six-artist batches every 20 minutes and also prioritizes member follows. The full catalog is covered in 13 scheduled batches. Search uses a one-year horizon. Provider calls are isolated, so one failure does not discard another provider’s results.

The database now records:

- `canonical_events` — current normalized projection;
- `event_source_links` — provider record, URL, authority and observation timestamps;
- `event_versions` — immutable snapshots when material fields change;
- `ingestion_runs` — whole refresh outcome;
- `connector_run_items` — per-connector event and error counts;
- `artist_follows` — demand signal used to prioritize refreshes.
- `artist_media` — exact-match attraction image, provider artist ID, intrinsic size,
  attribution, source page, fallback flag, and refresh timestamps;
- `canonical_events.image_*` — event-specific media projection retained across
  provider responses that temporarily omit an image.

Provider discovery records without an exact official ticket URL open an internal event page. They are not presented as purchase links. Exact Ticketmaster event URLs can hand off directly.

Ticketmaster event and attraction images are selected by explicit quality rules:
HTTPS on an allowlisted Ticketmaster CDN, at least 640 × 360, non-fallback before
fallback, 16:9 before other ratios, then largest area. Remote URLs are never
accepted from a browser query. The page requests an event or normalized artist ID;
the server resolves the stored URL and enforces content type and an 8 MB limit.
Artist media refreshes after 12 hours and the binary response is cached for one day
with a seven-day stale window. A failed image refresh never converts a valid event
search into an error.

When an exact Ticketmaster attraction has no qualifying image, a separately curated
canonical-name to English Wikipedia-title map can query the MediaWiki PageImages API.
Only `upload.wikimedia.org` originals of at least 900 × 500 and a 1.45:1 landscape
ratio are accepted, with the Wikipedia article retained as the source page and
Wikimedia Commons attribution displayed. This fallback deliberately leaves some
artists on the neutral product image instead of accepting a small portrait or an
ambiguous search match.

## Connector modes for the remaining destinations

Each official destination must enter through one explicit mode:

- **partner API/feed** — preferred for ticketing inventory and sale milestones;
- **official structured feed** — promoter or agency calendar with stable IDs;
- **permitted structured-page monitor** — low-frequency conditional fetch, host-specific parser and change fixtures;
- **operator-assisted intake** — official URL submitted, parsed into a draft and verified before publication;
- **handoff only** — no ingestion authority; keep the official destination link without implying coverage.

The platform must not automate seller login, queue access, CAPTCHA, ticket purchase or credential storage.

## Expansion order

1. **Identity foundation:** enable MusicBrainz alias resolution with its required client identification and rate policy. This reduces false negatives such as aliases and unit names.
2. **Primary promoter feeds:** pursue Live Nation market feeds and event-level seller mappings because one promoter often covers several countries.
3. **Fan-registration feeds:** partner integration for Weverse and b.stage; these contain high-value membership and registration windows that broad event APIs omit.
4. **Market ticketing connectors:** prioritize by observed member demand and missing critical milestones, beginning with Korea, Hong Kong, Taiwan, Thailand, Singapore and Japan.
5. **Review console and notifications:** conflicts, deadline changes, unlinked official pages, freshness breaches and delivery audit must be operable before claiming comprehensive protection.

## Service objectives before a commercial coverage claim

- event discovery freshness: 30 minutes for connected APIs;
- critical sale-window freshness: 10 minutes only where the partner contract and quota permit it;
- 100% of critical milestones have field-level provenance and timezone;
- material date changes are versioned and queued for notification within one refresh cycle;
- connector health and quota exhaustion are visible to operators;
- a market is labelled covered only when its declared artist/source set meets a measured recall target.

Counts are registry facts as of 2026-08-22. They should be generated in an operator inventory in the next migration rather than repeated in marketing copy.
