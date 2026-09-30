# Concert Passport deployment

> Deployment architecture below describes this repository's Lightsail setup.
> Actual release verification and rollback evidence: [September 30 release](../docs/RELEASE_2026_09_30.md).

## Runtime configuration

`apps/web/.env.example` is for local development. Before a new server installation,
set these values in the server-owned `/opt/concert-passport/shared/app.env`:

```dotenv
CONCERT_PASSPORT_DATA_MODE=official
CONCERT_PASSPORT_SITE_URL=https://your-production-domain
CONCERT_PASSPORT_DB_PATH=/data/concert-passport.sqlite
CONCERT_PASSPORT_MEDIA_CACHE_PATH=/data/media-cache
INGESTION_CRON_SECRET=<generated-server-only-secret>
```

Replace both placeholders before starting services. Keep the secret and provider
credentials out of Git. The app owns the mounted database; the worker requests
authenticated jobs over the private container network. An existing installation
keeps its server-owned environment file across releases.

The default `official` mode needs no Ticketmaster, PredictHQ or Brave key.
The worker skips commercial event ingestion while public official collection,
artist identity, links and media jobs remain independent. See the
[keyless data runbook](../docs/KEYLESS_DATA.md) for observed coverage and replayable audits.

## Existing topology

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

## Portable installation

For a new machine, use `compose.portable.yml`, not the Lightsail-specific file:

```bash
cp deploy/.env.example deploy/.env
# Replace INGESTION_CRON_SECRET using openssl rand -hex 32.
# Set CONCERT_PASSPORT_SITE_URL to your public HTTPS origin.
docker compose --env-file deploy/.env -f deploy/compose.portable.yml up -d --build
```

The app binds to loopback port 3000. Put your HTTPS reverse proxy in front of it; expose only the proxy's public ports. SQLite and Next caches use named volumes. The optional SearXNG service is not required by this portable template. Do not run `down -v` on a live installation unless intentionally deleting its data.

The build caps Node's heap at 512 MiB and Next's build workers at one. Runtime app/worker limits are separate. Allow enough RAM/swap for a build alongside existing workloads; preferably build images in CI on the target architecture before transfer.

## Consistent backups and migration proof

Run on the host with read access to the database and Python 3:

```bash
python3 deploy/scripts/sqlite-snapshot.py /path/to/concert-passport.sqlite \
  --backup /private/backups/before-release.sqlite > /private/backups/baseline.json
```

The destination must not exist. The script uses SQLite's online backup API, verifies integrity/foreign keys and emits only per-table counts, column names and hashes. Keep backups and fingerprints private. Copy the snapshot into a separate candidate data directory, run the candidate image against that directory, then compare:

```bash
python3 deploy/scripts/sqlite-snapshot.py /candidate/concert-passport.sqlite \
  --baseline /private/backups/baseline.json > /private/backups/migrated.json
```

`userDataUnchanged: true` verifies pre-existing user columns/rows across additive migrations. Test the previous image against the migrated *candidate copy* to prove application rollback compatibility.

For cutover: preserve the old image and source path; stop only the Concert Passport worker and app; create a final consistent backup; start the new app; check `/api/health`, user-data fingerprints and public routes; then start the worker. Keep downtime bounded. Never copy the candidate or a developer database over production.

For application rollback of schema v10: stop the worker, restore the previous image tag and source path, recreate app/worker, verify health. Keep the current production database because v10 is additive and newer user writes must survive. A database restore is disaster recovery, not the default application rollback: stop writers, preserve the failed DB and its WAL, restore the approved snapshot, and explicitly account for writes since that snapshot.

Retain at least the pre-release snapshot plus daily off-host backups according to the operator's retention policy. This repo provides a backup tool; it does not silently install a host scheduler or promise an off-host backup service.

## Observability

`/api/health` distinguishes app readiness from collection age. `/api/v1/coverage` and `/sources` expose aggregate coverage and source states. An HTTP 200 does not mean all sources are current. Investigate sustained `collection.delayed`, increasing due pages, source rate limits, and time-conflict review candidates. Worker logs are structured JSON; credentials and private rows must not be logged.
