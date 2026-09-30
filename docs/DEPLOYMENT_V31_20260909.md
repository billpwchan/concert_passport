# v31 release acceptance — 2026-09-09

Target: https://concert-passport.52-198-144-26.sslip.io/
Release source: `/opt/concert-passport/releases/continuous-20260906-v31`
Final image tag: `concert-passport-app:continuous-20260909-v31`

## Before production cutover

- TypeScript, ESLint and 98 tests passed, including real Live Nation / ThaiTicketMajor fixture replay, performer-type regression, source-to-seller artwork corroboration, database durability and React serialization.
- Node 22 production image built on the target server.
- Candidate migration reached schema 9 with SQLite integrity `ok`.
- Eleven route checks returned HTTP 200. Calendar export and invalid JSON handling passed.
- Accounts, profiles, sessions, saves, attendance and follows matched backup content hashes. Snapshot had three profiles, five saved events and no member accounts.
- Initial candidate audit discovered 426 URLs but published zero official events. Investigation found the legacy matcher treated unknown artist types as persons. The corrected matcher preserves unknown types, requires established catalog evidence, and accepts exact unambiguous performers on official pages. The failed audit is retained here so it is not confused with success.
- Corrected real collection: 12 pages checked, 28 event publication/enrichment operations, 26 distinct event artwork proofs, zero page failures in that batch. Date ranges and uncertain identities remain in review.
- Candidate future catalog: 95 events; 26 had official event artwork and 27 had independently verified artist photos. 42 still lacked verified art at this checkpoint. Eleven new official records included BTS Philippines / Thailand / Taiwan and Stray Kids Taiwan / Thailand. Date-only announcements stayed date-only.
- IVE Taipei's three existing performance times were preserved while their artwork was corroborated through the promoter's explicit tixCraft URL. The actual image endpoint returned a 2,901,857-byte PNG.

Production cutover, worker checks and final totals are appended after live acceptance. Candidate observations above are not claims about the live state.

Additional candidate checks: ITZY returned a 650,905-byte JPEG; Stray Kids a 1,771,451-byte PNG; BABYMONSTER a 389,417-byte JPEG. All HTTP 200, with no fallback response. Repeating route and user-table hash checks after real collection still passed. Build-time host load increased; the temporary candidate was stopped while the final build finished. The production health endpoint remained HTTP 200.

## Final candidate and deployment gate

The final built image passed eleven route checks, calendar validation, SQLite integrity and all six user-table hashes. Its authorized HTTP collector processed eight pages, published/enriched six event records, and reported zero failures (`schedulerOutcome: completed`).

A fresh production backup was created at `/opt/concert-passport/data/backups/pre-continuous-20260909-v31.sqlite`: 114 canonical events, three profiles, five saves, no accounts/sessions/attendance/follows; SQLite integrity passed.

Production cutover was NOT executed. Automatic approval review rejected the SSH cutover command because Codex usage was exhausted and offered a retry after 17:54. The prior v30 application remains live. Do not describe v31 as deployed. The prepared command stops the temporary candidate and invokes `/tmp/cp-cutover-v31.sh`, which retains the v30 image, atomically changes the release symlink and health-gates app/worker recreation. Resume only after approval/usage availability has actually changed.

## Production cutover completed

The usage API subsequently reported primary 5%, secondary 17%, with no reached limit. Retrying the identical cutover through the same approval channel succeeded; no approval workaround was used.

The production symlink and image now point to v31. App health is `healthy`; the worker was recreated and started. Live `/`, `/atlas`, `/plans`, `/passport`, `/sources`, and `/api/v1/coverage` returned HTTP 200. Schema is 9. All six user-table hashes still match the September 9 backup. The worker immediately acquired the official-collection lease; concurrent manual requests correctly returned `job_already_running` without duplicate execution. The public source page visibly reports PredictHQ's rejected credential instead of claiming connectivity.

## Production data acceptance

After ten authenticated collection batches, canonical records increased from 114 to 125: eleven newly discovered official events. The durable frontier contains 427 URLs. Eight Live Nation regional sources (MY, SG, HK, TW, TH, PH, JP, KR) all recorded successful checks; blocked/unsupported seller sources remain visible as such.

At the live checkpoint, 96 upcoming public events comprised 27 with verified event artwork, 27 with verified artist photos and 42 without verified artwork. Four sampled live event image endpoints (IVE, ITZY, Stray Kids, BABYMONSTER) returned HTTP 200 raster images, not fallbacks, and SQLite integrity remained `ok`. Browser inspection confirmed the real IVE artwork, its source link, original performance time and published sale date in the dark interface.

Unauthenticated official-collection and media routes returned 401; cross-origin correction submission returned 403. No test submissions or account data were written to production. Backups and the previous v30 rollback image remain available.

Remaining external/data limits: PredictHQ's installed token is still rejected; independent official collection works. Some seller pages block or do not expose parseable event information. Forty-two future events still need verified visual assets; placeholder artwork is not counted as resolved. Multi-day announcements without per-performance times remain in review. Source descriptions can retain publisher HTML entities; they are displayed as plain text, never executed.
