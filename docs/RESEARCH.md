# Research and Evidence

**Research date:** 2026-08-22
**Purpose:** Validate the product gap, derive interaction principles, and identify data/commercial constraints before implementation.

## 1. What the market validates

The broad market is real; the more important question is whether Concert Passport can earn trust in a fragmented workflow.

- Live Nation reported 159 million fans across 55,000 shows in 2025, with growth concentrated in international markets including Asia. Its broader concert and ticketing platforms reached more than 805 million fans in 55 countries. [2025 annual report](https://investors.livenationentertainment.com/sec-filings/annual-reports/content/0001335258-26-000009/lyv-20251231.htm)
- A 2025 Live Nation study reported that 75% of respondents plan their calendars early around shows. Treat this as directional vendor research, not neutral market sizing. [Living for Live summary](https://news.livenationentertainment.com/news/global-report-surveying-40000-people-finds-live-music-is-the-worlds-favorite-form-of-entertainment)
- Singapore’s official Ticketmaster help pages illustrate that a single performance can have artist, card, promoter, membership, and general-sale windows, along with waiting-room timing and ticket limits. [Ticketmaster SG Help](https://help.ticketmaster.sg/hc/en-us)
- Current official tour material shows that registration and eligibility can precede purchase, and that Japan/Asia flows may use lottery applications rather than only first-come sales. [Official HIGE DANdism Asia Tour information](https://event.higedan.com/feature/asiatour2026?lang=en)

The evidence supports the problem statement: the object to manage is a lifecycle, not a single date.

## 2. Competitor map

| Product/category | Strong at | Weak relative to this thesis | Lesson to take, not copy |
|---|---|---|---|
| Flighty | Calm operational clarity, live status, alerts, world map, lifetime Passport | Not a live-music or ticket-lifecycle product | Make stressful information feel obvious; combine utility and retrospective identity |
| Bandsintown | Artist tracking, local discovery, announced/on-sale alerts, broad fan reach | Primarily event/artist notification; limited user-owned multi-step ticket workflow and cross-border journey model | Fast artist import and broad discovery are table stakes |
| Songkick | Multi-location concert tracking and long-running concert database | API terms restrict ordinary access to non-commercial informational use; lifecycle depth remains limited | Multi-location tracking is essential, but data rights cannot be assumed |
| Ticketmaster | Authoritative discovery and, for approved partners, transactions and inventory | Geography/platform fragmentation; the open API is not permission for a competing commercial ticket experience | Integrate by contract and deep link before considering transactions |
| DICE | Fan-first purchase, upfront pricing, secure in-app tickets, waitlist/returns | Operates as the ticketing system for participating events, not a cross-platform fan journey layer | Transparency and official return flows build trust |
| Concert Archives | Past concert logging, statistics, setlists, imports, photos/video | Retrospective value is stronger than deadline protection and cross-border ticket orchestration | Historical import reduces Passport cold start |
| setlist.fm | Crowdsourced setlists and past performance data | Free API is non-commercial only; not an action/deadline system | Setlists are an enrichment partnership, not assumed free data |
| Polarsteps | Beautiful travel map, route capture, travel recaps, printed books | No concert/ticket lifecycle | Memory can monetize through premium presentation and physical artifacts |
| Calendar/Notion/spreadsheets | Flexible personal tracking | Manual updates, no entity resolution, provenance, or automatic change handling | Export/interoperability matters; the product must save more work than setup requires |

### Reference evidence

- Apple describes Flighty as putting key information front and center with an immediately understandable interface, live maps, and familiar airport conventions. [Behind the Design: Flighty](https://developer.apple.com/news/?id=970ncww4)
- Flighty Passport combines lifetime miles, history, map, statistics, and optimized sharing; current Pro positioning charges for alert/import depth while keeping core Passport capabilities available. [Passport](https://flighty.com/passport), [Pricing](https://flighty.com/pricing)
- Bandsintown supports artist and venue following, local discovery, weekly updates, announcement alerts, and on-sale alerts. [Notification settings](https://www.bandsintown.com/notifications), [city discovery help](https://help.bandsintown.com/en/articles/3643330-how-can-i-see-if-an-artist-i-am-following-is-coming-to-my-town)
- Songkick advertises a large upcoming and past concert database, but its published API terms grant ordinary API use for non-commercial informational purposes and require attribution. [Developer portal](https://app.songkick.com/developer), [API terms](https://www.songkick.com/developer/api-terms-of-use)
- Concert Archives supports past/upcoming filtering, Songkick/spreadsheet import, setlist matching, media, statistics, and notification controls. [Product update](https://www.concertarchives.org/backstagepass/our-biggest-update-ever/)
- Polarsteps combines planning, route tracking, maps, statistics, shareable recaps, subscription features, affiliate bookings, and printed travel books. [Product](https://www.polarsteps.com/), [Business model](https://support.polarsteps.com/hc/en-us/articles/29003435822866-Is-Polarsteps-free)
- DICE emphasizes upfront prices, secure in-app tickets, discovery, official return/waitlist flows, and direct promoter/venue relationships. [Fan product](https://dice.fm/bundle/coming-up-in-nashville-xwke), [Partner product](https://dice.fm/partners/ticketing/live?lng=en)

## 3. The whitespace

No referenced product combines all five layers as its primary model:

| Layer | Typical incumbent coverage | Concert Passport opportunity |
|---|---|---|
| Discovery | Strong | Make discovery multi-region and trip-window aware |
| Ticket lifecycle | Partial | Model prerequisites, registration, lotteries, results, payment, presales, queues, and changes |
| Personal operations | Weak | Next actions, acknowledgement, ownership, fallbacks, and audit history |
| Concert travel | Weak | Compare cities and overlay planned travel windows |
| Lifelong memory | Partial | Combine artist relationship, stamps, routes, distance, and recaps |

The differentiated loop is:

```text
Follow artist/region
        ↓
Create protected journey
        ↓
Complete ticket milestones
        ↓
Attend and stamp Passport
        ↓
Share/import history and follow the next tour
```

## 4. Asia-Pacific ticketing complexity

The system must support configuration rather than hard-code a single global funnel.

### Common sale programs

- artist or fan-club presale;
- membership preregistration;
- promoter newsletter presale;
- venue presale;
- bank/cardholder presale;
- travel/loyalty-member presale;
- lottery application and lottery-result phases;
- winner payment windows;
- general sale;
- additional-show or production-hold release;
- official waitlist or fan-to-fan resale where permitted.

### Common constraints

- city-specific preregistration;
- local mobile number or platform-app requirement;
- passport/name/identity matching;
- membership purchase or cutoff date;
- unique URL or access code;
- ticket limits that aggregate across sale phases;
- local-currency payment and card acceptance;
- delayed ticket issuance or convenience-store pickup;
- venue/doors/show times with different meanings;
- transfer or resale restrictions.

Ticketmaster Singapore advises users to join a waiting room before sale, use one device/browser, avoid refreshing, and use the correct presale link. This is exactly the boundary where Concert Passport should prepare and deep-link, not interfere. [Official queue guidance](https://help.ticketmaster.sg/hc/en-us/articles/40800728103697-What-is-the-queue-and-how-do-I-join)

## 5. Data-source feasibility

### Viable source classes

1. **Contracted APIs/feeds** for permitted discovery and event metadata.
2. **Official publisher portal** for artists, venues, promoters, and fan-club operators.
3. **Official pages and structured announcements** ingested only where permission and terms allow.
4. **User-forwarded material** such as an official link can enter the same automated host, identity, date and market validation pipeline; screenshots and reposts are never treated as primary evidence.
5. **Community corrections** with reputation, evidence, and reviewer workflows.
6. **Manual operations** for a deliberately narrow launch catalog.

### Important provider constraints

- Ticketmaster’s Discovery API can search events, attractions, and venues and returns official purchase URLs. Default limits are 5,000 calls/day and 5 requests/second. [Discovery API](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/)
- Ticketmaster’s API terms prohibit using the API to replicate its essential experience, limit storage, require timely removals, and restrict deriving commercial revenue except as permitted. A commercial product needs contract review, not only an API key. [General API terms](https://developer.ticketmaster.com/support/terms-of-use/)
- Ticketmaster’s transaction API is explicitly limited to approved distribution partners. [Partner API](https://developer.ticketmaster.com/products-and-docs/apis/partner/)
- Ticketmaster Partner API country coverage is not equivalent to all Asia-Pacific country sites; current published availability identifies only certain brands/countries. [Availability documentation](https://developer.ticketmaster.com/products-and-docs/apis/partner/availability/)
- PredictHQ offers licensed global event search and concert data, but coverage depends on the paid subscription and should be tested for milestone depth, latency, and target markets. [Events API](https://docs.predicthq.com/api/events/search-events)
- setlist.fm’s published API documentation says free API use is for non-commercial projects and directs commercial users to contact the company. [API documentation](https://api.setlist.fm/docs/1.0/index.html)

### Conclusion

There is no credible “one API solves Asia-Pacific ticket milestones” path. The product requires an adapter architecture, a multi-source identity graph, deterministic automatic verification and measurable failure states. That operating system and source graph can become the moat, but only if the company treats data correctness and recovery as first-class product behavior.

## 6. Ticket-purchase boundary

### Safe and useful V1

- validate the official seller domain;
- show prerequisites, limits, local time, and source;
- open the exact official page/app through a normal user action;
- use disclosed affiliate attribution only when contractually allowed;
- record user-reported outcomes;
- link only to approved official resale/return channels.

### Not acceptable without formal partnership

- monitor or copy protected pages against their terms;
- automate queues or refresh behavior;
- bypass CAPTCHA, waiting rooms, rate limits, or device controls;
- store ticketing passwords or payment cards;
- purchase across multiple accounts or evade ticket limits;
- guarantee availability;
- facilitate unauthorized resale.

Ticketmaster SG explicitly prohibits unauthorized robot/spider monitoring and automated ticket ordering. [Terms of Use](https://ticketmaster.sg/terms-of-use)

### Future authorized transaction path

In-app ticketing is technically possible only after distribution agreements, inventory access, merchant/payment design, refunds, tax, customer support, fraud, and jurisdictional review. Apple treats event tickets as services consumed outside the app, so non-IAP payment methods such as Apple Pay or traditional card entry are the applicable pattern. [App Review Guidelines 3.1.3(e)](https://developer.apple.com/app-store/review/guidelines/)

This is a partnership and operations program, not an MVP engineering feature.

## 7. Safety and legal signals

- The Singapore Police Force reported at least 722 concert-ticket scam cases and at least S$615,000 in losses from January–October 2025, and urged purchase from authorized platforms. [Official advisory](https://www.police.gov.sg/media-hub/news/2025/12/20251215_police_advisory_on_scams_involving_the_sale_of_concert_tickets)
- Singapore’s current policy environment does not remove the need to check event-specific transfer/resale restrictions. Ticketmaster SG’s purchase policy allows restrictions or cancellation when transfer/resale violates law or event-partner terms. [Purchase policy](https://ticketmaster.sg/purchase)
- Japan prohibits for-profit unauthorized resale above the authorized price for specified show/event tickets under defined conditions. [Official English law translation](https://www.japaneselawtranslation.go.jp/en/laws/view/3356/en)
- Artist names, logos, photos, poster art, ticket designs, and setlists carry trademark, copyright, publicity, database, or contractual concerns. A visually rich product still needs licensed assets and rights metadata.

The practical product rule is stronger than a generic legal disclaimer: show official destinations, do not broker unverified inventory, and make source/authorization visible in the interface.

## 8. Apple-platform opportunities and limits

- Live Activities can surface a user-initiated ticket-day countdown and status across the Lock Screen, Dynamic Island, Apple Watch, Mac, and other system surfaces. Apple recommends updates only when the underlying content changes and warns against duplicative alerts. [Live Activities HIG](https://developer.apple.com/design/human-interface-guidelines/live-activities)
- Local notifications can be scheduled by calendar, time interval, or location, but remote changes still require server-side push and rescheduling logic. [Local notifications](https://developer.apple.com/documentation/usernotifications/scheduling-a-notification-locally-from-your-app)
- EventKit supports adding calendar events without broad Calendar access, and write-only access where direct creation is required. Full access should not be requested merely to export reminders. [EventKit access guidance](https://developer.apple.com/documentation/eventkit/accessing-calendar-using-eventkit-and-eventkitui)
- MapKit for SwiftUI supports interactive annotations, overlays, and 3D map presentation suitable for an Atlas/Passport experience. [MapKit for SwiftUI](https://developer.apple.com/documentation/mapkit/mapkit-for-swiftui)

These capabilities justify an iOS-first approach, while the web companion handles bulk planning, sharing, and operations.

## 9. Research still required before public build

Desk research cannot validate willingness to pay or operational accuracy. Run:

1. 15–20 interviews across at least Singapore, Hong Kong, Japan/Korea concert travelers, and Southeast Asian outbound fans.
2. A two-week diary study capturing every tool and handoff used for one active ticket cycle.
3. A concierge pilot covering at least 30 users, 20 artists, 100 performances, and 200 critical milestones.
4. Direct source-completeness tests in each anchor market.
5. Prototype tests for Today, Journey, Atlas, and Passport.
6. Pricing tests at localized equivalents of US$29, US$39, and US$49 annually.
7. Counsel review of source licensing, outbound affiliate use, privacy, notification claims, and resale boundaries.

## 10. Research hypotheses

| Hypothesis | Evidence needed | Failure signal |
|---|---|---|
| Deadline management is more painful than concert discovery | Users show real screenshots/calendars and missed steps | Users only want a discovery feed |
| Fans will track several travel markets | At least half of primary cohort selects 3+ cities | Most users only care about home radius |
| Reliability supports subscription | 15%+ of qualified pilot users accept annual paid intent | Users expect every utility feature to remain free |
| Passport increases retention and sharing | 40%+ import 3 past shows; 20%+ create a share card | Memory entry feels like work and is abandoned |
| Manual operations can bridge data fragmentation | Target critical-milestone completeness is sustainable | Editorial cost or latency overwhelms unit economics |
| Official outbound links are useful enough for V1 | High ticket-day open rate and positive trust feedback | Users demand embedded purchase before adopting |

All numeric thresholds are validation gates, not claimed market facts.
