# Architecture

## System shape

Concert Passport is a modular monorepo with one shared domain language and two client experiences.

```text
official/licensed providers ──► source adapters ──► normalized events
official verified links      ──► source registry ──► evidence boundary
                                              │
                                              ▼
iOS app ◄──────────── API routes / auth / D1 state ────────────► Web app
   │                                                          │
Swift lifecycle core                                  responsive product UI
```

The central object is a `ConcertJourney`, not a generic event card. A journey owns a venue-local performance, prerequisites and ticket milestones, source evidence, user completion state, and eventual attendance.

## Web runtime

`apps/web` is a Next-compatible TypeScript app built on the Sites capability runtime.

- Server components render registry and journey data.
- Client components own countdowns, filters, and optimistic task interactions.
- Route handlers expose read discovery and sources plus authenticated user mutations.
- ChatGPT auth headers are read only on the server; the dispatcher, not browser JavaScript, establishes identity.
- D1 is accessed through Drizzle. User-state tables are bootstrapped idempotently at runtime so a newly provisioned site can accept writes without a manual local Wrangler step.

The checked-in Drizzle schema contains the wider normalized model. Runtime bootstrap is deliberately limited to the tables used by the current user-state vertical slice; production ingestion should apply checked-in migrations through the release process.

## Source boundary

The adapter interface returns normalized `DiscoveredEvent` values and independent health states. An unconfigured adapter returns an empty result and `configuration_required`; it never substitutes sample data.

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

The current native client reads discovery and keeps illustrative plan interaction in memory. Production mobile mutations require a dedicated mobile session design; ChatGPT web dispatcher headers must not be imitated by the app.

## Security and privacy boundary

The implementation does not store payment cards, seller credentials, barcodes, government ID, or ticket PDFs. Public memories and operational ticket material must remain separate data projections. All external purchase actions require an explicit user gesture to an HTTPS destination.

## Next architectural increments

1. Contracted ingestion workers and a reviewer console.
2. Immutable source evidence and material-change versions.
3. APNs scheduling, delivery audit, acknowledgement, and calendar redundancy.
4. Mobile authentication and durable offline plan state.
5. Export/deletion and privacy-safe public Passport projections.
