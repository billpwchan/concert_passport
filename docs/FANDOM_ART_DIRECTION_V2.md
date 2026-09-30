# Concert Passport — Fan Archive Art Direction

Status: accepted direction after rejecting the palette-based theme experiment.

## What was wrong

The first theme model changed color tokens but left the composition, imagery, hierarchy and interaction model intact. Naming the palettes made that weakness more visible. It treated fandom as a mood board instead of a lived practice.

The product will not ship fictional themes such as “Afterglow”, “Photocard” or “Soundcheck”. It keeps one coherent visual identity with independent System / Light / Dark appearance.

## Evidence

- Weverse organises the product around the artist relationship: Home brings notices and Calendar together; Feed carries artist and fan updates; LIVE·Media keeps artist content close. The identity comes from the artist and activity, not a global decorative skin. <https://weverse.io/notice/36944>
- DICE makes live discovery visual and immediate: real event imagery, clear time/location filters and a short path to the ticket. <https://apps.apple.com/us/app/dice-live-shows/id898358948>
- Material-culture research describes photocards and lightsticks as emotional anchors, rites of passage and signals of belonging. <https://journal.unnes.ac.id/journals/harmonia/article/view/24450>
- Research on interactive K-pop packaging finds that albums become collectibles because users reveal, arrange and share multiple physical inclusions. The interaction is spatial and tactile, not merely colorful. <https://www.diva-portal.org/smash/get/diva2%3A1701310/FULLTEXT02>
- Concert travel creates self-expansion, belonging and a shared sense of fulfilment; the travel record is part of the fan identity. <https://www.sciencedirect.com/science/article/pii/S275266662400007X>

## Product idea

Concert Passport is a living tour archive.

Before a show it behaves like an operations desk: dates, ticket phases, official links, saved alerts and travel fit.

After a show it behaves like a personal archive: attended nights, cities, distance, first meetings, photographs and stamps.

The same event moves from “planned ticket” to “memory artifact”; users should not have to recreate it.

## Visual system

### 1. Content supplies the identity

- Only canonical, provider-bound artist and event images can become primary art.
- The artist name, tour title, venue time and image provenance stay attached to every crop.
- Missing art is an intentional typographic composition, never an unrelated stock or generated idol image.
- Multiple images may be composed as a contact sheet only when each tile has a verified event identity.

### 2. A small set of material primitives

- `Tour sleeve`: large real image, artist name and local venue time.
- `Contact sheet`: several verified tour sleeves separated by hard gutters, not rounded cards.
- `Ticket strip`: compact date / city / ticket-stage object with a perforated edge.
- `Route trace`: map line and city marks used only where travel is part of the task.
- `Archive stamp`: attended record generated from real event and user history.
- `Source caption`: small, quiet provenance attached to imagery and official links.

These objects are reused across pages. Decorative stickers, fake tape, random gradients, glass cards and emoji-style fandom cues are excluded.

### 3. Typography and spacing

- Display type is large, compact and image-led; operational text is smaller and calmer.
- Headlines use normal sentence casing. Data labels use restrained uppercase only for dates, country codes and provenance.
- Sections connect through shared baselines and hard image gutters; border radius is limited to controls and large canvases.
- Light uses warm archive paper; Dark uses near-black print stock. They are the same composition, not separate personalities.

### 4. Color

- Product chrome is neutral.
- Artist photography supplies most page color.
- One electric blue remains the interactive accent because it is legible and does not imitate any fandom color.
- Ticket stages retain stable semantic colors across Light and Dark.
- No user-selectable palette themes.

## Page responsibilities

### Today

- Start with the next saved show when one exists.
- Compose the next show with two other verified upcoming images as a tour contact sheet.
- Show the next action, not a generic dashboard.
- Present upcoming Asia dates as a horizontal showreel with real imagery and direct official links.

### Atlas

- Keep artist-first and trip-first search as the two genuine entry points.
- Add a verified artist filmstrip as a useful search shortcut, not decoration.
- Preserve the map/results split and reveal ticket-stage detail in the result list.
- Search state must survive sharing in a later URL-state iteration.

### Plans

- Render the next saved show as a ticket object: image, date, venue and the official action.
- Remaining shows become an itinerary, grouped by trip rather than a generic list.
- Ticket milestones and reminders are the next operational layer.

### Passport

- Replace the government-document imitation with a personal concert archive.
- Attended records should be promoted from saved shows so artist, venue, image and source identity stay intact.
- Add personal photographs, notes and a route map only after an ownership/privacy model is defined.

## User journey

1. Search an artist or enter a destination and travel dates.
2. Compare verified shows and open the official ticket page.
3. Save one date; receive sale-stage and schedule changes.
4. Keep the show in Plans through the event.
5. Mark attendance once; the same record moves into Passport.
6. Build a private archive of artists, cities and distance.

## Red-team gates

- A visual cannot appear beside an artist unless the identity binding is verified.
- A visual treatment cannot reduce date, timezone, ticket-stage or official-link clarity.
- Empty states cannot imply unsupported coverage.
- Fandom language cannot invent intimacy or speak as the artist.
- Collection mechanics cannot create artificial scarcity, streak pressure or purchase guilt.
- Dark mode must preserve the same hierarchy and WCAG contrast, not invert arbitrary colors.
