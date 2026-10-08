# Mario Kart Event Graphics System: Design Spec

- **Date:** 2026-10-08
- **Status:** Draft for review
- **Owner:** Jayden (production)

## 1. Context and goals

A 4-player **Mario Kart 8 Deluxe** tournament at a work event, happening within a week of this spec. We need live, Nintendo-styled graphics on LED walls and a stream, driven from one control page.

### Display surfaces

| Surface | Canvas | Notes |
|---|---|---|
| Wide LED | 3840×1152 | Main wall. Title, backgrounds and scenes. During races the Switch gameplay is placed in the middle by Millumin, with background B behind it. |
| Twin LEDs | 1920×1152 | One canvas, physically two 960×1152 screens either side of the Wide. A camera shot of 2 players per half, with lower thirds on top. |
| Pillars | 1920×1080 | LED pillars. |
| Stream | 1920×1080 | Program feed. |

### Playback

- **Millumin** web (browser) media runs on 1–2 output laptops.
- A separate **control laptop** runs the server and the control page.
- Millumin's browser engine is **Chromium 103** (Millumin 5.12+). It supports a `transparent` property, so overlays get alpha.

### Success criteria

- The operator can set up 4 players and a track in under a minute.
- Every graphic can be taken in and out cleanly.
- Nothing half-typed ever reaches a screen.
- The system runs fully **offline** at the venue.
- Outputs render smoothly (target 60 fps) at 3840×1152 on the output laptops.
- Any screen recovers on its own from a reload or a network drop.

### Non-goals

- Capturing or compositing the camera or gameplay. Millumin does that.
- Audio.
- Cloud hosting.
- Multi-operator accounts or auth.
- Reading race results automatically from the game.

## 2. Decisions so far

| Topic | Decision |
|---|---|
| Game | Mario Kart 8 Deluxe, including Booster Course Pass (96 tracks, 24 cups) |
| Players | 4. Name, character (fills in character name and headshot), colour from an 8-colour palette |
| Background roles | **A Menu Sky** = title/holding. **B Icon Pattern** = base behind content and behind the gameplay (shown on its own during races). **C Sticker Wall** = alternate. |
| Lower thirds | **Medallion** style |
| Track card | **T1 Cup medallion**, top-left of each screen |
| Event title style | **S1 MK8 Chrome** by default; **S3 Classic** switchable |
| Font roles (defaults) | Event title: Mario Kart F2. Headings: Exo 2, Classic look. Names & numbers: Rubik. Labels: Rubik. All switchable by the operator. |
| Twin layout | Lower thirds side by side under each pair (P1+P2 left half, P3+P4 right half); track card on both halves |
| 1080 layout | The operator picks which players' lower thirds show (1–4); the row re-centres |
| Outputs | Fully flexible: any number of named outputs, each with a format (Wide / Twin / HD) |
| Race format | Cup mode (4 races) or single-track mode, plus Random |
| Scoring | Enter finishing positions to get MK8D points automatically, plus manual total adjustments |
| Live workflow | **Edit freely, then TAKE.** Preview → Program per output, with **CUT** (instant) and **AUTO** (animated) |
| Control page | Standard operator UI, not game-styled |
| Extra page | **Multiview** for a second monitor |
| Stack | Node.js + TypeScript server, **Svelte 5 + TypeScript + Vite** front end, WebSocket sync, JSON persistence |
| Assets | Sourced from Mario Wiki by a re-runnable script; stored locally |

The visual source of truth is the reference mockups in **`docs/mockups/`**: the approved designs as standalone code at real output size (see `docs/mockups/README.md`; open `docs/mockups/index.html` through a local server).

