# Design Direction

**Status:** Implemented cross-platform visual and interaction system · 2026-08-22
**Design standard:** Native, restrained, legible under stress, memorable after the show

## 1. Creative thesis

> A precision instrument for live memories.

The product has two emotional modes:

- **Before the show:** operational, exact, quiet, confidence-building.
- **After the show:** warm, editorial, tactile, personal.

The visual system should express both without feeling like two products. The bridge is the concert stamp: a precise record that gradually acquires emotional value.

This is not a Flighty skin. Flighty’s useful lesson is the disciplined hierarchy of time-critical information and the way operational data becomes a lifetime story. Concert Passport should develop its own concert/travel vocabulary.

## 2. Brand idea

### Brand promise

**Never miss the moment. Keep every one.**

### Brand attributes

- Precise
- Devoted
- Cosmopolitan
- Reassuring
- Intimate
- Inclusive
- Collectible

### Personality

The product speaks like the most organized friend in the ticket group: calm, current, prepared, and genuinely excited — never breathless, infantilizing, or manipulative.

### Working voice examples

| Situation | Preferred voice |
|---|---|
| Critical deadline | “会员预售注册还剩 3 小时。完成注册后回来标记。” |
| Unverified data | “这个时间来自主办方公告，票务平台尚未确认。” |
| Change | “开票时间从 10:00 改为 12:00。提醒已自动更新。” |
| Ticket-day | “Waiting room 已开放。请使用同一台设备，并不要刷新页面。” |
| Memory | “第一次在现场见到 RIIZE · 香港 · 2025.07.12” |
| Distance | “你为现场走过 12,480 km” with a visible metric explanation |

Avoid “guaranteed,” “we secured your ticket,” or language that implies an actual personal relationship with an artist.

## 3. Visual concept: Editorial Operations

The product is an editorial travel record with the precision of an operations console. Time, location, lifecycle state, and source authority create the composition. Light appearance uses warm paper rather than sterile white; dark appearance uses near-black ink rather than neon spectacle. The design is recognizable without depending on artist imagery, gradients, or a collage of floating cards.

### Color foundations

| Token | Proposed value | Role |
|---|---:|---|
| `paper` | `#F3F1EB` | Light canvas |
| `surface` | `#FBFAF7` | Light operational surface |
| `ink` | `#151515` | Light-mode primary text |
| `night` | `#10110F` | Dark canvas |
| `night-surface` | `#161714` | Dark operational surface |
| `night-ink` | `#F1EFE8` | Dark-mode primary text |
| `accent` | `#4338CA` / `#9C96FF` | Selected state, route, primary action |
| `signal-amber` | adaptive brown/amber | Waiting and needs attention |
| `signal-green` | adaptive green | Verified, ready, completed |
| `line` | adaptive neutral hairline | Structural division |

Values are starting points for visual prototyping, not production tokens. Every semantic pair must pass contrast testing in both appearance modes.

### Color behavior

- Use brand violet for selected state, navigation, and routes.
- Reserve red for real danger or loss of opportunity; never use it to manufacture urgency.
- A single performance may inherit a restrained accent derived from licensed tour art, but operational status colors never change meaning.
- Both light and dark are complete product appearances, not page-specific skins.
- Maps stay desaturated so time/status/route layers remain dominant.

## 4. Typography

### Interface

- **iOS:** San Francisco system family for native metrics, accessibility, and Dynamic Type.
- **Web:** the platform UI stack (SF Pro/Segoe UI) with PingFang SC/TC and system CJK fallbacks. No downloaded display face is required for the product to feel branded.
- **CJK:** PingFang on Apple platforms; Noto Sans CJK / Source Han Sans as web fallback.

### Editorial moments

- **Latin:** New York on Apple platforms or a licensed editorial serif on web.
- **CJK:** Songti/Source Han Serif fallback for Passport titles and anniversary narratives.
- Editorial type is limited to short display moments. Dates, deadlines, controls, and body text remain sans serif.

### Data

- Tabular numerals are mandatory for countdowns, times, prices, and distance.
- A restrained monospaced style may be used for source timestamps and ticket metadata, not entire screens.

### Hierarchy

1. Next action / countdown
2. Artist and city
3. Event-local date and time
4. Prerequisite and status
5. Source and verification time

The hierarchy must remain obvious in screenshots, Dynamic Type, and notification surfaces.

## 5. Shape, material, and elevation

- Use 2–7 pt radii only where a control or surface needs a physical edge. Collections are rows, tables, ledgers, and rails rather than repeated cards.
- Hairline rules, alignment, whitespace, and restrained tonal shifts create most hierarchy.
- Shadows are rare on dark operational screens and soft on paper artifacts.
- Ticket/perforation metaphors are reserved for actual ticket-path or Passport artifacts.
- Glass blur is reserved for sticky navigation where content passes underneath it.
- The primary CTA should be one obvious full-width or anchored control, not several competing gradient buttons.
- Status chips use icon + text + color; color alone is never the signal.

## 6. Iconography and illustration

- Use the native SF Symbols vocabulary on iOS, with a small set of custom symbols for lottery, membership, waiting room, stamp, and verified source.
- Custom icons use consistent optical weight and rounded terminals without becoming cartoonish.
- Do not create artist-logo-shaped stamps without permission.
- City, venue architecture, date, route, sound wave, and user-selected motifs can generate distinctive stamps without copying protected artwork.
- Artist photography and tour posters require licensed provider assets plus explicit rights metadata and expiry handling.

## 7. Signature components

### 7.1 Next Action

The most important component in the product.

- Human-readable action title.
- Large remaining-time or scheduled-time display.
- Venue-local time with home-time conversion on demand.
- One primary action.
- Completion/acknowledgement.
- Source tier and last verification.
- Calm risk treatment when prerequisite data is missing.

