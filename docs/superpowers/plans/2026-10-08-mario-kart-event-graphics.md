# Mario Kart Event Graphics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an offline, LAN-hosted live-graphics system for a 4-player Mario Kart 8 Deluxe tournament. It has one URL per output for Millumin, a control page with Preview → Program (CUT/AUTO) workflow and a master bar, and a multiview page.

**Architecture:**
- A single Node/TypeScript process serves three Vite-built Svelte 5 pages (control, out, multiview) plus local assets, and syncs state over WebSocket.
- All state logic lives in pure, unit-tested `shared/` modules: zod schemas, reducer, `deriveView`, scoring. The server validates commands, applies the reducer, persists `data/state.json`, and broadcasts.
- Output pages render a precomputed `ViewModel`. Program = the snapshot taken at the last TAKE; Preview = derived live from the draft.

**Tech Stack:** Node 20+, TypeScript (strict, ESM), `ws`, `zod`, Svelte 5 (runes), Vite + `@sveltejs/vite-plugin-svelte`, lightningcss, `@fontsource/*`, `tsx`, Vitest, Playwright, `sharp` (asset script only), `puppeteer@14` (Chromium 103 smoke test only).

**Spec:** `docs/superpowers/specs/2026-10-08-mario-kart-event-graphics-design.md`. **Visual source of truth: `docs/mockups/`.** Read `docs/mockups/README.md` before any graphics or UI task, and serve the repo root (`python3 -m http.server 8765`) to view the pages at <http://localhost:8765/docs/mockups/>.

## Global Constraints

### Visual reference

- Copy `docs/mockups/shared/tokens.css` verbatim to `web/src/graphics/tokens.css`. Port the blocks of `docs/mockups/shared/graphics.css` into the Svelte components, **keeping every number and class name**.
- Each graphics task names its reference page. Compare the result side by side with that page, using the same sample data, before accepting screenshots as baselines.

### Runtime and build

- Node ≥ 20. TypeScript `strict: true`. ESM (`"type": "module"`).
- **Output pages must run in Chromium 103 (Millumin).**
  - Vite `build.target` and `build.cssTarget` are `'chrome103'`.
  - CSS goes through lightningcss with targets from browserslist `chrome 103`.
  - `.browserslistrc` = `chrome 103`.
  - Never use: `:has()`, container queries, CSS nesting in shipped CSS, `color-mix()`, `oklch()`, the separate `translate`/`rotate`/`scale` properties, `@starting-style`, View Transitions, `linear()` easing, `text-wrap: balance`, `Array.prototype.toSorted`, `Object.groupBy`.
- **No internet at runtime.** Fonts and images are served from the project. No CDN URLs anywhere in `web/`.
- The server listens on `0.0.0.0`, port from `PORT` (default **8080**). Data directory from `DATA_DIR` (default `./data`).

### Canvases

| Format | Size |
|---|---|
| `wide` | 3840×1152 |
| `twin` | 1920×1152 (halves 960 wide) |
| `hd` | 1920×1080 |

- Pages render at fixed pixel size; `html, body` are transparent.
- Layer order, bottom to top: Background → Scene → Track card → Lower thirds → HOLD → FTB.

### Motion

- Animate `transform` and `opacity` only.
- **AUTO** enter durations: fast **300** ms, normal **500** ms, slow **900** ms.
- Exit duration = **0.6 ×** enter. Stagger **80 ms**. Easing `cubic-bezier(.24,.63,.38,1.22)`.
- **CUT** = 0 ms. The first render after page load is always a CUT.

### Scoring and colours

- Points for 1st–12th: **15, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1**. Total = sum + manual adjustment.
- Player colours (ids → hex): `red #e60012`, `blue #1e6cff`, `green #22b14c`, `yellow #ffc400`, `pink #ff5fa2`, `orange #ff8a00`, `purple #8b5cf6`, `cyan #06b6d4`.
- Defaults: P1 red, P2 blue, P3 green, P4 yellow.
- Chip text is `#14213d` on yellow and cyan, `#ffffff` otherwise.

### Fonts

- Default font roles: Event title **Mario Kart F2** (style `chrome`); Headings **Exo 2** (look `classic`); Names **Rubik**; Labels **Rubik**.
- Mario Kart F2 is served from `/assets/fonts/mario_kart_f2.ttf` as family `"MK F2"` with `unicode-range: U+0041-005A, U+0061-007A`. Its stack is `"MK F2","Lexend Zetta",sans-serif`.

### Control UI

- Neutral dark theme, system font stack, accent `#3b82f6`.
- Preview green `#16a34a`, Program red `#dc2626`, HOLD amber `#f59e0b`. Not game-styled.

### Persistence

- `data/state.json` is written atomically (temp file, then rename), debounced **200 ms**.
- On startup the previous file is copied into `data/backups/`; keep the newest **10**.

### Asset fetch

- Base URL `https://www.mariowiki.com/api.php`.
- User-Agent exactly `mk-event-graphics/1.0 (asset fetch)`. No personal data in any request.
- At most **1 request/second**. `titles=` batches of **50**.

### Errors

- Output pages never show errors or debug UI unless `?debug=1`.
- The control page shows a "Disconnected" banner and disables inputs while the socket is down.

## Review Focus

These are the input classes the spec implies but feature tests wouldn't naturally cover. Each one has a pinned test in the task named.

1. **Long text.** Player names (e.g. 28 characters) and long track names (e.g. "Tour Singapore Speedway") must shrink to fit their bar or card and never overflow. → Task 10 (lower third, track card), Task 13 (standings row).
2. **Corrupt or hand-edited `data/state.json` at startup.** The server must start from the newest valid backup, else from defaults, and never crash. → Task 6.
3. **Millumin reloads an output mid-show.** The page must show the current Program immediately, with no intro animation replay. → Task 9.
4. **An output URL whose output doesn't exist** (typo, renamed, removed). The page stays transparent and connected, and starts rendering as soon as that output id exists. → Task 7 (server), Task 9 (page).
5. **Incomplete or duplicate finishing positions.** Saving is allowed with a warning; a missing position (0) scores 0; standings still render. → Task 3 (scoring), Task 12 (UI).

---

## File Map

```
package.json  tsconfig.json  vite.config.ts  vitest.config.ts  playwright.config.ts  .browserslistrc  eslint.config.js
shared/
  catalog.ts      Catalog types + indexCatalog()
  palette.ts      PLAYER_COLOURS, colourHex(), textOn()
  fonts.ts        BUNDLED_FONTS, fontStack(), isUpright()
  scoring.ts      POINTS, pointsFor(), totals(), standings()
  schema.ts       zod schemas: show state, show file, commands
  types.ts        z.infer types + ViewModel interfaces
  view.ts         deriveView(), SUPPORTED_SCENES, FORMAT_CANVAS
  diff.ts         countPendingChanges()
  defaults.ts     createDefaultState(), EMPTY_LAYERS, DEFAULT_OUTPUTS
  reducer.ts      reduce(), CommandError
  protocol.ts     client/server message types, buildOutputPayload(), buildControlPayload()
server/
  app.ts          startServer()
  index.ts        CLI entry (env/args → startServer, print LAN URLs)
  store.ts        StateStore (load/backup/persist/dispatch)
  http.ts         createHttpHandler()
  ws.ts           attachSockets()
  lan.ts          lanUrls()
scripts/
  lib/catalog-data.ts   roster + cup/track tables, wiki title builders
  lib/mariowiki.ts      queryImageInfo(), downloadFile(), rate limit
  fetch-assets.ts       builds assets/ + assets/catalog.json
  smoke-chrome103.ts    Chromium 103 smoke + fps probe (P2)
assets/  characters/ tracks/ cups/ fonts/ catalog.json overrides.json
web/
  control.html out.html multiview.html
  src/lib/        socket.ts ready.ts fit.ts fonts.css fit-text.ts
  src/graphics/   Output.svelte motion.ts layouts.ts Medallion.svelte LowerThird.svelte LowerThirdsLayer.svelte
                  TrackCard.svelte TrackCardLayer.svelte TitleLockup.svelte Heading.svelte SceneLayer.svelte
                  backgrounds/{SkyBackground,IconPattern,StickerWall}.svelte backgrounds/icons.ts
                  scenes/{TitleScene,LineupScene,NextRaceScene,StandingsScene,WinnerScene}.svelte
                  overlays/{HoldOverlay,Ftb}.svelte
  src/out/main.ts
  src/control/    main.ts Control.svelte store.ts shortcuts.ts catalog.ts styles.css
                  TopBar.svelte Monitors.svelte LayerControls.svelte MasterBar.svelte
                  tabs/{ShowTab,TextFontsTab,OutputsTab,SettingsTab}.svelte
                  show/{PlayersCard,RaceCard,ResultsCard}.svelte
                  components/{CharacterSelect,ColourSelect,TrackSelect}.svelte
  src/multiview/  main.ts Multiview.svelte layout.ts
tests/
  fixtures/catalog.ts  shared/*.test.ts  server/*.test.ts  web/*.test.ts  e2e/*.spec.ts  e2e/helpers.ts
docs/millumin-runbook.md
```

---

## P0: Must work for the show

### Task 1: Project scaffold and Chromium 103 tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `.browserslistrc`, `eslint.config.js`
- Create: `web/control.html`, `web/out.html`, `web/multiview.html`
- Create: `web/src/control/main.ts`, `web/src/out/main.ts`, `web/src/multiview/main.ts` (each mounts a placeholder Svelte component)

**Interfaces:**
- Produces these npm scripts:
  - `dev`: `tsx watch server/index.ts --dev`
  - `build`: `vite build`
  - `start`: `tsx server/index.ts`
  - `fetch-assets`: `tsx scripts/fetch-assets.ts`
  - `test`: `vitest run`
  - `test:e2e`: `playwright test`
  - `lint`: `eslint web/src shared`
- `dist/` contains `control.html`, `out.html` and `multiview.html` after a build.

- [ ] **Step 1: Create the config.**
  - Dependencies: `svelte@^5`, `ws`, `zod`, `@fontsource/{rubik,exo-2,saira,roboto,lexend-zetta,titan-one,lilita-one,russo-one,baloo-2,luckiest-guy}`.
  - Dev dependencies: `vite`, `@sveltejs/vite-plugin-svelte`, `typescript`, `tsx`, `vitest`, `@playwright/test`, `@types/ws`, `@types/node`, `lightningcss`, `browserslist`, `sharp`, `eslint`, `typescript-eslint`, `eslint-plugin-svelte`, `eslint-plugin-compat`.
  - Vite settings:
    - `root: 'web'`, `build.outDir: '../dist'`, `emptyOutDir: true`.
    - Rollup inputs `control`, `out`, `multiview` → the three HTML files.
    - `build.target = build.cssTarget = 'chrome103'`.
    - `css.transformer: 'lightningcss'` with `lightningcss.targets = browserslistToTargets(browserslist('chrome 103'))`, and `build.cssMinify: 'lightningcss'`.
  - Vitest: `include: ['tests/**/*.test.ts']`, `passWithNoTests: true`.
  - Playwright:
    - `testDir: 'tests/e2e'`, Chromium project, `viewport` 1920×1200.
    - `workers: 1`, `fullyParallel: false`. All specs share one server, so they must run one at a time.
    - `webServer.command: 'npm run build && PORT=8099 DATA_DIR=.e2e-data tsx server/index.ts --fresh'`, `url: 'http://localhost:8099/control'`.
  - ESLint: `plugin:compat/recommended` over `web/src/**/*.{ts,svelte}`.
- [ ] **Step 2: Run `npm install && npm run build`.** Expected: exits 0, and `ls dist` shows `control.html multiview.html out.html assets/`.
- [ ] **Step 3: Run `npm run lint && npm test`.** Expected: both exit 0 (no tests yet).
- [ ] **Step 4: Commit.**

```bash
git add -A && git commit -m "chore: scaffold Svelte 5 + Vite (chrome103) + Node project"
```

### Task 2: Asset catalog and fetch script

**Files:**
- Create: `shared/catalog.ts`, `scripts/lib/catalog-data.ts`, `scripts/lib/mariowiki.ts`, `scripts/fetch-assets.ts`, `assets/overrides.json` (`{}`)
- Create: `tests/fixtures/catalog.ts`, `tests/shared/catalog.test.ts`, `tests/shared/catalog-data.test.ts`
- Generated: `assets/catalog.json`, `assets/characters/*.png`, `assets/cups/*.png`, `assets/tracks/*.png`, `assets/tracks/*-large.jpg`

**Interfaces:**
- Produces these types (`shared/catalog.ts`):