| Path | Shows |
|---|---|
| `shared/tokens.css` | Every colour, gradient, font stack, easing and duration. Copy verbatim. |
| `shared/graphics.css` | Reference CSS for every component, with exact pixel values |
| `backgrounds/a-menu-sky.html`, `b-icon-pattern.html`, `c-sticker-wall.html` | Backgrounds A, B, C (`?format=wide\|twin\|hd`) |
| `titles/title-lockup.html`, `titles/headings.html` | Event title S1/S3 per format; heading looks and fonts |
| `overlays/twin-lower-thirds.html`, `hd-lower-thirds.html`, `wide-lower-thirds.html`, `hold.html` | Medallion lower thirds, T1 track card, HOLD |
| `scenes/lineup.html`, `next-race.html`, `standings.html`, `winner.html` | Wide scenes |
| `ui/control.html`, `ui/multiview.html` | Control page layout and multiview |

Any page with `?guides=1` outlines every component with its exact x, y, width and height.

## 3. Architecture

```
mariokart/
  package.json          scripts: dev, build, start, fetch-assets, test
  shared/               types, reducer, scoring, view derivation (pure TS, unit-tested)
  server/               Node 20+ HTTP + WebSocket server, state store, persistence
  web/                  Svelte 5 app, built by Vite into three pages
    control.html        /control
    out.html            /out/:outputId
    multiview.html      /multiview
  scripts/fetch-assets.ts
  assets/               characters/ tracks/ cups/ fonts/ catalog.json (committed, offline)
  data/                 state.json, backups, uploads/fonts/ (gitignored)
  docs/                 spec, plan, Millumin runbook
```

### Server

- A single Node process. Run `npm run build` once, then `npm start`.
- Listens on `0.0.0.0:8080` (configurable).
- On start it prints the LAN URLs, including `<hostname>.local`, for every output.

**Routes**

| Route | Purpose |
|---|---|
| `/control` | Control page |
| `/out/:outputId` | An output's Program view; this is the URL Millumin loads |
| `/out/:outputId?view=preview` | The same output's Preview view |
| `/multiview` | Multiview page |
| `/assets/*`, `/fonts/*`, `/uploads/*` | Static files |
| `/ws` | WebSocket |
| `/api/export`, `/api/import`, `/api/fonts` | Show file export/import and font upload |

**Optional flags on output URLs**
- `&lowfx=1` reduces particles. Monitors and the multiview use it.
- `&debug=1` shows a connection/debug overlay. Outputs never show errors otherwise.

### Build

- Vite with esbuild `target: 'chrome103'`. CSS is lowered with lightningcss for Chrome 103.
- `eslint-plugin-compat` and browserslist `chrome 103` flag unsupported APIs.
- These are banned outright: `:has()`, container queries, `color-mix()`/`oklch()`, the separate `translate`/`rotate`/`scale` properties, `@starting-style`, View Transitions, `linear()` easing, `text-wrap: balance`.

### State model (in `shared/`)

```ts
ShowState {
  draft: ShowData                       // everything the operator edits (= Preview)
  outputs: OutputConfig[]               // id, name, format, safeArea, graphicsScale
  layers: Record<OutputId, Layers>      // draft layer choices per output
  program: Record<OutputId, ViewModel>  // what each output is showing (= Program)
  overlay: { hold: { on, message }, ftb: boolean }
  transition: 'fast' | 'normal' | 'slow'
  armed: OutputId[]
  clocks: { onAirSince?: number }
}
ShowData {
  event: { preTitle, title, titleAccent, watermark, holdMessage }
  typography: { eventTitle: { font, style: 'chrome' | 'classic' },
                headings: { font, look: 'chrome' | 'classic' | 'plain' },
                names: { font }, labels: { font } }
  players: [Player × 4]                 // { name, characterId, colour }
  race: { mode: 'cup' | 'track', cupId, raceIndex, trackId }
  scores: { races: RaceResult[], adjustments: number[4] }
}
Layers {
  background: 'A' | 'B' | 'C' | 'none'
  scene: 'none' | 'title' | 'lineup' | 'nextRace' | 'standings' | 'winner'
  trackCard: boolean
  lowerThirds: { on: boolean, players: number[] }   // which players (HD/Wide); Twin is fixed
}
```