### 7.2 Lifecycle Rail

A vertical sequence of ticket and travel milestones:

- completed states compress visually;
- current state expands;
- future states show prerequisites and windows;
- changed states retain the old value in history;
- expired/failed states explain the next fallback rather than ending in a dead state.

### 7.3 Verified Destination

Outbound seller treatment includes:

- official-domain badge;
- destination name and host domain;
- sale-program context;
- a short warning if leaving the app;
- no misleading in-app browser chrome that conceals the domain.

### 7.4 Atlas Ribbon

The map’s time control:

- a compact horizontal date interval;
- markers grouped by tour/artist relevance;
- a visible “my trip” band;
- quick local-time/currency context;
- smooth synchronization with the result sheet.

### 7.5 Passport Stamp

A stamp is a generated, durable record:

- city/venue code;
- performance date;
- attendance verification tier;
- a route mark or unique serial derived from the attendance record;
- optional user-chosen accent;
- no barcode or sensitive ticket data.

Stamps should become more personal through memories, not through random gamification rarity.

### 7.6 Source Ledger

An expandable trust component showing:

- current authoritative value;
- provider/official source;
- verified timestamp;
- material changes;
- correction submission.

It should feel understandable to a fan and rigorous enough for support operations.

## 8. Four flagship screens

### Screen A: Today

**Hero:** “RIIZE · Hong Kong — presale registration closes in 03:12:48.”
Under the timer: eligibility state, source badge, and one “Complete registration” action.
Below: material changes, then upcoming journeys. Discovery appears only after the action queue.

The screen should be readable in under two seconds.

### Screen B: Journey

A restrained hero with artist/tour identity, city, date, and small map context. The lifecycle rail owns the page. Ticket, squad, and travel modules attach to milestones rather than appearing as unrelated dashboards.

The page should answer “what is next, why, where did this come from, and what happens if I miss it?”

### Screen C: Atlas

The upper region is a quiet coordinate field with restrained route and event points. A date and market toolbar pins the selected period. The adjacent or lower ledger lists the best matches for a planned trip or selected artist. A multi-city compare mode turns the map into a decision surface rather than decoration.

### Screen D: Passport

The opening state is a travel-record identity ledger that adapts to light and dark appearance:

- shows attended;
- artists seen;
- cities/countries;
- journey distance;
- a small route map;
- recent stamps.

Scrolling moves from identity page to atlas, artist timelines, statistics, and memories. Share mode creates a deliberately redacted artifact.

## 9. Motion and haptics

- Countdown digits do not constantly animate; time changes should remain calm.
- A source change uses a short crossfade and a visible “updated” marker.
- Completing a milestone gives a restrained confirmation haptic and collapses the rail step.
- A Passport stamp lands once with a subtle ink/emboss transition; no confetti by default.
- Atlas camera changes preserve spatial context.
- Reduced Motion removes parallax, route drawing, stamp landing, and large camera sweeps.
- Haptics are never used for marketing or repeated urgency.

## 10. Native system surfaces

### Widgets

- Small: next critical deadline.
- Medium: two upcoming actions or one journey with context.
- Lock Screen: compact countdown/date, with sensitive content excluded.

### Live Activity

Only for a user-selected active ticket-day session:

- waiting-room/open-sale countdown;
- official-domain action;
- concise eligibility/limit reminder;
- no access code, membership ID, or queue scraping;
- ends after the configured sale session or user dismissal.

### Share Sheet

Accept an official URL, image, or selected text and propose a parsed event/milestone. The user reviews every extracted fact before submission.

## 11. Responsive web

- At desktop widths, Atlas, calendar, and plan details can use split panes.
- At mobile web widths, preserve the same action hierarchy but do not pretend to offer native notification guarantees.
- Public Passport pages use a fixed privacy-safe schema rather than rendering the owner’s private screen.
- Admin tooling prioritizes information density and auditability over brand flourish.

## 12. Accessibility and internationalization

- WCAG 2.2 AA baseline for web.
- Dynamic Type through accessibility sizes without clipping critical actions.
- VoiceOver labels include milestone type, status, local time, and remaining time.
- Do not encode completed/current/expired only by position or color.
- 44×44 pt minimum iOS interaction targets.
- English, Traditional Chinese, and Simplified Chinese layouts are tested with real content, not translated after implementation.
- Artist/venue aliases preserve original scripts and transliterations.
- Dates never rely on ambiguous numeric formats.
- All currency displays include ISO currency when cross-border context could be unclear.
- Time zones use city/abbreviation plus a discoverable full zone; never show an unexplained UTC offset alone.

## 13. Aesthetic red lines

- No generic neon-on-black “music app” template.
- No collage of unlicensed artist posters as the product’s identity.
- No endless rounded cards without hierarchy.
- No faux passport decoration that makes operational information hard to scan.
- No childish gender coding or assumption that all superfans want a cute/pink product.
- No dark-pattern countdowns, fake scarcity, mystery rewards, or engagement streak punishment.
- No direct imitation of Flighty, DICE, Apple Wallet, or any one competitor’s composition.
- No sacrificing accessibility for cinematic maps or thin typography.

## 14. Design validation sequence

1. Mood and brand territory board.
2. Black-and-white hierarchy prototypes for Today and Journey.
3. Data-dense multi-city comparison prototype.
4. Atlas map style test with real Asia-Pacific density.
5. Passport identity page and share-card study.
6. Motion prototypes for milestone completion, change, and stamping.
7. Usability sessions under simulated ticket-day time pressure.
8. Accessibility, localization, and low-connectivity tests.

High-fidelity visual work should start only after the core hierarchy succeeds without color or animation.
