# Visual Asset System

## Role of imagery

Concert Passport uses imagery to express two distinct product states:

- **Anticipation** — documentary concert photography for discovery and the next-show moment.
- **Memory** — collectible travel-print artwork for Passport history and shareable records.

Operational views such as search results, ticket stages, sources, account settings, and forms remain typographic. They use functional maps, route lines, timelines, stamps, and data marks instead of decorative stock photography. This keeps the product legible and prevents every section from becoming an unrelated card.

## Asset tiers

1. **Product-owned identity**: SVG logo, favicon, app icon, and social preview. These must remain repository-owned and work without a network request.
2. **Live artist and event media**: exact-match Ticketmaster attraction/event images, followed by a curated exact-title Wikimedia fallback with a landscape-resolution gate, refreshed from provider records and served through ID-based same-origin routes.
3. **Product-owned atmosphere**: generated or commissioned editorial master images, locally optimized and used only for a named editorial experience, never as false evidence for a live artist or event.
4. **Functional visualization**: MapLibre vector maps and code-native route, timeline, and stamp graphics. These must communicate real state whenever data exists.
5. **External identity**: official source favicons/logos, fetched only from the allowlisted same-origin logo route with a text fallback.

Artist photography is never selected from a generic image search. It is attached to an exact canonical artist or event record and retains provider ID, source page, dimensions, attribution, fallback state, first-seen time, last-check time, and content-change time. It never implies endorsement.

## Current masters

- `apps/web/public/brand-mark.svg` — standalone product mark.
- `apps/web/public/brand-social.svg` and `apps/web/public/og.png` — social preview master and 1200 × 630 export.
- `apps/ios/ConcertPassport/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png` — iOS app icon master.

Obsolete generated exploration images and the unreferenced mock-up archive were removed. Passport uses the repository-owned SVG mark on a code-native fixed-contrast surface. Text remains live HTML so all five languages, accessibility settings, and responsive breakpoints share the same visual.

## Live media lifecycle

- Scheduled catalog refreshes also perform an exact-match Ticketmaster attraction lookup for the same artist batch.
- Search refreshes the requested artist independently, so a profile image can appear even when there are no announced future dates.
- Event media takes precedence over attraction media; when neither is trustworthy, the UI renders an intentional typographic no-image state.
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

## Future ingestion contract

The next media-model migration should add provider-supplied focal point, dominant colour, blur placeholder, rights note, and removal state. The current production contract already includes stable provider ID, exact artist/event binding, source URL, attribution, intrinsic dimensions, fallback state, and observation/change timestamps. The application must never hotlink arbitrary images or silently substitute a low-confidence search result.