```ts
interface CharacterEntry { id: string; name: string; base: string; variant?: string; icon: string; art?: string }
interface CupEntry { id: string; name: string; emblem: string; tracks: [string, string, string, string] }
interface TrackEntry { id: string; name: string; cupId: string; thumb: string; image?: string }
interface Catalog { characters: CharacterEntry[]; cups: CupEntry[]; tracks: TrackEntry[] }
interface CatalogIndex extends Catalog { character(id: string): CharacterEntry | undefined; cup(id: string): CupEntry | undefined; track(id: string): TrackEntry | undefined; tracksOfCup(cupId: string): TrackEntry[] }
function indexCatalog(c: Catalog): CatalogIndex
```

- Asset URL paths in the catalog:
  - `/assets/characters/{id}.png`
  - `/assets/cups/{id}.png`
  - `/assets/tracks/{id}.png` (thumbnail, 288×162)
  - `/assets/tracks/{id}-large.jpg` (≤1600 px wide, JPEG quality 85, optional)
- Ids are kebab-case of the display name. Variants are `{baseId}-{variant}` (e.g. `yoshi-red`, `yoshi-light-blue`) with name `"Yoshi (Red)"`.
- Produces `tests/fixtures/catalog.ts` exporting `fixtureCatalog: Catalog`:
  - Characters: `mario`, `luigi`, `peach`, `yoshi`, `yoshi-red`, `bowser`, `pink-gold-peach`, `peachette`.
  - Cups: `mushroom` (the 4 real tracks) and `flower` (the 4 real tracks).
  - File paths follow the URL patterns above.
- Produces in `scripts/lib/catalog-data.ts`:
  - `kebab(s)`
  - `characterIconCandidates(name: string): string[]`
  - `trackThumbTitle(name)`, `trackLargeCandidates(name)`
  - `cupEmblemTitle(cupId)`
  - `CHARACTER_SPECS`, `CUP_SPECS`

**Data to encode in `catalog-data.ts`.**

**Roster order (base characters):**

> Mario, Luigi, Peach, Daisy, Rosalina, Tanooki Mario, Cat Peach, Birdo, Yoshi, Toad, Koopa Troopa, Shy Guy, Lakitu, Toadette, King Boo, Petey Piranha, Baby Mario, Baby Luigi, Baby Peach, Baby Daisy, Baby Rosalina, Metal Mario, Gold Mario, Pink Gold Peach, Wiggler, Wario, Waluigi, Donkey Kong, Bowser, Dry Bones, Bowser Jr., Dry Bowser, Kamek, Lemmy, Larry, Wendy, Ludwig, Iggy, Roy, Morton, Peachette, Inkling Girl, Inkling Boy, Villager (Boy), Villager (Girl), Isabelle, Link, Diddy Kong, Funky Kong, Pauline, Mii

**Icon title candidates.**
- Default: `MK8DX {Name} Icon.png`, then `MK8D {Name} Icon.png`, then `MK8 {Name} Icon.png`.
- Exceptions:

| Character | Icon title |
|---|---|
| Donkey Kong | `MK8DX DK Icon.png` |
| Bowser Jr. | `MK8 Bowser Jr Icon.png` |
| Birdo | `MK8D Birdo Icon.png` |
| Inkling Girl | `MK8DX Female Inkling Icon.png` |
| Inkling Boy | `MK8DX Male Inkling Icon.png` |
| Villager (Boy) | `MK8DX Male Villager Icon.png` |
| Villager (Girl) | `MK8DX Female Villager Icon.png` |
| Mii | `Mii MK8.png` |

**Variants** (inserted right after their base):

| Base | Variants | Icon title |
|---|---|---|
| Yoshi | Light-Blue, Black, Red, Yellow, White, Blue, Pink, Orange | `MK8 {V} Yoshi Icon.png` |
| Shy Guy | Light-Blue, Black, Green, Yellow, White, Blue, Pink, Orange | `MK8 {V} Shy Guy Icon.png` |
| Birdo | Light-Blue, Black, Red, Yellow, White, Blue, Green, Orange | `MK8D Birdo {V} Icon.png` |
| Inkling Girl | Green | `MK8D Green Inkling Icon.png` |
| Inkling Girl | Pink | `MK8D Pink Inkling Icon.png` |
| Inkling Boy | Purple | `MK8D Purple Inkling Icon.png` |
| Inkling Boy | Cyan | `MK8D Cyan Inkling Icon.png` |
| Link | Champion's Tunic | `MK8D BotW Link Icon.png` |

**Optional art:** try `MK8DX - {Name} artwork transparent.png`; it's fine if it's missing.

**Cups:** id, name, then 4 tracks in order. Track display names include the console prefix.

| Cup id | Tracks |
|---|---|
| mushroom | Mario Kart Stadium; Water Park; Sweet Sweet Canyon; Thwomp Ruins |
| flower | Mario Circuit; Toad Harbor; Twisted Mansion; Shy Guy Falls |
| star | Sunshine Airport; Dolphin Shoals; Electrodrome; Mount Wario |
| special | Cloudtop Cruise; Bone-Dry Dunes; Bowser's Castle; Rainbow Road |
| shell | Wii Moo Moo Meadows; GBA Mario Circuit; DS Cheep Cheep Beach; N64 Toad's Turnpike |
| banana | GCN Dry Dry Desert; SNES Donut Plains 3; N64 Royal Raceway; 3DS DK Jungle |
| leaf | DS Wario Stadium; GCN Sherbet Land; 3DS Music Park; N64 Yoshi Valley |
| lightning | DS Tick-Tock Clock; 3DS Piranha Plant Slide; Wii Grumble Volcano; N64 Rainbow Road |
| egg | GCN Yoshi Circuit; Excitebike Arena; Dragon Driftway; Mute City |
| triforce | Wii Wario's Gold Mine; SNES Rainbow Road; Ice Ice Outpost; Hyrule Circuit |
| crossing | GCN Baby Park; GBA Cheese Land; Wild Woods; Animal Crossing |
| bell | 3DS Neo Bowser City; GBA Ribbon Road; Super Bell Subway; Big Blue |
| golden-dash | Tour Paris Promenade; 3DS Toad Circuit; N64 Choco Mountain; Wii Coconut Mall |
| lucky-cat | Tour Tokyo Blur; DS Shroom Ridge; GBA Sky Garden; Ninja Hideaway |
| turnip | Tour New York Minute; SNES Mario Circuit 3; N64 Kalimari Desert; DS Waluigi Pinball |
| propeller | Tour Sydney Sprint; GBA Snow Land; Wii Mushroom Gorge; Sky-High Sundae |
| rock | Tour London Loop; GBA Boo Lake; 3DS Rock Rock Mountain; Wii Maple Treeway |
| moon | Tour Berlin Byways; DS Peach Gardens; Merry Mountain; 3DS Rainbow Road |
| fruit | Tour Amsterdam Drift; GBA Riverside Park; Wii DK Summit; Yoshi's Island |
| boomerang | Tour Bangkok Rush; DS Mario Circuit; GCN Waluigi Stadium; Tour Singapore Speedway |
| feather | Tour Athens Dash; GCN Daisy Cruiser; Wii Moonview Highway; Squeaky Clean Sprint |
| cherry | Tour Los Angeles Laps; GBA Sunset Wilds; Wii Koopa Cape; Tour Vancouver Velocity |
| acorn | Tour Rome Avanti; GCN DK Mountain; Wii Daisy Circuit; Piranha Plant Cove |
| spiny | Tour Madrid Drive; 3DS Rosalina's Ice World; SNES Bowser Castle 3; Wii Rainbow Road |

**Cup emblem titles:**
- `mushroom` → `MK8 MushroomCup.png`; `flower` → `MK8 FlowerCup.png`.
- star, special, shell, banana, leaf, lightning, egg, triforce, crossing, bell → `MK8 {Name} Cup Emblem.png`.
- The 12 Booster Course Pass cups → `MK8D BCP {Name} Emblem.png`, where Name is Golden Dash, Lucky Cat, Turnip, Propeller, Rock, Moon, Fruit, Boomerang, Feather, Cherry, Acorn, Spiny.

**Track titles:**
- Thumbnail: `MK8D {Track} Course Icon Full.png`.
- Large candidates: `MK8 {Track}.png`, then `MK8D {Track}.png`. Request with `iiurlwidth=1600` and save as JPEG via `sharp`.

- [ ] **Step 1: Write failing tests.**

```ts
// tests/shared/catalog-data.test.ts
expect(trackThumbTitle('Wii Moo Moo Meadows')).toBe('MK8D Wii Moo Moo Meadows Course Icon Full.png')
expect(cupEmblemTitle('mushroom')).toBe('MK8 MushroomCup.png')
expect(cupEmblemTitle('star')).toBe('MK8 Star Cup Emblem.png')
expect(cupEmblemTitle('golden-dash')).toBe('MK8D BCP Golden Dash Emblem.png')
expect(characterIconCandidates('Petey Piranha')).toEqual(['MK8DX Petey Piranha Icon.png','MK8D Petey Piranha Icon.png','MK8 Petey Piranha Icon.png'])
expect(characterIconCandidates('Donkey Kong')[0]).toBe('MK8DX DK Icon.png')
expect(CUP_SPECS).toHaveLength(24); expect(CUP_SPECS.flatMap(c => c.tracks)).toHaveLength(96)
expect(CHARACTER_SPECS.map(c => c.id)).toContain('yoshi-red')
// tests/shared/catalog.test.ts (fixture)
const idx = indexCatalog(fixtureCatalog)
expect(idx.character('yoshi-red')?.name).toBe('Yoshi (Red)')
expect(idx.tracksOfCup('mushroom').map(t => t.name)).toEqual(['Mario Kart Stadium','Water Park','Sweet Sweet Canyon','Thwomp Ruins'])
expect(idx.character('nope')).toBeUndefined()
```

- [ ] **Step 2: Run `npx vitest run tests/shared/catalog` and confirm it FAILS** (modules not found).
- [ ] **Step 3: Implement `catalog.ts`, `catalog-data.ts` and `mariowiki.ts`.**
  - `queryImageInfo(titles: string[], opts?: { width?: number }): Promise<Map<string, { url: string; thumbUrl?: string } | null>>`. It follows MediaWiki title normalisation by mapping the `normalized` array back to the requested titles.
  - `downloadFile(url: string, dest: string): Promise<void>`.
  - Both share one 1 req/s limiter and the fixed User-Agent.
- [ ] **Step 4: Run the tests and confirm they PASS.**
- [ ] **Step 5: Implement `fetch-assets.ts`.**
  - For each spec, resolve the first candidate title that exists. Apply `assets/overrides.json`, which maps a requested title to a replacement title, before querying.
  - Download files that don't already exist on disk.
  - Write `assets/catalog.json`.
  - Print the summary line, followed by each unresolved title on its own line:
    - `catalog.json written: 24 cups, 96 tracks, <n> characters; missing: <k>`
- [ ] **Step 6: Run `npm run fetch-assets`** (needs internet; takes about 6 minutes).
  - For each missing required file (icon, thumbnail, emblem), find the real title with `api.php?action=query&list=search&srnamespace=6&srsearch=…`, add it to `overrides.json`, and re-run.
  - Expected final line: `missing: 0`. Optional `art` and large images may be absent.
- [ ] **Step 7: Add a real-catalog integrity test and run it.**
  - Assert: 24 cups; every cup's 4 ids exist in `tracks`; 96 tracks; character ids are unique; every `icon`, `thumb` and `emblem` path exists under `assets/` (`fs.existsSync`).
  - Expected: PASS.
- [ ] **Step 8: Commit.**

```bash
git add shared/catalog.ts scripts tests assets && git commit -m "feat: Mario Wiki asset fetch script and MK8D catalog"
```

### Task 3: Palette, fonts and scoring

**Files:**
- Create: `shared/palette.ts`, `shared/fonts.ts`, `shared/scoring.ts`
- Test: `tests/shared/scoring.test.ts`, `tests/shared/palette-fonts.test.ts`

**Interfaces:**
- `PLAYER_COLOURS: { id: ColourId; name: string; hex: string }[]` (8 entries, order as in Global Constraints)
- `type ColourId = 'red'|'blue'|'green'|'yellow'|'pink'|'orange'|'purple'|'cyan'`
- `colourHex(id: ColourId): string`
- `textOn(id: ColourId): '#ffffff' | '#14213d'`
- `BUNDLED_FONTS: string[]`: `['Rubik','Exo 2','Saira','Roboto','Lexend Zetta','Titan One','Lilita One','Russo One','Baloo 2','Luckiest Guy','Mario Kart F2']`
- `fontStack(family: string): string`
  - `'Mario Kart F2'` → `'"MK F2","Lexend Zetta",sans-serif'`
  - otherwise → `'"<family>","Rubik",sans-serif'`