**Views are derived, not stored separately.**
- `deriveView(data, layers, outputConfig) → ViewModel` is a pure function. Its output contains only what that output will render: resolved names, image URLs, colours, fonts, standings rows and so on.
- **Preview** pages render `deriveView(draft…)`.
- **Program** pages render `program[outputId]`.
- An output has **pending changes** when `deriveView(draft…) ≠ program[outputId]`. The UI shows a count of changed elements.

### Actions

Clients send typed commands. The server validates each one with zod, applies it with a pure reducer from `shared/`, saves, and broadcasts.

| Group | Commands |
|---|---|
| Players and race | `setPlayer`, `setRace`, `stepRace(±1)`, `randomRace` |
| Scores | `saveResults(raceNo, positions)`, `setAdjustment` |
| Text and fonts | `setEventText`, `setTypography` |
| Layers | `setLayers(outputId, patch)` |
| Take | `arm(outputIds)`, `take({ outputIds, mode: 'cut' \| 'auto' })` |
| Emergency | `hold(on, message?)`, `clear()`, `ftb(on)` |
| Outputs | `addOutput`, `updateOutput`, `removeOutput` |
| Show file | `importShow`, `resetScores`, `resetShow` |

### What each command does

- **take:** for each target output, sets `program[id] = deriveView(draft…)` and stamps it with the transition mode and speed. Starts the on-air clock on the first take.
- **hold:** an overlay drawn above everything on every output, appearing instantly. It's background A with the event title and the hold message. On the Twins it renders per half. Releasing it returns to Program.
- **clear:** turns off scene, track card and lower thirds in **both** Program and draft for every output. Backgrounds stay.
- **ftb:** a 0.5 s fade to black on all outputs. Pressing it again fades back up.

### Sync protocol

- **Control and Multiview clients** subscribe to the full state.
- **Output clients** subscribe with `{ outputId, view: 'program' | 'preview' }` and receive only their view model, the overlay, and the transition settings.
- The server sends the full payload on connect and on every change. Payloads are small (a few KB).
- The server tracks connected output clients per output and per view, which drives the connection lights.

### Persistence

- `data/state.json` is written atomically (temp file, then rename), debounced by 200 ms.
- On startup the previous file is copied to `data/backups/` (the last 10 are kept).
- **Export/Import** downloads or uploads the whole show as one JSON file.

## 4. Outputs and formats

### Output config

```ts
{ id, name, format: 'wide' | 'twin' | 'hd', safeArea: { top, right, bottom, left }, graphicsScale }
```

- `id` is the URL slug.
- Default outputs: `wide` (wide), `twins` (twin), `stream` (hd), `pillars` (hd).
- Outputs are added, edited and removed in the **Outputs** tab, which also has a copy-URL button for each.

### Rendering rules

- Each page renders on a fixed-pixel canvas matching its format, with no scaling inside the page.
- `html, body` are transparent. The background layer, when on, is opaque.
- **Layer order, bottom to top:** Background → Scene → Track card → Lower thirds → HOLD overlay → FTB overlay.

### What each format supports

| Format | Backgrounds | Scenes | Track card | Lower thirds |
|---|---|---|---|---|
| Wide 3840×1152 | A / B / C | Title, Line-up, Next race, Standings, Winner | top-left | selected players, centred row (scaled up) |
| Twin 1920×1152 | A / B / C | Title only (per half) | top-left of **each** half | fixed: P1+P2 left half, P3+P4 right half, side by side |
| HD 1920×1080 | A / B / C | Title, Line-up, Next race, Standings, Winner (HD layouts) | top-left | selected players (1–4), centred row |

**Layout details**
- **Safe area:** margins are applied to every overlay position. This allows for LED edges hidden by the stage or set.
- **Graphics scale:** multiplies overlay size per output.
- **Twin lower thirds:** 430×160 px each, at x = 40 and 490 within each 960 half, 70 px from the bottom plus the safe area.

## 5. Graphics

The approved mockups are the visual source of truth. The real build uses game art and real fonts.

### Backgrounds

All three animate continuously using `transform`/`opacity` only.

