# Product Blueprint

**Working title:** Concert Passport
**Document status:** Direction proposal
**Date:** 2026-08-22
**Initial geography:** Asia-Pacific
**Initial platforms:** Native iOS + responsive web companion

## 1. Executive thesis

Concert Passport should be the trusted operating system for the entire concert journey:

1. Know what is happening across the regions a fan is willing to travel to.
2. Turn a show into an actionable, multi-step plan.
3. Protect every critical registration, lottery, presale, payment, and entry deadline.
4. Coordinate ticket-day and travel responsibilities with friends.
5. Preserve the resulting memories as a beautiful personal passport.

The central product object is not an event card. It is a **Concert Journey** with a changing lifecycle, evidence, responsibilities, and an eventual memory.

The experience should feel like a precision travel instrument before the show and a treasured archive after it.

## 2. Problem definition

For an Asia-Pacific fan, “tickets go on sale Friday” is rarely enough information. A single show can involve:

- fan-club membership purchase;
- membership verification or a city-specific preregistration window;
- a lottery application and result date;
- a payment deadline after winning;
- cardholder, promoter, venue, artist, or platform presales;
- a waiting-room opening time distinct from the sale time;
- ticket limits, identity requirements, phone-number requirements, or pickup rules;
- different local time zones and languages;
- schedule changes, additional dates, ticket releases, transfers, and official resale;
- flights, hotels, companions, and a fixed travel budget.

The current coping stack is fragmented across social media, screenshots, chat groups, calendars, notes, spreadsheets, ticket apps, and memory. A missed prerequisite can make every later alert useless.

## 3. Positioning

### Category

**Concert Journey OS** — a planning, deadline-protection, travel-discovery, and memory platform for live-music fans.

### Positioning statement

For fans who plan their lives and travel around live music, Concert Passport is the one trusted place that turns fragmented announcements into a verified action timeline, coordinates the journey across cities and friends, and records a lifetime of shows on a personal world map.

### The wedge

The defensible wedge is not “more concerts.” It is:

- lifecycle-level ticketing data rather than a single on-sale timestamp;
- cross-border and multi-city planning rather than a home-city radius;
- field-level source provenance and change history;
- an action system that knows what the fan has completed;
- a passport that turns utility into identity, retention, and sharing.

## 4. Target users

### Primary: the cross-border superfan

- Tracks roughly 5–30 priority artists.
- Attends at least 3 shows per year or travels for at least one show.
- Will consider several Asia-Pacific cities for the same tour.
- Maintains memberships, presale codes, calendars, screenshots, and group chats.
- Has high cost-of-failure: missing one window can waste memberships, flights, or months of planning.

### Secondary: the travel opportunist

- Already has a trip or flexible travel window.
- Wants to see relevant shows available in that city and period.
- Needs a quick answer to “what is on while I am there?”

### Collaborative: the ticket squad

- Two to six friends coordinate dates, quantities, payment methods, devices, and backup cities.
- Needs explicit responsibility and status, not another noisy chat thread.

### Later: promoters, venues, and fan-club operators

- Need a verified publishing channel, demand visibility, and attributable fan conversion.
- This is a later B2B surface, not an MVP dependency.

## 5. Jobs to be done

1. **Protect me:** When a tour is announced, show every prerequisite and deadline early enough that I do not lose my chance.
2. **Help me choose:** When a tour has several cities, compare timing, ticket paths, travel friction, and conflicts.
3. **Fit concerts into travel:** When I am planning or taking a trip, show relevant performances within that place and date range.
4. **Coordinate us:** When friends are trying together, make the owner, quantity, status, and fallback for every task obvious.
5. **Get me to the right seller:** When a window opens, take me to a verified official destination with the correct context.
6. **Remember it:** After attendance, turn the show into a permanent stamp, route, statistic, and story.

## 6. Product principles

