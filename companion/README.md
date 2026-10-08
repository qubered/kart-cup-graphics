# Companion module: Kart Cup Graphics

Bitfocus Companion connection for the Kart Cup control server (HTTP, `/api/presets` + `/api/command`).

**Actions:** save new preset / overwrite preset from PVW or PGM, GO (fire the standby cue), move standby cue next/previous, select cue (load into PVW), fire a specific cue, rewind stack, recall preset (optionally cut/auto), take (cut/auto), arm output / arm all, hold, clear, FTB.
**Feedbacks:** cue is PGM / PVW, preset last recalled, output armed, hold on, FTB on.
**Variables:** `<stack-id>_pgm`, `<stack-id>_pvw` (preset names), `armed_outputs`, `preset_count`.
**Presets:** auto-generated buttons per preset, per stack (GO / select prev / select next / rewind) and per cue (select, lit red on PGM and green on PVW), plus take, arm per output, hold, clear and FTB. They refresh when presets, stacks or outputs change.

**Tournament** (shown when a tournament exists): actions next match, set active match, show race win / cup win (output, part full/hero/board, match shown), show bracket, show matches (all / round / 1-based range), split race or cup win across two outputs (hero on one, scoreboard on the other), run a cue action (next race / next match / reset stack). Feedbacks: match is active, match status, match has winner. Variables: `tournament_name`, `active_match_label`, `active_match_status`, `active_match_winner`, and `match_<id>_status` / `match_<id>_winner`. Buttons: next match, race win, cup win, bracket, matches (all on the first output; re-point in the button's action) and one per match.
The module reads the tournament from `/api/presets` (`tournament` field, same shape as an exported tournament) when the server provides it, otherwise from `/api/export` (first tournament).

## Show flow
Select a cue and it loads into Preview. **GO** sends it to Program with its own Cut/Auto, then the next cue in the stack is selected into Preview.

## Install
```sh
cd companion
npm install
npm run build
npm run package   # produces kartcup-graphics-1.0.0.tgz to import via Companion's module-dev folder / "Import module package"
```
For development, point Companion's *Developer modules path* at a folder containing this directory, then add a **Kart Cup Graphics** connection with the control server's IP and port (default 8080).

The remote API has no authentication, same as the control websocket: keep it on the show LAN. (Without this module, Companion's Generic HTTP module can also `POST /api/command` with a JSON command.)
