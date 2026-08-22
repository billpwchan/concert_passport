# Roadmap and Todo

**Program status:** Gate 0 accepted; cross-platform vertical slice delivered for pilot preparation
**Program objective:** Prove and launch a trusted Asia-Pacific Concert Journey OS with a top-tier native iOS experience and a web companion.

## 1. Goal hierarchy

### Vision

Every live-music fan can confidently get from “I want to see them” to “I was there,” anywhere in the region, and keep that story for life.

### 12-month product goal

Launch in at least two validated Asia-Pacific markets with:

- dependable coverage of the complete ticket lifecycle for a deliberately scoped artist/catalog cohort;
- a native iOS product and production web/admin companion;
- measurable protection of critical milestones;
- a Passport users actively complete and share;
- evidence that a consumer subscription can cover data and support operations.

This is a goal proposal, not a delivery-date commitment. External data agreements and legal review can dominate elapsed time.

### North star

**Monthly Protected Journeys (MPJ):** journeys with at least one verified, actively covered critical milestone that the user acknowledges or completes in the month.

### Quality bar

- Critical milestone correctness ≥ 99% within the supported catalog.
- No unresolved ambiguity in event-local time for a protected milestone.
- Notification jobs idempotent, versioned, and auditable.
- Public shares structurally incapable of including ticket secrets or exact private travel.
- Core flows meet accessibility and localization acceptance criteria.

## 2. Delivery strategy

Do not build every surface at once. The order is:

```text
Direction
  → User/data validation
    → Interaction prototype
      → Concierge pilot
        → Product foundation
          → Closed beta
            → Paid launch
              → Partnerships and expansion
```

## 3. Gate 0 — Direction confirmation

**Outcome:** Confirm what company/product is being built before visual production or engineering.

### Todo

- [x] Define product category and wedge.
- [x] Define core user and jobs.
- [x] Define lifecycle and trust model.
- [x] Define initial information architecture.
- [x] Define iOS/web platform roles.
- [x] Define initial commercialization.
- [x] Define design territory.
- [x] Red-team data, ticketing, safety, legal, and unit-economics risks.
- [x] Owner confirmed the recommended direction and ticketing boundary.
- [ ] Choose interview/pilot recruitment access and target cohort.
- [x] Prioritize cross-border K-pop superfans; J-pop coverage is out of scope for now.

### Exit criteria

- Written confirmation of wedge, platform sequence, purchase boundary, launch markets, audience focus, and aesthetic direction.

## 4. Phase 1 — Discovery and feasibility

**Indicative effort:** 2–4 weeks
**Outcome:** Validate pain, willingness to pay, and source feasibility before a production build.

### User research

- [ ] Recruit 15–20 high-intent fans across the first-market cohort.
- [ ] Include people who traveled for concerts and people who missed a critical window.
- [ ] Conduct artifact-based interviews using real screenshots, calendars, notes, and group chats.
- [ ] Map each participant’s last complete journey from first signal to attendance.
- [ ] Run a two-week diary study for at least 8 participants in an active ticket cycle.
- [ ] Test annual price anchors at localized US$29/39/49 equivalents.
- [ ] Document accessibility, language, and international-card/phone pain points.

### Market/data feasibility

- [x] Create a source registry for Singapore and Hong Kong, expanded to 11 APAC K-pop markets.
- [ ] Shadow 20 priority artists and at least 100 performances.
- [ ] Capture announce, registration, presale, general-sale, change, and show-day fields.
- [ ] Measure source availability, rights, structure, change frequency, and latency.
- [ ] Apply for/test permitted Ticketmaster discovery access.
- [ ] Evaluate PredictHQ or alternatives against real anchor-market recall and milestone depth.
- [ ] Open commercial conversations with event/setlist providers where needed.
- [ ] Get counsel review of API terms, user-forwarded ingestion, source snapshots, asset use, affiliate links, and jurisdictional privacy.
- [ ] Track automatic quarantine rate and median recovery time per 100 critical milestones.

