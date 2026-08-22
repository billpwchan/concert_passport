# Red-Team Audit

**Verdict:** The concept is strategically strong, but it is not primarily a UI project. It is a trust, data-operations, and jurisdiction project wrapped in a premium consumer experience.

The product is viable only if it can become more reliable than a fan’s current combination of official social accounts, group chats, and calendars. Beautiful screens amplify trust; they cannot substitute for it.

## 1. Hard challenge to the thesis

### Challenge: “This is only Bandsintown plus a map.”

If the product stores only artist, venue, performance date, and one on-sale time, the challenge is correct and the product should not be built.

The response must be demonstrated, not claimed:

- prerequisite-aware lifecycle;
- registration/lottery/result/payment semantics;
- multi-city comparison;
- explicit user action state;
- field-level provenance and change history;
- travel-window discovery;
- trusted Passport continuity.

### Challenge: “The data does not exist in one legal feed.”

Correct. This is the largest existential risk. The proposed response is a deliberately narrow catalog, multiple licensed/official/user-forwarded adapters, and an editorial verification system. If the business cannot afford that operation or secure appropriate rights, it should reduce geography rather than pretend to be comprehensive.

### Challenge: “Fans will not pay for reminders.”

They probably will not pay for generic reminders. The paid value has to be confidence across a high-cost, multi-step journey: early prerequisite detection, full ticket-path coverage, change handling, multi-region comparison, coordination, and a premium long-term archive. This requires pricing validation before building a broad surface.

### Challenge: “The product can never guarantee a push notification.”

Correct. iOS settings, device state, network, provider failure, and user behavior prevent an absolute guarantee. The product must say “protected by these alert channels,” not “guaranteed.” Redundancy, acknowledgement, calendar export, job audit, and clear status lower risk without dishonest claims.

### Challenge: “Passport is a gimmick.”

It becomes a gimmick if it is a badge collection disconnected from real attendance. It becomes a retention asset when it reduces historical import friction, respects privacy, generates meaningful artist/travel narratives, and remains portable. The Passport must not distract from deadline protection in the first session.

## 2. Risk register

| Risk | Likelihood | Impact | Mitigation | Stop/trigger condition |
|---|---|---:|---|---|
| Critical milestones are incomplete or late | High | Existential | Narrow markets/artists, source hierarchy, field provenance, human verification, freshness SLAs | Pilot accuracy or latency misses gate for two cycles |
| Source terms prohibit intended commercial use | High | Existential | Legal review, contracts, provider adapters, user-forwarded inputs, no unauthorized scraping | No lawful source mix for first two markets |
| Platform dependence changes economics/coverage | High | High | Never make one provider canonical; preserve internal entities and source graph | One provider supplies >70% of critical milestones without fallback |
| Push notification is delayed/disabled | Medium | High | Multi-channel coverage, local calendar, acknowledgement, in-app alert health | Product copy still implies guarantee or delivery audit is absent |
| Wrong time-zone conversion causes a miss | Medium | Existential | IANA zones, store UTC + local zone, property tests, source-local display, change audit | Any unexplained critical time conversion incident in beta |
| Duplicate events or localized-name mismatch | High | High | Entity aliasing, dedupe review queue, provider ID mapping | Duplicates materially confuse 1%+ of protected plans |
| Ticket seller/link is unsafe or unofficial | Medium | Existential | Verified-domain registry, source tiers, outbound interstitial, reporting | Any unreviewed user URL can receive “official” treatment |
| Unofficial resale introduces fraud/liability | High | Existential | Exclude marketplace; only approved official return/resale links | Pressure to monetize gray-market inventory without contracts |
| Queue automation violates terms or laws | Medium | Existential | No bots, refreshers, login automation, CAPTCHA workarounds, or limit evasion | Product requirement crosses preparation into automated interaction |
| Artist media use infringes rights | High | High | Asset rights metadata, licensed feeds, user-owned media, generated city/venue stamps | No reliable way to expire/remove provider assets |
| Ticket/access code leaks through sharing | Medium | High | Explicit share allowlist, redaction, encrypted sensitive notes, screenshot warnings | Public renderer can access private raw ticket fields |
| Live/exact location enables stalking | Medium | High | Private default, delayed/coarse share, no background live social map | Exact location appears in public Passport or friend feed by default |
| Cross-border privacy obligations diverge | High | High | Data minimization, regional counsel, deletion/export, processor inventory, residency review | Launch expands before data map and lawful basis review |
| Account takeover exposes itineraries/codes | Medium | High | Passkeys/Apple auth, strong session controls, encrypted secrets, device/session review | Sensitive codes stored without threat model and recovery process |
| Community submissions create misinformation | High | High | Evidence required, reputation and reviewer queue, source tier visible | Unverified submissions automatically trigger critical alerts |
| Support burden overwhelms subscription margin | High | High | Concierge pilot, correction tooling, per-market cost accounting, scope control | Data/support cost per payer cannot fit target annual price |
| Cold start requires too much manual setup | High | High | Start with artist/city selection, share-sheet capture, CSV/history import later | <50% reach first protected journey in pilot |
| Passport has no proof or is overly strict | Medium | Medium | Self-attested/confirmed/imported proof tiers; joy first, verification visible | Users abandon because logging needs ticket proof |
| Fandom-specific aesthetics narrow the audience | Medium | Medium | Inclusive visual system; personalize accents without gender stereotype | Research shows product perceived as only one genre/demographic |
| Monetization corrupts trust ranking | Medium | High | Separate sponsorship, published ranking principles, affiliate disclosure | Commercial contracts require hidden ranking advantage |
| Physical merchandise creates fulfillment drag | Medium | Medium | Partner production, preorder pilots, later phase | Inventory purchased before demonstrated demand |

