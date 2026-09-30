# v28 Autonomous Platform Red-Team

Audit date: 2026-08-23<br />
Scope: Web runtime, scheduled ingestion, identity graph, event lifecycle, media/link publication, schema evolution, obsolete artifacts, production operating shape.

## Baseline observed

The production snapshot contained 2,519 artist identities (2,313 active), 88 future canonical events across 10 markets, and all 12 configured market sweeps had completed recently. Of the future events, 22 had event-specific art and 66 used exact artist art; no remote visual was missing. The identity queue had 1,424 due or never-checked records, mostly low priority. Recent ingestion runs completed without fatal errors, but the architecture still relied on one global worker loop and forward searches for most lifecycle knowledge.

These figures are an audit snapshot, not a coverage promise.

## Round 1 — Process and schema failure

| Finding | Severity | Failure mode | Control delivered | Verification |
| --- | --- | --- | --- | --- |
| Startup executed repeated schema repair and data-delete statements | High | each process boot could mutate production history outside a release boundary | ordered transactional `schema_migrations`; repairs moved to one-time migration 4 | migration count/idempotency test |
| Scheduled endpoints had no cross-process exclusion | High | restart or second worker could overlap provider calls and SQLite writes | persisted database leases per job | concurrent claim and expiry tests |
| Every job ran every 20 minutes | Medium | identity/media quota waste and unnecessary provider load | independent six-hour and twenty-minute cadences | worker configuration and build |
| One endpoint failure delayed later work and waited a full normal cadence | Medium | transient outage produced long blind periods | isolated job errors, explicit persisted outcome, 15-minute partial retry and at-most-five-minute hard-failure retry | worker outcome test and structured logs |
| Environment values were effectively unbounded | Medium | a configuration mistake could create a crawl or disable freshness | bounded intervals, pages, batch sizes, concurrency and timeouts | unit coverage for query windows; static audit |

## Round 2 — Coverage and new-artist failure

| Finding | Severity | Failure mode | Control delivered | Verification |
| --- | --- | --- | --- | --- |
| Absolute priority sort could starve the tail as the hot cohort grows | High | new/quiet artists remain permanently overdue | fixed capacity for hot, never-checked and longest-overdue cohorts | synthetic saturation test |
| Identity and event refresh shared an unnecessarily frequent cadence | Medium | open identity sources were called too often | independent persisted cursor scan every six hours | runtime schedule audit |
| Known-artist search alone cannot learn a new group | High | first announced event is invisible until editorial action | rotating 12-market sweep plus provider identity candidate queue | existing dynamic-artist and market tests |
| Mutable open-data indexes can lag a debut | Residual | new act appears only after the next full scan | market-first second path; documented targeted-roster partnership need | operating metric: scan-cycle age |

## Round 3 — Lifecycle and reconciliation failure

| Finding | Severity | Failure mode | Control delivered | Verification |
| --- | --- | --- | --- | --- |
| Forward future search is not a deletion protocol | Critical | cancelled/deleted shows remain public indefinitely | resumable PredictHQ `updated.*` active/deleted feed with fixed window and overlap | active/deleted query, cursor and tombstone tests |
| Bounded pagination could lose later pages across runs | High | cursor advances before a full update window is read | persist fixed upper bound and continuation URL; advance only on completion | partial-state model and migration |
| A single deletion could hide a show still active elsewhere | Critical | lower-quality source overrides an official source | source-level lifecycle state and authority reconciliation | sole-source, multi-source and restore tests |
| Forward status updates used a different rule from tombstones | Critical | reported cancellation could overwrite official schedule | one reconciliation function for all forward and deletion evidence | reported-vs-official status test |
| Cancelled items simply disappeared | Medium | saved users receive no explanation | saved/detail projections retain lifecycle; five-language status content | localization alignment tests |

## Round 4 — Trust-boundary failure

| Finding | Severity | Failure mode | Control delivered | Verification |
| --- | --- | --- | --- | --- |
| Provider continuation was host-checked but path-prefix tolerant | Medium | an unexpected same-host endpoint could receive credentials | exact HTTPS host and exact events-path allowlist | malicious continuation test |
| Internal scheduled routes are network reachable inside the private network | High | unauthenticated caller triggers expensive work | mandatory bearer secret plus database lease | route implementation and production network isolation |
| AI extraction could be mistaken for source truth | High | plausible but false data is published | AI limited to candidate evidence; deterministic publication gates | architecture contract; production path currently model-free |
| Generic or shared media can misidentify a celebrity | High | false artist image creates direct user harm | exact identity binding and cross-identity quarantine | media pipeline tests |

## Round 5 — Product and repository failure

| Finding | Severity | Failure mode | Control delivered | Verification |
| --- | --- | --- | --- | --- |
| Three internal design-lab routes remained public | Medium | stale product concepts confuse users and search engines | remove concept/product routes; keep ITZY only at canonical show URL | production-build route manifest and 404 smoke test |
| Orphan generated images and six mock-up binaries remained | Low | repository weight and unclear asset authority | delete eight unreferenced binaries and update asset policy | zero-reference scan |
| Event status lacked a visible localized fact | Medium | rescheduled/postponed users see stale-looking plans | localized status fact in English, Simplified/Traditional Chinese, Japanese and Korean | catalog parity and interpolation tests |
| Documentation still described ad-hoc schema bootstrap | Medium | future maintainers reintroduce unsafe patterns | update architecture, source, deployment and autonomous-operation contracts | link and diff review |

## Release gate result

The refactor passes the release gate for the current single-host architecture when all of the following remain green:

- full TypeScript, lint, unit/integration and optimized-build checks;
- canonical show route responds, obsolete lab routes return 404;
- migration 5 applies once to a backup-verified production database;
- app, worker, search, and gateway remain healthy after an isolated Compose rollout;
- lifecycle change cursor begins advancing without provider/auth errors;
- no non-Concert-Passport container, network, configuration, or volume is restarted or modified.

## Residual stop-ship conditions for later scale

- Do not run multiple application writers against SQLite.
- Do not promise exhaustive regional coverage without measured recall and source contracts.
- Do not send lifecycle notifications until a transactional outbox and deduplicated delivery audit exist.
- Do not auto-publish model-extracted unstructured evidence without a replayed multilingual evaluation and deterministic source validation.
- Do not reuse current session cookies as a mobile authentication protocol.
