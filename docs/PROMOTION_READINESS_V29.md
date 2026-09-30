# Promotion Readiness v29

Audit date: 2026-08-25<br />
Scope: production data, discovery and identity automation, link and media proof, responsive product flow, localization, saved-show and Passport journeys, repository/runtime shape.

## Decision

Concert Passport remains a controlled-beta product. The emotional and editorial layer is distinctive enough to keep, but a public growth campaign is **No-Go** until the trust and journey gates below are met.

The product is not a poster gallery with utilities attached. Its durable loop is:

```text
discover → verify → save intent → act on the next deadline → attend → remember → share
```

Every page and automation job must advance or protect that loop.

## Production evidence

The 2026-08-25 read-only production audit found 89 visible future canonical events. Thirty-two used event-specific art and 57 inherited artist art. Apparent image coverage was 100%, but identity mistakes made that number unsafe:

- `Belle` was published for a Belle and Sebastian event.
- `Shannon` was published for a Shannon Noll event.
- `FiA` was published for an unrelated FIA event in New Zealand.
- a Ticketmaster attraction for an NFL festival had been bound to a Korean artist named NFL.
- the identity candidate queue contained 474 `no_match` outcomes and only five auto-resolved identities.
- verified link evidence included 13 HTTP 403 results and two timeouts; static candidate data could still pass the previous score threshold.

These are promotion blockers because the wrong identity can propagate into the event title, image, official label, saved plan and share artifact.

## Product contract

### Show Identity

An event shown publicly must have a stable artist identity, an event identity, lifecycle state and source proof. Display names are projections, never identity keys.

### Plan

Saving a show means selecting intent and receiving one clear next action. `interested`, `trying`, `ticketed`, `going`, `attended` and `skipped` are user states; they must not be mixed with provider lifecycle states.

### Memory

An ended saved show should be convertible to Passport without retyping artist, city, venue and date. Future travel and attendance records remain private by default.

### Share

Share artifacts may use only assets whose rights explicitly allow the requested scope. They must omit tickets, barcodes, order numbers, seats, precise live location and photo EXIF.

## Target platform layers

```text
provider API / official page / licensed media
  → immutable observation and source proof
  → schema and scope validation
  → artist and event candidates
  → deterministic identity gates
  → provider event ledger
  → canonical reconciliation
  → publication policy
  → public read model
  → saved-show state / outbox / notifications
  → Passport and share renderers
```

AI may propose OCR, aliases, duplicate clusters, crop focal points and translation drafts. It must not directly publish artist identity, lifecycle, ticket URLs, rights decisions or celebrity media.

## Release gates

### P0 — trust and correct flow

- known NFL/Belle/Shannon/FiA class errors visible in discovery: zero;
- frozen 500-case multilingual identity set: 100% precision for auto-publish decisions;
- every public provider event resolves through a stable provider artist binding or explicit editorial attestation;
- catalog/search candidates cannot become page-verified after fetch failure;
- all ticket CTAs have a current provider, page or manual proof;
- top-100 target artist search Top-1 accuracy at least 95%;
- first 50 search results have less than 1% duplication and less than 0.5% wrong artist attribution;
- homepage artist query reaches correct stored results in at most two actions;
- every canonical result enters the internal Event Hub before an external seller;
- every saved future show has a next action or an explicit waiting state;
- users can remove saved shows and delete personal records;
- mobile language access remains available and all navigation is localized;
- all downloadable/promoted assets have per-asset rights and derivative-use approval.

### P1 — useful closed loop

- provider event ledger, orphan tombstones, monotonic provider updates and full lifecycle backfill;
- real per-target partial retries within 15 minutes;
- My Shows state machine, ticket milestones, reminder preferences and transactional outbox;
- post-show attendance conversion into Passport;
- generic event/Passport share renderer and event-specific Open Graph images;
- asset registry with rights scope, expiry, takedown, focal point and fixed crop derivatives;
- cached search p95 below 1.5 seconds and live search p95 below 5 seconds;
- mobile p75 LCP at most 2.5 seconds, INP at most 200 ms and CLS at most 0.1 on a mid-range Android profile;
- 320/390/768/1440 screenshots for five locales with no critical clipping or overflow;
- core text at least 12px and primary touch targets at least 44px;
- public internal scheduler routes return 404;
- database-aware off-host backups achieve RPO 15 minutes and tested RTO 60 minutes.