1. **The next action wins.** The most time-sensitive user action is always clearer than general discovery content.
2. **Local time is a fact, not decoration.** Store UTC plus the event’s IANA time zone; show venue time and optionally home time.
3. **Every critical claim has evidence.** Show source, last verified time, confidence, and change history.
4. **No false certainty.** Unknown, estimated, rumored, announced, verified, changed, and cancelled are distinct states.
5. **Utility earns emotion.** Precision before ticket day gives the Passport emotional legitimacy afterward.
6. **Calm urgency.** Use hierarchy and countdowns, not casino mechanics or manipulative panic.
7. **Private by default.** Exact travel, ticket, membership, and location information is never public by default.
8. **Official paths first.** Ranking and alerts must not steer users toward unsafe or unauthorized sellers.
9. **The archive belongs to the fan.** Past attendance, memories, and export cannot be held hostage by a subscription.
10. **Asia-Pacific is not one market.** Ticket semantics, language, identity, currency, and resale rules are jurisdiction-specific.

## 7. The concert lifecycle

The lifecycle engine is the core domain capability.

| Stage | Example milestone | User action | Typical risk |
|---|---|---|---|
| Signal | Rumor or tour teaser | Watch artist/tour | False or incomplete information |
| Announcement | City/date announced | Add a plan or compare cities | Date and venue may still change |
| Eligibility | Buy or renew membership | Confirm eligibility | Membership cutoff precedes registration |
| Registration | Apply for artist/fan presale | Register for a specific city | Registration does not guarantee access |
| Lottery | Submit application | Choose show/seat class | Result and payment are separate deadlines |
| Result | Lottery outcome posted | Check outcome | Notification may be platform-only |
| Payment | Winner payment deadline | Pay via official platform | Winning ticket can lapse |
| Presale | Card/fan/promoter presale | Join waiting room and purchase | Unique codes, limits, and prerequisites |
| General sale | Public on-sale | Join official queue | High concurrency and bot protection |
| Fulfillment | Ticket delivery or pickup | Configure app/ID/phone | Country-specific identity constraints |
| Travel | Flight, hotel, companion plan | Confirm itinerary | Cancellation and cross-city conflicts |
| Show day | Doors, entry, start | Navigate and check in | Door and show times differ |
| Memory | Attendance confirmation | Add photos, notes, setlist | Ticket codes and exact location can leak |

Each milestone must support:

- type, title, description, start, end, and all-day semantics;
- event-local time zone and normalized UTC timestamps;
- eligibility/prerequisite rules;
- official URL and canonical source identity;
- verification tier, confidence, and last-checked time;
- immutable change history;
- user state: not needed, to do, in progress, completed, failed, expired;
- responsible squad member;
- notification policy and acknowledgement state.

## 8. Information architecture

### iOS navigation

1. **Today** — command center for the next actions, changes, and countdowns.
2. **Atlas** — date-aware map and list for region, city, tour, and trip-window exploration.
3. **Plans** — saved Concert Journeys, comparisons, ticket squads, and travel status.
4. **Passport** — attendance map, stamps, routes, artist timelines, statistics, and recaps.

Global artist/event search is available from every top-level surface. Settings and the user profile remain secondary.

### Web companion

- The same core read/write model with more room for calendar, map, and multi-city comparison.
- Fast bulk editing and historical import.
- Public, privacy-safe shared Passport pages.
- An internal verification and support console.
- A public marketing and SEO surface for permitted event pages.

The web companion is not required to reproduce iOS-only capabilities such as Live Activities, haptics, widgets, or Apple Calendar integration.

## 9. Core experiences

### 9.1 Onboarding

Target: reach a useful plan in under 90 seconds.

1. Pick priority artists manually; music-service import is optional and requested later.
2. Choose home city and cities/regions the fan is willing to visit.
3. Set travel tolerance and preferred languages.
4. Preview real upcoming journeys.
5. Ask for notification permission only after the user chooses a critical alert.
6. Ask for Calendar access only when the user actively exports or syncs.

### 9.2 Today / Command Center

The first viewport answers:

- What do I need to do next?
- How long do I have?
- What changed since I last looked?
- Is the information official and current?

Content order:

