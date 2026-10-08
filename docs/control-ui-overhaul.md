# Control page overhaul: options

Status: **pitch, nothing built yet.** Three directions, each mocked at 1600×1000. Interactive prototypes: `docs/mockups/ui/control-v2-{a,b,c}.html` (serve the repo root, see `docs/mockups/README.md`). Screenshots live in `docs/mockups/ui/control-v2/`.

## What is wrong today

Measured on the real app at 1600×1000 with 8 presets and a 9-cue stack (`before-*.png`):

| Problem | Evidence |
|---|---|
| Presets rows are all controls | 15 per row (8 scope chips + Recall, Cut, Auto, Overwrite←PVW, Overwrite←PGM, Rename, Delete). ~4 rows fit. |
| Cue rows are worse | 18 per row (3 selects, 7 buttons, 8 scope chips on a second line). ~4½ rows fit. |
| Save / restore is jargon | "Save from PVW / PGM", "Recall / Cut / Auto", "Overwrite ← PVW" need the data model in your head. Scope has 8 checkboxes *before* you can type a name. |
| Building a cue list is two trips | Save a preset on one tab, switch to Cues, pick it from a `<select>`. Nothing is built from what you are looking at. |
| Overwrite is dangerous | Cue "Overwrite ← PVW" silently changes **every** cue using that preset; guarded only by `confirm()`. |
| Live and setup mixed | 7 tabs: Show, Tournament (live), Presets, Cues (authoring), Text & Fonts, Outputs, Settings (setup). |
| Layer panel is dense and clipped | 5 rows of segmented buttons with a green/red double-encoding legend; the Overlays row falls below the fold with the Line-up scene selected. |
| Master bar is 128px | Arm chips, transport, emergency, plus two lines of keyboard hints. |

## Design rules (all options)

It is a show-control surface, not a dashboard. These came from the "production app" steer and the Companion module's behaviour:

1. **Colour contract, same as the Stream Deck feedbacks:** green = Preview/standby, red = Program/on air, blue = armed/primary, amber = modified/pending/editing. Nothing else uses them.
2. **No hover-only actions; every target ≥ 44px.** It must work on a touchscreen and under stress.
3. **Nothing floats over the monitors or the transport.** Saving is an inline form in a side rail, not a popover or modal.
4. **Run mode cannot destroy.** Reordering, deleting and overwriting only exist in an explicit Edit state; GO is locked while editing.
5. **No `confirm()` mid-show.** Overwrite is two-tap ("Tap again to overwrite, affects 2 cues") and every load/save shows an Undo toast.
6. **Load only ever goes to Preview.** Nothing reaches air except Take / GO.
7. **Transport and emergency stay on screen in every workspace**, emergency visually separated from Take.
8. **Rename "preset" to "look" in the UI only.** API, Companion and saved files keep `preset`.

## Option A: Rundown-first

`a-live.png`, `a-library.png`, `a-libconfirm.png`, `a-save.png`, `a-edit.png`, `a-drag.png`, `a-data.png`, `a-setup.png`

The cue list is the spine of the page and is always visible. Layout: **Rundown (left) · monitors + scene strip (centre) · Look / Library inspector (right) · slim transport**. Workspaces collapse from 7 tabs to **Live · Show data · Setup**.

- **Run / Edit lock** on the rundown. Run rows are glanceable: number, name, CUT/AUTO, ON AIR (red) / NEXT (green). A big **GO** sits at the foot of the rail.
- **Edit** shows drag handles, ✕ and an inline editor per cue (look, take, after, recall). The editor says *"Used by 2 cues"* with **Make unique**, replacing the silent global overwrite.
- **Add cue from Preview** is one button; **Save look…** has "Also add to rundown as cue N".
- **Save look** is an inline panel: name, Preview / On air, and 4 groups (Look, Outputs armed, Race & players, Scores) instead of 8 checkboxes. "Advanced" still exposes all 8.
- **Library** tab: tap a look to load it to Preview; a pinned "Preview now · Modified" card offers *Update "X"* (two-tap) or *Save as new…*.
- **Scene strip** (12 visual tiles) replaces the scene button row; the inspector only shows options for the current scene (Race win: Part, Match, Split).

Best for: scripted run-of-show, one operator learning the page. Cost: biggest restructure of the page shell, but every existing panel (monitors, layers, show data) is reused.

## Option B: Look bank

`b-live.png`, `b-store.png`

Hardware-style. A **bank of look buttons** (pages of 20, numbered like Stream Deck keys) is the main surface; the cue list becomes a **sequence strip** along the bottom with GO.

- Tap a slot = load to Preview. **STORE** then tap a slot = save; an empty slot saves, a filled slot asks for a second tap.
- Build a sequence by tapping chips or **REC** (tap looks in order).
- Preview tweaks (scene, background, overlays, win part) in a compact panel under the monitors.

Best for: improvised or fast-turnaround shows, and operators already thinking in Stream Deck pages. Cost: introduces slot/page ordering that the data model does not have (see below), and long scripted runs are harder to read as a chip strip than as a list.

## Option C: Run / Build split

`c-run.png`, `c-tweak.png`, `c-build.png`, `c-buildconfirm.png`

Two screens for two jobs. **Run** is stripped to big monitors, **On air / Next / After** cards, a huge **GO**, and a rundown minimap; "Tweak Preview" opens a drawer. **Build** (amber top bar) is a three-pane editor: Looks library · Rundown editor with Take/After always visible · Look editor with a large preview and Save as new / Update.

Best for: the least busy screen during the show, and the roomiest place to author. Cost: a mode switch whenever you need to edit mid-show, and two layouts to maintain.

