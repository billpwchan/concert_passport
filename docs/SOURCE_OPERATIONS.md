# Source Operations

## Coverage thesis

Concert Passport launches as a K-pop product across Singapore, Hong Kong, Japan, Taiwan, Thailand, South Korea, Malaysia, the Philippines, Indonesia, Vietnam, and Australia. Japan is included for K-pop tours; J-pop artist coverage is not part of the initial catalog.

The source graph combines:

1. artist, agency, fan-club, and membership notices;
2. local promoters and venues;
3. official primary ticket sellers;
4. contracted event discovery APIs;
5. reviewed user-submitted official links.

No single provider is treated as complete across these markets.

## Tiers

- **Tier 1:** primary operational source for a market or lifecycle phase.
- **Tier 2:** important supplement or identity/discovery provider.
- **Tier 3:** reviewed fallback; not currently included in the launch registry.

Tier describes operational priority, not blanket authority. The official seller named by an event promoter or artist notice remains authoritative for that event.

## Launch registry

The code registry includes fan platforms, Ticketmaster Discovery, PredictHQ, MusicBrainz, major local ticket sellers, and market-specific Live Nation/promoter properties. Japan coverage includes Ticket PIA, e+, and Lawson Ticket; Malaysia includes GoLive Asia and BookMyShow; Indonesia includes LOKET, tiket.com, and Mecimapro; Vietnam includes Ticketbox.

Registry inclusion permits only normal link verification and explicitly contracted API use. It is not a scraping approval and does not imply a commercial distribution agreement.

## Record acceptance

A protected milestone needs:

- normalized artist, tour, performance, and venue identity;
- the exact local date/time and IANA zone;
- a milestone type and close/open semantic;
- source URL, host, check time, and authority tier;
- official seller identity for any purchase handoff;
- reviewer state when facts conflict or came from an image/community submission.

High-impact conflicts must not auto-resolve. Registration deadlines, lottery results, payment closes, cancellations, and seller changes require second review until a contracted authoritative feed proves reliable.

## Host verification

The allowlist accepts an exact official host or its true subdomain. It rejects suffix lookalikes such as `weverse.io.example.com`. Host verification is necessary but insufficient; review must confirm the exact event page and seller relationship.

## Ingestion states

```text
discovered → parsed → matched → reviewed → published
                      ↘ conflict → second review
published → changed → impact assessment → alert reschedule
```

Machine extraction is a reviewer suggestion. It must not directly publish a critical time.

## Operational targets for the pilot

- ≥99% critical-field correctness within the declared supported catalog;
- median contracted-source change latency under 15 minutes;
- explicit per-market SLA for manually reviewed sources;
- 100% of outbound purchase links on the verified host registry and checked at event level;
- zero silent changes to a published critical timestamp.

If these targets cannot be sustained, narrow the artist/market catalog rather than claiming comprehensive coverage.

## Ticket purchase boundary

V1 may prepare prerequisites, show queue guidance, open the exact official seller by user action, and record an outcome. Automated queue activity, CAPTCHA bypass, login automation, stored payment data, ticket-limit evasion, inventory guarantees, and unofficial resale are prohibited.