- `isUpright(family: string): boolean`: true for Mario Kart F2, Lexend Zetta, Titan One, Luckiest Guy, Lilita One, Russo One. Headings in other fonts render italic.
- `POINTS = [15,12,10,9,8,7,6,5,4,3,2,1]`
- `pointsFor(position: number): number`
- `totals(scores: { races: { positions: number[] }[]; adjustments: number[] }, players = 4): number[]`
- `standings(scores, players = 4): { playerIndex: number; position: number; total: number; lastRacePoints: number | null }[]`

- [ ] **Step 1: Write failing tests.**

```ts
expect(pointsFor(1)).toBe(15); expect(pointsFor(12)).toBe(1); expect(pointsFor(0)).toBe(0); expect(pointsFor(13)).toBe(0)
const s = { races: [{ positions: [1, 4, 3, 2] }, { positions: [2, 3, 0, 1] }], adjustments: [0, 0, 5, 0] }
expect(totals(s)).toEqual([27, 19, 15, 24])      // missing position (0) scores 0
// tie: share position, ordered by latest race finish
const t = { races: [{ positions: [1, 2, 3, 4] }, { positions: [4, 3, 1, 2] }], adjustments: [0, 0, 0, 0] }
// totals: [23, 22, 25, 21] → order P3, P1, P2, P4
expect(standings(t).map(r => r.playerIndex)).toEqual([2, 0, 1, 3])
const tie = { races: [{ positions: [1, 2, 3, 4] }], adjustments: [0, 3, 0, 0] }  // P1 15, P2 15
const st = standings(tie); expect(st[0].position).toBe(1); expect(st[1].position).toBe(1)
expect(st.slice(0, 2).map(r => r.playerIndex)).toEqual([0, 1])                 // P1 finished ahead last race
expect(standings({ races: [], adjustments: [0, 0, 0, 0] }).every(r => r.position === 1 && r.lastRacePoints === null)).toBe(true)
expect(textOn('yellow')).toBe('#14213d'); expect(textOn('red')).toBe('#ffffff')
expect(fontStack('Mario Kart F2')).toBe('"MK F2","Lexend Zetta",sans-serif'); expect(fontStack('Exo 2')).toBe('"Exo 2","Rubik",sans-serif')
```

- [ ] **Step 2: Run `npx vitest run tests/shared/scoring.test.ts tests/shared/palette-fonts.test.ts` and confirm it FAILS.**
- [ ] **Step 3: Implement the three modules.**
- [ ] **Step 4: Run the tests and confirm they PASS.**
- [ ] **Step 5: Commit.** `git commit -m "feat: scoring, player palette and font stacks"`

### Task 4: Schemas, types, view derivation and defaults

**Files:**
- Create: `shared/schema.ts`, `shared/types.ts`, `shared/view.ts`, `shared/diff.ts`, `shared/defaults.ts`
- Test: `tests/shared/view.test.ts`, `tests/shared/diff.test.ts`

**Interfaces.** These types are exported from `shared/types.ts`. Persisted shapes are `z.infer` of the schemas in `schema.ts`.

```ts
type OutputFormat = 'wide'|'twin'|'hd'; type BackgroundId = 'A'|'B'|'C'|'none'
type SceneId = 'none'|'title'|'lineup'|'nextRace'|'standings'|'winner'
type TransitionSpeed = 'fast'|'normal'|'slow'; type TakeMode = 'cut'|'auto'
interface SafeArea { top: number; right: number; bottom: number; left: number }
interface OutputConfig { id: string /* ^[a-z0-9-]+$ */; name: string; format: OutputFormat; safeArea: SafeArea; graphicsScale: number }
interface Player { name: string; characterId: string; colour: ColourId }
interface RaceState { mode: 'cup'|'track'; cupId: string; raceIndex: 0|1|2|3; trackId: string }
interface RaceResult { raceNo: number; trackId: string; positions: number[] /* per player, 0 = not entered */ }
interface EventText { preTitle: string; title: string; titleAccent: string; watermark: string; holdMessage: string }
interface Typography { eventTitle: { font: string; style: 'chrome'|'classic' }; headings: { font: string; look: 'chrome'|'classic'|'plain' }; names: { font: string }; labels: { font: string } }
interface ShowData { event: EventText; typography: Typography; players: Player[]; race: RaceState; scores: { races: RaceResult[]; adjustments: number[] } }
interface Layers { background: BackgroundId; scene: SceneId; trackCard: boolean; lowerThirds: { on: boolean; players: number[] } }
interface ProgramFrame { view: ViewModel; mode: TakeMode; speed: TransitionSpeed; takenAt: number }
interface ShowState { draft: ShowData; outputs: OutputConfig[]; layers: Record<string, Layers>; program: Record<string, ProgramFrame>;
  overlay: { hold: { on: boolean; message: string }; ftb: boolean }; transition: TransitionSpeed; armed: string[];
  clocks: { onAirSince: number | null }; uploadedFonts: { family: string; file: string }[] }
interface ShowFile { draft: ShowData; outputs: OutputConfig[]; layers: Record<string, Layers>; transition: TransitionSpeed }
// ViewModel (server-computed, render-only)
interface FontStacks { eventTitle: string; headings: string; names: string; labels: string }
interface TitleView { preTitle: string; title: string; accent: string }
interface PlayerView { slot: number; name: string; character: string; icon: string; art: string; colour: string /*hex*/; textColour: string }
interface TrackCardView { raceLabel: string; cupName: string; cupEmblem: string; trackName: string }
type SceneView =
  | { kind: 'title'; title: TitleView }
  | { kind: 'lineup'; players: PlayerView[] }
  | { kind: 'nextRace'; raceLabel: string; cupName: string; cupEmblem: string; trackName: string; trackImage: string; cupTracks: { name: string; thumb: string; current: boolean }[] }
  | { kind: 'standings'; rows: { position: number; player: PlayerView; total: number; lastRacePoints: number | null }[]; footer: string }
  | { kind: 'winner'; player: PlayerView; total: number }
interface ViewModel { format: OutputFormat; canvas: { w: number; h: number }; safeArea: SafeArea; graphicsScale: number;
  fonts: FontStacks; headingLook: 'chrome'|'classic'|'plain'; headingUpright: boolean; eventTitleStyle: 'chrome'|'classic';
  background: { id: Exclude<BackgroundId,'none'>; watermark: string; title: TitleView } | null;
  scene: SceneView | null; trackCard: TrackCardView | null; lowerThirds: PlayerView[] }
```

**Functions:**
- `FORMAT_CANVAS: Record<OutputFormat, { w: number; h: number }>`
- `SUPPORTED_SCENES: Record<OutputFormat, SceneId[]>`
  - wide and hd: all scenes
  - twin: `['none','title']`
- `deriveView(data: ShowData, layers: Layers, output: OutputConfig, catalog: CatalogIndex): ViewModel`
- `countPendingChanges(draft: ViewModel, program: ViewModel | undefined): number`
  - Counts one each for background, scene, trackCard, the fonts/looks group, and each lower-third slot that differs.
  - When `program` is undefined, counts each non-empty section.
- `EMPTY_LAYERS: Layers`: `{ background: 'none', scene: 'none', trackCard: false, lowerThirds: { on: false, players: [0,1,2,3] } }`
- `DEFAULT_OUTPUTS: OutputConfig[]`:
  - `wide` (Wide, wide), `twins` (Twins, twin), `stream` (Stream, hd), `pillars` (Pillars, hd)
  - each with `safeArea` all 0 and `graphicsScale` 1
- `createDefaultState(catalog: CatalogIndex, now: number): ShowState`
  - Players `Player 1`–`Player 4`, characters `mario`, `luigi`, `peach`, `yoshi`, colours red/blue/green/yellow.
  - Race: cup mode, `mushroom`, `raceIndex` 0.
  - Event text: title `KART CUP`, accent `2026`, preTitle `''`, watermark `MARIO KART`, holdMessage `BACK SHORTLY`.
  - Typography: the defaults from Global Constraints.
  - Draft layers:
    - wide: `{bg 'A', scene 'title'}`
    - twins: `{trackCard true, lowerThirds on [0,1,2,3]}`
    - stream: `{trackCard true, lowerThirds on [0,1]}`
    - pillars: `{bg 'B'}`
  - Program: `deriveView(draft, EMPTY_LAYERS, …)` for every output, mode `cut`. Nothing is on air until the first TAKE.
  - Transition `normal`.
  - `armed: []`, overlay off (`hold: { on: false, message: 'BACK SHORTLY' }`, `ftb: false`), `clocks.onAirSince: null`, `uploadedFonts: []`.

**Rules `deriveView` must follow:**
- Twin lower thirds are always slots `[0,1,2,3]`. HD and wide use `layers.lowerThirds.players`, sorted ascending.
- Scenes not in `SUPPORTED_SCENES[format]` → `null`.
- Race label: cup mode → `` `RACE ${raceIndex+1} / 4` ``; track mode → `` `RACE ${scores.races.length+1}` ``.
- `nextRace` in cup mode lists the cup's 4 tracks with `current` set on `raceIndex`. `trackImage` = `track.image ?? track.thumb`.
- Standings footer: `` `AFTER RACE ${races.length} · ${CUP NAME UPPERCASE}` ``. The cup is the current race cup.
- Winner = standings row 0.
- An unknown character or cup becomes `''` image paths and `'?'` names. Never throw.

- [ ] **Step 1: Write failing tests** using `fixtureCatalog` and `createDefaultState`.

```ts
const st = createDefaultState(idx, 0); const twin = st.outputs[1]; const hd = st.outputs[2]
const on = { ...EMPTY_LAYERS, lowerThirds: { on: true, players: [2, 0] } }
expect(deriveView(st.draft, on, twin, idx).lowerThirds.map(p => p.slot)).toEqual([0, 1, 2, 3])
expect(deriveView(st.draft, on, hd, idx).lowerThirds.map(p => p.slot)).toEqual([0, 2])
expect(deriveView(st.draft, { ...EMPTY_LAYERS, scene: 'standings' }, twin, idx).scene).toBeNull()
const d2 = { ...st.draft, race: { ...st.draft.race, raceIndex: 1 as const } }
expect(deriveView(d2, { ...EMPTY_LAYERS, trackCard: true }, twin, idx).trackCard).toMatchObject({ raceLabel: 'RACE 2 / 4', trackName: 'Water Park', cupName: 'Mushroom Cup', cupEmblem: '/assets/cups/mushroom.png' })
const d3 = { ...st.draft, race: { ...st.draft.race, mode: 'track' as const }, scores: { races: [{ raceNo: 1, trackId: 'water-park', positions: [1, 2, 3, 4] }, { raceNo: 2, trackId: 'water-park', positions: [1, 2, 3, 4] }], adjustments: [0, 0, 0, 0] } }
expect(deriveView(d3, { ...EMPTY_LAYERS, trackCard: true }, hd, idx).trackCard!.raceLabel).toBe('RACE 3')
const p4 = deriveView(st.draft, { ...EMPTY_LAYERS, lowerThirds: { on: true, players: [3] } }, hd, idx).lowerThirds[0]
expect(p4).toMatchObject({ name: 'Player 4', character: 'Yoshi', colour: '#ffc400', textColour: '#14213d', icon: '/assets/characters/yoshi.png' })
expect(deriveView(st.draft, EMPTY_LAYERS, hd, idx).fonts.eventTitle).toBe('"MK F2","Lexend Zetta",sans-serif')
const bad = { ...st.draft, players: st.draft.players.map((p, i) => i ? p : { ...p, characterId: 'ghost' }) }
expect(deriveView(bad, { ...EMPTY_LAYERS, lowerThirds: { on: true, players: [0] } }, hd, idx).lowerThirds[0]).toMatchObject({ icon: '', character: '?' })
// diff
const a = deriveView(st.draft, on, hd, idx)
expect(countPendingChanges(a, a)).toBe(0)
const renamed = { ...st.draft, players: st.draft.players.map((p, i) => i === 0 ? { ...p, name: 'SAM' } : p) }
expect(countPendingChanges(deriveView(renamed, on, hd, idx), a)).toBe(1)
expect(countPendingChanges(deriveView(st.draft, { ...on, background: 'B' }, hd, idx), a)).toBe(1)
```

- [ ] **Step 2: Run `npx vitest run tests/shared/view.test.ts tests/shared/diff.test.ts` and confirm it FAILS.**
- [ ] **Step 3: Implement `schema.ts`** (zod schemas `showStateSchema`, `showFileSchema`; `program` frames use `view: z.custom<ViewModel>()`), plus `types.ts`, `view.ts`, `diff.ts` and `defaults.ts`.
- [ ] **Step 4: Run the tests and confirm they PASS.**
- [ ] **Step 5: Commit.** `git commit -m "feat: show state schema, view derivation, pending diff, defaults"`

