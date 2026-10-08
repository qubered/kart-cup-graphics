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
