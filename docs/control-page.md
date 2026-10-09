# Control page (`/control`)

The operator page. Design rationale and the interactive prototype are in `docs/control-ui-overhaul.md` and `docs/mockups/ui/demo/`; this file describes what is built.

## Pages

Top bar: **Live · Race · Tournament · Setup**. The transport (arm outputs, CUT / AUTO, speed, HOLD / CLEAR / FTB) is always visible at the bottom. The page is kept in the URL hash (`#/race`).

| Page | What it does |
|---|---|
| **Live** | Left: the **rundown** (cue list, Run / Edit lock, GO). Centre: output tabs, Preview and Program side by side, the **Looks library**. Right: the selected screen's scenes, then that scene's options, Background and Overlays. |
| **Race** | Operate the live race: the race tiles and map (per-race override), the players and finishing places, the scoreboard, Next race and (in a tournament) Next match. Never changes the graphics. |
| **Tournament** | Set up and manage a tournament: outline of rounds on the left, one page per round (match tabs, settings, maps, players, results, winner override), Overview with readiness checks, Graphics config, and the tournament library. |
| **Setup** | Text and fonts (event title, notice board, QR), Outputs, Settings. |

## Looks and rundowns

- A **Look** is a saved preset (the data model still calls it a preset). It captures everything: every screen's layers, arming, show data, scores, speed and Mattify. The recall options choose what comes back: **Look**, **Outputs armed**, **Race & players**, **Scores** (Advanced shows all 8 flags). New Looks default to Look + Outputs armed on, Race & players and Scores off; while a tournament is active race, players and scores are never recalled.
- Tapping a Look loads it into **Preview only**. The header shows *Preview: X · MODIFIED / SAVED*; **Update "X"** needs two taps and says how many cues it affects; **Save as new…** opens the form in the right bar. ⋯ on a tile: Recalls…, Rename, Duplicate, ＋ Cue, Delete (two taps).
- The **rundown** is a cue stack. Run mode: tap a cue to put it on standby (it loads into Preview), **GO** (or `G`) fires it with the cue's Cut / Auto and any *then next race / next match / reset* action. Edit mode locks GO and allows drag reorder, remove, per-cue Look / Take / After / Recalls, **Add cue from Preview** (saves a Look and adds the cue in one step), and adding Looks by drag or ＋.
- **Undo** (toast button or Ctrl/Cmd+Z): loads into Preview, saves, overwrites, deletes, cue edits and the like. Takes and GO are never undoable. Destructive actions are two-tap, never `confirm()`.

## Keys

`Space` AUTO · `Enter` CUT · `G` GO (Run mode) · `H` hold · `Shift+Esc` clear · `Shift+B` fade to black (not while typing) · `1`–`9` arm outputs · `Ctrl/Cmd+Z` undo. Hints also show as tooltips on the buttons.

## Code map

- `web/src/control/Control.svelte` (shell), `TopBar.svelte`, `MasterBar.svelte`, `ui.ts` (page, Run/Edit, toasts, undo), `ui/` (`ui.css` primitives with a `u-` prefix, `drag.ts`, `twotap.svelte.ts`).
- `live/RundownRail.svelte` + `live/rail/`, `live/Centre.svelte` + `live/centre/`, `live/SceneEditor.svelte` + `live/scene/`, `race/`, `tournament/`, `setup/`.
- Commands added for this UI (all in `shared/types.ts`): `addCueFromPreview`, `duplicatePreset`, `makeCuePresetUnique`, `setPreset`, `moveCueTo`, `restoreSnapshot`, `setRoundName`, `setRaceTrack`, `clearRace`. Existing commands are unchanged, so Companion keeps working.

## Behaviour worth knowing

- **Look thumbnails are schematic**, drawn from the real view model (names, colours, scores, track card) rather than the live graphics renderer: `Output.svelte` sets global page styles and runs the full animated scene, which is too heavy for 20+ tiles.
- **ON AIR** on a Look = its layers equal what Program shows on every screen it arms. **MODIFIED** = Preview differs from the loaded Look in the parts that Look recalls.
- **Race results save when the row is complete** (all four places distinct), in one `saveResults`, so half a race never flashes on air. Until then the selected places show amber.
- The Looks library has no "Overwrite ← PGM" button any more (`updatePreset` with `from: 'pgm'` still exists); save a new Look from *On air now* instead.
- Undo limits: restoring a deleted Look brings back its cues with new ids and without the on-air / standby marker; undoing "Add cue from Preview" clears the *loaded Look* marker.

## Screenshots

`docs/screenshots/control/`: `live.png`, `live-modified.png` (Preview changed: MODIFIED, Update / Save as new), `live-edit.png` (Edit mode: drag grips, ＋ on Looks, locked GO), `race.png`, `tournament.png`, `setup.png`. Captured from the running app at 1920×1080 with a seeded show.