### Task 5: Commands and reducer

**Files:**
- Modify: `shared/schema.ts` (add `commandSchema`)
- Create: `shared/reducer.ts`
- Test: `tests/shared/reducer.test.ts`

**Interfaces.** `Command` is the zod discriminated union on `type`:

```ts
{type:'setPlayer'; index:0|1|2|3; patch: Partial<Player>} | {type:'setRace'; patch: Partial<RaceState>} | {type:'stepRace'; delta: 1|-1}
| {type:'randomRace'} | {type:'saveResults'; raceNo: number; trackId: string; positions: number[]} | {type:'setAdjustment'; index:0|1|2|3; value: number}
| {type:'setEventText'; patch: Partial<EventText>} | {type:'setTypography'; role:'eventTitle'|'headings'|'names'|'labels'; patch: {font?: string; style?: 'chrome'|'classic'; look?: 'chrome'|'classic'|'plain'}}
| {type:'setLayers'; outputId: string; patch: Partial<Layers>} | {type:'arm'; outputIds: string[]} | {type:'take'; mode: TakeMode; outputIds?: string[]}
| {type:'setTransition'; speed: TransitionSpeed} | {type:'hold'; on: boolean; message?: string} | {type:'clear'} | {type:'ftb'; on: boolean}
| {type:'addOutput'; output: OutputConfig} | {type:'updateOutput'; id: string; patch: Partial<Omit<OutputConfig,'id'>>} | {type:'removeOutput'; id: string}
| {type:'importShow'; file: ShowFile} | {type:'resetScores'} | {type:'resetShow'} | {type:'resetOnAirClock'}
```

- `class CommandError extends Error`
- `interface ReduceContext { catalog: CatalogIndex; now: number; random: () => number }`
- `reduce(state: ShowState, cmd: Command, ctx: ReduceContext): ShowState`
  - Pure: returns a new object and never mutates its input.
  - Throws `CommandError` on an unknown output id (except `addOutput`), a duplicate id in `addOutput`, or an invalid slug.

**Behaviour that needs pinning:**
- **take**
  - Targets are `cmd.outputIds ?? state.armed`.
  - Each target gets `program[id] = { view: deriveView(draft, layers[id], output), mode, speed: state.transition, takenAt: now }`.
  - Sets `clocks.onAirSince = now` if it's null.
  - No targets → state is returned unchanged.
- **clear**
  - For every output: layers keep their `background`, but `scene: 'none'`, `trackCard: false`, `lowerThirds.on: false`.
  - Every program is then re-derived with mode `cut`.
- **hold** `{on: true}` → `overlay.hold = { on: true, message: cmd.message ?? draft.event.holdMessage }`.
- **stepRace** clamps `raceIndex` to 0–3. In cup mode it sets `trackId` to the cup's track at the new index.
- **randomRace**
  - Cup mode: picks from cups whose 4 track ids have no saved race. Index = `Math.floor(random() * candidates.length)`. Sets `raceIndex` 0.
  - Track mode: picks from unplayed tracks the same way.
  - If everything has been played, it picks from the full list.
- **saveResults** replaces any existing result with the same `raceNo`, otherwise appends. Races stay sorted by `raceNo`.
- **removeOutput** deletes the output from `outputs`, `layers`, `program` and `armed`.
- **addOutput** sets `layers = EMPTY_LAYERS` and program to that output's empty view.
- **importShow** replaces draft, outputs, layers and transition; resets program to empty views; turns the overlay off; clears `armed`.

- [ ] **Step 1: Write failing tests** (one `it` per bullet above). Key assertions:

```ts
let s = createDefaultState(idx, 0); const ctx = { catalog: idx, now: 1000, random: () => 0 }
s = reduce(s, { type: 'setPlayer', index: 0, patch: { name: 'SAM' } }, ctx)
expect(s.draft.players[0].name).toBe('SAM'); expect(s.program.wide.view.lowerThirds).toEqual([])
expect(reduce(s, { type: 'take', mode: 'auto' }, ctx)).toBe(s)                      // nothing armed
s = reduce(reduce(s, { type: 'arm', outputIds: ['wide'] }, ctx), { type: 'take', mode: 'cut' }, ctx)
expect(s.program.wide).toMatchObject({ mode: 'cut', speed: 'normal', takenAt: 1000 }); expect(s.program.wide.view.background?.id).toBe('A')
expect(s.program.twins.view.trackCard).toBeNull(); expect(s.clocks.onAirSince).toBe(1000)
expect(reduce(s, { type: 'take', mode: 'auto' }, { ...ctx, now: 2000 }).clocks.onAirSince).toBe(1000)
const c = reduce(s, { type: 'clear' }, ctx); expect(c.layers.wide).toMatchObject({ background: 'A', scene: 'none', trackCard: false })
expect(c.program.wide.view.scene).toBeNull(); expect(c.program.wide.view.background?.id).toBe('A')
expect(reduce(s, { type: 'hold', on: true }, ctx).overlay.hold).toEqual({ on: true, message: 'BACK SHORTLY' })
expect(reduce({ ...s, draft: { ...s.draft, race: { ...s.draft.race, raceIndex: 3 } } }, { type: 'stepRace', delta: 1 }, ctx).draft.race.raceIndex).toBe(3)
expect(reduce(s, { type: 'stepRace', delta: 1 }, ctx).draft.race.trackId).toBe('water-park')
const r = reduce(reduce(s, { type: 'saveResults', raceNo: 1, trackId: 'mario-kart-stadium', positions: [1, 4, 3, 2] }, ctx), { type: 'saveResults', raceNo: 1, trackId: 'mario-kart-stadium', positions: [2, 1, 3, 4] }, ctx)
expect(r.draft.scores.races).toHaveLength(1); expect(r.draft.scores.races[0].positions).toEqual([2, 1, 3, 4])
expect(() => reduce(s, { type: 'addOutput', output: { ...s.outputs[0] } }, ctx)).toThrow(CommandError)
expect(() => reduce(s, { type: 'setLayers', outputId: 'nope', patch: {} }, ctx)).toThrow(CommandError)
const rm = reduce(s, { type: 'removeOutput', id: 'wide' }, ctx); expect(rm.program.wide).toBeUndefined(); expect(rm.armed).toEqual([])
expect(reduce(s, { type: 'randomRace' }, ctx).draft.race).toMatchObject({ cupId: 'mushroom', raceIndex: 0 })
```

- [ ] **Step 2: Run `npx vitest run tests/shared/reducer.test.ts` and confirm it FAILS.**
- [ ] **Step 3: Implement `commandSchema` and `reduce`.**
- [ ] **Step 4: Run the tests and confirm they PASS.**
- [ ] **Step 5: Commit.** `git commit -m "feat: command schema and pure show reducer"`

### Task 6: Protocol payloads and the persistent state store

**Files:**
- Create: `shared/protocol.ts`, `server/store.ts`
- Test: `tests/shared/protocol.test.ts`, `tests/server/store.test.ts`

**Interfaces:**

```ts
type Subscription = { role: 'control' } | { role: 'multiview' } | { role: 'output'; outputId: string; view: 'program' | 'preview' }
type ClientMessage = { type: 'subscribe'; sub: Subscription } | { type: 'command'; command: Command } | { type: 'ping' }
interface HoldView { message: string; title: TitleView; fonts: FontStacks; titleStyle: 'chrome' | 'classic' }
interface OutputPayload { type: 'output'; outputId: string; view: ViewModel | null; frame: { mode: TakeMode; speed: TransitionSpeed; takenAt: number }; hold: HoldView | null; ftb: boolean }
type Presence = Record<string, { program: number; preview: number }>
interface ControlPayload { type: 'state'; state: ShowState; presence: Presence; pending: Record<string, number> }
type ServerMessage = OutputPayload | ControlPayload | { type: 'pong' } | { type: 'error'; message: string }
```

- `clientMessageSchema` (zod)
- `buildOutputPayload(state, outputId, view, catalog): OutputPayload`
  - Program view: `program[id]` with its frame.
  - Preview view: `deriveView(draft…)` with frame `{ mode: 'cut', speed, takenAt: 0 }`.
  - Unknown id → `view: null`.
  - `hold` is non-null when `overlay.hold.on`.
- `buildControlPayload(state, presence, catalog): ControlPayload` (pending via `countPendingChanges`)
- `class StateStore`
  - `constructor(opts: { dataDir: string; catalog: CatalogIndex; now?: () => number; random?: () => number })`
  - `load(): Promise<void>`
  - `get state(): ShowState`
  - `dispatch(cmd: unknown): { ok: true } | { ok: false; error: string }`: validates with `commandSchema`; a `CommandError` becomes `ok: false`.
  - `onChange(fn: (s: ShowState) => void): () => void`
  - `flush(): Promise<void>`: saves immediately.
  - `reset(): void`: defaults; used by `--fresh`.

**What `load` does:**
1. Read `state.json` and validate it with `showStateSchema`.
2. If that fails, try the backups newest-first.
3. If they all fail, use `createDefaultState`.
4. On success, copy the current file to `backups/state-<ISO>.json` and prune to 10.

Saves are atomic: write `state.json.tmp`, then rename, debounced 200 ms.

- [ ] **Step 1: Write failing tests.**

```ts
// protocol
expect(buildOutputPayload(s, 'ghost', 'program', idx).view).toBeNull()
expect(buildOutputPayload(reduce(s, { type: 'hold', on: true }, ctx), 'wide', 'program', idx).hold?.message).toBe('BACK SHORTLY')
expect(buildOutputPayload(s, 'wide', 'preview', idx).frame.mode).toBe('cut')
expect(buildControlPayload(s, {}, idx).pending.wide).toBeGreaterThan(0)       // default draft differs from empty program
// store (tmp dir per test)
await store.load(); store.dispatch({ type: 'setPlayer', index: 0, patch: { name: 'SAM' } }); await store.flush()
expect(JSON.parse(readFileSync(join(dir, 'state.json'), 'utf8')).draft.players[0].name).toBe('SAM')
expect(store.dispatch({ type: 'bogus' }).ok).toBe(false)
expect(store.dispatch({ type: 'setLayers', outputId: 'nope', patch: {} })).toEqual({ ok: false, error: expect.stringMatching(/nope/) })
// Review Focus 2: corrupt file falls back to newest valid backup
writeFileSync(join(dir, 'state.json'), '{not json'); /* backups/state-<t>.json holds a valid state with name 'BACKUP' */
const s2 = new StateStore({ dataDir: dir, catalog: idx }); await s2.load(); expect(s2.state.draft.players[0].name).toBe('BACKUP')
// no valid files → defaults, no throw; 12 loads → 10 backups
```

- [ ] **Step 2: Run `npx vitest run tests/shared/protocol.test.ts tests/server/store.test.ts` and confirm it FAILS.**
- [ ] **Step 3: Implement `protocol.ts` and `store.ts`.**
- [ ] **Step 4: Run the tests and confirm they PASS.**
- [ ] **Step 5: Commit.** `git commit -m "feat: sync payloads and persistent state store with backups"`

### Task 7: HTTP server, WebSocket hub and entry point

**Files:**
- Create: `server/app.ts`, `server/http.ts`, `server/ws.ts`, `server/lan.ts`, `server/index.ts`
- Test: `tests/server/app.test.ts`

**Interfaces:**
- `startServer(opts: { port: number; dataDir: string; assetsDir: string; distDir: string; dev: boolean; fresh?: boolean; catalog?: Catalog }): Promise<{ port: number; store: StateStore; close(): Promise<void> }>`
  - `catalog` defaults to reading `assetsDir/catalog.json`. If it's missing, exit with: `Missing assets/catalog.json — run npm run fetch-assets`.
- `createHttpHandler(opts: { distDir; assetsDir; dataDir; store; vite?: ViteDevServer }): (req, res) => void`

| Route | Behaviour |
|---|---|
| `GET /` | 302 to `/control` |
| `GET /control`, `/multiview`, `/out/:id` | The matching built HTML (`out.html` for every output id). In dev, rewrite to `/control.html` etc. and hand to `vite.middlewares` (`appType: 'mpa'`). |
| `/assets/*` | From `assetsDir` |
| `/uploads/*` | From `dataDir/uploads` |
| Other dist files | Static |
| `GET /api/info` | `{ lanUrls: string[] }` |

  - Every response sends `Cache-Control: no-store`.
- `attachSockets(server: http.Server, store: StateStore, catalog: CatalogIndex): { presence(): Presence; close(): void }`
  - On `subscribe`, send the matching payload immediately.
  - On every store change, send a `ControlPayload` to control and multiview clients and an `OutputPayload` to each output client.
  - A presence change also re-broadcasts to control and multiview.
  - `ping` → `pong`.
  - Terminate any client that hasn't sent a ping or message for 15 s.
  - A failed command → `{type:'error'}` to the sender only.
