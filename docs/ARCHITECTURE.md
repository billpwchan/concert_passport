# Architecture

## System shape

Concert Passport is a modular monorepo with one shared domain language and two client experiences.

```text
official/licensed providers ──► source adapters ──► normalized events
official verified links      ──► source registry ──► evidence boundary
                                              │
                                              ▼
iOS app ◄────────── API routes / session / SQLite state ──────► Web app
   │                                                          │
Swift lifecycle core                                  responsive product UI
```

The central object is a `ConcertJourney`, not a generic event card. A journey owns a venue-local performance, prerequisites and ticket milestones, source evidence, user completion state, and eventual attendance.

## Web runtime

`apps/web` is a standard Next.js 16 TypeScript app running on Node.js 22.

- Server components render registry and journey data.
- Client components own countdowns, filters, and optimistic task interactions.
- Route handlers expose discovery and sources plus browser-private user mutations.
- A random `HttpOnly` first-party cookie isolates preview state; no identity credential is exposed to client JavaScript.
- SQLite uses WAL mode and an explicit persistent volume. User-state tables are bootstrapped idempotently at runtime.
- MapLibre GL JS renders the interactive Atlas using OpenFreeMap styles; the result list remains the accessible source of truth.
- The production container exposes no host port and is reachable only through the existing Caddy gateway network.

Runtime persistence is deliberately limited to the tables used by the current user-state vertical slice. Production ingestion and multi-user identity require versioned migrations before the data pilot expands.

## Source boundary

The adapter interface returns normalized `DiscoveredEvent` values and independent health states. Ticketmaster and PredictHQ run independently through `Promise.allSettled`; one provider failure does not discard the other. An unconfigured adapter returns an empty result and `configuration_required`; it never substitutes sample data. Public search input is constrained, rate-limited, cached for ten minutes, and protected by a Ticketmaster daily request budget.

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

The current native client reads discovery and keeps illustrative plan interaction in memory. Production mobile mutations require a dedicated mobile account/session design; the browser preview cookie is not a mobile authentication protocol.

## Security and privacy boundary

The implementation does not store payment cards, seller credentials, barcodes, government ID, or ticket PDFs. Public memories and operational ticket material must remain separate data projections. All external purchase actions require an explicit user gesture to an HTTPS destination.

## Next architectural increments

1. Contracted ingestion workers and a reviewer console.
2. Immutable source evidence and material-change versions.
3. APNs scheduling, delivery audit, acknowledgement, and calendar redundancy.
4. Mobile authentication and durable offline plan state.
5. Export/deletion and privacy-safe public Passport projections.
