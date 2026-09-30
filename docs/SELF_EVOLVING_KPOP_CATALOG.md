# Self-Evolving K-pop Catalog

## Goal

Discover new and long-tail K-pop artists without maintaining a finite editorial list, keep aliases and activity state current, and allocate event-provider calls according to real demand and recent evidence.

## Closed-loop design

1. **Bootstrap:** the original launch set prevents an empty first run.
2. **Expand:** MusicBrainz and Wikidata scans add externally identified K-pop acts and aliases.
3. **Observe:** licensed event searches and market-wide sweeps attach live activity evidence.
4. **Prioritize:** follows, recent events and high-confidence new debuts raise refresh priority, while explicit cohort budgets protect unseen and long-tail acts.
5. **Verify:** multiple source mappings increase confidence; contradictions fail closed.
6. **Learn:** successful events reset the next-check window and update market coverage.
7. **Revisit:** quiet long-tail artists remain in a low-frequency queue instead of disappearing.

The graph therefore improves from its own observations without using a generative model to invent facts.

## Merge policy

- Prefer stable source IDs over names.
- Normalize Unicode, punctuation, whitespace and `&`/`and` for lookup only; preserve the best sourced display name.
- Treat aliases as evidence with their own source and confidence.
- Upgrade an `unknown` artist type when a structured source supplies `group` or `person`, even if the launch seed has higher display-name confidence.
- Never merge two stable external IDs solely because their short names are similar.
- Never create an artist from arbitrary free text unless an event provider explicitly classifies it as K-pop or a member follows it.
- An event-wide scan must prove the artist in the event title or structured performer evidence. A provider's first attraction is not accepted by itself.
- Ambiguous stage names such as `KEY`, `V`, `Moon` and `Jay` require an explicit concert/tour title pattern; a word occurrence or generic performer association is insufficient.
- Provider artist type (`group`/`person`) must agree with the canonical identity when both are known. This prevents same-name entities such as the Filipino group BINI and Korean singer Bini from being merged.
- An unknown Ticketmaster attraction is not published immediately. A bounded exact-name + South Korea + artist-type MusicBrainz resolution can add the stable identity automatically; zero or multiple exact matches fail closed.
- Direct user searches use the same exact Korean-identity resolver and share a process-wide MusicBrainz request queue that respects the one-request-per-second limit.
- Unknown provider identities enter a durable candidate queue keyed by provider attraction ID. Priority favors structured group type and explicit concert/fancon/encore titles; attempts, retry time and last error survive restarts.
- Each ingestion run has a 35-second candidate-resolution budget. A slow or failed identity lookup backs off that candidate without failing the market sweep or starving later candidates.
- A provider attraction ID is trusted only after it is bound to a canonical artist ID. Merely receiving a stable ID does not prove that a same-name alias is the same artist.
- Successful exact resolution writes a durable provider-ID crosswalk; later events use that crosswalk before names or aliases. Conflicting attempts do not overwrite an existing binding.

## Asset identity policy

- Event artwork is accepted only from an already accepted event record and remains tied to that provider event ID.
- Artist artwork requires an exact canonical attraction identity or a curated structured mapping; fuzzy name search never selects an image.
- Provider assets marked as fallback are rejected at ingestion and removed from the media table.
- A remote image URL observed for two different canonical artists is automatically quarantined for both identities. The product shows a typographic no-image state until a distinct trusted asset appears.
- Image source URL, provider artist/event ID, dimensions, attribution, fallback state and refresh time remain queryable metadata.
- Decorative local assets must not claim to represent a real artist, event, route or venue. Data-like maps are rendered from actual records, not baked into promotional artwork.

## Failure policy

- One identity source may fail without preventing another source from committing.
- Failed pages do not advance their cursor.
- Open-data requests are bounded and rate limited.
- Low-confidence event matches stay outside the K-pop catalog.
- Low-confidence, fallback or cross-identity media stays outside the rendered product.
- Inactive or disbanded acts remain searchable but move to the long-tail event cadence unless new activity appears.
- Empty markets show measured zero-state information and nearby results; they do not display a generic catalog-loading promise.

## Metrics

- active identities and verified identities;
- group/person/unknown distribution;
- new identities learned per source and per day;
- alias collision rate;
- events found per artist query and market sweep;
- long-tail queue age and overdue count;
- future shows and markets with shows;
- source freshness per market;
- false merge, duplicate and automatic-quarantine rates.

## Red-team checks

- A popular artist tag must not crowd newly debuted acts out of every page.
- A one-character name such as `V` must remain searchable when strongly verified.
- A translated alias must resolve to one identity without replacing a better canonical display name.
- A provider's generic “pop” classification must not promote an arbitrary act to K-pop.
- A source outage must not reset progress to page zero or delete previously accepted identities.
- No user-facing count may be derived from the launch seed constant.
- A fallback asset must never render, even when it has better dimensions than the real alternatives.
- One image URL must not silently become the portrait of multiple canonical artists.
- A large hot cohort must still leave capacity for never-checked and longest-overdue identities.

## Runtime cadence

Identity graph expansion runs independently from event ingestion. MusicBrainz and Wikidata advance one durable page every six hours by default. Event ingestion runs every twenty minutes and combines a fair artist queue with one due market sweep. Provider update/deletion state is consumed before the forward event searches so lifecycle corrections can land even when no artist is currently due.

The fair queue reserves half of each batch for priority/recent activity, one quarter for never-checked identities when the batch permits it, and the remaining capacity for the longest-overdue tail. Empty cohort capacity is filled by overdue work. This is a capacity guarantee, not only a sort order.