### Product validation

- [ ] Test low-fidelity Today, Journey, Atlas, and Passport prototypes.
- [ ] Simulate a real ticket-day countdown with changing source data.
- [ ] Test whether users understand verified, estimated, changed, and unverified states.
- [ ] Test a Concert Journey without a Passport to isolate utility value.
- [ ] Test Passport import and sharing without future planning to isolate memory value.

### Exit criteria

- At least 60% can create a protected journey in the prototype without facilitation.
- At least 40% select multiple cities/markets.
- At least 10% show credible paid intent at US$39/year equivalent.
- A lawful source/operation plan can cover the first two markets.
- No critical lifecycle concept repeatedly confuses the cohort.

## 5. Phase 2 — Concierge pilot and design system

**Indicative effort:** 3–5 weeks, overlapping late Phase 1
**Outcome:** Operate the promise manually before automating it.

### Concierge product

- [ ] Enroll 30 pilot users.
- [ ] Let users select priority artists, cities, and one active journey.
- [ ] Maintain at least 200 critical milestones through an internal source ledger.
- [ ] Send controlled, auditable reminders through agreed channels.
- [ ] Record acknowledgement, completion, correction, and outcome.
- [ ] Produce a manual Passport recap for attended events.
- [ ] Interview users immediately after a real registration/on-sale event.

### Design

- [ ] Complete brand-territory and naming exploration.
- [ ] Run domain, app-store, social-handle, and preliminary trademark screening.
- [ ] Build monochrome interaction wireframes.
- [ ] Produce high-fidelity Today, Journey, Atlas, and Passport flows.
- [ ] Prototype lifecycle change and ticket-day Live Activity behavior.
- [ ] Establish tokens for color, typography, spacing, shape, motion, haptics, and charts.
- [ ] Design English, Traditional Chinese, and Simplified Chinese variants from the same components.
- [ ] Prepare Japanese and Korean localization/content requirements before either market becomes public.
- [ ] Test VoiceOver, Dynamic Type, reduced motion, contrast, and low-connectivity states.
- [ ] Create redacted share-card and Passport public-page schemas.

### Exit criteria

- Pilot meets the data-quality kill criteria in the Red-Team document.
- Users identify the next action in Today and Journey in under five seconds.
- No critical usability issue remains in ticket-day simulation.
- Visual direction is distinct from reference products and approved.

## 6. Phase 3 — MVP engineering foundation

**Indicative effort:** 8–12 weeks for a focused experienced team after validated design
**Outcome:** A secure, testable closed-beta product with production data operations.

### Repository and delivery foundation

- [x] Initialize Git and contribution rules; remote branch protections remain a repository-host setting.
- [x] Establish monorepo/workspace boundaries for iOS, web, API, shared contracts, and docs.
- [ ] Configure CI for formatting, lint, type checking, unit, integration, contract, and security tests.
- [ ] Configure separate local, preview, staging, and production environments.
- [ ] Establish secret management, dependency update, backup, restore, and incident procedures.
- [ ] Add architecture decision records and schema migration policy.

### Backend/domain

- [ ] Implement artist, alias, tour, performance, venue, and provider entities.
- [ ] Implement sale program, milestone, prerequisite, and change event.
- [ ] Implement field-level provenance and source evidence.
- [ ] Implement user plans and milestone state.
- [ ] Implement notification rule, versioned schedule, delivery audit, and acknowledgement.
- [ ] Implement attendance, travel segment, stamp, memory, and stats.
- [ ] Implement squad, invite, role, and task with privacy boundaries.
- [ ] Implement verified outbound-domain registry.
- [ ] Publish an OpenAPI contract and generate typed client models.
- [ ] Add data export and deletion workflows.

### Ingestion and operations