- **A · Menu Sky**
  - Cyan → royal gradient (`#25c8f6 → #0e9ce6 → #0b72d8 → #2b4ec6`).
  - Faint checkerboard on the right; drifting crest outlines; a light sweep every 9 s; twinkling sparkles.
  - Two large watermark lines showing the operator's **watermark text** (default "MARIO KART") in the Event-title font.
- **B · Icon Pattern**
  - `#0553a6` with a `#03458f` tone-on-tone icon tile: wheel, shield "8", road sign, tyres, speedo, star, mushroom, item box, flag.
  - Drifts diagonally on a 38 s loop with a light vignette.
- **C · Sticker Wall**
  - `#f3f3f3` with a grey sticker sheet laid out on a 24 px grid.
  - Two wordmark bands showing the watermark text, offset by half a tile.
  - Drifts sideways on an 80 s loop.
  - Black kart and bike silhouettes drive along a road line; a logo plate shows the event title and pre-title.
  - Sticker text auto-fits its box.

### Event title lockup

- A yellow skewed **pre-title** pill, then the **title** plus an **accent**.
- **S1 Chrome:**
  - Title in a chrome gradient (`#fff → #c3cad3 → #4f5a67 | #7f8a97 → #fff`) with a 30 px dark outline and drop shadow.
  - Accent in the iridescent "8" gradient (`#8be6ff → #2a7bff → #6a3dff → #e02fbf → #ff5a2e`).
- **S3 Classic:** white title, navy outline and drop shadow, yellow accent.

### Lower thirds (Medallion)

- A gold medallion (gradient `#fff4ad → #ffd21f → #e5a400 → #b97c00`, dark rim) with the headshot on navy and ★★★ underneath.
- A navy bar (`#1d4870 → #0e2a46`) with a slanted right end, a fading checker pattern, and a player-colour stripe across the top.
- A skewed **P#** chip in the player colour.
- **Name** in the Names font; **character** in the Labels font, uppercase, light cyan.

### Track card (T1)

- The cup emblem in the same gold medallion as the lower thirds.
- A navy bar with a yellow top stripe, containing the race chip (`RACE 2 / 4`), cup name and track name.
- **In single-track mode** the medallion shows that track's cup emblem and the chip reads `RACE n` (n = races saved + 1).

### Scenes (Wide and HD)

- **Line-up:** "THE RACERS" heading and four cards, each with a big medallion, P# chip, name and character.
- **Next race:** a large track image in a gold frame, the cup medallion badge, "NEXT RACE" and "RACE n / 4" chips, the track name in the Headings font, and the cup name.
  - In cup mode with no race selected yet, it shows the cup with its 4 track tiles.
- **Standings:** MK8-results style.
  - The leader's row is yellow (`#fff27a → #ffeb02`); the others are translucent navy with a player-colour edge.
  - Each row shows the last race's points as a chip (`+15`) and the total.
  - Rows re-sort with a FLIP animation.
  - Footer: "AFTER RACE n · CUP".
- **Winner:** spinning ray burst, a bobbing big medallion, confetti, "WINNER" heading, name, character and points. Shown on background A by default.

### Text fitting (applies to every operator-typed text)

- **Names, track names, sticker text:** shrink the font 1 px at a time down to a floor of **60%** of its base size. If it still doesn't fit, compress the text horizontally (`scaleX`) until it does. Text never overflows and never becomes tiny.
- **Event title line:** shrinks with no floor to its maximum width: wide **3600** px, HD **1800** px, each twin half **900** px. Base sizes are wide 210 / pre-title 58, HD 150 / 42, twin 92 / 26. Outline and drop shadow are in `em`, so they shrink with the text.

### Typography

Each role has a font and a fallback stack, and each role is chosen independently.

| Role | Used for | Default |
|---|---|---|
| Event title | Title lockup, A/C watermarks | **Mario Kart F2** (letters only) → **Lexend Zetta 900** for digits, space and punctuation |
| Headings | Scene headings, track names | **Exo 2 900 italic**, **Classic** look |
| Names & numbers | Player names, positions, points | **Rubik 900 italic** |
| Labels | Character, cup, chips, small text | **Rubik 800** |