- `lanUrls(port: number): string[]`: `http://<os.hostname()>.local:<port>` plus each IPv4 non-internal address.
- `server/index.ts`:
  - Reads `PORT` (8080), `DATA_DIR` (`./data`), `--dev` and `--fresh` (reset state on start; used by e2e).
  - Prints `Control: <url>/control`, then `Output <id>: <url>/out/<id>` for each output, using the first LAN URL.

- [ ] **Step 1: Write failing integration tests.**
  - Start `startServer` on port 0 with a tmp `dataDir`, `fixtureCatalog`, and a tmp `distDir` containing stub `control.html`, `out.html` and `multiview.html`.
  - Use a small helper `client(sub)` that opens a `ws`, sends a subscribe message, and collects messages.

```ts
expect((await fetch(`${base}/out/wide`)).headers.get('cache-control')).toBe('no-store')
expect(await (await fetch(`${base}/out/wide`)).text()).toContain('stub-out')
const wide = await client({ role: 'output', outputId: 'wide', view: 'program' }); const twins = await client({ role: 'output', outputId: 'twins', view: 'program' })
const ctlA = await client({ role: 'control' }); const ctlB = await client({ role: 'control' })
ctlA.send({ type: 'command', command: { type: 'arm', outputIds: ['wide'] } }); ctlA.send({ type: 'command', command: { type: 'take', mode: 'auto' } })
await expect.poll(() => wide.last().view?.background?.id).toBe('A')
expect(twins.messages.filter(m => m.type === 'output')).toHaveLength(1)     // only the initial payload
await expect.poll(() => ctlB.last().state.armed).toEqual(['wide'])          // second control page stays in sync
await expect.poll(() => ctlA.last().presence.wide.program).toBe(1); wide.close(); await expect.poll(() => ctlA.last().presence.wide.program).toBe(0)
// Review Focus 4: unknown output id stays connected and starts rendering once created
const ghost = await client({ role: 'output', outputId: 'lobby', view: 'program' }); expect(ghost.last().view).toBeNull()
ctlA.send({ type: 'command', command: { type: 'addOutput', output: { id: 'lobby', name: 'Lobby', format: 'hd', safeArea: { top: 0, right: 0, bottom: 0, left: 0 }, graphicsScale: 1 } } })
await expect.poll(() => ghost.last().view?.format).toBe('hd')
ctlA.send({ type: 'ping' }); await expect.poll(() => ctlA.messages.some(m => m.type === 'pong')).toBe(true)
```

- [ ] **Step 2: Run `npx vitest run tests/server/app.test.ts` and confirm it FAILS.**
- [ ] **Step 3: Implement the five server files.**
- [ ] **Step 4: Run the tests and confirm they PASS.**
- [ ] **Step 5: Smoke-run it.** Run `npm run build && npm start`. Expected: it prints `Control: http://<host>.local:8080/control` and four `Output …` lines, and `curl -s localhost:8080/api/info` returns JSON with `lanUrls`.
- [ ] **Step 6: Commit.** `git commit -m "feat: HTTP + WebSocket server with presence and LAN URLs"`

### Task 8: Web foundation (socket, readiness, fonts, motion, layouts)

**Files:**
- Create: `web/src/lib/socket.ts`, `web/src/lib/ready.ts`, `web/src/lib/fit.ts`, `web/src/lib/fit-text.ts`, `web/src/lib/fonts.css`
- Create: `web/src/graphics/motion.ts`, `web/src/graphics/layouts.ts`
- Test: `tests/web/socket.test.ts`, `tests/web/motion-layouts.test.ts`

**Interfaces:**
- `nextDelay(attempt: number): number`: `min(500 * 2^attempt, 5000)`.
- `connect(sub: Subscription, h: { onMessage(m: ServerMessage): void; onStatus?(up: boolean): void }, opts?: { url?: string; WebSocketImpl?: typeof WebSocket; now?: () => number }): { send(cmd: Command): void; close(): void }`
  - Sends `subscribe` on every open, and `ping` every 5 s.
  - Reconnects if no message arrives within 10 s.
  - Reconnects after close using `nextDelay`.
  - `send` while disconnected drops the command.
- `whenReady(imageUrls: string[], timeoutMs = 3000): Promise<void>`: waits for `document.fonts.ready` and decodes each image, whichever finishes first versus the timeout.
- `fit` (Svelte action): `use:fit={{ width, height }}` scales the first child to the node's width.
- `fitText` (Svelte action): `use:fitText={{ max: number; minRatio?: number }}`. It's the same rule as `fitText` in `docs/mockups/shared/mockup.js`:
  1. Shrink font-size 1 px at a time down to `minRatio` × the base size (default **0.6**; `0` = no floor).
  2. If it still overflows, set `transform: scaleX(max / width)` on the inner `<span>`.
  - Re-runs when the text changes.
  - Fitted elements wrap their text in a `<span>` (`[data-fit] > span { display: inline-block; transform-origin: left center }`).
- `fonts.css`:
  - `@fontsource` imports: Rubik 400/500/700/800/900 + 800/900 italic; Exo 2 900 + 900 italic; Saira 800/900 + italics; Roboto 900 + italic; Lexend Zetta 800/900; Titan One; Lilita One; Russo One; Baloo 2 800; Luckiest Guy.
  - `@font-face { font-family: "MK F2"; src: url(/assets/fonts/mario_kart_f2.ttf); unicode-range: U+0041-005A, U+0061-007A; }`
- `SPEED_MS = { fast: 300, normal: 500, slow: 900 }`, `STAGGER_MS = 80`
- `enterDuration(mode: TakeMode, speed: TransitionSpeed): number`, `exitDuration(mode, speed): number`
- `overshoot(t: number): number`: cubic-bezier(.24,.63,.38,1.22) solved for x → y.
- `pop(node: Element, p: { duration: number; delay?: number }): TransitionConfig` (scale .6 → 1 plus opacity)
- `slideIn(node, p: { duration: number; delay?: number; dx?: number }): TransitionConfig`
- `lowerThirdSlots(format: OutputFormat, slots: number[], safe: SafeArea, scale: number): { slot: number; x: number; y: number; scale: number }[]`
  - Card size is 430×160 multiplied by the effective scale.
  - **twin:** x = 40, 490, 1000, 1450 for slots 0–3 (+ `safe.left`); y = 1152 − 70 − 160 − `safe.bottom`.
  - **hd:** a centred row with 20 px gaps; y = 1080 − 70 − 160·scale − `safe.bottom`.
  - **wide:** like hd, but the effective scale is 1.5 × scale and the gap is 30 px.
- `trackCardSlots(format: OutputFormat, safe: SafeArea): { x: number; y: number }[]`: twin → `[ {40,40}, {1000,40} ]`, otherwise `[ {40,40} ]`, each offset by `safe.left` / `safe.top`.

- [ ] **Step 1: Write failing tests.**

```ts
expect([0, 1, 4].map(nextDelay)).toEqual([500, 1000, 5000])
expect(enterDuration('cut', 'slow')).toBe(0); expect(enterDuration('auto', 'normal')).toBe(500); expect(exitDuration('auto', 'normal')).toBe(300)
expect(overshoot(0)).toBeCloseTo(0); expect(overshoot(1)).toBeCloseTo(1); expect(Math.max(...Array.from({ length: 101 }, (_, i) => overshoot(i / 100)))).toBeGreaterThan(1)
const z = { top: 0, right: 0, bottom: 0, left: 0 }
expect(lowerThirdSlots('twin', [0, 1, 2, 3], z, 1).map(s => [s.x, s.y])).toEqual([[40, 922], [490, 922], [1000, 922], [1450, 922]])
expect(lowerThirdSlots('twin', [0], { ...z, bottom: 30 }, 1)[0].y).toBe(892)
expect(lowerThirdSlots('hd', [0, 1], z, 1).map(s => s.x)).toEqual([520, 970])
expect(lowerThirdSlots('wide', [0, 1, 2, 3], z, 1)[0]).toMatchObject({ x: 585, y: 842, scale: 1.5 })
expect(trackCardSlots('twin', { ...z, left: 10, top: 5 })).toEqual([{ x: 50, y: 45 }, { x: 1010, y: 45 }])
// socket: mock WebSocket class records instances; closing one triggers onStatus(false) and a new instance after nextDelay(0) (vi.useFakeTimers)
```

- [ ] **Step 2: Run `npx vitest run tests/web` and confirm it FAILS.**
- [ ] **Step 3: Implement the modules.**
- [ ] **Step 4: Run the tests and confirm they PASS.** Then run `npm run lint` and confirm it passes.
- [ ] **Step 5: Commit.** `git commit -m "feat: web socket client, readiness, fonts, motion and layout math"`

### Task 9: Output page shell, backgrounds A and B, HOLD/FTB, runbook

**Files:**
- Create: `web/src/out/main.ts`, `web/src/graphics/Output.svelte`
- Create: `web/src/graphics/backgrounds/SkyBackground.svelte`, `IconPattern.svelte`, `icons.ts`
- Create: `web/src/graphics/overlays/HoldOverlay.svelte`, `Ftb.svelte`
- Create: `docs/millumin-runbook.md`, `tests/e2e/helpers.ts`, `tests/e2e/output.spec.ts`

**Interfaces:**
- `out/main.ts`:
  - Parses `/out/:id`, `view=preview`, `lowfx=1` and `debug=1`.
  - Connects with `{ role: 'output', … }` and mounts `Output` with props `{ payload: OutputPayload | null; firstPaint: boolean; lowfx: boolean; debug: boolean; connected: boolean }`.
  - On the first payload it calls `whenReady(<all image urls in view>)`, renders with `firstPaint = true` (all durations 0), then sets `data-ready` on `<body>`.
- `Output.svelte`:
  - A canvas `div#canvas` sized to `view.canvas`.
  - Layers in order, each with an attribute: `[data-layer=background|scene|trackcard|lowerthirds]`, `[data-overlay=hold|ftb]`.
  - Backgrounds carry `data-bg="A|B|C"`.
  - Transition durations come from `enterDuration(frame.mode, frame.speed)`, or 0 when `firstPaint`.
  - `view === null` renders nothing.
  - The debug panel shows only with `debug`.
- `SkyBackground` props: `{ watermark: string; font: string; lowfx: boolean; w: number; h: number }`
  - Gradient `#25c8f6 → #0e9ce6 → #0b72d8 → #2b4ec6`, checkerboard, crest outlines, a light sweep every 9 s, watermark lines.
  - Sparkles: 150, or 30 with lowfx.
- `IconPattern` props: `{ w: number; h: number }`
  - `#0553a6` with a `#03458f` SVG tile (1250×280; icons from the mockup), translating diagonally on a 38 s loop, plus a vignette.
- `HoldOverlay` props: `{ hold: HoldView; format: OutputFormat; w: number; h: number }`
  - Background A with the title lockup and the message.
  - On twin it renders two `.hold-half` blocks, each 960 wide.
  - Appears instantly with no transition.
- `Ftb` props: `{ on: boolean }`: black, 500 ms opacity fade.
- `tests/e2e/helpers.ts`:
  - `command(cmd: Command): Promise<void>`: opens a ws control client, sends, waits for the next `state`.
  - `state(): Promise<ShowState>`
  - `resetShow(): Promise<void>`
  - **Every e2e spec file calls `test.beforeEach(resetShow)`.** Each test sets up its own state and never relies on a previous test.

- [ ] **Step 1: Write failing e2e tests** in `output.spec.ts`.

