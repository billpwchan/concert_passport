# API Contract

Base path: `/api/v1`. JSON is used for requests and responses.

## `GET /discover`

`artist` is required and must contain at least two characters. Optional parameters are `city`, `countryCode`, `startDateTime`, and `endDateTime`. Country codes are restricted to supported Asia-Pacific markets and date ranges may not exceed 370 days.

Returns normalized live-provider results with stable canonical IDs, coordinates when available, event URLs, connector health, per-provider errors, cache state, and `generatedAt`. Ticketmaster records carry the provider’s exact official event URL. PredictHQ records carry a Concert Passport detail URL until an official ticket link is matched. Results are upserted into the canonical event catalog. Requests are limited per client and normalized searches are cached for ten minutes. When a connector is unavailable, `events` remains truthful and the consumer UI shows a neutral service state without exposing configuration details.

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
{ "url": "https://weverse.io/artist/notice" }
```

Only HTTPS URLs are accepted. The response identifies whether the host exists in the curated official-host registry, but every submission remains `pending` until event-level review.

## Sessions

Browser sessions use random opaque tokens. Only token hashes are stored in SQLite. Cookies are `HttpOnly`, `SameSite=Lax`, `Secure` in production, and rotated at authentication boundaries. Anonymous state remains available before registration and is merged into the member account after authentication.

Verified email delivery, recovery, passkeys/MFA, device management, export, and deletion remain public-launch gates. Direct mobile mutations require a supported mobile token flow rather than reuse of browser cookies.

## Environment

`TICKETMASTER_API_KEY` activates Ticketmaster Discovery. `PREDICTHQ_ACCESS_TOKEN` activates PredictHQ. `TICKETMASTER_DAILY_REQUEST_BUDGET` defaults to 4500, below the standard 5000-call quota. `INGESTION_CRON_SECRET` authenticates the isolated refresh worker. Secrets remain server-side and are never prefixed for client exposure or rendered in consumer status copy.
