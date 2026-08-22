# API Contract

Base path: `/api/v1`. JSON is used for requests and responses.

## `GET /discover`

Query parameters are optional: `artist`, `city`, `countryCode`, `startDateTime`, and `endDateTime`.

Returns normalized live-provider results, connector health, per-provider errors, and `generatedAt`. With no configured credentials, `events` is empty and connector status explains what configuration is required.

## `GET /sources`

Returns the curated registry, connector health, and product policy flags:

- automated purchase: false;
- unofficial resale: false;
- verified official handoff: true.

## `PATCH /plans/{journeyId}/milestones/{milestoneId}`

Requires a Sites/ChatGPT authenticated session. Accepted body:

```json
{ "state": "completed" }
```

`state` is one of `todo`, `completed`, or `skipped`. The endpoint upserts the profile and milestone state in D1.

## `POST /submissions`

Requires authentication. Accepted body:

```json
{ "url": "https://weverse.io/artist/notice" }
```

Only HTTPS URLs are accepted. The response identifies whether the host exists in the curated official-host registry, but every submission remains `pending` until event-level review.

## Authentication

Read endpoints are public. Write endpoints trust identity headers only when supplied by the Sites dispatcher. Direct clients must use a future supported mobile authentication flow; they must not manufacture dispatcher headers.

## Environment

`TICKETMASTER_API_KEY` activates Ticketmaster Discovery. `PREDICTHQ_ACCESS_TOKEN` activates PredictHQ. Secrets remain server-side and are never prefixed for client exposure.
