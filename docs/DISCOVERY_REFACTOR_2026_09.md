# Discovery refactor — 6 September 2026

## Baseline and scope

The local checkout was older than the deployed release. This iteration first restored the Web source from `promotion-readiness-20260825-v29-3b2da00`, then integrated the changes below. The dynamic artist identity catalog, publication quarantine, lifecycle change feed, durable scheduler leases, licensed image cache, five locales, account state and `/shows` experiences are retained. Their appearance in the root diff does not mean they were all authored in this iteration. iOS is unchanged.

## User journey

1. Enter through an artist search or upcoming show on the new editorial home.
2. Filter the stored catalog immediately by artist, market, venue-local dates and weekends. Filters survive a shared URL or return visit. Request fresh source data explicitly, with clear partial-source failure feedback.
3. Compare up to three dates, cities and venues. Use the optional map when geography matters.
4. Inspect the event, its observation age, lifecycle state, meaningful change history and official destination. Source observation and link verification are separate timestamps.
5. Save the event, return through the shortlist, or export a calendar snapshot. Date-only placeholders and cancelled, deleted, postponed or quarantined events cannot produce misleading confirmed-time exports. The calendar file is not a subscribed feed and does not auto-update.

The visual system uses paper surfaces, dark green actions, large editorial headings and consistent show cards. Mobile navigation, dark appearance, five locales, visible action errors, pending controls and reduced motion remain supported. Real provider/artist images use the existing media proxy; missing or failed images use a typographic fallback rather than a fabricated artist photo.

## Data and update behavior

- A SQLite discovery cache survives app restarts. Identical simultaneous refreshes coalesce within the app process. Successful lookups cache for ten minutes, partial failures for one minute. The UI never advances an event's observation time just because a cached result was read.
- Cache entries contain source outcome metadata, not public event snapshots. Every response re-reads the canonical catalog and publication controls, so later cancellation or quarantine takes effect immediately.
- Ticketmaster and PredictHQ preserve successfully fetched pages when another page/window fails and report incompleteness. They do not equate an interrupted fetch with an empty market. Date-only Ticketmaster results do not invent a midnight performance.
- Cross-provider matching requires an equivalent confirmed instant (with the existing explicit date-placeholder reconciliation exception). Distinct matinee/evening performances no longer merge via a broad four-hour tolerance.
- Static official-calendar references retain their recorded observation time. Migration 8 repairs timestamps refreshed by old static re-ingestion and requires independent live verification before republishing a static link as verified.
- Existing autonomous scheduling and lifecycle cursors are preserved. Failed artist refreshes are retried after 30 minutes instead of being marked successfully checked and deferred for the normal long interval.
- Artist image sources fall back independently when Ticketmaster fails. Remote media keeps the existing disk cache and redirect/SSRF controls, rejects external SVG, and bounds streamed raster bodies before allocating the entire image.
- Save/follow mutation endpoints validate malformed request bodies. Follow status is readable by the current session. Follows influence recurring discovery; no email/push delivery is claimed.

## Verification

Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` in `apps/web` with an isolated `CONCERT_PASSPORT_DB_PATH`. New regression coverage exercises concurrent caching, retries, observation provenance/migration, distinct performances, calendar escaping/folding and change history. Existing identity, lifecycle, scheduler, localization, security, media and link-resolution tests remain required.

Browser verification uses a temporary database containing only exported public catalog/media rows, with no production accounts. Check mobile and desktop, light/dark, dates, compare, save/remove, detail navigation, partial-source feedback and image loading. Production smoke checks follow deployment.

## Rollout and rollback

Create a separate release directory and image while the existing app serves traffic. Retain the old image and current symlink target. Stop the refresh worker for cutover, take a consistent SQLite `VACUUM INTO` backup, then recreate only the Concert Passport app and worker. Keep the shared runtime environment, mounted data and search/gateway services in place. Verify schema migrations, public routes, official/media/calendar endpoints and app/worker health.

Rollback by restoring the retained image tag and previous current symlink, then recreating only app/worker. The cache migration is additive and the provenance repair is compatible with the old schema. Restore the database backup only if a demonstrated data problem requires it; a blind restore would discard newer user changes.

## Boundaries

Coverage depends on provider quotas, permissions and published source information. A stale or absent event is not proof that a show is cancelled. Follows do not send notifications. Prices, stock, queues and checkout remain with the official ticketing destination. Comparison and exported calendars help planning but do not reserve tickets. Historical changes already merged by the prior release cannot always be reconstructed automatically; the stricter matching prevents new false merges.
