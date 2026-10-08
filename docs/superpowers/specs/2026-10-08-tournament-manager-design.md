# Tournament Manager: Design Spec

- **Date:** 2026-10-08
- **Status:** Draft for review
- **Owner:** Jayden (production)

## 1. Goal

Run a multi-match event (for example 4 semis then a final) from one control page. Each match keeps its own cup, players and scores. Switching match changes what the live graphics show without losing any other match's data. Add race-win, cup-win, bracket and multi-match scoreboard scenes.

## 2. Decisions

| Topic | Decision |
|---|---|
| Final field | All 4 semi winners fill the final's slots. Every slot can be overridden by hand. |
| Carry-over | None. The final starts at 0. |
| Match setup | Set up all matches ahead of time or fill each as you reach it. Every field is editable at any time. The final auto-fills from winners but can be overridden. |
| Match-win tie | Existing `standings()` tiebreak (last race position). Winner can be overridden by hand. |
| Editing results | Finished matches stay editable. Winners, bracket and scenes recalculate. |
| Tournaments | Several can be saved and loaded. One is active. |
| Race win | Winner of a single race, shown with running totals. |
| Cup win | Winner of a match (also used for the final champion). |
| Win-screen look | Existing chrome/classic headings and character icons. No podium. |
| Bracket vs matches | Separate scenes. |
| Outputs | Wide, twin and HD all supported. |

## 3. Data model

```ts
interface Match {
  id: string
  label: string                 // "Semi 1", "Final"
  round: number                 // 0 = semis, 1 = final
  data: ShowData                // players, race, scores: the same shape the draft uses today
  status: 'pending' | 'live' | 'done'
  winnerOverride: number | null // slot index, null = computed from standings()
  slotSources?: ({ matchId: string; auto: boolean } | null)[]  // final: where each player slot comes from
}
interface Tournament {
  id: string; name: string
  matches: Match[]
  activeMatchId: string
  winScreen: WinScreenConfig
  matchesScene: MatchesSceneConfig
}
ShowState.tournaments: Tournament[]; ShowState.activeTournamentId: string | null
```

- **The draft is the active match.** Switching match writes the current `draft` back into its `Match`, then loads the new match's `data` into `draft`. Existing scenes, lower thirds, presets and the Companion module keep working unchanged.
- **Outside the active match** (bracket, matches scene, win screens for other matches) the view model reads `Match.data` directly.
- The event text and typography stay show-wide. They are not copied per match.
- When no tournament is active, the app behaves exactly as it does today.

## 4. Scenes

New scene ids: `raceWin`, `cupWin`, `bracket`, `matches`.

### 4.1 Parts and split outputs

`Layers` gains `part?: 'full' | 'hero' | 'board'` (default `full`) for `raceWin` and `cupWin`.

- `full`: hero and scoreboard in one layout (wide, HD).
- `hero`: winner only.
- `board`: scoreboard only.
- A "Split across outputs" button sets `hero` on one output and `board` on another.
- Twin currently supports only `title`. It gains `raceWin`, `cupWin` (`hero` and `board` parts only), `bracket` and `matches` (compact layouts).

### 4.2 Win screens (`WinScreenConfig`)

- Blocks, each togglable: winner hero (icon, name, "WINNER" heading), scoreboard (rows, per-race points, totals), cup emblem, track name.
- Layout presets: hero left / board right, hero centre / board strip below.
- Saved per tournament, usable in presets.
- `raceWin` shows the latest saved race of a chosen match (default: active). `cupWin` shows a chosen match's winner (default: active).

### 4.3 Matches scene (`MatchesSceneConfig`)

- **Which matches:** any subset (semis 1–4, semis plus final, two only).
- **Layout:** 2×2 grid, 4-across row, 1×4 stack, or one focused card with small strips.
- **Detail:** full (4 rows plus per-race points), compact (rows with totals), winner only.
- **Live marker** on the active match. Pending matches show the players with 0s or hide scores (option).
- **Range selector** so one twin shows semis 1–2 and the other 3–4.
- Defaults: 2×2, full on wide, compact on HD and twin.

### 4.4 Bracket scene

Simple "4 semis → final" panel. Each semi shows its winner and score, feeding into the final box. Overridden winners show the same as computed ones.

## 5. Control UI

New **Tournament** tab:

- Tournament picker (new, duplicate, load, delete).
- Match list / bracket editor with the active match highlighted.
- Per-match setup form (label, cup, players, characters, colours) and results table. Both edit any match, not only the active one.
- Winner override and slot-source override controls.
- "Go to next match" and per-match "Make active".
- Win-screen and matches-scene config panels.

## 6. Commands (additions)

`createTournament`, `loadTournament`, `renameTournament`, `deleteTournament`, `addMatch`, `updateMatch`, `removeMatch`, `setActiveMatch`, `nextMatch`, `setMatchResults` (edit any match's races and adjustments), `setWinnerOverride`, `setSlotSource`, `setWinScreenConfig`, `setMatchesSceneConfig`. `setLayers` gains `part`.

Companion actions: next match, set active match, show race win, show cup win, show bracket, show matches.

## 7. Persistence and compatibility

- `tournaments` and `activeTournamentId` default to `[]` / `null` in the zod state schema, so older state files still load.
- Tournaments are included in show export/import.
- Presets keep snapshotting the draft. A new scope flag `tournament` is optional, and is off by default so recalling a preset never switches match.

## 8. Phasing

1. Data model, schema, reducer commands, match switching, per-match scores, persistence, tests.
2. Tournament tab UI (setup, results editing, overrides).
3. `raceWin` and `cupWin` scenes with config, parts and the twin support.
4. `matches` and `bracket` scenes.
5. Companion buttons, preset scope and e2e snapshots.

## 9. Testing

- Unit: reducer commands, match switching round-trips, winner and tie logic, slot auto-fill and override, schema back-compat.
- View: `deriveView` for each new scene and part, per output format.
- E2E: Playwright snapshots for each new scene on wide, twin and HD, plus a switch-match flow.