- **Heading looks:** Chrome, Classic or Plain.
- **Bundled fonts** (self-hosted, offline): Rubik, Exo 2, Saira, Roboto, Lexend Zetta, Titan One, Lilita One, Russo One, Baloo 2, Luckiest Guy, and Mario Kart F2 from `assets/fonts/mario_kart_f2.ttf`. The free fonts come from `@fontsource` packages.
- **Mario Kart F2's numbers are serif placeholder glyphs.** So its `@font-face` uses `unicode-range: U+0041-005A, U+0061-007A`; everything else falls through to Lexend Zetta.
- **Uploaded fonts** (ttf/otf/woff/woff2, through Text & Fonts) are saved to `data/uploads/fonts/` and appear in every role's list. Every stack ends in a bundled fallback.
- **Before showing anything**, pages wait for `document.fonts.ready` and for image preloads, then reveal.

### Player colours

| Colour | Hex |
|---|---|
| Red | `#e60012` |
| Blue | `#1e6cff` |
| Green | `#22b14c` |
| Yellow | `#ffc400` |
| Pink | `#ff5fa2` |
| Orange | `#ff8a00` |
| Purple | `#8b5cf6` |
| Cyan | `#06b6d4` |

- Defaults: P1 red, P2 blue, P3 green, P4 yellow.
- Chip text is dark on light colours (yellow, cyan) and white otherwise.

### Motion

- **AUTO**
  - Elements enter with a pop or slide using overshoot easing `cubic-bezier(.24,.63,.38,1.22)`, staggered 80 ms left to right.
  - Duration by speed setting: Fast 0.3 s, Normal 0.5 s, Slow 0.9 s.
  - Exits are 60% of the enter duration, ease-in.
  - When data changes on an element already on air: the medallion flips and the text cross-fades.
  - Scene changes cross-fade.
- **CUT:** no animation.
- **First paint after a page (re)load always renders as a CUT.** Millumin reloads pages, and an intro animation must never replay because of that.
- **Performance:** animate only `transform` and `opacity`. No large `filter: blur` at 3840 px; neon drop-shadows are limited. Particle counts are capped and reduced further with `lowfx`.

## 6. Control page (`/control`)

A standard, neutral, dark operator UI: system font and a blue accent (`#3b82f6`). Broadcast colours mean something here: green = Preview, red = Program, amber = HOLD. It's laid out for 1440×900 and up. The reference is `control-v3.html`.

### Top bar

Title, "Now: Race n / 4 · Cup · Track", a connection light per output, and the clock.

### Left panel tabs

- **Show** (the default tab) has three stacked cards:
  - **Players:** 4 rows of P# · Name · **Character** (searchable dropdown with icon; colour variants are their own entries, e.g. "Yoshi (Red)") · **Colour** (8 presets).
  - **Race:**
    - A Cup / Single track toggle.
    - A cup dropdown showing the emblem; 4 race tiles with thumbnails, done races dimmed and the current one highlighted; ◀ ▶ to step.
    - In single-track mode, a searchable track dropdown grouped by cup.
    - **Random** picks a cup or track not played yet.
  - **Results** (current race):
    - Per player: a finishing-position select (1st–12th). Points and running total fill in automatically.
    - **Save results.** Duplicate positions trigger a warning but can still be saved.
    - **Edit totals…** for manual adjustments.
    - Earlier races can be reopened and edited.
- **Text & Fonts:**
  - Pre-title, title, accent, watermark and hold message.
  - Event title style (Chrome/Classic).
  - A font and look for each role.
  - Font upload and the font list.
- **Outputs:** list and edit outputs (name, format, URL with copy, connected clients, safe area, graphics scale); add or remove.
- **Settings:**
  - Export/Import show; reset scores; reset show.
  - Asset catalog status and server LAN URLs.
  - Reset the on-air timer.

### Right panel

