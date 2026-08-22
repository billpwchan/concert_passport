# Concert Passport

Concert Passport is a K-pop concert journey operating system for Asia-Pacific fans: verified discovery, registration and sale milestones, cross-border planning, and a lifelong map of shows.

This repository now contains a working vertical slice rather than a concept-only prototype:

- a premium responsive web product with Today, Atlas, Plans, Journey, Passport, and Sources;
- English, Simplified Chinese, and Traditional Chinese content systems plus adaptive light/dark appearances on Web and iOS;
- private first-party browser sessions and durable SQLite user state;
- live Ticketmaster Discovery and PredictHQ aggregation with validation, caching, and quota protection;
- a curated official-source registry across 11 Asia-Pacific markets;
- a native SwiftUI + MapKit iOS app and independently tested Swift lifecycle core;
- product research, design direction, commercial model, source policy, and red-team gates.

All concert records visible by default are explicitly labeled **illustrative**. Live discovery returns no invented events when provider credentials are absent.

## Product boundary

Concert Passport prepares the fan and opens a verified official destination. It does not automate queues, bypass CAPTCHAs, purchase tickets, hold inventory, store ticketing credentials, or operate an unofficial resale marketplace.

The initial catalog is K-pop only. Japan is included as a K-pop touring market; J-pop artist coverage is intentionally out of scope.

## Workspace

```text
apps/web   Next.js app, API routes, SQLite state, MapLibre and source adapters
apps/ios   Native SwiftUI app, Xcode project, Swift package and tests
docs       Product, research, architecture, operations and audit records
deploy     Isolated Docker Compose and Caddy configuration for the Lightsail host
```

## Run the web app

Requirements: Node.js 22.13 or later.

```bash
cd apps/web
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. The web app creates a private, first-party browser
session and stores local state in `apps/web/data/concert-passport.sqlite` unless
`CONCERT_PASSPORT_DB_PATH` is set.

Quality commands:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Set `TICKETMASTER_API_KEY` and/or `PREDICTHQ_ACCESS_TOKEN` to activate the included live discovery adapters. Provider access and commercial use remain subject to their contracts and terms.

The production web app is self-hosted as an isolated Docker service behind the
existing Caddy gateway. See [`deploy/README.md`](deploy/README.md). No Sites or
Cloudflare runtime is required.

## Run the iOS app

Open `apps/ios/ConcertPassport.xcodeproj` in Xcode 16 or later. The checked-in debug configuration points to `http://localhost:3000/`; change `CONCERT_PASSPORT_API_BASE_URL` in `Info.plist` or through build configuration for a hosted environment.

The shared Foundation-only lifecycle core can be verified independently:

```bash
cd apps/ios
swift test
```

## Product and engineering records

- [Product blueprint](docs/PRODUCT_BLUEPRINT.md)
- [Research and evidence](docs/RESEARCH.md)
- [Design direction](docs/DESIGN_DIRECTION.md)
- [Localization and content system](docs/LOCALIZATION.md)
- [Architecture](docs/ARCHITECTURE.md)
- [API contract](docs/API.md)
- [Source operations](docs/SOURCE_OPERATIONS.md)
- [Implementation audit](docs/IMPLEMENTATION_AUDIT.md)
- [Roadmap](docs/ROADMAP.md)
- [Original red-team audit](docs/RED_TEAM.md)

Concert Passport remains a working name until domain, App Store, and trademark screening is complete.
