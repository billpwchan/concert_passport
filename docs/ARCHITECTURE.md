# Architecture

## System shape

Concert Passport is a modular monorepo with one shared domain language and two client experiences.

```text
official/licensed providers ──► source adapters ──► canonical event catalog
official verified links      ──► source registry ──► outbound-link policy
refresh worker               ──► ingestion audit ──► followed artists/markets
                                                   │
                                                   ▼
iOS app ◄────────── API routes / accounts / SQLite state ─────► Web app
   │                                                           │
Swift lifecycle core                                   responsive product UI
```

The central object is a `ConcertJourney`, not a generic event card. A journey owns a venue-local performance, prerequisites and ticket milestones, source evidence, user completion state, and eventual attendance.

## Web runtime

`apps/web` is a standard Next.js 16 TypeScript app running on Node.js 22.

- Server components render registry and journey data.
- Client components own countdowns, filters, and optimistic task interactions.
- Route handlers expose discovery, sources, registration, login, saved shows, follows, and plan mutations.
- Email/password accounts use salted scrypt hashes. Opaque browser session tokens are random, hashed at rest, rotated at authentication boundaries, and never exposed to client JavaScript.
- Anonymous browser state can be merged into an authenticated member account.
- SQLite uses WAL mode and an explicit persistent volume. Account, session, catalog, library, plan, and ingestion tables are bootstrapped idempotently at runtime.
- MapLibre GL JS renders the interactive Atlas using OpenFreeMap styles; the result list remains the accessible source of truth.
- The production web container exposes no host port and is reachable only through the existing Caddy gateway network. An isolated worker shares the image and data volume but has no HTTP ingress.

The schema is still bootstrapped in application code. Versioned, reversible migrations remain necessary before multiple application versions can overlap during a larger rollout.

## Source boundary

The adapter interface returns normalized `DiscoveredEvent` values and independent health states. Ticketmaster and PredictHQ run independently through `Promise.allSettled`; one provider failure does not discard the other. An unavailable adapter returns an empty result; it never substitutes sample data. Public search input is constrained, rate-limited, cached for ten minutes, and protected by a Ticketmaster daily request budget. Consumer views translate connector state into neutral availability language and never expose credentials.

Discovery upserts provider records into `canonical_events`. Exact Ticketmaster event links are distinguished from PredictHQ data-only records; the latter open an internal event page with an explicit pending-link state. Saved plans reference the canonical record so refreshes can update an existing item instead of creating a second hardcoded copy.

The refresh worker periodically processes a bounded set of followed artist/market pairs and writes `ingestion_runs` for observability. This is a catalog freshness mechanism, not a ticket-page scraper or queue bot.

It also rotates through the maintained core K-pop artist catalog, writes per-connector run outcomes, retains every provider relationship in `event_source_links`, and creates an `event_versions` snapshot when a material normalized field changes. The complete source contract and staged expansion policy live in [SOURCE_INTEGRATION_SYSTEM.md](SOURCE_INTEGRATION_SYSTEM.md).

The source registry is a policy artifact, not permission to scrape. It records market, tier, capability, official host, and partnership status. Event-level authorization still takes precedence: a known platform can host both official and unrelated content.

## Time and lifecycle invariants

- Critical moments are stored as absolute instants plus an IANA venue time zone.
- Registration close and sale open are distinct milestone types.
- Lottery application, result, winner payment, delivery, doors, and show can each be separate.
- Alerts are calculated from the operative deadline and remain deterministic.
- A critical correction should create a new version and reschedule, rather than silently overwrite, once the ingestion pipeline is implemented.

## iOS

`apps/ios` is a native iOS 17 SwiftUI app with MapKit and Observation.

- `Core` contains Sendable Foundation models and pure lifecycle functions.
- `Services` contains the API boundary and main-actor application state.
- `Features` contains Today, Atlas, Plans/Journey, and Passport.
- The core is also exposed as a Swift package so lifecycle semantics can run in CI without an iOS simulator.

The current native client reads discovery and keeps sample plan interaction in memory. Production mobile mutations require a dedicated mobile account/session design; the browser cookie is not a mobile authentication protocol.

## Security and privacy boundary

The implementation does not store payment cards, seller credentials, barcodes, government ID, or ticket PDFs. Public memories and operational ticket material must remain separate data projections. All external purchase actions require an explicit user gesture to an HTTPS destination.

## Next architectural increments

1. Versioned database migrations and a reviewer console.
2. Immutable source evidence and material-change versions.
3. APNs scheduling, delivery audit, acknowledgement, and calendar redundancy.
4. Mobile authentication and durable offline plan state.
5. Verified email, recovery, session management, export/deletion, and privacy-safe public Passport projections.
