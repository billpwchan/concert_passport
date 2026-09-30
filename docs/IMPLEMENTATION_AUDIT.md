# Implementation Audit

**Audit date:** 2026-08-22
**Scope:** self-hosted web platform, account and catalog persistence, live source layer, refresh worker, native iOS foundation, tests, and release posture.

## Verdict

The repository now has a credible member-platform foundation rather than a hardcoded single-browser prototype. Accounts, secure sessions, anonymous-to-member state migration, saved shows, artist follows, canonical events, link semantics, periodic ingestion, and run auditing are implemented. The consumer interface no longer exposes source tiers or credential state, and default pages are driven by saved/live data rather than demo records.

This is suitable for controlled early access. It is not ready to promise comprehensive K-pop coverage or guaranteed alerts: verified email/recovery, versioned migrations, reviewer operations, field-level event provenance, production notification delivery, user data controls, and contractual source coverage remain release gates.

## What passed

- Strict TypeScript, lint, automated tests, and production compilation.
- First-party registration, login, logout, server-side session revocation, and anonymous-state merge.
- Salted scrypt password hashing, hashed session tokens, secure cookie attributes, same-origin mutation checks, and authentication rate limits.
- Canonical event upserts, idempotent saved shows, artist/market follows, and ingestion-run persistence.
- An isolated refresh worker with no public port and an authenticated internal endpoint.
- Ticketmaster and PredictHQ adapters configured only on the server; one provider failure does not erase another provider’s results.
- Exact Ticketmaster event pages are distinguished from PredictHQ discovery listings.
- Consumer source UI uses actual allowlisted logos, removes internal tier labels, and never displays credential requirements.
- User-facing English, Simplified Chinese, and Traditional Chinese plus light/dark appearances.
- Responsive MapLibre/OpenFreeMap Atlas with map/list linkage, save, and follow actions.
- Existing project containers remain outside the Concert Passport Compose ownership boundary.
- No queue bot, purchase automation, seller credential, payment, ticket barcode, or resale capability.

## Findings

| Severity | Finding | Disposition |
|---|---|---|
| P0 | No production notification scheduler or delivery audit exists. | Blocks any missed-deadline reliability promise. |
| P0 | API access exists, but contractual coverage and measured automatic recall remain incomplete. | Keep declared coverage narrow; publish critical ticket facts only after deterministic authority and conflict gates pass. |
| P1 | Email verification and credential recovery are not implemented. | Required before broad public registration. |
| P1 | Schema bootstrap is idempotent but not a versioned migration system. | Add forward/backward compatible migrations before overlapping releases. |
| P1 | No operator console or event-level official-link approval exists. | Keep user submissions pending and do not elevate host reputation to event authority. |
| P1 | Account export, deletion, and user-visible session management are absent. | Required privacy and security launch work. |
| P1 | Native iOS state is still local/sample-first and lacks a mobile token flow. | Keep mobile mutations local until supported authentication exists. |
| P2 | Discovery cache, public rate limiting, and connector budget state are process-local. | Move to shared infrastructure before horizontal scaling. |
| P2 | Source logos depend on external publisher favicon availability through an allowlisted proxy. | Add a rights-reviewed owned asset manifest for commercial launch. |
| P2 | CSP permits inline Next.js hydration scripts. | Introduce request nonces when framework and deployment path are stable. |

## Red-team conclusions

### A polished interface can overstate reliability

The revised consumer language states what is live, saved, official, or merely a listing. It does not expose internal confidence theatre. The remaining defense is operational: field-level evidence, change history, correction SLAs, and notification audit must exist before stronger reliability claims.

### A known ticket host can still contain the wrong listing

Host allowlisting prevents basic lookalikes but does not prove event authorization. Exact links still require event-level evidence and a reviewer path.

### Accounts can create new harm

Future travel and fandom preferences are sensitive. The current sessions are server-revocable and Passport remains private, but public launch still requires recovery hardening, device review, data export/deletion, retention policy, and incident response.

### Automated refresh can become accidental scraping

The worker only invokes configured provider adapters for followed pairs and is deliberately bounded. Adding HTML monitoring or purchase assistance is a separate legal and security decision, not an incremental implementation detail.

## Go/no-go gate

Proceed with controlled early access and real-user product validation. Do not sell comprehensive coverage or alert reliability until lawful source coverage, reviewer tooling, notification audit, corrections, migration discipline, identity recovery, privacy controls, and declared-market SLAs pass the red-team gates.