- **Output tabs:** connection light plus a pending-change count on each.
- **PREVIEW** and **PROGRAM** monitors. These are live iframes of `/out/:id?view=preview&lowfx=1` and `/out/:id?lowfx=1`, scaled to fit.
- **Layer controls** for the selected output:
  - Background: A / B / C / None.
  - Scene: None / Title / Line-up / Next race / Standings / Winner (only the scenes that output's format supports).
  - Overlays: Track card and Lower thirds toggles. HD and Wide outputs also get a P1–P4 picker.
  - A green fill means set in Preview; a red underline means on air.
- An **Open Multiview** button.

### Master bar (always visible at the bottom)

| Section | Contents |
|---|---|
| Take to | One arm chip per output, showing connection and pending count; plus **ALL** |
| Transition | **CUT**, **AUTO**, and speed Fast / Normal / Slow |
| Emergency (all outputs, instant) | **HOLD** (toggle, uses the hold message), **CLEAR**, **FTB** (toggle) |

**Keyboard shortcuts**
- **Space** = AUTO
- **Enter** = CUT
- **1–9** = arm/disarm outputs in order
- **H** = HOLD
- **Shift+Esc** = CLEAR
- **Shift+B** = FTB

Shortcuts are ignored while a text field has focus, except the emergency ones.

## 7. Multiview (`/multiview`)

- A 1920×1080 layout that scales to the window.
- **Tiles** are scaled iframes of the real output pages with `lowfx=1`:
  - The Wide **Program** across the top.
  - The Wide **Preview**.
  - An info tile: clock, on-air timer, current race.
  - A standings tile (from Program) plus "Up next".
  - Program tiles for every other output.
- If the output list changes, wide-format outputs go full width at the top and the rest flow in a row.
- **Borders:** red = Program, green = Preview, amber on every tile during HOLD.
- Each tile is labelled with its output name and whether that output's client is connected.

## 8. Data and assets

### Catalog (`assets/catalog.json`)

- `characters[]`: `{ id, name, base, variant?, icon, art? }`, in roster order. Colour and costume variants are their own entries.
- `cups[]`: `{ id, name, emblem, tracks[4] }`, for all 24 cups.
- `tracks[]`: `{ id, name, cupId, thumb, image? }`, for all 96 tracks.

### `npm run fetch-assets` (`scripts/fetch-assets.ts`)

**Behaviour**
- Uses the Mario Wiki MediaWiki API (`https://www.mariowiki.com/api.php`).
- Sends a **generic User-Agent naming only the tool** (`mk-event-graphics/1.0 (asset fetch)`), with no personal data.
- Makes at most 1 request per second, and batches `titles=` 50 at a time.
- Downloads into `assets/`, skips files it already has, and writes `catalog.json`.
- Reports anything missing; `assets/overrides.json` fills gaps by hand.
- Run it once with internet access. The results are committed so the venue needs no internet.

**Image sources**

| Asset | File pattern | Notes |
|---|---|---|
| Character icons | `MK8DX <Name> Icon.png` | Exceptions: `MK8 Bowser Jr Icon.png`, `MK8D Birdo Icon.png`, `MK8D BotW Link Icon.png`, `MK8DX DK Icon.png`, `MK8DX Female Inkling Icon.png`, etc. |
| Character variants | `MK8 <Colour> Yoshi Icon.png`, `MK8 <Colour> Shy Guy Icon.png`, `MK8D Birdo <Colour> Icon.png`, Inkling/Villager/Link/Gold Mario variants | 128 px |
| High-res character art | Known artwork patterns, e.g. `MK8 <Name> … Artwork.png` | Optional. Medallions fall back to icons, which work at the sizes used. |
| Track thumbnails | `MK8D <Prefix> <Name> Course Icon Full.png` | 288×162. Source: `Category:Mario_Kart_8_/_Mario_Kart_8_Deluxe_course_icons`. |
| Large track images (Next race scene) | `MK8 <Name>.png` (e.g. 2560×1440) | Where it exists; otherwise the thumbnail |
| Cup emblems | `MK8 MushroomCup.png`, `MK8 FlowerCup.png`, `MK8 <X> Cup Emblem.png`, `MK8D BCP <X> Emblem.png` | |

**Excluded:** British-English duplicate files, battle courses, and placeholder icons.

### Scoring (`shared/scoring.ts`)

- Points by finishing position, 1st to 12th: **15, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1**.
- Total = sum of race points + manual adjustment.
- Standings sort by total. A tie shares the same position; the shared rows are ordered by the latest race finish.

## 9. Reliability and error handling

- **Outputs**
  - WebSockets reconnect with backoff (0.5 s, growing to 5 s), with a 5 s heartbeat.
  - On reconnect the output gets the full state and re-renders as a CUT.
  - While disconnected, outputs keep their last frame. They never show errors (except with `debug=1`).
- **Control page:** a visible "disconnected" banner, and all inputs and buttons are disabled until it reconnects.
- **Server**
  - Commands are validated; invalid ones are rejected and logged.
  - State is saved atomically with rotating backups. On a crash it restarts with the same state (run with a simple supervisor or `--watch` in production mode).
- **Missing assets** render a neutral placeholder: an empty medallion, or the cup emblem as track art. They never break a layout.
- **Network:** a wired switch connecting all laptops is recommended. Millumin uses `http://<control-host>.local:8080/out/<id>`.

## 10. Testing

| Kind | Coverage |
|---|---|
| **Unit** (Vitest, `shared/`) | Scoring; the reducer (take/cut/auto, hold, clear, ftb, arming, pending-diff); `deriveView` for each format and scene; catalog integrity (24 cups × 4 tracks, every referenced file exists). |
| **Server integration** | WebSocket protocol: subscribe → payload; take → broadcast to the right outputs only; reconnect → full state; persistence round-trip; import/export. |
| **Visual / E2E** (Playwright, Chromium) | Render every format × scene × background and compare screenshots; transparent body when no background; control → take → output updates. |
| **Chromium 103 smoke test** | Load each page in a Chromium 103 build (e.g. the version bundled with an older Puppeteer). Assert no console errors and that the first render happens. |
| **Performance** | Frame rate of the Wide output with background A and a scene at 3840×1152. Budget: ≥ 58 fps on the output Mac. Lower particle counts if it falls short. |
| **Rehearsal** | The Millumin runbook in `docs/millumin-runbook.md`. |

**Millumin runbook outline**
- Browser media pointed at the output URL.
- Render size = output canvas.
- Framerate 60.
- `transparent` on for overlay outputs.
- `keep hot` on (needs Millumin 5.15+ on macOS 26 because of a known freeze bug).
- Keep the Millumin window in front.

## 11. Priorities (one-week delivery)

### P0: must work for the show

- Server, state, WebSocket and persistence.
- Asset script and catalog.
- Control page:
  - Show tab: Players, Race, Results.
  - Output layer controls and monitors.
  - Master bar: arm, CUT/AUTO, HOLD, CLEAR, FTB.
- Outputs:
  - Backgrounds A and B.
  - Event title (S1/S3).
  - Lower thirds on Twin and HD.
  - Track card T1.
- Millumin runbook.

### P1: planned for the show

- Wide scenes: Line-up, Next race, Standings, Winner.
- Scoring UI polish.
- Multiview.
- Text & Fonts tab with font roles and looks.
- Background C.
- HD scene layouts.

### P2: if time allows

- Font upload.
- Export/Import.
- Automated Chromium 103 smoke test.
- Extra animation polish.

## 12. Risks and open items

- **Licensing**
  - Mario Kart F2 is "free for personal use". Using it at a company event is the owner's call; contacting the designer is an option.
  - Nintendo art is used for an internal event, also the owner's call.
- **High-res character art** may not exist for every character. Icons are the fallback.
- **Millumin performance at 3840×1152** isn't documented. Benchmark on the real output Mac early in the week.
- **Venue network:** confirm the switch, cabling and whether `.local` names resolve. If they don't, use fixed IPs.