- [x] Build adapter interface with source-specific configuration and transparent health states.
- [ ] Build first official/licensed provider adapters.
- [x] Build authenticated official-URL submission persistence; text/image intake remains later.
- [ ] Add OCR/extraction as suggestions, never automatic authoritative facts.
- [ ] Implement alias resolution and duplicate review.
- [ ] Implement conflicting-source and material-change review.
- [ ] Build admin dashboards for missing critical data and upcoming risks.
- [ ] Add reviewer audit, four-eyes approval, and correction SLA tracking.
- [ ] Add asset-rights metadata and removal/expiry support.

### Notification reliability

- [ ] Implement APNs device registration and preference categories.
- [ ] Implement idempotent deterministic delivery IDs.
- [ ] Reschedule/cancel notifications on milestone version change.
- [ ] Implement email fallback for opted-in critical milestones.
- [ ] Implement Calendar export without requesting unnecessary read access.
- [ ] Build alert coverage and infrastructure health surfaces.
- [ ] Add retry, dead-letter, replay, and incident tooling.
- [ ] Test home/venue zones, DST transitions, ambiguous local times, and date-line crossings.

### iOS

- [ ] Sign in and privacy-aware onboarding.
- [ ] Artist/city selection and search.
- [x] Today command center vertical slice.
- [x] Journey lifecycle rail and official-source handoff vertical slice.
- [x] Plans list and journey status.
- [x] Atlas MapKit map/list and market filters.
- [x] Passport stamps, relationship memory, and statistics foundation.
- [ ] Manual attendance and historical entry.
- [ ] Verified outbound seller handoff.
- [ ] Widgets, App Intents, and user-initiated Live Activity.
- [ ] Share-sheet event/milestone submission.
- [ ] Deep links and universal links.
- [ ] Offline read state for current plans and ticket-day checklist.
- [ ] VoiceOver, Dynamic Type, reduced motion, localization, and haptic review.

### Web

- [ ] Authentication and account settings.
- [x] Responsive Today, Plans, Journey, Atlas, Passport, and Sources vertical slice.
- [ ] Bulk historical entry/import.
- [ ] Privacy-safe public Passport share page.
- [ ] Internal admin and support console.
- [ ] Marketing site, policy pages, deletion/export entry, and status page.
- [ ] Keyboard navigation, focus order, screen-reader, and WCAG review.

### Security and privacy

- [ ] Data classification and retention policy.
- [ ] Threat model for account, squads, imports, sharing, outbound links, and admin.
- [ ] Encryption plan for sensitive user notes/identifiers.
- [ ] Session/device management and invite-link revocation.
- [ ] EXIF stripping and upload malware/content-type validation.
- [ ] Authorization tests for every user/squad/admin boundary.
- [ ] Abuse rate limits and reporting.
- [ ] Dependency, static, dynamic, and penetration testing proportional to launch risk.

### Exit criteria

- All P0 lifecycle and alert acceptance tests pass.
- Operational console can resolve every critical data failure without direct DB edits.
- Backup restore and notification-reschedule drills pass.
- Privacy, security, accessibility, and legal launch reviews have no unresolved blockers.

## 7. Phase 4 — Closed beta

**Indicative effort:** 4–6 weeks
**Outcome:** Prove reliability and retention under real concert cycles.

### Todo

- [ ] Invite 100–300 users in Singapore and Hong Kong.
- [ ] Cap the supported catalog and publish coverage expectations.
- [ ] Instrument time to first protected journey, MPJ, corrections, latency, alert outcomes, and support cost.
- [ ] Run at least three high-demand ticket-day sessions.
- [ ] Conduct weekly data-quality and incident review.
- [ ] Test Passport history import and share loop.
- [ ] Test Plus packaging without blocking basic archive access.
- [ ] Test App Store metadata, privacy labels, notification copy, and subscription disclosures.
- [ ] Establish public correction, status, and incident communication.

### Exit criteria

