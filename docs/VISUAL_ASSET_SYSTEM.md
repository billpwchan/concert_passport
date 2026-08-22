# Visual Asset System

## Role of imagery

Concert Passport uses imagery to express two distinct product states:

- **Anticipation** — documentary concert photography for discovery and the next-show moment.
- **Memory** — collectible travel-print artwork for Passport history and shareable records.

Operational views such as search results, ticket stages, sources, account settings, and forms remain typographic. They use functional maps, route lines, timelines, stamps, and data marks instead of decorative stock photography. This keeps the product legible and prevents every section from becoming an unrelated card.

## Asset tiers

1. **Product-owned identity**: SVG logo, favicon, app icon, and social preview. These must remain repository-owned and work without a network request.
2. **Live artist and event media**: exact-match Ticketmaster attraction/event images, followed by a curated exact-title Wikimedia fallback with a landscape-resolution gate, refreshed from provider records and served through ID-based same-origin routes.
3. **Product-owned atmosphere**: generated or commissioned editorial master images, locally optimized and used only as a neutral discovery fallback when no reliable live artist/event asset exists.
4. **Functional visualization**: MapLibre vector maps and code-native route, timeline, and stamp graphics. These must communicate real state whenever data exists.
5. **External identity**: official source favicons/logos, fetched only from the allowlisted same-origin logo route with a text fallback.

Artist photography is never selected from a generic image search. It is attached to an exact canonical artist or event record and retains provider ID, source page, dimensions, attribution, fallback state, first-seen time, last-check time, and content-change time. It never implies endorsement.

## Current masters

- `apps/web/public/visuals/arena-awaiting-v1.jpg` — neutral home fallback when a reliable live artist/event image is unavailable, 2:1 crop, 330 KB.
- `apps/web/public/visuals/passport-routes-v1.jpg` — retained generated exploration, 2:1 crop, 502 KB; no longer rendered by the product.
- `apps/web/public/brand-mark.svg` — standalone product mark.
- `apps/web/public/brand-social.svg` and `apps/web/public/og.png` — social preview master and 1200 × 630 export.
- `apps/ios/ConcertPassport/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png` — iOS app icon master.

Both generated raster masters are intentionally free of text, logos, identifiable performers, and UI. They do not represent a named act. Only the neutral arena image remains an active fallback. Passport now uses the repository-owned SVG mark on a code-native fixed-contrast surface. Text remains live HTML so all three languages, accessibility settings, and responsive breakpoints share the same visual.

## Live media lifecycle

- Scheduled catalog refreshes also perform an exact-match Ticketmaster attraction lookup for the same artist batch.
- Search refreshes the requested artist independently, so a profile image can appear even when there are no announced future dates.
- Event media takes precedence over attraction media; attraction media takes precedence over the neutral arena fallback.
- Selection prefers non-fallback 16:9 assets and then the largest available area above 640 × 360.
- Wikimedia is used only for a curated canonical page-title mapping when Ticketmaster has no qualifying attraction image. The current gate requires at least 900 × 500 and a 1.45:1 landscape ratio; low-resolution portrait results are not promoted merely to increase coverage.
- The application never exposes or accepts the remote image URL in its UI API. It serves `/api/v1/events/:id/image` or `/api/v1/artists/:name/image`, resolving the upstream source from stored data.
- The media proxy accepts only Ticketmaster CDN hosts or `upload.wikimedia.org` according to the stored provider, enforces image content types and an 8 MB response ceiling, and supplies bounded public caching.
- Source attribution links remain visible on immersive heroes and artist search strips.

## Responsive and theme rules

- Desktop hero copy occupies the left 42 percent; visual energy is weighted to the right.
- Mobile uses a bottom-weighted scrim so the stage remains visible above live text rather than becoming a dark wallpaper.
- Photography keeps the same cinematic treatment in light and dark themes. Surrounding product surfaces and functional diagrams respond to theme tokens.
- Passport identity is code-native, high-contrast, and never inverted. Its statistics use a fixed bone-on-ink palette for reliable contrast.
- Images render through `next/image`, reserve their layout with a positioned parent, and provide responsive `sizes` hints.
- Decorative images use empty alternative text. Meaningful source identity retains a visible text fallback.

## Final image-generation prompts

The two original raster masters were made with the built-in image-generation tool and then optimized locally. These are the final production prompts.

### Arena anticipation

```text
Use case: photorealistic-natural
Asset type: premium responsive web hero background for a K-pop concert travel planner
Primary request: an editorial, cinematic photograph of the final quiet seconds before a major arena concert begins in an Asian city
Scene/backdrop: vast contemporary indoor arena seen from high in the lower bowl, audience as an atmospheric field of tiny silhouettes, stage far in the distance, no identifiable performer
Subject: anticipation, light, scale, and the feeling of arriving after a long trip
Style/medium: high-end music editorial photography, documentary realism, subtle 35mm grain, sophisticated rather than glossy advertising
Composition/framing: very wide landscape, strong usable negative space across the left 42 percent for interface copy, visual energy and stage lights weighted to the right, layered depth, clean horizon
Lighting/mood: deep ink-black shadows, restrained ultraviolet and warm amber beams, gentle haze, luminous but not neon cyberpunk
Color palette: charcoal, off-white highlights, muted periwinkle, one warm amber accent
Materials/textures: realistic haze, concrete arena, soft film grain
Constraints: no readable signs, no logos, no text, no watermark, no close faces, no recognizable celebrity, no phones dominating the frame, no confetti, no fantasy architecture
Avoid: AI illustration look, excessive saturation, sci-fi HUD, EDM laser cliché, generic stock-photo cheering hands, fake text, distorted bodies
```

### Passport routes

```text
Use case: stylized-concept
Asset type: premium wide background artwork for a private concert passport and travel history page
Primary request: an elegant abstract visualization of concert journeys across Asia, like a collectible travel print rather than a dashboard graphic
Scene/backdrop: near-black archival paper with a faint oblique map-grid impression of East and Southeast Asia, no readable country labels
Subject: thin luminous route arcs connecting a small number of cities, subtle circular passport impressions, delicate dots that feel like arena lights seen from the air
Style/medium: museum-quality screen print mixed with security-print engraving and restrained photographic light leaks; sophisticated editorial graphic design
Composition/framing: very wide landscape, central and right-side visual interest, generous quiet area on left for statistics, routes must feel organic and purposeful
Lighting/mood: quiet, intimate, nostalgic after-show atmosphere
Color palette: black, graphite, bone, muted periwinkle, oxidized copper, one coral-red stamp accent
Materials/textures: fine paper grain, hairline engraving, subtle emboss and metallic ink
Constraints: no words, no letters, no numbers, no readable map labels, no flags, no logos, no UI panels, no watermark, no people
Avoid: neon cyberpunk, sci-fi interface, generic glowing globe, busy infographic, fake typography, obvious AI geometry, excessive lens flares
```

## Future ingestion contract

The next media-model migration should add provider-supplied focal point, dominant colour, blur placeholder, rights note, and removal state. The current production contract already includes stable provider ID, exact artist/event binding, source URL, attribution, intrinsic dimensions, fallback state, and observation/change timestamps. The application must never hotlink arbitrary images or silently substitute a low-confidence search result.
