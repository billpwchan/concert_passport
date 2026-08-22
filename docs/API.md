# API Contract

Base path: `/api/v1`. JSON is used for requests and responses.

## `GET /discover`

`artist` is required and must contain at least two characters. Optional parameters are `city`, `countryCode`, `startDateTime`, and `endDateTime`. Country codes are restricted to supported Asia-Pacific markets and date ranges may not exceed 370 days.

Returns normalized live-provider results with coordinates when available, connector health, per-provider errors, cache state, and `generatedAt`. Requests are limited per client; normalized searches are cached for ten minutes. With no configured credentials, `events` is empty and connector status explains what configuration is required.

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

`state` is one of `todo`, `completed`, or `skipped`. The endpoint upserts the browser-private profile and milestone state in SQLite.

## `POST /submissions`

Accepted body:

```json
{ "url": "https://weverse.io/artist/notice" }
```

Only HTTPS URLs are accepted. The response identifies whether the host exists in the curated official-host registry, but every submission remains `pending` until event-level review.

## Preview session

The current web preview creates a random, `HttpOnly`, `SameSite=Lax` first-party cookie on the first write. It isolates one browser’s saved state but is not an account system or cross-device identity. Production account recovery, Apple sign-in, export, and deletion remain release gates. Direct mobile mutations must wait for that supported account flow.

## Environment

`TICKETMASTER_API_KEY` activates Ticketmaster Discovery. `PREDICTHQ_ACCESS_TOKEN` activates PredictHQ. `TICKETMASTER_DAILY_REQUEST_BUDGET` defaults to 4500, below the standard 5000-call quota. Secrets remain server-side and are never prefixed for client exposure.
