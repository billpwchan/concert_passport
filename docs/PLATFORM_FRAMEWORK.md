# Platform Framework

## Product contract

Concert Passport is a private K-pop planning network. It combines official event discovery, ticket-window planning, saved shows, artist follows, travel context, and a long-term attendance archive. Operational concepts such as connector credentials, source tiers, internal confidence scoring, or review queues never appear as consumer navigation or marketing copy.

The public product has seven domains:

1. **Identity** — accounts, sessions, recovery, privacy, export, and deletion.
2. **Discovery** — artist and market search across normalized providers.
3. **Catalog** — canonical artists, performances, venues, cities, and official links.
4. **Library** — saved shows, followed artists, and user preferences.
5. **Planning** — ticket milestones, personal state, reminders, and travel context.
6. **Passport** — private attendance history and user-controlled sharing.
7. **Operations** — ingestion, entity resolution, corrections, source health, and audit.

## Consumer task architecture

The navigation follows the user’s mental sequence rather than the backend domain model:

1. **Today** answers “what is next?” with the closest relevant show and a real, recently refreshed Asia schedule. It does not explain the product with feature illustrations.
2. **Atlas** answers “where can I see this artist?” with one search, one travel window, a functional map, live results, and an exact artist visual even when the answer is currently zero dates.
3. **Plans** answers “what have I decided to watch?” with only user-saved canonical events and direct official/event-detail handoffs.
4. **Passport** answers “where have I already gone?” with private attendance records, route distance, cities, and stamps.

Sources is operational transparency, not a core consumer task. It remains reachable as a utility link and from provider attribution, but it is no longer a primary mobile destination. Account and language/theme controls remain global utilities.

### Page content contract

| Surface | Primary question | Must contain | Must not contain |
|---|---|---|---|
| Today | What is worth acting on next? | The next saved or published show, real entity media, a short live schedule, direct next actions | Feature diagrams, platform explanations, fake counters |
| Atlas | Where can I see this artist? | Artist search, market, explicit one-year window, functional map, comparable results, follow/save actions | Source taxonomy, speculative ticket links, decorative maps |
| Event | Is this the right show and where do I go next? | Artist, show, venue-local date, city/venue, data provider, the best available official handoff | Internal match language, unsupported sale claims |
| Plans | What have I chosen to watch? | User-saved canonical shows and current event/official links | General discovery feed, promotional modules |
| Passport | What have I already experienced? | Private attendance record, cities, artists, distance, entry form | Future plans, public-by-default sharing, generic travel artwork |
| Sources | Which sites are monitored? | Live connector status, real logos, markets, coverage, official-link submission | Tier badges, credential status, primary-navigation prominence |
| Account | How do I keep my data? | Sign-up/sign-in or account state, concise benefits, session-safe actions | Security theatre, infrastructure terminology |

The intended first-session path is:

```text
Today / shared link
        │
        ▼
Atlas artist search ──► exact current artist visual
        │                         │
        ├── no dates ──► follow artist and continue scheduled checks
        │
        └── dates ─────► compare city/date on map and result list
                                  │
                                  ▼
                           save canonical event
                                  │
                                  ▼
                         Plans / official handoff
                                  │
                            after attendance
                                  ▼
                              Passport
```

## Identity and security

The current web implementation includes first-party email/password accounts, salted scrypt password hashes, opaque 256-bit sessions, hashed session tokens at rest, `HttpOnly` cookies, same-origin mutation checks, and authentication rate limits. Anonymous plans can be merged into an account at sign-in.

The following remain public-launch gates rather than simulated features:

- verified email delivery;
- password recovery and credential-change confirmation;
- passkeys or MFA for sensitive account actions;
- user-visible device/session management;
- account export and deletion workflows;
- an explicit privacy policy, processor inventory, and retention schedule.

No ticketing password, payment card, barcode, government ID, or automated purchase credential belongs in this identity domain.

## Event and link model

Every provider result is normalized into a canonical event record. Provider IDs are retained for idempotent refreshes. A consumer can save the canonical record, while later ingestion updates its date, venue, status, and outbound URL without duplicating the plan.

Outbound links carry explicit semantics:

- Ticketmaster event URLs may be presented as official event and purchase pages.
- PredictHQ records open a Concert Passport event detail page and remain explicitly “ticket link pending” until an official event URL is matched; no public seller URL is invented.
- Promoter, fan-platform, and ticketing links require host allowlisting and event-level review before an “official” label.

The platform does not join queues, automate login, bypass bot controls, or buy tickets. Authorized in-app commerce would require a separate distribution, payments, refund, fraud, tax, and regulatory program.

## Refresh and operations

The deployed worker runs separately from the web process. It rotates through a maintained K-pop artist catalog, prioritizes followed artist/market pairs, queries configured adapters, upserts canonical events, and records both whole-run and per-connector outcomes. Source relationships and material event changes are retained for provenance instead of being silently overwritten. A provider failure does not discard successful results from another provider.

The next operations increment is a role-gated console for:

- connector health and request budgets;
- unresolved artist, venue, and event matches;
- conflicting critical dates;
- official-link review and correction history;
- upcoming deadlines without adequate authority;
- notification delivery and incident audit.

## Roles

- **Member** — owns private follows, saved shows, plans, and Passport entries.
- **Operator** — reviews source mappings and corrections without account administration.
- **Administrator** — manages operators, policies, and security incidents.

Role enforcement belongs on the server and every privileged mutation must be auditable. The current release only exposes the member surface; operator and administrator interfaces remain launch work.

## Commercial launch gates

Commercial availability requires declared market coverage, lawful source contracts, field-level provenance for ticket deadlines, notification delivery audits, correction SLAs, privacy controls, accessibility review, customer support, and source/logo trademark review. Until those gates pass, the product should be described as early access, not comprehensive ticket protection.