## 3. Data-quality threat model

### Failure modes

- announcement has a date but no venue or ticket path;
- event and waiting-room time are confused;
- registration closing time is mistaken for presale time;
- time is published in the artist’s home zone rather than venue zone;
- additional show inherits the wrong sale program;
- translated artist or venue name creates a duplicate;
- source page changes without a stable URL;
- official social image contains the only deadline;
- a cancellation appears on one channel but not the ticket page;
- the seller is official but the pasted link is a phishing lookalike;
- daylight-saving transition changes a remote fan’s home-time display;
- a source retracts or corrects a post after alerts were scheduled.

### Required defenses

- field-level source evidence and timestamps;
- raw-text/image evidence retention only where rights and privacy permit;
- OCR/parser output always marked as machine-extracted until reviewed;
- source-domain allowlist with IDN/homograph protection;
- conflicting-source review queue;
- material-change severity classification;
- alert rescheduling tied to the exact milestone version;
- fan-visible correction and support path;
- post-incident review for every missed or incorrect critical deadline.

## 4. Notification red team

### What can go wrong

- remote push accepted by APNs but not seen;
- user denies permission or disables a category;
- scheduled local alert survives after an event changes;
- quiet-hour policy suppresses a deadline in another time zone;
- duplicate adapters create duplicate alerts;
- a retry sends an expired message;
- Live Activity and push repeat the same information;
- lock-screen text reveals an access code or private trip.

### Design response

- show an “alert coverage” state on every critical milestone;
- require explicit user choice for the most important channel/time;
- generate deterministic delivery IDs by user + milestone + milestone version + offset;
- cancel or supersede jobs when the version changes;
- use server push for changes and local/calendar redundancy for known timepoints;
- never label alerts as guaranteed;
- display a compact incident/status notice if alert infrastructure is degraded;
- keep sensitive values out of notification payloads.

## 5. Ticketing and transaction red team

### V1 allowed

- factual seller and sale-program information;
- verified official link/app handoff;
- user checklist and timer;
- encrypted optional note for a user’s own code, never full ticket credentials;
- official return/resale handoff where event policy allows;
- disclosed affiliate parameters under contract.

### V1 prohibited

- automatic page monitoring contrary to site terms;
- queue joining, refreshing, polling, or manipulation;
- automated login or purchase;
- CAPTCHA or bot-detection bypass;
- multi-account coordination designed to evade limits;
- storing payment data;
- selling, validating, or guaranteeing user-to-user tickets;
- bundling a restricted ticket with travel for resale.

### Requirements before authorized in-app purchase

- written distribution agreement and documented country/event inventory;
- merchant-of-record and tax model;
- all-in price presentation and currency rules;
- PCI scope and payment-token architecture;
- refunds, cancellations, chargebacks, fraud, and customer-support SLAs;
- accessibility and identity/age handling;
- inventory/cart expiry and idempotent order state machine;
- jurisdiction-by-jurisdiction resale/transfer review;
- incident response and financial reconciliation.

This is a separate business line and should have its own go/no-go review.

## 6. Privacy and personal safety

### Sensitive data inventory

- followed artists can reveal beliefs or identity in some contexts;
- exact future travel plans;
- home city and frequent venues;
- squad membership and relationships;
- ticket/presale membership identifiers;
- payment outcomes and budget;
- photos, faces, location metadata, seat and entry information;
- passport/identity details if a foreign platform requires them.

### Product rules

- Do not collect passport/ID documents for the planned product.
- Do not collect or store ticketing passwords or payment cards.
- Treat access codes and membership identifiers as secrets.
- Default Passport, plans, companions, and travel to private.
- Use a public-share allowlist; do not rely on hiding individual fields after rendering.
- Strip EXIF location from share artifacts and user-upload display derivatives.
- Never expose seat/barcode details in public images.
- Offer account export, account deletion, session/device review, and link revocation.
- Separate operational analytics from sensitive content and avoid raw-content session replay.

