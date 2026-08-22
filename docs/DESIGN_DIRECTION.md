# Design Direction

**Status:** Proposed visual and interaction system
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

## 3. Visual concept: Midnight Passport

The base environment is a deep midnight field: the moment after venue lights fall and before the first note. Operational surfaces are crisp and luminous. Completed journeys move into warm paper, ink, foil, embossing, and stamp textures.

### Color foundations

| Token | Proposed value | Role |
|---|---:|---|
| `night-950` | `#08090D` | Primary dark canvas |
| `night-900` | `#101218` | Elevated dark surface |
| `night-800` | `#191C24` | Secondary surface |
| `paper-50` | `#F7F3EA` | Passport/light canvas |
| `paper-100` | `#EFE8DA` | Warm secondary canvas |
| `ink-950` | `#161412` | Text on paper |
| `fog-400` | `#9A9DA8` | Secondary dark-mode text |
| `pulse-500` | `#7C63FF` | Primary brand action and route light |
| `afterglow-500` | `#FF5E75` | Emotional highlight, not every CTA |
| `signal-amber` | `#FFB547` | Waiting, lottery, needs attention |
| `signal-cyan` | `#41D9D0` | Verified/ready/confirmed |
| `signal-red` | `#FF4D55` | Expiring, failed, cancelled |

Values are starting points for visual prototyping, not production tokens. Every semantic pair must pass contrast testing in both appearance modes.

### Color behavior

- Use brand violet for selected state, navigation, and routes.
- Reserve red for real danger or loss of opportunity; never use it to manufacture urgency.
- A single performance may inherit a restrained accent derived from licensed tour art, but operational status colors never change meaning.
- Paper mode appears within Passport and share artifacts, not as a disconnected global light theme.
- Maps stay desaturated so time/status/route layers remain dominant.

## 4. Typography

### Interface

- **iOS:** San Francisco system family for native metrics, accessibility, and Dynamic Type.
- **Web:** Inter Variable or a comparably neutral variable grotesk after performance and multilingual review.
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

- Use a 12–16 pt corner radius for actionable cards; avoid an interface made entirely of floating pills.
- Hairline rules and tonal surface shifts create most hierarchy.
- Shadows are rare on dark operational screens and soft on paper artifacts.
- Ticket/perforation metaphors are reserved for actual ticket-path or Passport artifacts.
- Glass blur is used only when spatially justified over a map or moving backdrop.
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

The upper two-thirds is a dark, quiet map with glowing route and event points. A time ribbon pins the selected period. The lower sheet lists the best matches for a planned trip or selected artist. A multi-city compare mode turns the map into a decision surface rather than decoration.

### Screen D: Passport

The opening state is a warm paper identity page laid over the dark product canvas:

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
