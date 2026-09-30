# Source Operations

> September 30 update: [keyless collection is now the default](KEYLESS_DATA.md). Commercial API jobs are opt-in; per-page access failures no longer stop an otherwise working source.

## Operating model

Concert Passport covers K-pop tours in Singapore, Hong Kong, Japan, Taiwan, Thailand, South Korea, Malaysia, the Philippines, Indonesia, Vietnam, and Australia. Japan is included for K-pop tours; J-pop identity discovery is outside the current graph.

The production data plane is autonomous. It combines scheduled identity scans, licensed event APIs, rotating market sweeps, automatic official-link discovery, deterministic page inspection, event versioning and bounded retry. User-submitted evidence is not required for baseline coverage and there is no manual publication queue.

## Authority and source tiers

- **Tier 1** — primary operational source for a market or lifecycle phase.
- **Tier 2** — important supplement or identity/discovery source.

Tier affects scheduling and evidence weight; it is not displayed as unexplained “T1/T2” shorthand in the consumer interface. The seller or promoter explicitly named for a particular event remains authoritative for that event.

Registry inclusion permits safe link verification and explicitly supported API/feed use. It is not permission to bypass authentication, robots policy, rate limits, anti-bot controls, or commercial terms.

## Automatic acceptance

A critical milestone is publishable only when the system has:

- a canonical artist, tour, performance and venue identity;
- an absolute instant plus the source-local IANA timezone;
- an explicit lifecycle semantic such as registration close, lottery, presale or general sale;
- source URL, observed time, provider record and authority score;
- a deterministic match above the configured threshold;
- no unresolved higher-authority contradiction.

Conflicting or incomplete evidence is quarantined automatically. It does not publish a critical deadline, trigger an alert, or receive an “official” label. A later provider observation retries the decision; repeated failures use exponential backoff. This is a failure state, not a human work queue.

Media follows the same fail-closed rule. `fallback=true` provider artwork is never stored, exact artist identity is required before an artist image is accepted, and cross-artist duplicate URLs enter a durable automatic quarantine. Missing imagery is an acceptable presentation state; an unrelated image is not.

Artist identity is also typed. A same-name provider attraction cannot inherit a catalog record when `group` and `person` disagree. Unknown structured attractions are resolved against an exact South Korean MusicBrainz identity under a globally rate-limited queue; ambiguous or absent matches stay unpublished and retry through later sweeps.

The resolver is a persistent queue rather than a loop over the first search page. Candidates are keyed by stable provider artist ID, prioritized, retried with backoff and processed under a fixed runtime budget. One slow MusicBrainz response cannot abort an otherwise successful market scan.

Provider artist IDs have an explicit crosswalk to canonical catalog IDs. The presence of an attraction ID alone is not evidence of identity. Crosswalks are created only after exact external resolution, cannot silently move between canonical artists, and are consulted before aliases.

## Continuous health

The runtime records, per connector and market:

- last success and failure;
- cursor and rows seen/accepted;
- events discovered and identities learned;
- last market sweep and next due time;
- missing/exact ticket-link counts;
- quarantined conflicts and retry age;
- fallback rejection, cross-artist image collisions and quarantined media URLs;
- provider latency, quota and error class.

Consumer empty states expose what users need: the actual number of future events, number of configured official sources, last automatic scan, and nearby markets with published dates. They never imply that a market is unsupported merely because it currently has zero announced events.

## Operational targets

- at least 99% critical-field correctness inside the declared measured scope;
- median connected-source latency under 15 minutes where quota permits;
- 100% of outbound purchase links checked at event level and on the verified host registry;
- zero silent overwrites of published critical timestamps;
- catalog scan cursors always durable across restarts;
- automatic recovery or a visible degraded state for every connector failure.

If these targets are not sustained, the interface narrows its claim and reports measured freshness. It does not silently serve sample data or ask a user to trust an unexplained “updating” message.

## Ticket purchase boundary

The product may prepare prerequisites, explain the sale stage, show countdowns, open the exact official seller after a user gesture, and record an outcome. It must not automate seller login, queue activity, CAPTCHA, refresh behavior, stored payment data, limit evasion or checkout.
