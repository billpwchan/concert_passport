# API Contract

Base path: `/api/v1`. JSON is used for requests and responses.

## `GET /discover`

`artist` is required and must contain at least two characters. Optional parameters are `city`, `countryCode`, `startDateTime`, and `endDateTime`. Country codes are restricted to supported Asia-Pacific markets and date ranges may not exceed 370 days.

Returns normalized live-provider results with stable canonical IDs, coordinates when available, event URLs, connector health, per-provider errors, cache state, and `generatedAt`. Ticketmaster records carry the provider’s exact official event URL. Live Nation artist calendars contribute structured official tour dates and promoter event pages, including dates omitted from regional API inventory. An exact-date official calendar supplements only performances verified against first-party artist, promoter, venue, or seller pages; it does not infer dates or times. PredictHQ records carry a Concert Passport detail URL until an official ticket link is matched. Results are upserted into the canonical event catalog. Requests are limited per client and normalized searches are cached for ten minutes. When a connector is unavailable, `events` remains truthful and the consumer UI shows a neutral service state without exposing configuration details.

## `GET /sources`

Returns the curated registry, connector health, and product policy flags:

- automated purchase: false;
- unofficial resale: false;
- verified official handoff: true.

## `PATCH /plans/{journeyId}/milestones/{milestoneId}`

Accepted body:

```json
{ "state": "completed" }
```

`state` is one of `todo`, `completed`, or `skipped`. The endpoint persists state for the signed-in account, or for an isolated anonymous browser before registration.

## `POST /plans`

Accepted body:

```json
{ "canonicalEventId": "ticketmaster:event-id" }
```

Saves a normalized catalog event to the current account or anonymous browser library. The write is idempotent.

## `POST /follows`

Accepted body:

```json
{ "artist": "RIIZE", "market": "SG" }
```

Follows an artist and optional supported market. Followed pairs drive periodic background refreshes.

## Account routes

- `POST /auth/register` creates an account and merges the current anonymous library.
- `POST /auth/login` verifies credentials, rotates the session, and merges anonymous state.
- `POST /auth/logout` revokes the current server-side session.
- `GET /auth/me` returns the public account projection or `null`.

Mutation requests require a same-origin browser context. Authentication endpoints are rate-limited.

## `POST /submissions`

Accepted body:

```json
{ "url": "https://www.livenation.sg/event/example", "eventId": "optional-canonical-id", "note": "Information to recheck" }
```

Only HTTPS URLs on configured collector hosts are accepted. Same-origin requests are rate-limited. The response returns the submission ID and `queued` status; the official verification queue determines `checked` or `needs_review`. A report cannot directly modify public data.

## `GET /coverage`

Returns actual source checks, durable page queue counts, recent catalog changes and scheduler outcomes. No credentials or private user data are exposed.

## Sessions

Browser sessions use random opaque tokens. Only token hashes are stored in SQLite. Cookies are `HttpOnly`, `SameSite=Lax`, `Secure` in production, and rotated at authentication boundaries. Anonymous state remains available before registration and is merged into the member account after authentication.

Verified email delivery, recovery, passkeys/MFA, device management, export, and deletion remain public-launch gates. Direct mobile mutations require a supported mobile token flow rather than reuse of browser cookies.

## Environment

`TICKETMASTER_API_KEY` activates Ticketmaster Discovery. `PREDICTHQ_ACCESS_TOKEN` activates PredictHQ. `TICKETMASTER_DAILY_REQUEST_BUDGET` defaults to 4500, below the standard 5000-call quota. `INGESTION_CRON_SECRET` authenticates the isolated refresh worker. Secrets remain server-side and are never prefixed for client exposure or rendered in consumer status copy.

## September 2026 journal API additions

All journal mutations require a same-origin request and the current account or private browser session. JSON shape/date/length/distance validation returns 400; missing or another user's record returns 404. Personal responses use `Cache-Control: private, no-store`.

- `GET /api/v1/passport`: `{ entries: [...] }`, excluding removed records.
- `POST /api/v1/passport`: manual `{ artist, city, market, attendedAt, eventName?, venue?, travelDistanceKm? }`. A manual `YYYY-MM-DD` stays date-only. Alternatively `{ eventId }` records a saved, non-quarantined past performance; retries reuse the same record and restore it if removed. Future, cancelled, postponed and deleted events are rejected.
- `PATCH /api/v1/passport`: `{ id, ...manualFields }` edits the current user's record. `{ id, restore: true }` restores a removed record.
- `DELETE /api/v1/passport`: `{ id }` performs recoverable removal.
- `DELETE /api/v1/follows`: `{ artist, market }`, scoped to the current user.
- `GET /api/health`: lightweight SQLite readiness, schema version and official collection status/age. A delayed worker is reported separately from app readiness. Private data and credentials are never returned.
- `GET /api/v1/events/:eventId/calendar`: returns 409 while a recorded timing conflict remains unresolved.

Schema v10 adds nullable `attendance_records.event_id`, `deleted_at` and a unique user/event index. Anonymous-to-account merge preserves both memories if each identity recorded the same event, detaching the redundant source link without deleting either record.
