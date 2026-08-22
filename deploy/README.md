# Concert Passport deployment

The production app runs as a dedicated container on the existing external
`jchart_gateway` Docker network. It publishes no host port. The existing Caddy
gateway reaches it by the unique `concert-passport-app` container name.

Server-owned state lives only under `/opt/concert-passport`:

- `shared/app.env` — runtime credentials, mode `0600`, never committed.
- `data/` — SQLite user state.
- `cache/` — disposable Next.js runtime cache.
- `current/` — the uploaded source snapshot and Compose file.

The only shared-gateway addition is
`/config/sites-enabled/concert-passport.caddy` inside the existing Caddy
configuration volume. Deployment validates the complete Caddyfile before a
graceful reload; it does not restart or rewrite the existing JChart or Flightlog
services.

Production URL:
`https://concert-passport.52-198-144-26.sslip.io`