```ts
test('no background = transparent page', async ({ page }) => { await command({ type: 'resetShow' }); await page.goto('/out/wide'); await page.waitForSelector('body[data-ready]')
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgba(0, 0, 0, 0)'); await expect(page.locator('[data-layer=background]')).toHaveCount(0) })
test('take shows background A', async ({ page }) => { await page.goto('/out/wide'); await command({ type: 'arm', outputIds: ['wide'] }); await command({ type: 'take', mode: 'cut' }); await expect(page.locator('[data-bg=A]')).toBeVisible() })
// Review Focus 3: reload mid-show renders Program instantly
test('reload renders current program with no enter animation', async ({ page }) => { await command({ type: 'take', mode: 'auto', outputIds: ['wide'] }); await page.goto('/out/wide'); await page.reload(); await page.waitForSelector('body[data-ready]')
  expect(await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && (a.effect as KeyframeEffect).target?.closest('[data-layer=scene]')).length)).toBe(0)
  await expect(page.locator('[data-layer=scene]')).toHaveCSS('opacity', '1') })
test('hold covers twin halves', async ({ page }) => { await page.goto('/out/twins'); await command({ type: 'hold', on: true }); await expect(page.locator('[data-overlay=hold] .hold-half')).toHaveCount(2)
  await expect(page.locator('[data-overlay=hold]')).toContainText('BACK SHORTLY'); await command({ type: 'hold', on: false }); await expect(page.locator('[data-overlay=hold]')).toHaveCount(0) })
// Review Focus 4: unknown output id
test('unknown output stays blank then renders when created', async ({ page }) => { await page.goto('/out/lobby'); await page.waitForTimeout(500); expect(await page.locator('#canvas *').count()).toBe(0)
  await command({ type: 'addOutput', output: { id: 'lobby', name: 'Lobby', format: 'hd', safeArea: { top: 0, right: 0, bottom: 0, left: 0 }, graphicsScale: 1 } })
  await command({ type: 'setLayers', outputId: 'lobby', patch: { background: 'B' } }); await command({ type: 'take', mode: 'cut', outputIds: ['lobby'] }); await expect(page.locator('[data-bg=B]')).toBeVisible() })
test('debug panel only with ?debug=1', async ({ page }) => { await page.goto('/out/wide'); await expect(page.locator('[data-debug]')).toHaveCount(0); await page.goto('/out/wide?debug=1'); await expect(page.locator('[data-debug]')).toBeVisible() })
```

- [ ] **Step 2: Run `npx playwright test tests/e2e/output.spec.ts` and confirm it FAILS.**
- [ ] **Step 3: Implement the files listed above.** Reference pages: `docs/mockups/backgrounds/a-menu-sky.html` and `b-icon-pattern.html` (check `?format=twin` and `?format=hd`), and `docs/mockups/overlays/hold.html` (wide, hd, twin).
- [ ] **Step 4: Run the tests and confirm they PASS.**
- [ ] **Step 5: Write `docs/millumin-runbook.md`.** It's a checklist covering:
  - Web media URL `http://<control>.local:8080/out/<id>`
  - Render size = output canvas (3840×1152 / 1920×1152 / 1920×1080)
  - Framerate 60
  - `transparent` ON for overlay outputs (twins, stream); OFF for full-frame outputs
  - `keep hot` ON (requires Millumin ≥ 5.15 on macOS 26)
  - Keep the Millumin window in front; check Output › display FPS
  - Fallback: fixed IP if `.local` doesn't resolve
  - Rehearsal steps: take each layer on each output, HOLD/CLEAR/FTB, pull the network cable for 10 s and confirm recovery
  - Run the server under an auto-restart loop on show day: `while true; do npm start; sleep 1; done`. State reloads from `data/state.json`.
- [ ] **Step 6: Commit.** `git commit -m "feat: output page with backgrounds A/B, hold, FTB; Millumin runbook"`

### Task 10: Medallion lower thirds, track card, title lockup, heading

**Files:**
- Create: `web/src/graphics/Medallion.svelte`, `LowerThird.svelte`, `LowerThirdsLayer.svelte`, `TrackCard.svelte`, `TrackCardLayer.svelte`, `TitleLockup.svelte`, `Heading.svelte`, `scenes/TitleScene.svelte`
- Modify: `web/src/graphics/Output.svelte` (wire up the layers)
- Test: `tests/e2e/graphics.spec.ts`

**Interfaces:**
- `Medallion` props: `{ image: string; size: number; stars?: boolean }`. An empty `image`, or one that fails to load, renders the empty navy disc.
- `LowerThird` props: `{ player: PlayerView; fonts: FontStacks }`
  - Root is `.lower-third[data-slot]`; 430×160.
  - Name uses `use:fitText={{ max: 214 }}`.
  - Wrap the medallion image in `{#key player.icon}` with a flip transition; wrap the text in `{#key}` with a cross-fade, so changes on air animate without remounting the root.
- `LowerThirdsLayer` props: `{ players: PlayerView[]; view: ViewModel; enter: number; exit: number }`. Positions come from `lowerThirdSlots`; enter delay = index × `STAGGER_MS`.
- `TrackCard` props: `{ card: TrackCardView; fonts: FontStacks }`
  - Root `.track-card`, 540×120.
  - Track name uses `use:fitText={{ max: 352 }}`.
- `TrackCardLayer` positions cards with `trackCardSlots`.
- `TitleLockup` props: `{ title: TitleView; style: 'chrome' | 'classic'; font: string; size: number }`
  - Root `.title-lockup[data-style]`.
  - Chrome: gradient `#fff → #f1f4f7 28% → #c3cad3 46% → #4f5a67 50% → #7f8a97 60% → #cdd4db 82% → #fff`, 30 px dark outline `#0a0f1c` via a stroked `::before` copy, accent gradient `#8be6ff → #2a7bff → #6a3dff → #e02fbf → #ff5a2e`.
  - Classic: white with a `#0b2a6f` outline and drop shadow, accent `#ffd31a`.
  - An empty pre-title hides the pill.
- `Heading` props: `{ text: string; accent?: string; look: 'chrome' | 'classic' | 'plain'; font: string; upright: boolean; size: number }`
- `TitleScene` props: `{ title: TitleView; view: ViewModel }`. On twin it renders one lockup per 960 half.
- **Test hooks:** `.lower-third[data-slot] .name`, `.track-card .track-name`, and class `heading` on the `Heading` root.

- [ ] **Step 1: Write failing e2e tests.**

```ts
test('twin lower thirds at fixed slots with player colours', async ({ page }) => { await command({ type: 'resetShow' }); await page.goto('/out/twins')
  await command({ type: 'arm', outputIds: ['twins'] }); await command({ type: 'take', mode: 'cut' })
  const xs = await page.locator('.lower-third').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().x - document.getElementById('canvas')!.getBoundingClientRect().x)))
  expect(xs).toEqual([40, 490, 1000, 1450]); await expect(page.locator('.track-card')).toHaveCount(2); await expect(page.locator('.track-card').first()).toContainText('RACE 1 / 4') })
// Review Focus 1: long text never overflows
test('long names and track names fit', async ({ page }) => { await command({ type: 'setPlayer', index: 0, patch: { name: 'ALEXANDRIA-ROSE FEATHERSTONE' } })
  await command({ type: 'setRace', patch: { mode: 'track', trackId: 'tour-singapore-speedway' } }); await command({ type: 'take', mode: 'cut', outputIds: ['twins'] }); await page.goto('/out/twins'); await page.waitForSelector('body[data-ready]')
  for (const sel of ['.lower-third[data-slot="0"] .name', '.track-card .track-name']) expect(await page.locator(sel).first().evaluate(e => e.firstElementChild!.getBoundingClientRect().width <= e.getBoundingClientRect().width + 1)).toBe(true)
  expect(await page.locator('.lower-third[data-slot="0"] .name').evaluate(e => parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(26) })   // 60% floor of 44px
test('on-air rename updates without remount', async ({ page }) => { await command({ type: 'take', mode: 'cut', outputIds: ['twins'] }); await page.goto('/out/twins'); await page.waitForSelector('body[data-ready]'); const h = await page.locator('.lower-third[data-slot="1"]').elementHandle()
  await command({ type: 'setPlayer', index: 1, patch: { name: 'PRIYA' } }); await command({ type: 'take', mode: 'auto', outputIds: ['twins'] })
  await expect(page.locator('.lower-third[data-slot="1"]')).toContainText('PRIYA'); expect(await h!.evaluate(e => e.isConnected)).toBe(true) })
test('title lockup chrome by default, classic switchable', async ({ page }) => { await command({ type: 'take', mode: 'cut', outputIds: ['wide'] }); await page.goto('/out/wide'); await expect(page.locator('.title-lockup[data-style=chrome]')).toBeVisible()
  await command({ type: 'setTypography', role: 'eventTitle', patch: { style: 'classic' } }); await command({ type: 'take', mode: 'cut', outputIds: ['wide'] }); await expect(page.locator('.title-lockup[data-style=classic]')).toBeVisible() })
test('visual: twin + hd snapshots', async ({ page }) => { await command({ type: 'take', mode: 'cut', outputIds: ['twins', 'stream'] })
  await page.goto('/out/twins'); await page.waitForSelector('body[data-ready]'); await expect(page.locator('#canvas')).toHaveScreenshot('twin-l3.png', { maxDiffPixelRatio: 0.01 })
  await page.goto('/out/stream'); await page.waitForSelector('body[data-ready]'); await expect(page.locator('#canvas')).toHaveScreenshot('hd-l3.png', { maxDiffPixelRatio: 0.01 }) })
```

- [ ] **Step 2: Run `npx playwright test tests/e2e/graphics.spec.ts` and confirm it FAILS.**
- [ ] **Step 3: Implement the components.** Reference pages: `docs/mockups/overlays/twin-lower-thirds.html`, `hd-lower-thirds.html`, `wide-lower-thirds.html` (with `?guides=1` for exact boxes), `docs/mockups/titles/title-lockup.html` (S1/S3 × wide/hd/twin) and `titles/headings.html`.
  - `TitleLockup` gets the format's layout from `TITLE_LAYOUT` (`web/src/graphics/title-layout.ts`):

    | Format | Layout | ts | ps | max | maxLines | maxH |
    |---|---|---|---|---|---|---|
    | wide | `line` | 210 | 58 | 3600 | 1 | — |
    | hd | `stack` | 190 | 50 | 1700 | 2 | 640 |
    | twin | `stack` | 170 | 40 | 860 | 3 | 760 |

  - `breakTitle(title, accent, layout, measure): { lines: string[]; accentLine: boolean; size: number }` is pure and unit-tested. `measure(text)` = width at 100 px.
    - Try every split into ≤ maxLines at spaces. Score = min(ts, max ÷ (w/100 + 0.28) for each line incl. the accent, maxH ÷ (lines × 1.16)).
    - Pick the fewest lines with score ≥ 0.85 × ts; else the highest score.
    - Port it from `layoutTitles()` in `docs/mockups/shared/mockup.js`.
  - Each line then gets `fitText` with `minRatio: 0`, and all lines take the smallest size. Outline and drop shadow are in `em`.
  - Unit tests with a fake measure where each char = 118 px at 100 px:
    - `breakTitle('KART CUP','2026','stack',…)` → hd: lines `['KART CUP']`; twin: lines `['KART','CUP']`.
    - Wide → a single line containing the accent.
- [ ] **Step 4: Run the tests and confirm they PASS.** Run `--update-snapshots` once to create the baselines, check them by eye against the mockups, then re-run without the flag.
- [ ] **Step 5: Commit.** `git commit -m "feat: medallion lower thirds, T1 track card, title lockup and headings"`

### Task 11: Control page shell (monitors, layer controls, master bar, shortcuts)

**Files:**
- Create: `web/src/control/main.ts`, `Control.svelte`, `store.ts`, `styles.css`, `TopBar.svelte`, `Monitors.svelte`, `LayerControls.svelte`, `MasterBar.svelte`, `shortcuts.ts`
- Create: `web/src/control/tabs/ShowTab.svelte` (placeholder; filled in Task 12)
- Test: `tests/web/shortcuts.test.ts`, `tests/e2e/control.spec.ts`

**Interfaces:**
- `store.ts`:
  - `control: Readable<{ payload: ControlPayload | null; connected: boolean; catalog: CatalogIndex | null; selectedOutput: string }>`
  - `send(cmd: Command): void`
  - `selectOutput(id: string): void`
  - The catalog is fetched from `/assets/catalog.json`.
- `shortcutCommand(e: { key: string; shiftKey: boolean; targetTag: string }, s: { outputs: string[]; armed: string[]; hold: boolean; ftb: boolean }): Command | null`

| Key | Command | Works in INPUT/TEXTAREA/SELECT? |
|---|---|---|
| `' '` | `{type:'take',mode:'auto'}` | No |
| `'Enter'` | `{type:'take',mode:'cut'}` | No |
| `'1'`–`'9'` | `{type:'arm',outputIds:<toggle that output>}` | No |
| `'h'` | `{type:'hold',on:!hold}` | No |
| Shift + `'Escape'` | `{type:'clear'}` | **Yes** |
| Shift + `'B'` | `{type:'ftb',on:!ftb}` | **Yes** |

