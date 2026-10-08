# Millumin runbook

Checklist for setting up and rehearsing the output pages in Millumin. Output pages are Chromium 103 web pages with transparent backgrounds.

## Per-output setup

For each output (`wide`, `twins`, `stream`, `pillars`, or any you added):

- [ ] Add a **Web media** pointing at `http://<control>.local:8080/out/<id>` (`<control>` is the control laptop's hostname; the server prints the exact URLs on start).
- [ ] **Render size = the output canvas:**
  - wide: 3840x1152
  - twin: 1920x1152
  - hd: 1920x1080
- [ ] **Framerate 60.**
- [ ] **`transparent` ON** for overlay outputs (twins, stream). **OFF** for full-frame outputs.
- [ ] **`keep hot` ON.** Requires Millumin 5.15 or later on macOS 26 (earlier versions have a known freeze bug).
- [ ] Keep the Millumin window in front of other windows. Check Output > display FPS.
- [ ] Fallback: if `.local` doesn't resolve, use the control laptop's fixed IP, e.g. `http://192.168.1.20:8080/out/wide`.

## Twins as two screens: left and right

The twins output is one 1920x1152 canvas, but the two LED screens can each get their own URL. Both pages render the **same canvas and state** (one Take drives both), cropped to one half:

| URL | Render size | Shows |
|---|---|---|
| `/out/twins/left` | 960x1152 | Left screen: P1 + P2 lower thirds, left track card |
| `/out/twins/right` | 960x1152 | Right screen: P3 + P4 lower thirds, right track card |
| `/out/twins` | 1920x1152 | The whole canvas (still works; used by the control monitors) |

- [ ] Use either the two half URLs **or** the full one in Millumin, not both.
- [ ] The Outputs tab shows each half's connection count (`L 1 · R 1`). The Twins light is green with both halves (or a full page) connected, **amber with only one**.

## Superwide 5760x1152 (one URL for the whole stage)

`/out/superwide` renders left twin half (960) + wide (3840) + right twin half (960) side by side on one 5760x1152 page. It shows the Program of the `wide` and `twins` outputs, so you arm and take those two as usual (other output ids: `?wide=<id>&twins=<id>`).

- [ ] Web media at `http://<control>.local:8080/out/superwide`, render size **5760x1152**, framerate 60.
- [ ] `transparent` ON if the backgrounds are not taken on both outputs.
- [ ] Use this **instead of** the separate wide and twin pages. It counts as a full connection for both outputs.
- [ ] Check the frame rate at this size on the output Mac: it is 50% more pixels than the wide alone. If it falls short, use `?lowfx=1`.

Query options: `?lowfx=1` halves the particle counts, `?debug=1` shows a small status panel, `?view=preview` shows Preview instead of Program.

## Show day

- [ ] Use a wired switch for all laptops.
- [ ] Run the server under an auto-restart loop: `while true; do npm start; sleep 1; done`. State reloads from `data/state.json` after a crash.
- [ ] Run `npm run smoke:103` after every build; check `wide fps` >= 58 on the output Mac via Millumin's display FPS.

## Rehearsal

- [ ] Take each layer (background, scene, track card, lower thirds) on each output, with both CUT and AUTO.
- [ ] Test HOLD, CLEAR and FTB, then release each.
- [ ] Reload the page in Millumin mid-show. The current Program must appear immediately, with no intro animation.
- [ ] Pull the network cable for 10 seconds. Outputs keep their last frame and show no errors. Confirm the control page shows "Disconnected" and recovers when the cable returns.
- [ ] Kill and restart the server. Confirm outputs reconnect and the state is unchanged.
