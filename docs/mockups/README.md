# Reference mockups

These pages are the approved designs from brainstorming, written as plain HTML/CSS/JS at **real output size**. They are the **visual source of truth** for the build: the Svelte components must match them.

## Viewing

The pages load the Mario Kart F2 font from `assets/fonts/` with a relative URL. Browsers block that over `file://`, so serve the **repo root**:

```bash
python3 -m http.server 8765
```

Then open <http://localhost:8765/docs/mockups/> for the gallery.

The mockups need internet for Google Fonts and Mario Wiki images. The real app self-hosts both.

`http.server` lets the browser cache files, so after editing `shared/*` do a hard refresh (Cmd+Shift+R).

## URL parameters

| Param | Effect |
|---|---|
| `format=wide\|twin\|hd` | Canvas 3840×1152 / 1920×1152 / 1920×1080 (backgrounds, title lockup, HOLD) |
| `guides=1` | Outlines every component with its `x,y · w×h` in canvas pixels; use this to read off exact positions |
| `fit=0` | 1:1 pixels instead of scale-to-window |
| `embed=1` | Black page, no caption (used by iframes) |
| `camera=0` | Hide the stand-in camera so overlay transparency shows |
| `lowfx=1` | Fewer particles (monitors, multiview) |
| `style=chrome\|classic` | Event title style (S1 / S3) |
| `look=classic\|chrome\|plain` | Heading look |
| `players=0,1` | HD/wide lower-third slots |
| `pre`, `title`, `accent`, `wm`, `hold`, `names`, `track` | Override sample text (e.g. long-name tests) |
| `hold=1` | Multiview only: shows the HOLD state |

## Files

| Path | What it is |
|---|---|
| `shared/tokens.css` | **Every design token** (colours, gradients, font stacks, easing, durations, operator-UI colours). Copy verbatim into `web/src/graphics/tokens.css`. |
| `shared/graphics.css` | Reference CSS for every component: backgrounds A/B/C, title lockup, headings, medallion, lower third, track card, scene parts, HOLD, camera stand-in. Port each block into its Svelte component **keeping every number**. |
| `shared/mockup.js` | Sample data; `lowerThirdSlots()` / `trackCardSlots()` (identical to plan Task 8); component HTML builders; the icon set (`ICONS`: pattern tile 1250×280, crest, kart/bike silhouettes); the sticker tile (`STICKER_TILE`, 1280×1152); sparkles, parade, confetti; `fitText`; the guides overlay. |
| `backgrounds/a-menu-sky.html`, `b-icon-pattern.html`, `c-sticker-wall.html` | The three backgrounds |
| `titles/title-lockup.html` | Title scene (background A + event title), S1/S3, wide/hd/twin |
| `titles/headings.html` | Heading looks and every bundled font |
| `overlays/twin-lower-thirds.html`, `hd-lower-thirds.html`, `wide-lower-thirds.html` | Medallion lower thirds + T1 track card per format |
| `overlays/hold.html` | HOLD slide, wide/hd/twin |
| `scenes/lineup.html`, `next-race.html`, `standings.html`, `winner.html` | Wide scenes |
| `backgrounds/d-player-announce.html`, `scenes/player-announce.html` | Player announcement: field in the player's colour with checkered flag bands, winner-hero layout on top. Built in the app as `AnnounceScene.svelte` (`announce` scene; player picked with `announceSlot`) |
| `ui/control.html` | Approved control-page layout (1600×1000), standard operator UI |
| `ui/multiview.html` | Multiview (1920×1080) |

## Text-fitting rules (also in spec §5)

- **Names, track names, sticker text:** shrink to a floor of 60% of the base size, then compress the inner `<span>` with `scaleX`. See `fitText` in `shared/mockup.js`; try `overlays/twin-lower-thirds.html?names=ALEXANDRIA-ROSE%20FEATHERSTONE,PRIYA,TOM,ALEX&track=Tour%20Singapore%20Speedway`.
- **Event title lockup:** wide = one line; HD = title in 1–2 lines + accent line; twin = title in 1–3 lines + accent line, per half. Line breaks are chosen by measured fit: the fewest lines that reach ≥ 85% of the base size (see `layoutTitles()` and `MK.TITLE_SIZES`). Every line is fitted with no floor and all lines share the smallest size. Try `titles/title-lockup.html?format=twin&title=SUPER%20MEGA%20KART%20CHAMPIONSHIP`.
- **Gotcha:** the sticker tile repeats through SVG `<use>`. Its classes must be unscoped, because ancestor selectors don't match inside `<use>` copies.

## Rules for implementers

- **Same numbers, same structure.** Class names here match the test hooks in the plan where they overlap: `.lower-third[data-slot] .name`, `.track-card .track-name`, `.heading`, `.standing-row[data-slot]`, `.standing-row.first`, `.lineup-card`, `[data-bg]`, `[data-layer]`, `[data-overlay=hold]`, `.hold-half`.
- **Assets.** The mockups hotlink `mario.wiki.gallery`; the app uses `/assets/...` paths from `assets/catalog.json`.
- **Animation.** Animation here is ambient only (backgrounds, sparkles, rays, bob, parade). Enter/exit/take animations are specified in the spec §5 "Motion" and plan Global Constraints, and implemented in `web/src/graphics/motion.ts`.
- **Derived pages.** `wide-lower-thirds.html` and the HD/twin variants of the title and HOLD follow the layout rules but were not separately reviewed. Tidy them if needed, but keep the rules.
- **Visual regression.** Playwright snapshots in the plan should be compared by eye against these pages (same sample data) before they become baselines.