- **Layout** (reference `docs/mockups/ui/control.html`):
  - Top bar: title, "Now: Race n / 4 · Cup · Track", connection lights per output, clock.
  - Left: tabs **Show** | **Text & Fonts** | **Outputs** | **Settings**. Only Show in this task; the others are placeholders.
  - Right: output tabs, each with a light and a pending badge from `payload.pending`.
  - `Monitors`: Preview iframe `/out/<id>?view=preview&lowfx=1` with a green border, Program iframe `/out/<id>?lowfx=1` with a red border, both scaled with `use:fit`.
  - `LayerControls` for the selected output:
    - Background segmented A/B/C/None.
    - Scene segmented, listing only `SUPPORTED_SCENES[format]`.
    - Track card toggle.
    - Lower thirds toggle; plus P1–P4 checkboxes when format ≠ twin.
    - A green fill shows the draft value; a red underline shows the value in `program[id].view`.
  - `MasterBar` (fixed bottom, 128 px):
    - Arm chips (light, `WxH`, pending badge) and **ALL**.
    - **CUT**, **AUTO** and Fast/Normal/Slow (`setTransition`).
    - **HOLD** (amber; label shows the hold message), **CLEAR** (red outline), **FTB**.
    - A line of shortcut hints.
  - A "Disconnected — reconnecting…" banner, with every control `disabled`, while `connected` is false.
- **Labels and test hooks:**
  - Background buttons are labelled `A · Sky`, `B · Icons`, `C · Stickers`, `None`.
  - Scene buttons are labelled `None`, `Title`, `Line-up`, `Next race`, `Standings`, `Winner`.
  - Output tabs carry `data-output-tab=<id>`, with a `[data-pending]` badge only when the count is > 0.
  - Arm chips carry `data-arm=<id>`. Master-bar buttons' accessible names start with `CUT`, `AUTO`, `HOLD`, `CLEAR` and `FTB`.

- [ ] **Step 1: Write failing tests.**

```ts
const s = { outputs: ['wide', 'twins', 'stream', 'pillars'], armed: ['wide'], hold: false, ftb: false }
expect(shortcutCommand({ key: ' ', shiftKey: false, targetTag: 'BODY' }, s)).toEqual({ type: 'take', mode: 'auto' })
expect(shortcutCommand({ key: ' ', shiftKey: false, targetTag: 'INPUT' }, s)).toBeNull()
expect(shortcutCommand({ key: '2', shiftKey: false, targetTag: 'BODY' }, s)).toEqual({ type: 'arm', outputIds: ['wide', 'twins'] })
expect(shortcutCommand({ key: '1', shiftKey: false, targetTag: 'BODY' }, s)).toEqual({ type: 'arm', outputIds: [] })
expect(shortcutCommand({ key: 'h', shiftKey: false, targetTag: 'INPUT' }, s)).toBeNull()
expect(shortcutCommand({ key: 'Escape', shiftKey: true, targetTag: 'INPUT' }, s)).toEqual({ type: 'clear' })
expect(shortcutCommand({ key: 'B', shiftKey: true, targetTag: 'TEXTAREA' }, s)).toEqual({ type: 'ftb', on: true })
// e2e control.spec.ts
test('layer change is pending until AUTO', async ({ page }) => { await command({ type: 'resetShow' }); await page.goto('/control')
  await page.getByRole('button', { name: 'B · Icons' }).click(); await expect(page.locator('[data-output-tab=wide] [data-pending]')).toBeVisible()
  await page.locator('[data-arm=wide]').click(); await page.getByRole('button', { name: /^AUTO/ }).click()
  await expect.poll(async () => (await state()).program.wide.view.background?.id).toBe('B'); await expect(page.locator('[data-output-tab=wide] [data-pending]')).toHaveCount(0) })
test('HOLD from master bar', async ({ page }) => { await page.goto('/control'); await page.getByRole('button', { name: /^HOLD/ }).click(); await expect.poll(async () => (await state()).overlay.hold.on).toBe(true) })
```

- [ ] **Step 2: Run `npx vitest run tests/web/shortcuts.test.ts && npx playwright test tests/e2e/control.spec.ts` and confirm it FAILS.**
- [ ] **Step 3: Implement the files.**
- [ ] **Step 4: Run the tests and confirm they PASS.**
- [ ] **Step 5: Commit.** `git commit -m "feat: control page shell with monitors, layer controls, master bar and shortcuts"`

### Task 12: Show tab (Players, Race, Results)

**Files:**
- Create: `web/src/control/catalog.ts`, `web/src/control/show/PlayersCard.svelte`, `RaceCard.svelte`, `ResultsCard.svelte`
- Create: `web/src/control/components/CharacterSelect.svelte`, `ColourSelect.svelte`, `TrackSelect.svelte`
- Modify: `web/src/control/tabs/ShowTab.svelte`
- Test: `tests/web/control-catalog.test.ts`, `tests/e2e/show.spec.ts`

**Interfaces:**
- `searchCharacters(c: CatalogIndex, q: string): CharacterEntry[]`
  - Case-insensitive match on `name`.
  - Entries whose name starts with `q` come first, then contains-matches; roster order within each group.
  - An empty `q` returns everything.
- `searchTracks(c: CatalogIndex, q: string): { cup: CupEntry; tracks: TrackEntry[] }[]`: grouped by cup; cups with no matches are dropped.
- `duplicatePositions(positions: number[]): number[]`: positions (ignoring 0) that appear more than once, sorted.
- `CharacterSelect` props: `{ value: string; catalog: CatalogIndex; onchange(id: string): void }`. A searchable combobox with icon and name; ArrowUp/Down and Enter select.
- **PlayersCard**
  - 4 rows: chip `P#` in the player colour · name `<input>` (sends `setPlayer` on input) · `CharacterSelect` · `ColourSelect` (8 presets).
  - A "● Pn changed — not on air yet" note when `pending` > 0 and that player differs from Program.
- **RaceCard**
  - Cup | Single track toggle.
  - Cup mode: cup select (emblem + name); 4 race tiles with thumbnails (done races dimmed using `scores.races` trackIds; current highlighted); ◀ ▶ (`stepRace`).
  - Single-track mode: `TrackSelect`.
  - **Random** button (`randomRace`).
- **ResultsCard**
  - Title "Results · Race n · <Track>".
  - Per player: a position `<select>` (—, 1st–12th), the points from `pointsFor`, and the running total from `totals` including the pending edit.
  - **Save results** (`saveResults` with `raceNo` = selected race). Always enabled.
  - Duplicates show the warning text `Duplicate position: <n>`.
  - A race picker (Race 1…n+1) reopens earlier results.
  - **Edit totals…** opens per-player adjustment number inputs (`setAdjustment`).
  - Footnote: "Positions 1st–12th score 15, 12, 10, 9 … 1. Saving updates Standings in Preview."
- **Test hooks:** player rows `[data-player=<i>]` containing `input[name=name]` and the `[data-character]` combobox button; result rows `[data-result=<i>]` containing the position `select` (option values `''`, `'1'` … `'12'`).

- [ ] **Step 1: Write failing tests.**

```ts
expect(searchCharacters(idx, 'pe').map(c => c.name)).toEqual(['Peach', 'Peachette', 'Pink Gold Peach'])
expect(searchCharacters(idx, 'RED').map(c => c.id)).toEqual(['yoshi-red'])
expect(duplicatePositions([1, 3, 3, 0])).toEqual([3]); expect(duplicatePositions([0, 0, 1, 2])).toEqual([])
// e2e show.spec.ts
test('edit players without going on air', async ({ page }) => { await command({ type: 'resetShow' }); await page.goto('/control')
  await page.locator('[data-player=0] input[name=name]').fill('SAM'); await page.locator('[data-player=0] [data-character]').click(); await page.keyboard.type('yosh'); await page.keyboard.press('Enter')
  await expect.poll(async () => (await state()).draft.players[0]).toMatchObject({ name: 'SAM', characterId: 'yoshi' })
  expect((await state()).program.twins.view.lowerThirds).toEqual([]) })
// Review Focus 5: duplicate / missing positions save with a warning
test('results with a duplicate and a blank', async ({ page }) => { await page.goto('/control')
  for (const [i, v] of [[0, '1'], [1, '1'], [2, '3'], [3, '']] as const) await page.locator(`[data-result=${i}] select`).selectOption(v)
  await expect(page.getByText('Duplicate position: 1')).toBeVisible(); await page.getByRole('button', { name: 'Save results' }).click()
  await expect.poll(async () => (await state()).draft.scores.races[0]?.positions).toEqual([1, 1, 3, 0]) })
```

- [ ] **Step 2: Run the tests and confirm they FAIL.**
- [ ] **Step 3: Implement the Show tab components.**
- [ ] **Step 4: Run `npx vitest run tests/web && npx playwright test tests/e2e/show.spec.ts` and confirm it PASSES.**
- [ ] **Step 5: Commit.** `git commit -m "feat: Show tab — players, race selection and results entry"`

---

## P1: Planned for the show

### Task 13: Wide and HD scenes (Line-up, Next race, Standings, Winner)

**Files:**
- Create: `web/src/graphics/SceneLayer.svelte`, `scenes/LineupScene.svelte`, `NextRaceScene.svelte`, `StandingsScene.svelte`, `WinnerScene.svelte`
- Modify: `web/src/graphics/Output.svelte`
- Test: `tests/e2e/scenes.spec.ts`

**Interfaces:**
- `SceneLayer` props: `{ scene: SceneView; view: ViewModel; enter: number; exit: number }`. A scene change cross-fades.
- Each scene takes `{ scene: <its SceneView variant>; view: ViewModel; enter: number }`.
- Each scene lays out for `view.format` `wide` (3840×1152) or `hd` (1920×1080), using a `.wide` / `.hd` root class.
- Headings use `<Heading look={view.headingLook} font={view.fonts.headings} upright={view.headingUpright}>`.

| Scene | Contents |
|---|---|
| Line-up | `THE RACERS`; four `.lineup-card` elements with Medallion, P# chip, name (`fitText`) and character |
| Next race | `NEXT RACE` and race-label chips, track image in a gold frame (`#ffd21f`, 12 px, radius 34), cup medallion badge, track name heading, cup name, and the `cupTracks` strip with `current` highlighted |
| Standings | `STANDINGS`; `.standing-row[data-slot]` per row keyed by `player.slot` with `animate:flip` (duration = enter); `.first` on every row with position 1 (yellow `#fff27a → #ffeb02 → #fede01`, text `#281c03`); player-colour edge; name in `.name` with `fitText`; `+N` chip when `lastRacePoints` isn't null; total; footer text |
| Winner | Rotating ray burst (40 s/rev), bobbing medallion, confetti (90, or 20 with lowfx), `WINNER` heading, name, character, `<total> PTS` |

Reference pages: `docs/mockups/scenes/lineup.html`, `next-race.html`, `standings.html` and `winner.html`. HD layouts aren't mocked: derive them from the wide pages with the same parts and proportions, and compare against `docs/mockups/overlays/hd-lower-thirds.html` for scale.

- [ ] **Step 1: Write failing e2e tests.**

```ts
for (const [scene, text] of [['lineup', 'THE RACERS'], ['nextRace', 'NEXT RACE'], ['standings', 'STANDINGS'], ['winner', 'WINNER']] as const)
  test(`wide ${scene}`, async ({ page }) => { await command({ type: 'setLayers', outputId: 'wide', patch: { background: 'B', scene } }); await command({ type: 'take', mode: 'cut', outputIds: ['wide'] }); await page.goto('/out/wide'); await expect(page.locator('[data-layer=scene]')).toContainText(text) })
test('standings re-sort keeps rows', async ({ page }) => {
  await command({ type: 'saveResults', raceNo: 1, trackId: 'mario-kart-stadium', positions: [1, 2, 3, 4] })            // P1 leads
  await command({ type: 'setLayers', outputId: 'wide', patch: { background: 'B', scene: 'standings' } }); await command({ type: 'take', mode: 'cut', outputIds: ['wide'] })
  await page.goto('/out/wide'); await page.waitForSelector('body[data-ready]'); const row = await page.locator('.standing-row[data-slot="3"]').elementHandle()
  await command({ type: 'saveResults', raceNo: 2, trackId: 'water-park', positions: [4, 3, 2, 1] })                    // totals 24/22/22/24, tie → P4 (won last race)
  await command({ type: 'take', mode: 'auto', outputIds: ['wide'] })
  await expect(page.locator('.standing-row').first()).toHaveAttribute('data-slot', '3'); expect(await row!.evaluate(e => e.isConnected)).toBe(true); await expect(page.locator('.standing-row.first')).toHaveCount(2) })  // tie shares 1st
test('hd scenes stay inside 1920×1080', async ({ page }) => { await command({ type: 'setLayers', outputId: 'stream', patch: { background: 'B', scene: 'standings' } }); await command({ type: 'take', mode: 'cut', outputIds: ['stream'] })
  await page.goto('/out/stream'); await page.waitForSelector('body[data-ready]')
  const out = await page.locator('[data-layer=scene] *').evaluateAll(els => els.filter(e => { const r = e.getBoundingClientRect(); return r.right > 1920 + 1 || r.bottom > 1080 + 1 }).length); expect(out).toBe(0) })
test('long name fits standings row', async ({ page }) => { await command({ type: 'setPlayer', index: 0, patch: { name: 'ALEXANDRIA-ROSE FEATHERSTONE' } })
  await command({ type: 'setLayers', outputId: 'wide', patch: { scene: 'standings' } }); await command({ type: 'take', mode: 'cut', outputIds: ['wide'] }); await page.goto('/out/wide'); await page.waitForSelector('body[data-ready]')
  expect(await page.locator('.standing-row .name').first().evaluate(e => e.firstElementChild!.getBoundingClientRect().width <= e.getBoundingClientRect().width + 1)).toBe(true) })
```