1. Critical next action.
2. Acknowledgement or completion control.
3. Material changes.
4. Upcoming journeys.
5. Relevant discovery, clearly separated from required actions.

### 9.3 Concert Journey

The canonical plan screen contains:

- event/tour identity, city, venue, and performance time;
- a prominent next-action block;
- a vertical lifecycle timeline;
- eligibility and ticket-path choices;
- source ledger and change log;
- official seller button with verified-domain treatment;
- squad responsibilities;
- travel summary and conflicts;
- attendance and memory section after the show.

### 9.4 Atlas

Atlas supports two modes:

- **Artist mode:** compare every relevant city/date on a tour.
- **Trip mode:** enter a city or trip window and see relevant shows nearby.

It combines a map, a time scrubber, and a synchronized result sheet. Sponsored inventory, if ever introduced, must never silently change relevance ranking.

### 9.5 Ticket-day mode

At the configured waiting-room time, a focused surface presents:

- verified official purchase link;
- sale-local and home-local times;
- eligibility status;
- quantity/ticket-limit reminder;
- access-code hint without exposing the full secret on the lock screen;
- assigned squad member and fallback city;
- a user-started Live Activity where platform policy permits.

It does not refresh queues, bypass bot controls, automate login, store payment cards, or place orders.

### 9.6 Passport

Every attendance can produce:

- a city/venue/date stamp;
- a route on the world map;
- shows, artists, cities, countries, venues, distance, and time statistics;
- “first seen live” and anniversary moments;
- artist-specific timelines;
- yearly recaps and privacy-safe share cards;
- optional photos, notes, companions, seat/section, and setlist links.

Preferred copy is “第一次在现场见到 RIIZE” rather than language that falsely implies a personal relationship. Poetic lines such as “一起走过 12,480 km” can be used as fan-facing narrative when the metric is clearly explained.

Distance must be labeled as either:

- **journey distance** from imported/entered travel segments; or
- **estimated concert distance** calculated consistently between declared points.

### 9.7 Squad

The squad is a lightweight coordination layer, not a social network:

- invite link and named roles;
- task owner and completion state;
- desired quantities and fallback city/date;
- private notes;
- status updates without revealing payment credentials or full ticket codes;
- activity log for accountability.

Public follower counts, open DMs, and engagement feeds are deliberately excluded from early versions.

## 10. MVP scope

### Must have

- account, profile, privacy controls, and Sign in with Apple;
- artist following and multi-region preferences;
- normalized artist/tour/performance/venue catalog;
- lifecycle milestones with provenance and changes;
- Today command center;
- plan creation and milestone completion;
- push, in-app, and calendar-export reminders;
- Atlas date/city/artist exploration;
- verified official outbound ticket links;
- attendance logging, stamps, map, and core statistics;
- manual link/screenshot/event submission with review;
- internal data verification and support console;
- English, Traditional Chinese, and Simplified Chinese product foundations;
- accessible layouts, Dynamic Type, VoiceOver, keyboard navigation, and reduced motion.

### Should have during beta

- tour city comparison;
- dual-time-zone display;
- squad tasks and invites;
- historical concert import via CSV and manual entry;
- widgets and ticket-day Live Activity;
- privacy-safe Passport share cards;
- email alert fallback;
- cancellation/reschedule flows.

### Explicitly later

- streaming-service artist import;
- email/calendar read import;
- hotel and flight affiliate integrations;
- official promoter/venue publishing portal;
- official fan-to-fan resale links;
- authorized in-app ticket transactions;
- printed Passport books, posters, and collectible products;
- Android client.

### Explicitly out of scope

- ticket bots or automated queue interaction;
- CAPTCHA bypass, multi-account purchasing, or stored ticketing passwords;
- unofficial resale marketplace;
- guarantees that an alert or external seller will result in a ticket;
- public display of barcodes, presale codes, ticket PDFs, exact live location, or passport/ID data;
- unlicensed commercial reuse of artist photos, logos, poster art, or setlists.

## 11. Trust and data model

