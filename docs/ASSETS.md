# Visual assets and provenance

## Product art direction

The live product uses verified official event photography, quiet paper/ink colors and a personal ticket-stub journal. An abstract generated ticket was explored and rejected during review; it is not the homepage visual. The site never generates documentary artist imagery. SVG brand marks and restrained hover/stamp motion are code-native.

## Product screenshots

`docs/assets/home-desktop.png`, `home-mobile.png`, `atlas-desktop.png` and `event-desktop.png` capture the actual September 30 Web interface against an isolated public-source audit database. They are UI documentation, not proof of current ticket availability. The event detail screenshot includes an official Live Nation ITZY promotional preview from the source linked in the UI. Third-party artist imagery remains owned by its respective rights holders and is not relicensed with repository code.

## Runtime media

Official event artwork is tied to a source document and media proof. Wikimedia artist images require identity, provenance and license metadata. A fallback graphic is used when verified artwork is unavailable. Never substitute generated artist portraits as documentary event imagery.

Existing assets under `apps/web/public/editorial/` and older `visuals/` belong to earlier editorial experiences; their existing provenance records in `VISUAL_ASSET_SYSTEM.md` and historical design documents still apply. Adding a code license does not grant rights to third-party photos, logos, posters, maps or source content.

## Map locations

`apps/web/lib/domain/city-locations.json` contains 13 city-level P625 coordinates retrieved from the linked Wikidata entities on 2026-09-30 (CC0 structured data). The UI labels these as approximate city markers and groups multiple performances in one city. They are never stored as verified venue coordinates. Exact city + market matching prevents cross-country guessing; unsupported cities remain in the list. Examples: [Singapore Q334](https://www.wikidata.org/wiki/Q334), [Taipei Q1867](https://www.wikidata.org/wiki/Q1867).

`product-tour.gif` is a simple slideshow of actual UI screenshots, not a recording of interactions or a generated mockup.

`passport-desktop.png` 为隔离测试数据库的界面截图，包含明确标记的合成回忆，不是实际观演记录。

`production-v32.png` captures the deployed HTTPS homepage after final release verification on 2026-09-30. Its featured photograph loaded from the verified official-event image endpoint.

## Repository cover and licensing

`docs/assets/readme-hero.svg` is original code-native brand artwork created for the repository: abstract tour routes and a personal ticket stub. It includes no artist portrait or source photograph, requires no external font/image/script, and is not a product screenshot or a real admission ticket. Original brand SVGs, code and documentation use the repository [MIT License](../LICENSE). Third-party media and data retain their independent conditions in [THIRD_PARTY_NOTICES](../THIRD_PARTY_NOTICES.md).

`docs/assets/social-preview.svg` derives from the same original artwork and adds a technology/footer strip. `social-preview.png` is its 1280×640 raster export for repository social previews. Both are original brand assets under MIT; neither contains third-party artist photography or claims to document a real show. The SVG remains the editable source.