## Option D: Declutter in place (no new layout)

Not mocked. Keep the tabs, merge **Presets + Cues into one "Rundown" tab**, apply the shared fixes below. Smallest change, ships fastest, but the live/setup split and the always-visible rundown do not happen.

## Comparison

| | A Rundown-first | B Look bank | C Run / Build | D Declutter |
|---|---|---|---|---|
| Less busy | Good | Medium (bank is dense) | **Best at show time** | Some |
| Save / restore | Inline save, Library, two-tap update | **STORE → tap slot** | Save as new / Update in editor | Same fixes, old layout |
| Build cue list | From Preview, drag, inline editor | REC / tap chips | Dedicated editor | Merged tab |
| Edit mid-show | One toggle | One toggle | Mode switch | Tab switch |
| Model changes | Small | **Slot / page ordering** | Small | None |
| Rework | Medium-large | Large | Medium-large | Small |
| Fits a Stream Deck workflow | Yes | **Closest** | Yes | Yes |

The effort row is my judgement, not a measured estimate.

## Recommendation

**Option A**, with Option C's Now / Next / After cards pulled into the rundown rail if you want more glanceability, and B's STORE-to-slot as a possible later shortcut. A answers all three complaints without a second mode to learn. If time is tight, ship the shared fixes below first as Option D; they carry straight into A.

### Shared fixes (worth doing regardless)

- Two-tap overwrite instead of `confirm()`; Undo toast on load, save and overwrite.
- Collapse the 8 scope flags into 4 groups in the UI (keep 8 under "Advanced").
- One-line rows: remove the per-row scope chips and the duplicate Overwrite←PVW / PGM buttons.
- Master bar from 128px to 96px; speed becomes a 44px segmented control; keyboard hints move to tooltips.
- Drop the green/red double-encoding legend: controls show Preview state, with a small red dot where on-air differs.

### What needs server or model work

| Need | Used by | Notes |
|---|---|---|
| Add cue from Preview in one step | A, C | Today `savePreset` then `addCue` needs the new id back first. Cleanest: `addCue` accepts `fromPreview: true` plus a name. |
| Duplicate preset ("Make unique") | A, C | New `duplicatePreset` command. |
| "Modified" indicator | A, B, C | Client-side diff of Preview vs the last-loaded preset (`lastPreset` exists); no server change needed. |
| Undo of a load / overwrite | all | Small ring buffer of draft + layers snapshots on the client or server. |
| Slot / page order for looks | B only | New fields on `Preset`; Companion button generation would follow them. |
| GO shortcut | A, B, C | Proposed `G`. Open question: should Space become GO whenever a rundown has a standby cue? |

Companion keeps working for A, C and D as long as existing commands are unchanged.

## Research

**Mobbin** has no broadcast-switcher products, so it is used for narrow UI mechanics only. Patterns I *rejected* for a live show: hover-reveal actions, floating popovers, modal confirms, ⌘K palettes.

| Used for | Reference |
|---|---|
| Strip of scene thumbnails with a LIVE badge; collapsible settings sections | [Vimeo Events](https://mobbin.com/screens/028669ee-877f-42d8-a8bc-60ded330af51) |
| Preset thumbnail grid with the selected one marked, Reset / Apply footer | [Higgsfield](https://mobbin.com/screens/974ef91a-b28e-47fa-b8a3-e9a4f1f0f2f5) |
| "Current" item pinned above saved items | [Lovable](https://mobbin.com/screens/62800b55-ce00-4dcd-b30d-77d4698da889) |
| Drag handles, numbered rows, "Add step / card" | [Substack](https://mobbin.com/screens/e99921e3-a4fa-40f1-874d-e2df7afa214d), [Gamma](https://mobbin.com/screens/516d0fb7-9538-4a46-a2ec-f571f7ec7440), [Juicebox](https://mobbin.com/screens/01028d24-0e2e-4ae8-81b3-c5f8c09117a0) |
| "Now playing / Next from" queue | [Spotify](https://mobbin.com/screens/348167b8-3517-4f96-9dfb-0df3295ce72a), [Suno](https://mobbin.com/screens/a3a9d465-e7e9-495e-87e3-78bc32e0b971) |
| Restore with a stated consequence ("will overwrite your current doc") | [Writer](https://mobbin.com/screens/d6e6654e-119a-456a-acef-fcb72d9ec330), [Substack history](https://mobbin.com/screens/b9578385-f96c-45a2-b2e2-483bfc410cb6), [Fibery](https://mobbin.com/screens/eb05e8be-4a16-47f0-94fe-08ad3da74171) |
| "Unsaved changes" with an Update action | [OpenAI Platform](https://mobbin.com/screens/27ee1460-45f9-4307-a0f3-da5ce1b4a250) |

**Broadcast and show-control tools** (QLab's standby/GO and edit-vs-show mode, ATEM / OBS Studio Mode PVW-PGM, lighting-console record/store with a second press to overwrite, Stream Deck button pages) are from general knowledge of those products, not looked up in this session. The repo's own `companion/` module confirms the GO / select / PVW-PGM feedback model they share.

The graphics in the mockups are schematic stand-ins, not the real renderer.

## Open questions

1. Which option, or which mix? (A is my pick.)
2. OK to call presets **Looks** in the UI?
3. Do you run this on a touchscreen, or mouse and keyboard plus Stream Deck? That decides how aggressive the 44px targets need to be.
4. Should Space become GO when a rundown is active, or stay AUTO with GO on `G`?
5. Is anything on the Show data / Setup tabs used live that I have under Setup? (The mockups only restructure those; contents are unchanged.)
