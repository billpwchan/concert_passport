# Concert Passport v27 red-team record

Date: 2026-08-23<br />
Scope: event coverage, artist identity, visual assets, discovery UX, localization, runtime safety and production isolation.

## Baseline

The production catalog contained 90 future performances in 11 APAC markets. Only 22 performances had event-level art, 41 could fall back to one artist image, and 27 had no remote visual. The original artist-media fallback depended on Ticketmaster plus a hard-coded list of 11 Wikipedia page titles.

## Round 1 — coverage and ingestion

### Findings

- Ticketmaster artist identity was cached only in memory, so every process restart repeated attraction searches and consumed quota.
- A global artist query read only two fixed pages.
- PredictHQ retained pagination metadata but did not follow `next`, so high-density windows could silently stop after 50 records.
- Media lookups ran inside every 20-minute event-ingestion cycle and competed with event discovery for the Ticketmaster request budget.
- The home page intentionally collapsed all later performances for the same artist and market, making a larger catalog appear small.

### Changes

- Added persistent provider-artist lookup caching with 30-day match and 3-day miss TTLs.
- Increased bounded global Ticketmaster artist pagination to three pages, configurable up to five.
- Added safe, bounded PredictHQ `next` pagination with host/path validation.
- Split media refresh into an independently scheduled six-hour job.
- Changed the home calendar to retain distinct performances while limiting an artist to two cards in the initial 14-card mix.

## Round 2 — asset supply and blank-state failure

### Findings

- Wikimedia lookup was limited to a small hard-coded title map and required a landscape Wikipedia lead image.
- Only one image per artist was stored and no author/license fields were retained.
- Verified official event pages were already inspected, but their JSON-LD and Open Graph images were discarded.
- The image proxy allowed only Ticketmaster and Wikimedia hosts.
- A missing record or failed remote fetch returned HTTP 404, creating blank cards and hero regions.

### Changes

- Replaced the hard-coded map with identity-led Wikidata P18 lookup and Commons metadata retrieval.
- Added author, license name, license URL and usage-policy storage for artist media.
- Added Commons-category fallback and candidate scoring for group/landscape imagery.
- Extracted official-page JSON-LD and Open Graph event art during the existing evidence inspection flow.
- Allowed images extracted from already trusted official pages while rejecting credentials, non-HTTPS, local hostnames, IP literals and unsafe redirects.
- Added a deterministic Concert Passport visual fallback to every artist and event image endpoint. A missing or expired remote asset can no longer produce a blank surface.

Live probes against the seven artists responsible for the 27 blank production cards found licensed Commons media for BTS, TREASURE, Xlov, LeeHi and TWS. A deeper MusicBrainz-to-Wikidata-to-Commons-category path also resolved LUCY. Deux has no suitable verified Commons asset and intentionally remains on the branded fallback until an authorized source is available.

## Round 3 — identity poisoning and wrong-artist risk

### Finding

Production had associated the group LUCY with Wikidata `Q27951671`, the same-name Weki Meki member. A media system that blindly trusted this binding would have replaced an empty card with the wrong person.

### Changes

- Artist evidence with a known `group`/`person` conflict is no longer attached to an existing same-name identity.
- The incorrect LUCY Wikidata relation is removed during the schema/data repair.
- Media resolution now prefers an exact MusicBrainz P434 lookup before an existing Wikidata relation or label search.
- Ticketmaster attraction results and persistent cache entries must also be compatible with the catalog artist type.
- Ambiguous or unresolved identity is treated as “no authorized media”; the branded fallback wins over a potentially wrong photograph.

## Round 4 — security and production isolation

### Gates

- Remote-image URLs must use HTTPS, contain no credentials or non-standard port, and cannot target localhost, `.local` names or IP literals.
- Pagination URLs are restricted to the PredictHQ HTTPS events endpoint.
- Official-page imagery is accepted only after the existing trusted-source, page-inspection and event-match score reaches the publishing threshold.
- The media job uses the existing private scheduler bearer token and remains inaccessible without it.
- Deployment continues to touch only the `concert-passport-*` containers, its dedicated discovery network and its existing Caddy site entry. JChart and Flightlog containers are out of scope.

## Round 5 — live catalog truth audit

### Findings

- A production row linked the Korean duo Deux to “Deux Yan from: The Netherlands JAPAN TOUR in Osaka” because the old matcher allowed an artist-name prefix followed by an unrelated word before “tour”.
- A production row linked the band LUCY to “vurtnight Rrose” because PredictHQ supplied a same-name solo person entity and the event pipeline did not compare provider entity type with catalog artist type.

### Changes

- Artist-led title matches now require the live intent immediately after the artist name, with a bounded ordinal exception such as “LUCY 9TH CONCERT”.
- PredictHQ person/organization entities are mapped to person/group evidence and checked against the catalog identity type at both adapter and publication gates.
- An explicit same-name provider entity with the wrong type overrides weak title evidence and is rejected.
- The two provider-verified contaminated rows are removed during startup repair. The production count becomes 88 upcoming performances rather than retaining two false positives to make coverage look larger.

## Verification gates

- TypeScript: pass
- ESLint: pass
- Node test suite: 67/67 pass
- Next.js production build: pass
- Local HTTP home route: 200
- Local missing-artist visual route: 200 `image/svg+xml`, explicitly marked `brand-fallback`
- Live external media probes: licensed metadata retained; identity conflict discovered and corrected

## Residual limits

- A branded fallback is not a substitute for tour key art. The worker will continue backfilling official event pages and licensed artist sources.
- Event-page preview permission is source-specific. Stored source URL and attribution support takedown and replacement, but commercial launch still requires a formal per-partner media agreement matrix.
- PostgreSQL, immutable raw source snapshots and a full review console remain the next data-platform migration; they are deliberately not introduced in the same production release as this ingestion/media correction.
