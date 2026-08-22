# Implementation Audit

**Audit date:** 2026-08-22
**Scope:** current web vertical slice, source layer, D1 user state, native iOS foundation, tests, and release posture.

## Verdict

The repository now proves the product interaction model and cross-platform technical shape at a high visual and engineering bar. It is suitable for user testing and a source-operations pilot. It is not yet a truthful “never miss a concert” production service because notification delivery, contracted ingestion, reviewer operations, and mobile account persistence are not complete.

## What passed

- Web routes compile with strict TypeScript and lint cleanly.
- Lifecycle, time formatting, alert offsets, source uniqueness, market coverage, and host lookalikes have automated tests.
- Authenticated milestone and source-submission writes were exercised against local D1.
- Unconfigured live adapters return empty data with transparent health states.
- Default UI records are labeled illustrative.
- Swift lifecycle tests pass and the native app compiles for a generic iOS device without signing.
- App Icon, launch color, responsive web metadata, and social preview assets are repository-owned.
- No queue bot, purchase automation, seller credential, payment, ticket barcode, or resale capability exists.

## Findings

| Severity | Finding | Disposition |
|---|---|---|
| P0 | No production notification scheduler or delivery audit exists. | Blocks any reliability promise; next major workstream. |
| P0 | Provider keys/contracts and editorial verification operation are not provisioned. | Hosted discovery is transparent but incomplete; pilot must narrow declared catalog. |
| P1 | Mobile write authentication is not designed; native state is currently in-memory. | Keep iOS mutations local until a supported mobile session/token flow is implemented. |
| P1 | Runtime D1 bootstrap covers current user-state tables, not the full normalized ingestion schema. | Apply checked-in migrations in the ingestion/release environment before enabling it. |
| P1 | Event-level seller authorization still requires editorial review even for known hosts. | Submission API correctly remains `pending`; build reviewer tooling next. |
| P1 | No privacy-safe public share renderer, export, or deletion flow exists yet. | Do not expose public Passport pages before structural redaction is implemented. |
| P2 | The dev/build toolchain retains transitive advisories, while `npm audit --omit=dev` reports zero production vulnerabilities after the controlled Next 16.3.2 upgrade. | Track Sites/vinext updates; do not force-upgrade the beta build stack independently. |
| P2 | English is the only implemented UI language. | Add Traditional Chinese and Simplified Chinese before broader APAC beta. |

## Red-team challenges

### “The beautiful UI creates false trust.”

Mitigation in this slice: every demonstration journey is labeled illustrative, source status is visible, and live connectors do not fabricate results. Remaining gate: critical facts need field-level evidence and correction history before the product uses stronger reliability language.

### “An allowlisted seller can still host a malicious or unrelated listing.”

Correct. Domain checks prevent basic lookalikes but do not establish event authorization. The operations process therefore keeps submissions pending and requires event-level promoter/artist evidence.

### “The app encourages parasocial claims.”

Passport copy uses a warm “first met” memory framing but never implies communication or artist endorsement. Spending, status, exact travel, and ticket proof are not social rankings.

### “Cross-platform parity will slow the wedge.”

The current split is intentional: web handles dense planning and source transparency; iOS proves glanceable Today, journey completion, MapKit Atlas, and Passport. Production mobile authentication and notifications should be built only after the data pilot validates the promise.

## Go/no-go gate

Proceed to a controlled concierge pilot. Do not market the product as a comprehensive live alert service or accept payment for reliability until contracted/official source coverage, reviewer tooling, APNs delivery audit, correction handling, privacy controls, and declared-market SLAs pass the original red-team gates.