- Critical correctness and omission gates met.
- D30 retention target is set from cohort behavior and met by at least one qualified cohort.
- Paid conversion intent translates into real trial/annual starts.
- Support cost and data operation are consistent with viable gross margin.
- No severity-one privacy, safety, ticket-link, or alert incident remains open.

## 8. Phase 5 — Commercial launch

### Todo

- [ ] Launch free + Passport Plus plans with localized pricing.
- [ ] Publish data coverage, ranking, affiliate, privacy, and correction principles.
- [ ] Add annual recap and privacy-safe acquisition loop.
- [ ] Establish customer support and on-call coverage around major sale windows.
- [ ] Negotiate authorized ticket affiliate/distribution relationships.
- [ ] Pilot one printed Passport artifact through preorder/partner fulfillment.
- [ ] Add promoters/venues to a waitlisted verified publisher program.
- [ ] Expand market-by-market only after local source and policy gates pass.

## 9. Phase 6 — Expansion options

These are independent bets and should not be bundled into the MVP:

### Authorized commerce

- Partner inventory, in-app reservation/purchase, order management, refunds, and support.
- Separate financial, legal, PCI, fraud, and operations program.

### Travel intelligence

- Calendar/trip import, flight/hotel comparisons, journey cost, conflict detection, and disclosed affiliates.
- Do not sell restricted ticket+travel bundles without explicit permission.

### B2B verified publishing

- Promoter/venue/artist date and milestone publishing.
- Fan demand by city, conversion attribution, and correction workflows.
- Clear separation between factual product truth and paid campaign tools.

### Physical Passport

- Annual books, city/tour maps, posters, and collectible inserts using rights-cleared content.
- Preorder and partner fulfillment before holding inventory.

### Android

- Begin only after iOS product-market fit and notification/data operations are stable.

## 10. Priority backlog

### P0 — product promise

- Complete lifecycle semantics.
- Source provenance and changes.
- Time-zone correctness.
- Today next action.
- Plans and completion state.
- Reliable alert scheduling and audit.
- Official outbound seller verification.
- Admin correction workflow.
- Attendance and basic Passport.
- Privacy-safe sharing/export/deletion.

### P1 — product differentiation

- Multi-city compare.
- Trip-window Atlas.
- Squad coordination.
- Historical import.
- Widgets/Live Activity.
- Rich artist Passport timelines.
- Advanced statistics and annual recap.
- Subscription packaging.

### P2 — scale and monetization

- Streaming/email/calendar imports.
- Publisher portal.
- Travel affiliate integration.
- Official resale/waitlist integration.
- Physical products.
- Authorized commerce.
- Android.

## 11. First implementation sprint after approval

The first sprint should still be a validation sprint, not a production UI sprint:

1. [x] Initialize the repository and decision records.
2. [x] Define the canonical lifecycle schema and clearly illustrative sample data.
3. [x] Build a source-registry, adapter boundary, and submission prototype.
4. [x] Create high-fidelity Today/Journey/Atlas/Passport flows for web and iOS.
5. Recruit the first research cohort.
6. Test the source model against Singapore and Hong Kong cases.
7. Produce an evidence-backed build/no-build review.

## 12. Owner decisions required now

Recommended defaults are in bold.

1. Audience focus: **cross-border K-pop superfans first; J-pop is out of scope for now**.
2. Launch geography: **Singapore + Hong Kong public cohort; shadow Japan, South Korea, Taiwan, and Thailand**.
3. Platform: **native iOS primary + responsive web companion/admin**.
4. Ticketing: **verified official handoff only in V1; no unofficial resale or automation**.
5. Brand: **premium and inclusive “precision × devotion × memory,” with Concert Passport as codename**.
6. Business: **free basic utility/archive + US$39–49/year Plus hypothesis + disclosed authorized affiliates later**.

All six directions were accepted on 2026-08-22. Future changes should be recorded as explicit product decisions.