### Core entities

- `Artist`
- `Tour`
- `Performance`
- `Venue`
- `TicketProvider`
- `SaleProgram`
- `Milestone`
- `Prerequisite`
- `SourceEvidence`
- `ChangeEvent`
- `UserPlan`
- `PlanMilestoneState`
- `Squad` and `SquadTask`
- `TicketOutcome` without payment credentials
- `TravelSegment`
- `Attendance`
- `Stamp`
- `Memory`
- `NotificationRule` and `NotificationDelivery`

### Source hierarchy

1. Official ticket seller or promoter feed/page.
2. Artist, agency, fan-club, or tour official channel.
3. Official venue or local promoter.
4. Contracted event-data provider.
5. Trusted aggregator.
6. Reviewed community submission.
7. Unverified user note or rumor.

Authority is field-specific. An artist may be authoritative for the tour announcement while the ticket seller is authoritative for queue and purchase rules.

### Data-quality rules

- Preserve the raw source snapshot or evidence reference where rights permit.
- Store provenance per field, not only per record.
- Never silently overwrite a critical timestamp.
- Generate an immutable change event and reassess scheduled alerts on every critical change.
- Require a second confirmation for contradictory high-impact information.
- Show users when a value is estimated or awaiting verification.
- Build duplicate detection across localized artist names, venues, cities, and platform IDs.

## 12. Notification policy

Default critical sequence, configurable per milestone:

- registration or lottery opens;
- 24 hours before closing;
- 2 hours before closing if not acknowledged;
- waiting room opens;
- 10 minutes before on-sale;
- on-sale now;
- result announced;
- payment deadline reminders;
- material schedule, venue, or eligibility change.

Principles:

- A notification is not considered success merely because APNs accepted it.
- The product records delivery when available, app open, acknowledgement, and completion separately.
- Critical actions can have push + calendar + optional email redundancy.
- Quiet hours are respected except for user-designated time-sensitive milestones where platform policy permits.
- Full access codes or sensitive membership identifiers never appear in notification content.
- Discovery and marketing notifications are off by default or separately consented; they never masquerade as critical alerts.

## 13. Business model

### Free

- follow artists and regions;
- basic event discovery and standard alerts;
- create a limited number of active Concert Journeys;
- keep an unlimited personal attendance archive;
- core Passport map and statistics;
- official ticket links.

### Passport Plus subscription

Initial pricing hypothesis to test, not a commitment: **US$39–49/year**, localized by market.

- unlimited active journeys and regions;
- full milestone alert engine and acknowledgement escalation;
- multi-city tour comparison and trip-window mode;
- squad coordination;
- calendar sync, imports, advanced statistics, and rich recaps;
- widgets, Live Activities, and custom Passport presentation;
- priority data correction/support.

Core memory export and basic attendance history remain available without an active subscription.

### Additional revenue

- disclosed affiliate commission from authorized ticket and travel partners;
- premium printed Passport books, maps, posters, and annual editions;
- later B2B verified publishing, demand insights, and campaign attribution;
- later authorized ticket distribution partnership.

### Commercial principles

- No display advertising in the initial product.
- Paid placements never alter factual deadlines or masquerade as personal relevance.
- Affiliate status is disclosed before outbound purchase.
- Subscription revenue should fund data quality and alert reliability, not merely cosmetic themes.

## 14. Metrics

### North star

**Monthly Protected Journeys (MPJ):** unique Concert Journeys in which the user has at least one upcoming critical milestone that is verified, covered by an active alert, and acknowledged or completed during the month.

This measures the recurring utility better than raw monthly active users or notification volume.

### Leading indicators

- time to first protected journey;
- percentage of new users who follow 3+ artists and 2+ cities;
- critical milestones with authoritative sources;
- critical milestone correction rate;
- median source-to-user change latency;
- alert acknowledgement and task completion rates;
- journey-to-ticket-confirmed conversion, user reported;
- trip-window searches that create a plan;
- Passport completion and share rate;
- squad invitation acceptance;
- D7, D30, and next-tour retention.