### P2 — defensible growth

- multi-person ticket squads and ownership;
- city comparison, schedule conflicts and budget ranges;
- calendar integrations and privacy-safe music follow import;
- annual and tour Passports;
- immutable release images, observability and a PostgreSQL-backed durable job/outbox system before horizontal scale.

## Media contract

Asset priority:

```text
rights-cleared event-specific art
→ rights-cleared tour art
→ rights-cleared current-era artist image
→ identity-checked, licensed Commons image
→ repository-owned typographic fallback
```

Required registry fields include entity and provider IDs, source URL, creator, license, rights basis, allowed scopes, territories, expiry/removal deadline, hashes, dimensions, focal point, safe box, member coverage, text/logo density, review state and removal state.

Ticketmaster distinguishes fallback images in the Discovery API; they must never be presented as event-specific art. Its API is based on stable event, attraction, classification and venue entities, so identity binding should use provider IDs rather than name-only inference. MusicBrainz permits one request per second and asks clients not to poll metadata indiscriminately, so catalog synchronization must be paced and cursor-based. PredictHQ recommends syncing `active` and `deleted` records by `updated.*` time and preserving a fixed update window. Wikimedia assets require per-file license compliance and attribution; Commons availability alone is not a commercial endorsement or personality-right clearance.

An image appearing on an official event page proves the event source, not permission to display, download, transform, share or use that image in paid promotion. Every one of those scopes needs an explicit rights basis in the asset registry.

References:

- [Ticketmaster Discovery API](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/)
- [MusicBrainz API and rate limits](https://musicbrainz.org/doc/MusicBrainz_API)
- [PredictHQ update integration](https://docs.predicthq.com/integrations/integration-guides/keep-data-updated-via-api)
- [Wikimedia Commons reuse guide](https://commons.wikimedia.org/wiki/Commons%3AReusing_content_outside_Wikimedia/en)

## Delivery sequence

### Slice A — delivered in this change

- fail closed when Ticketmaster artist IDs are unbound;
- stop all automated name-only provider bindings; exact catalog evidence can create a review candidate but not a binding decision;
- require explicit trusted K-pop evidence before automatic identity use;
- stop broad-music market candidates entering identity resolution without scope evidence;
- stop the exact MusicBrainz resolver treating Korean country plus name as sufficient;
- quarantine the three confirmed mismatched public events while retaining audit/detail data;
- require a live page or Ticketmaster provider assertion before a link score is verified;
- route canonical cards through internal Event Hub;
- add a reusable editorial Event Hub so verified ticketing is an explicit CTA rather than the whole card destination;
- remove static `sold out`, `tickets available` and added-night labels from editorial cards until a current proof exists;
- represent multi-day editorial shows as containers with exact canonical performances and one server-backed save state;
- keep past and changed saved shows visible instead of silently dropping them;
- add rights-safe, typographic event-specific Open Graph cards for reusable editorial hubs;
- make URL artist queries filter stored results immediately;
- move mobile search and results ahead of the editorial collage;
- suppress editorial multi-day duplicates across their full date range;
- restore mobile language access and localized bottom navigation;
- make the ITZY countdown data-derived and remove the black LCP reveal;
- add removal of saved shows.

### Slice B — next

- typed link proofs and CTA recomputation/revocation;
- provider event ledger and lifecycle backfill;
- per-target retry state and worker fencing;
- unified saved-show intent state and real milestones;
- event-to-Passport conversion and personal-record deletion;
- asset rights registry, focal crops and takedown workflow.

### Slice C — growth candidate

- generic premium Event Hub and share templates;
- privacy-safe notifications and change inbox;
- performance budgets, analytics and seven-day shadow replay;
- canary release only after all P0 gates remain green.