## 7. Intellectual-property audit

Potentially protected material includes:

- artist names and logos;
- artist likeness and publicity rights;
- tour marks, poster art, and promotional photography;
- venue and ticket-platform marks;
- ticket artwork and barcodes;
- setlists/database content;
- user photos containing other people.

Mitigation:

- maintain rights metadata per asset/provider/territory/purpose/expiry;
- use textual nominative references only after counsel review;
- prefer provider-licensed or user-owned media;
- create stamps from city, venue, date, route, and original geometry;
- provide notice/takedown and provider-removal tooling;
- keep default share templates clear of unlicensed artist images/logos;
- negotiate commercial setlist/metadata rights before integration.

## 8. Ethical audit

Superfans are valuable users but are also vulnerable to scarcity pressure, parasocial manipulation, scams, and overspending.

Do not:

- use fake urgency or undisclosed scarcity;
- shame users for missing a streak/show;
- imply closeness, communication, or endorsement from an artist;
- rank unsafe resale because it pays more;
- encourage evasion of event limits;
- expose another fan’s travel or attendance without consent;
- turn spending into public social status;
- market debt/credit as the solution to ticket scarcity.

Do:

- explain uncertainty and source authority;
- allow budget and travel-friction limits;
- provide scam warnings at the point of risk;
- separate memory/identity from spend;
- let users mute an artist, tour, city, or promotional content without losing their archive.

## 9. Operational audit

An internal admin console is a launch feature, not back-office polish. It needs:

- source and provider health;
- unresolved entity matches;
- conflicting critical facts;
- upcoming milestones with missing authority;
- change severity and alert impact preview;
- reviewer assignment and four-eyes approval for highest-risk corrections;
- user reports and correction SLA;
- outbound-domain verification;
- notification delivery audit;
- per-market completeness and latency dashboards;
- asset-rights expiry/removal queue.

If operations are performed in ad hoc spreadsheets and direct database edits, the product is not ready for a protected-journey promise.

## 10. Kill criteria and pivots

Pause or narrow the product if any of the following remains true after the concierge pilot:

1. Fewer than 60% of qualified users create a protected journey without facilitator help.
2. Fewer than 40% track more than one city/market, undermining the cross-border wedge.
3. Critical milestone field correctness is below 99% for the deliberately covered catalog.
4. More than 2% of protected plans experience a material critical-milestone omission during the pilot.
5. Connected official-source change latency cannot meet 15 minutes median, or editorial-source latency cannot meet a declared market SLA.
6. Data and support operations cannot fit a plausible US$39–49 annual subscription margin.
7. Fewer than 10% of the qualified pilot cohort shows paid intent at US$39/year equivalent.
8. No lawful, sustainable source mix exists for at least Singapore and Hong Kong.
9. The product requires unofficial scraping or resale to feel useful.
10. Users consistently describe the Passport as work rather than a reward.

Possible pivots:

- narrow to a high-touch K-pop cross-border lifecycle product;
- sell verified timeline infrastructure to promoters/fan clubs;
- focus on private/manual planning plus Passport, without claims of comprehensive automated coverage;
- begin as a concierge membership while the source network develops.

## 11. Pre-launch red-team gates

- Threat model and privacy data map reviewed.
- Data-provider and asset rights reviewed by counsel.
- Critical timestamp test suite includes DST, ambiguous local times, and source corrections.
- Notification failure/retry/reschedule game day completed.
- Phishing/homograph and outbound-domain tests completed.
- Public Passport redaction tested against ticket and EXIF leakage.
- Account takeover, invite abuse, and link-revocation flows tested.
- Accessibility audit completed in all launch languages.
- Incident response has an owner, severity system, user communication template, and rollback path.
- Every launch claim can be supported without the word “guarantee.”

## 12. Interface-system audit · 2026-08-22

### Failure patterns removed

- repeated large-radius cards that gave unrelated content equal importance;
- forced dark mode, purple glow, and rounded display typography that read as a generic AI dashboard;
- numbered/sidebar navigation that consumed attention without helping ticket tasks;
- marketing-style headlines without a corresponding next action;
- raw English strings inside localized routes;
- a tablet breakpoint where desktop navigation disappeared before mobile navigation appeared.

### Current design gates

- The next critical action must be identifiable before scrolling.
- Every collection chooses one native structure: table, ledger, ordered rail, or map/result pair.
- Light and dark themes share semantic hierarchy and state meaning.
- English, Simplified Chinese, and Traditional Chinese must render from controlled catalogs.
- Artist accents cannot override operational status colors.
- Decorative stamp geometry is allowed only in Passport; ticket execution screens remain restrained.
- A screen must remain usable without glow, shadows, imagery, motion, or color alone.
- Desktop, tablet, and 390 px mobile layouts must retain primary navigation and avoid horizontal overflow.