### Business indicators

- Plus trial start and paid conversion;
- annual renewal;
- revenue per protected journey;
- licensed-data and support cost per active paying user;
- authorized outbound purchase click-through and affiliate yield;
- printed product attach rate.

### Guardrails

- missed or incorrect critical deadlines;
- duplicate/false event rate;
- notification opt-out and spam reports;
- unsafe or unauthorized seller reports;
- privacy/security incidents;
- correction response time;
- sponsored-ranking complaints.

## 15. Technical frame

### Recommended shape

- **iOS:** SwiftUI native app, widgets, App Intents, ActivityKit, MapKit, EventKit, APNs.
- **Web:** TypeScript and a modern React framework for the companion, public sharing, and admin console.
- **API:** TypeScript modular monolith with explicit domain modules and an OpenAPI contract.
- **Data:** managed PostgreSQL + PostGIS; object storage for permitted evidence and user media.
- **Jobs:** durable, idempotent job queue for ingestion, change detection, notification scheduling, and retries.
- **Search:** PostgreSQL full-text/entity aliases first; dedicated search only after measured need.
- **Observability:** structured logs, traces, crash/error reporting, data-quality dashboards, and notification audit trails.

### Service boundaries

```text
Official/licensed sources      User submissions/imports
           |                           |
           +------ Ingestion adapters -+
                          |
              Normalize / resolve / dedupe
                          |
          Catalog + provenance + change ledger
                          |
        +-----------------+-------------------+
        |                 |                   |
  Journey engine     Alert scheduler     Passport/stats
        |                 |                   |
        +----------- Product API -------------+
                    /              \
               Native iOS       Web + Admin
```

This begins as a modular monolith so transactions, source corrections, and alert rescheduling remain understandable. Premature microservices would create more failure surfaces than product value.

### Non-negotiable engineering properties

- All critical timestamp writes are auditable and versioned.
- Notification jobs are idempotent and tied to a milestone version.
- Rescheduling a milestone invalidates obsolete jobs.
- Time-zone behavior is covered by property and transition tests.
- Sensitive user fields are encrypted and excluded from analytics.
- Public share objects are generated from an explicit allowlist.
- User data export and account deletion are designed before launch.
- Admin overrides require reason, source, and actor audit data.

## 16. Launch geography

The data model and time-zone system should be region-ready from the start, but operational coverage must expand in explicit tiers.

### Tier 1 public cohort

- Singapore
- Hong Kong

These are the recommended first public markets because they are major cross-border concert destinations, support an English/Traditional-Chinese launch surface, and expose meaningful presale complexity without requiring the company to solve every local ticket-lottery system at once.

### Tier 1 shadow coverage

- Japan
- South Korea
- Taiwan
- Thailand

The company should monitor and operate these markets during the pilot without initially promising comprehensive public coverage. Japan and South Korea require native Japanese/Korean localization plus validated identity, lottery, fulfillment, and platform-app semantics before public launch.

### Tier 2 expansion candidates

- Malaysia, Indonesia, and the Philippines
- Australia and New Zealand
- additional Southeast Asian cities based on observed user journeys

### Separate compliance program

Mainland China should not be treated as a routine market toggle. Public launch there requires a separate review of hosting, cybersecurity, privacy, content, mapping, ticketing relationships, company presence, and app distribution. The global architecture should avoid blocking a later compliant deployment, but the MVP must not claim mainland coverage.

The combined shadow set captures materially different ticket flows: first-come sales, fan/member presales, lotteries, platform identity requirements, and cross-border travel.

## 17. Decision gate

Implementation should begin only after confirming:

1. The initial wedge is deadline protection and cross-border planning.
2. iOS is the primary client and web is a companion/admin/public surface.
3. V1 uses official outbound purchase only.
4. The recommended launch markets are acceptable.
5. The brand direction is premium, inclusive, calm, and emotionally warm rather than fandom-specific or visually childish.
6. A concierge data-quality pilot precedes a public launch.
