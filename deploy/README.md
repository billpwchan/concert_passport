# Concert Passport deployment

The production app, refresh worker and private discovery search run as dedicated
containers. Only the app joins the existing external `jchart_gateway` network.
The worker and search service communicate with it on the dedicated
`concert_passport_discovery` network; the search service exposes no host port.

Server-owned state lives only under `/opt/concert-passport`:

- `shared/app.env` — runtime credentials, mode `0600`, never committed.
- `shared/searxng.env` — random private search secret, mode `0600`.
- `data/` — SQLite user state.
- `cache/` — disposable Next.js runtime cache.
- `current/` — the uploaded source snapshot and Compose file.

`concert-passport-worker` calls an authenticated internal endpoint on a bounded
interval. It refreshes followed artist/market pairs, upserts canonical events,
then resolves trusted official ticket, promoter, artist and venue pages through
the automatic evidence pipeline. `concert-passport-searxng` supplies a
key-free, private meta-search discovery layer for official sites that do not
offer APIs. Search results are candidates only: every URL still has to pass the
same exact-host, artist, local-date and market checks before publication.
Fetches are host-allowlisted, time/size bounded and never automate purchase
flows.

The only shared-gateway addition is
`/config/sites-enabled/concert-passport.caddy` inside the existing Caddy
configuration volume. Deployment validates the complete Caddyfile before a
graceful reload; it does not restart or rewrite the existing JChart or Flightlog
services.

Production URL:
`https://concert-passport.52-198-144-26.sslip.io`