- [ ] **Step 2: Run `npx playwright test tests/e2e/scenes.spec.ts` and confirm it FAILS.**
- [ ] **Step 3: Implement the scenes.**
- [ ] **Step 4: Run the tests and confirm they PASS.** Add a `toHaveScreenshot` per scene and check the baselines by eye.
- [ ] **Step 5: Commit.** `git commit -m "feat: line-up, next race, standings and winner scenes"`

### Task 14: Text & Fonts, Outputs and Settings tabs

**Files:**
- Create: `web/src/control/tabs/TextFontsTab.svelte`, `OutputsTab.svelte`, `SettingsTab.svelte`
- Modify: `web/src/control/Control.svelte`
- Test: `tests/e2e/tabs.spec.ts`

**Interfaces:**
- **TextFontsTab**
  - Inputs for pre-title, title, title accent, watermark and hold message (`setEventText`).
  - Event title style: Chrome / Classic.
  - For each role (Event title, Headings, Names & numbers, Labels): a font `<select>` listing `BUNDLED_FONTS` plus `state.uploadedFonts[].family`; Headings also gets look Chrome/Classic/Plain (`setTypography`).
  - Each option label renders in its own font.
- **OutputsTab**
  - A table of outputs: name, format, URL `/out/<id>` with a Copy button (full URL from `/api/info` `lanUrls[0]`), connected count, safe area (4 number inputs), graphics scale.
  - **Add output** (id slug, name, format) and **Remove** (with `confirm()`).
- **SettingsTab**
  - **Reset scores** (`confirm`) and **Reset show** (`confirm`).
  - **Reset on-air timer**.
  - The server LAN URLs list.
  - Asset catalog counts: cups, tracks, characters.
- **Test hooks:**
  - Left tabs use `role=tab` with names `Show`, `Text & Fonts`, `Outputs`, `Settings`.
  - Role blocks are `[data-role=eventTitle|headings|names|labels]`, each with `select[name=font]`.
  - Event text inputs are named `preTitle`, `title`, `titleAccent`, `watermark` and `holdMessage`. Each sends `setEventText` on input.
  - Output rows are `[data-output-row=<id>]`.
  - The add form has inputs `name=id`, `name=name` and `select[name=format]`, plus an `Add output` button.

- [ ] **Step 1: Write failing e2e tests.**

```ts
test('headings font reaches output', async ({ page }) => { await page.goto('/control'); await page.getByRole('tab', { name: 'Text & Fonts' }).click(); await page.locator('[data-role=headings] select[name=font]').selectOption('Saira')
  await command({ type: 'setLayers', outputId: 'wide', patch: { scene: 'standings' } }); await command({ type: 'take', mode: 'cut', outputIds: ['wide'] })
  const out = await page.context().newPage(); await out.goto('/out/wide'); expect(await out.locator('.heading').first().evaluate(e => getComputedStyle(e).fontFamily)).toMatch(/^"?Saira/) })
test('add output appears everywhere', async ({ page }) => { await page.goto('/control'); await page.getByRole('tab', { name: 'Outputs' }).click()
  await page.locator('input[name=id]').fill('lobby'); await page.locator('input[name=name]').fill('Lobby'); await page.locator('select[name=format]').selectOption('hd'); await page.getByRole('button', { name: 'Add output' }).click()
  await expect(page.locator('[data-arm=lobby]')).toBeVisible(); await expect(page.locator('[data-output-row=lobby]')).toContainText('/out/lobby') })
test('watermark text reaches background A', async ({ page }) => { await page.goto('/control'); await page.getByRole('tab', { name: 'Text & Fonts' }).click(); await page.locator('input[name=watermark]').fill('ACME RACING')
  await command({ type: 'take', mode: 'cut', outputIds: ['wide'] }); const out = await page.context().newPage(); await out.goto('/out/wide'); await expect(out.locator('[data-bg=A]')).toContainText('ACME RACING') })
```

- [ ] **Step 2: Run the tests and confirm they FAIL.**
- [ ] **Step 3: Implement the tabs.**
- [ ] **Step 4: Run them again and confirm they PASS.**
- [ ] **Step 5: Commit.** `git commit -m "feat: text & fonts, outputs and settings tabs"`

### Task 15: Background C (Sticker Wall)

**Files:**
- Create: `web/src/graphics/backgrounds/StickerWall.svelte`, `stickers.ts`
- Modify: `web/src/graphics/Output.svelte`
- Test: add to `tests/e2e/output.spec.ts`

**Interfaces:**
- `StickerWall` props: `{ watermark: string; title: TitleView; titleFont: string; labelFont: string; w: number; h: number; lowfx: boolean }`

**Layout.** Reference page: `docs/mockups/backgrounds/c-sticker-wall.html` (`STICKER_TILE` in `docs/mockups/shared/mockup.js`). Keep the sticker classes **unscoped** (`.st-o`, not `.bg-stickers .st-o`): selectors with ancestors don't match inside SVG `<use>` copies.
- `#f3f3f3` background; a 1280×1152 sticker tile on a 24 px grid.
- Rows A, C and E are stickers; B and D are wordmark bands showing `watermark` (D offset by 640).
- Repeat the tile across the width and translate by −1280 px over 80 s.
- Sticker texts use `fitText` against their box. The wordmark font-size scales down so it fits 980 px.
- A kart parade (7 karts/bikes, ×2 for looping, 55 s) and a road line, with the logo plate (title, accent `#e60012`, pre-title).

- [ ] **Step 1: Write a failing test.** Taking background C shows `[data-bg=C]` containing the watermark text, and every sticker `text[data-max]` has `getBBox().width <= data-max + 1` once the page is ready.
- [ ] **Step 2: Run `npx playwright test -g "background C"` and confirm it FAILS.**
- [ ] **Step 3: Implement it.**
- [ ] **Step 4: Run it again and confirm it PASSES.** Check a screenshot by eye against the mockup.
- [ ] **Step 5: Commit.** `git commit -m "feat: sticker wall background C"`

### Task 16: Multiview page

**Files:**
- Create: `web/src/multiview/main.ts`, `Multiview.svelte`, `layout.ts`
- Test: `tests/web/multiview-layout.test.ts`, `tests/e2e/multiview.spec.ts`

**Interfaces:**
- `multiviewLayout(outputs: OutputConfig[]): Tile[]` on a 1920×1080 canvas with a 10 px margin and gap.
  - `type Tile = { kind: 'output'; outputId: string; view: 'program' | 'preview'; x; y; w; h } | { kind: 'info' | 'standings'; x; y; w; h }`
  - The first `wide`-format output's Program spans the full width at the top (height = w × 1152/3840).
  - Its Preview sits below-left at w = 620.
  - The info tile (clock, on-air timer from `clocks.onAirSince`, now race) sits to the right of the Preview.
  - The standings tile is right-aligned, w = 410.
  - The other outputs' Program tiles share the bottom row at equal height.
- Reference page: `docs/mockups/ui/multiview.html` (and `?hold=1`).
- Tiles are iframes of `/out/<id>?lowfx=1` (plus `&view=preview` for Preview), scaled with `use:fit`.
- Borders: Program `#dc2626`, Preview `#16a34a`; all `#f59e0b` while `overlay.hold.on`.
- Each tile is labelled `<NAME> · PROGRAM` or `<NAME> · PREVIEW`, with a connection light from `presence`.
- **Test hook:** every tile root carries `data-tile`, and gets class `hold` while HOLD is on.

- [ ] **Step 1: Write failing tests.**

```ts
const t = multiviewLayout(DEFAULT_OUTPUTS)
expect(t.find(x => x.kind === 'output' && x.outputId === 'wide' && x.view === 'program')).toMatchObject({ x: 10, y: 10, w: 1900 })
expect(t.filter(x => x.kind === 'output' && x.view === 'program')).toHaveLength(4)
expect(t.every(x => x.x >= 0 && x.y >= 0 && x.x + x.w <= 1920 && x.y + x.h <= 1080)).toBe(true)
// no two tiles overlap (pairwise rectangle intersection = false)
// e2e: /multiview shows 'WIDE · PROGRAM'; after hold on, every [data-tile] has class 'hold'
```

- [ ] **Step 2: Run the tests and confirm they FAIL.**
- [ ] **Step 3: Implement the page.**
- [ ] **Step 4: Run them again and confirm they PASS.**
- [ ] **Step 5: Commit.** `git commit -m "feat: multiview page"`

---

## P2: If time allows

### Task 17: Font upload and show Export/Import

**Files:**
- Modify: `shared/schema.ts` and `shared/reducer.ts` (add `{type:'registerFont'; family: string; file: string}`, which appends to `uploadedFonts` and is a no-op for duplicates)
- Modify: `server/http.ts`
- Create: `web/src/lib/uploaded-fonts.ts`
- Modify: `TextFontsTab.svelte`, `SettingsTab.svelte`, `web/src/out/main.ts`, `web/src/control/main.ts`
- Test: `tests/server/app.test.ts` (extend), `tests/shared/reducer.test.ts` (extend)

**Interfaces:**
- `PUT /api/fonts/:filename` (raw body)
  - Accepts only `.ttf`, `.otf`, `.woff` and `.woff2` files of 10 MB or less.
  - The filename must match `^[A-Za-z0-9 _.-]+$` and must not contain `..`.
  - Saves to `data/uploads/fonts/<filename>`, then dispatches `registerFont` with family = the filename without its extension.
  - Returns `{ family }`, or 400 with a message.
- `GET /api/export` → a `ShowFile` JSON download.
- `POST /api/import` validates with `showFileSchema` and dispatches `importShow`; 400 if invalid.
- `loadUploadedFonts(fonts: { family: string; file: string }[]): Promise<void>`
  - Uses `new FontFace(family, url(/uploads/fonts/<file>))` plus `document.fonts.add`.
  - Called on every payload when the list changes, before `whenReady`.
- `fontStack` already handles any family name.

- [ ] **Step 1: Write failing tests.**
  - `PUT /api/fonts/..%2Fevil.ttf` → 400.
  - `PUT /api/fonts/Comic.exe` → 400.
  - A valid upload → `store.state.uploadedFonts` contains `{ family: 'MyFont', file: 'MyFont.ttf' }`.
  - Export → import round trip leaves `draft` deep-equal.
  - Importing `{}` → 400.
- [ ] **Step 2: Run `npx vitest run tests/server tests/shared/reducer.test.ts` and confirm it FAILS.**
- [ ] **Step 3: Implement it.**
- [ ] **Step 4: Run it again and confirm it PASSES.** Manually upload a `.ttf`, select it for Headings, take, and see it on the output.
- [ ] **Step 5: Commit.** `git commit -m "feat: font upload and show export/import"`

### Task 18: Chromium 103 smoke test and FPS probe

**Files:**
- Create: `scripts/smoke-chrome103.ts`
- Modify: `package.json` (add a `puppeteer@14` dev dependency and the script `"smoke:103": "tsx scripts/smoke-chrome103.ts"`)

**Interfaces:**
- `npm run smoke:103 -- --base http://localhost:8080`:
  - Asserts `browser.version()` starts with `HeadlessChrome/103`. If the installed Puppeteer bundles a different Chromium, pin the 14.x release that bundles 103 and say so in the commit message.
  - Loads `/control`, `/multiview`, `/out/wide`, `/out/twins?view=preview` and `/out/stream`.
  - Fails on any `pageerror` or `console.error`.
  - Waits for `body[data-ready]` on outputs.
  - Then takes background A + title on wide, samples `requestAnimationFrame` for 5 s on `/out/wide` at a 3840×1152 viewport, and prints `wide fps: <n>`.

- [ ] **Step 1: Run `npm start` and `npm run smoke:103` against the built app.** Expected: `OK 5 pages, 0 errors`, and an fps line printed.
- [ ] **Step 2: Fix any Chromium 103 incompatibility it finds**, and add a regression assertion for each fix to the relevant e2e test.
- [ ] **Step 3: Add to `docs/millumin-runbook.md`:** "Run `npm run smoke:103` after every build; check `wide fps` ≥ 58 on the output Mac via Millumin's display FPS."
- [ ] **Step 4: Commit.** `git commit -m "test: Chromium 103 smoke test and fps probe"`
