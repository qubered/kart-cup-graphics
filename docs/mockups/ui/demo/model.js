'use strict'
/* Prototype state for the control-page demo. Everything here is simulated in the browser; no server.
   It mirrors the real data model closely enough to feel right: a look is a full snapshot with a scope (preset),
   a cue is { lookId, take, after, scope? }, outputs have their own layers, Take copies Preview to Program for armed outputs. */

const STORE_KEY = 'kcg-control-demo-v2'
const OUTS = [
  { id: 'wide', name: 'Wide', fmt: '3840×1152', kind: 'wide', ar: '10/3' },
  { id: 'twin', name: 'Twins', fmt: '1920×1152', kind: 'twin', ar: '5/3' },
  { id: 'stream', name: 'Stream', fmt: '1920×1080', kind: 'hd', ar: '16/9' },
  { id: 'pillars', name: 'Pillars', fmt: '1920×1080', kind: 'hd', ar: '16/9' },
]
const SCENES = [['none', 'None'], ['title', 'Title'], ['lineup', 'Line-up'], ['nextRace', 'Next race'], ['standings', 'Standings'], ['winner', 'Winner'],
  ['raceWin', 'Race win'], ['cupWin', 'Cup win'], ['bracket', 'Bracket'], ['matches', 'Matches'], ['notice', 'Notice'], ['qr', 'QR codes']]
const SCENE_NAME = Object.fromEntries(SCENES)
const POINTS = [15, 12, 10, 9]
const TRACKS = ['Mario Kart Stadium', 'Water Park', 'Sweet Sweet Canyon', 'Thwomp Ruins']
const CHARS = ['Mario', 'Luigi', 'Peach', 'Yoshi', 'Bowser', 'Toad', 'Daisy', 'Wario']
const PCOL = ['#ef4444', '#3b82f6', '#22c55e', '#eab308']
const SPEEDS = { fast: 350, normal: 800, slow: 1600 }
const SCOPE8 = [['layers', 'Layers'], ['armed', 'Arming'], ['style', 'Event style'], ['match', 'Race'], ['players', 'Players'], ['scores', 'Scores'], ['transition', 'Speed'], ['mattify', 'Mattify']]
const GROUPS = [
  { key: 'look', label: 'Look', hint: 'Scene, background, overlays, text, speed', keys: ['layers', 'style', 'transition', 'mattify'] },
  { key: 'outputs', label: 'Outputs armed', hint: 'Which outputs a Take goes to', keys: ['armed'] },
  { key: 'race', label: 'Race & players', hint: 'Cup, track, names, characters', keys: ['match', 'players'] },
  { key: 'scores', label: 'Scores', hint: 'Recall would overwrite live scores', keys: ['scores'] },
]
const DEFAULT_GROUPS = { look: true, outputs: true, race: false, scores: false }
const SLOTS = 15

const clone = (x) => JSON.parse(JSON.stringify(x))
const uid = (p) => p + Math.random().toString(36).slice(2, 7)
const blank = () => ({ scene: 'none', bg: 'none', track: false, lt: false, part: 'hero', reveal: 4, qr: false, qrStyle: 'center', logo: 'corner', ltp: [0, 1, 2, 3] })
const L = (o) => ({ ...blank(), ...o })
const scopeFromGroups = (g) => Object.fromEntries(SCOPE8.map(([k]) => [k, GROUPS.some((gr) => gr.keys.includes(k) && g[gr.key])]))
const groupsFromScope = (s) => Object.fromEntries(GROUPS.map((g) => [g.key, g.keys.every((k) => s[k])]))
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

let S

function seed() {
  const players = [{ name: 'ALEX', char: 'Mario' }, { name: 'PRIYA', char: 'Luigi' }, { name: 'TOM', char: 'Yoshi' }, { name: 'MEI', char: 'Peach' }]
  const base = {
    armed: ['wide', 'twin', 'stream'], style: { title: 'KART CUP', accent: '2026', hold: 'BACK SHORTLY' }, match: 1, players,
    scores: { races: [[3, 1, 2, 4], [1, 2, 3, 4]], adj: [0, 0, 0, 0] }, transition: 'normal', mattify: true,
  }
  const mk = (id, name, w, tw = {}, st = null) => ({
    id, name, ...clone(base),
    layers: { wide: L(w), twin: L({ scene: 'none', bg: 'none', ...tw }), stream: L(st ?? w), pillars: L({ scene: 'none', bg: 'B' }) },
    scope8: scopeFromGroups(DEFAULT_GROUPS),
  })
  const looks = [
    mk('l1', 'Holding', { scene: 'none', bg: 'C' }),
    mk('l2', 'Title', { scene: 'title', bg: 'A', logo: 'corner' }),
    mk('l3', 'Line-up reveal', { scene: 'lineup', bg: 'B', reveal: 4 }, { lt: true }),
    mk('l4', 'Next race', { scene: 'nextRace', bg: 'B', track: true }, { track: true }),
    mk('l5', 'Race win — hero', { scene: 'raceWin', bg: 'B', part: 'hero', track: true }, { track: true }),
    mk('l6', 'Standings', { scene: 'standings', bg: 'B' }),
    mk('l7', 'Cup win', { scene: 'cupWin', bg: 'A', part: 'full' }),
    mk('l8', 'Sponsor notice', { scene: 'notice', bg: 'C', qr: true }),
  ]
  const cue = (lookId, take, after = null) => ({ id: uid('c'), lookId, take, after })
  const cues = [cue('l1', 'cut'), cue('l2', 'auto'), cue('l3', 'auto'), cue('l4', 'auto'), cue('l5', 'cut', 'nextRace'), cue('l6', 'auto'), cue('l4', 'auto'), cue('l5', 'cut', 'nextRace'), cue('l7', 'auto')]
  const slots = (...ids) => [...ids, ...Array(SLOTS - ids.length).fill(null)]
  const s = {
    layout: 'A', view: 'live', rtab: 'look', outSel: 'wide', dtab: 'race', snav: 'Outputs',
    looks, rundowns: [{ id: 'r1', name: 'Main show', cues, pgm: 3, pvw: 4 }], rundownId: 'r1',
    bank: { page: 1, pages: [{ name: 'Pre-show', slots: slots('l1', 'l2', 'l3', 'l8') }, { name: 'Races', slots: slots('l4', 'l5', 'l6', 'l7') }, { name: 'Results', slots: slots('l6', 'l7') }, { name: 'Sponsors', slots: slots('l8') }] },
    layers: clone(looks[3].layers), program: {}, armed: [...base.armed], speed: 'normal', mattify: true,
    event: clone(base.style), race: { index: 1, cup: 'Mushroom Cup' }, players: clone(players), scores: clone(base.scores),
    tour: { active: 2, matches: ['R1 · Match 1', 'R1 · Match 2', 'R1 · Match 3', 'R1 · Match 4', 'Semi 1', 'Semi 2', 'Final'].map((label, i) => ({ id: 'm' + i, label })) },
    loadedLookId: 'l4', programLabel: 'Next race', programLookId: 'l4', onAirSince: Date.now() - (42 * 60 + 17) * 1000,
    outOnline: { wide: true, twin: true, stream: true, pillars: false },
    pending: {},
    // ephemeral UI state
    hold: false, ftb: false, cleared: false, lastTake: null, log: [],
    edit: false, openCue: null, rdMenu: false, rdRename: null, advCue: null,
    saveOpen: false, saveForm: null, libFilter: '', libMenu: null, libRename: null,
    store: false, bankEdit: false, slotMenu: null, rec: false, seqEdit: false, selCue: null,
    confirm: null, toast: null, undo: [], connected: true, modal: null,
  }
  s.layers = clone(looks[3].layers)
  for (const o of OUTS) s.program[o.id] = { layers: clone(looks[3].layers[o.id]) }
  // Preview starts on the standby cue (cue 5)
  Object.assign(s.layers, clone(looks[4].layers)); s.loadedLookId = 'l5'
  return s
}

const PERSIST = ['layout', 'looks', 'rundowns', 'rundownId', 'bank', 'layers', 'program', 'armed', 'speed', 'mattify', 'event', 'race', 'players', 'scores', 'tour', 'loadedLookId', 'onAirSince', 'outOnline', 'programLabel', 'programLookId']
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(Object.fromEntries(PERSIST.map((k) => [k, S[k]])))) } catch (e) { /* storage may be blocked */ } }
function boot(fresh) {
  S = seed()
  if (!fresh) { try { const raw = localStorage.getItem(STORE_KEY); if (raw) Object.assign(S, JSON.parse(raw)) } catch (e) { /* ignore */ } }
}

/* ── selectors ── */
const R = () => S.rundowns.find((r) => r.id === S.rundownId) || S.rundowns[0]
const lookById = (id) => S.looks.find((l) => l.id === id)
const usedBy = (id) => S.rundowns.reduce((n, r) => n + r.cues.filter((c) => c.lookId === id).length, 0)
const cuesUsing = (id) => S.rundowns.flatMap((r) => r.cues.map((c, i) => ({ r, c, n: i + 1 })).filter((x) => x.c.lookId === id))
const out = (id) => OUTS.find((o) => o.id === id)
const totals = () => S.players.map((_, i) => S.scores.races.reduce((t, race) => t + (race?.[i] ? POINTS[race[i] - 1] ?? 0 : 0), 0) + (S.scores.adj[i] || 0))
const standing = () => totals().map((t, i) => ({ i, t, name: S.players[i].name })).sort((a, b) => b.t - a.t)
const trackName = () => TRACKS[S.race.index] ?? TRACKS[0]
const cueEffScope = (look, cue) => ({ ...look.scope8, ...(cue?.scope ?? {}) })
const LAYER_KEYS = ['scene', 'bg', 'track', 'lt', 'part', 'reveal', 'qr', 'qrStyle', 'logo', 'ltp']
function pendingCount(id) {
  const a = S.layers[id], b = S.program[id]?.layers ?? blank()
  return LAYER_KEYS.filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k])).length
}
function isModified() {
  const look = lookById(S.loadedLookId)
  if (!look) return true
  if (JSON.stringify(look.layers) !== JSON.stringify(S.layers)) return true
  return JSON.stringify([...look.armed].sort()) !== JSON.stringify([...S.armed].sort())
}
function hhmmss(ms) {
  const s = Math.max(0, Math.floor(ms / 1000)), p = (n) => String(n).padStart(2, '0')
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`
}
function suggestName() {
  const l = S.layers.wide, sc = l.scene
  let base = sc === 'raceWin' ? `Race win — ${l.part}` : sc === 'cupWin' ? `Cup win — ${l.part}` : sc === 'none' ? (l.bg === 'none' ? 'Overlays only' : 'Holding') : (SCENE_NAME[sc] || 'Look')
  let n = base, k = 2
  while (S.looks.some((x) => x.name === n)) n = `${base} ${k++}`
  return n
}

/* ── toast / undo / two-tap ── */
let toastTimer, confirmTimer
function toast(text, undoable) {
  clearTimeout(toastTimer)
  S.toast = { text, undo: !!undoable }
  toastTimer = setTimeout(() => { S.toast = null; render() }, 7000)
}
function contentSnap() { return JSON.stringify(Object.fromEntries([...PERSIST, 'selCue'].filter((k) => k !== 'program' && k !== 'onAirSince').map((k) => [k, S[k]]))) }
function pushUndo(label) { S.undo.push({ label, snap: contentSnap() }); if (S.undo.length > 30) S.undo.shift() }
function undo() {
  const u = S.undo.pop(); if (!u) { toast('Nothing to undo'); return }
  Object.assign(S, JSON.parse(u.snap)); S.confirm = null; S.openCue = null; S.saveOpen = false; S.libMenu = null; S.slotMenu = null
  toast(`Undone: ${u.label}`)
}
/** Two-tap guard. First call arms it (returns false), a second call on the same key within 3s returns true. */
function twoTap(key) {
  if (S.confirm === key) { S.confirm = null; clearTimeout(confirmTimer); return true }
  S.confirm = key; clearTimeout(confirmTimer); confirmTimer = setTimeout(() => { S.confirm = null; render() }, 3000)
  return false
}

/* ── looks ── */
function snapshotParts(from) {
  const layers = from === 'pgm' ? Object.fromEntries(OUTS.map((o) => [o.id, clone(S.program[o.id]?.layers ?? blank())])) : clone(S.layers)
  return { layers, armed: clone(S.armed), style: clone(S.event), match: S.race.index, players: clone(S.players), scores: clone(S.scores), transition: S.speed, mattify: S.mattify }
}
function applyLook(look, scope) {
  if (scope.layers) S.layers = clone(look.layers)
  if (scope.armed) S.armed = clone(look.armed)
  if (scope.style) S.event = clone(look.style)
  if (scope.match) S.race.index = look.match
  if (scope.players) S.players = clone(look.players)
  if (scope.scores) S.scores = clone(look.scores)
  if (scope.transition) S.speed = look.transition
  if (scope.mattify) S.mattify = look.mattify
  S.loadedLookId = look.id
}
/** Load a look into Preview only. Nothing reaches air. */
function loadLook(id, cue, quiet) {
  const look = lookById(id); if (!look) return
  const lost = !quiet && isModified()
  if (lost) pushUndo('load ' + look.name)
  applyLook(look, cueEffScope(look, cue))
  if (lost) toast(`Loaded “${look.name}” — unsaved Preview changes discarded`, true)
}
function placeInBank(lookId) {
  const pages = S.bank.pages
  const order = [S.bank.page, ...pages.map((_, i) => i).filter((i) => i !== S.bank.page)]
  for (const pi of order) { const k = pages[pi].slots.indexOf(null); if (k >= 0) { pages[pi].slots[k] = lookId; return { page: pi, slot: k } } }
  pages.push({ name: 'Page ' + (pages.length + 1), slots: [lookId, ...Array(SLOTS - 1).fill(null)] })
  return { page: pages.length - 1, slot: 0 }
}
function createLook(name, from, groups, opts = {}) {
  const look = { id: uid('l'), name: name || suggestName(), ...snapshotParts(from), scope8: opts.scope8 ?? scopeFromGroups(groups ?? DEFAULT_GROUPS) }
  S.looks.push(look)
  if (opts.slot !== undefined) { const pg = S.bank.pages[S.bank.page]; pg.slots[opts.slot] = look.id } else placeInBank(look.id)
  S.loadedLookId = look.id
  return look
}
function updateLook(id, from) {
  const look = lookById(id); if (!look) return
  pushUndo('update ' + look.name)
  Object.assign(look, snapshotParts(from)); S.loadedLookId = id
  toast(`Updated “${look.name}”${usedBy(id) ? ` — used by ${usedBy(id)} cue${usedBy(id) > 1 ? 's' : ''}` : ''}`, true)
}
function renameLook(id, name) { const l = lookById(id); if (l && name.trim()) { pushUndo('rename'); l.name = name.trim() } }
function duplicateLook(id, name) {
  const l = lookById(id); if (!l) return null
  pushUndo('duplicate ' + l.name)
  const c = { ...clone(l), id: uid('l'), name: name || l.name + ' copy' }
  S.looks.push(c); placeInBank(c.id); return c
}
function deleteLook(id) {
  const l = lookById(id); if (!l) return
  const n = usedBy(id); pushUndo('delete ' + l.name)
  S.looks = S.looks.filter((x) => x.id !== id)
  for (const p of S.bank.pages) p.slots = p.slots.map((s) => (s === id ? null : s))
  for (const r of S.rundowns) { r.cues = r.cues.filter((c) => c.lookId !== id); r.pgm = Math.min(r.pgm, r.cues.length - 1); r.pvw = Math.min(r.pvw, r.cues.length - 1) }
  if (S.loadedLookId === id) S.loadedLookId = null
  toast(`Deleted “${l.name}”${n ? ` and ${n} cue${n > 1 ? 's' : ''}` : ''}`, true)
}

/* ── rundown ── */
function addCue(lookId, index, opts = {}) {
  const r = R(), c = { id: uid('c'), lookId, take: 'auto', after: null, ...opts }
  const at = index == null ? r.cues.length : index
  r.cues.splice(at, 0, c)
  if (at <= r.pgm) r.pgm++
  if (r.pvw >= at && r.pvw >= 0) r.pvw++
  return { c, at }
}
function addCueFromPreview() {
  pushUndo('add cue')
  const look = createLook(null, 'pvw', DEFAULT_GROUPS)
  const { at } = addCue(look.id)
  S.openCue = at
  toast(`Added cue ${at + 1} · saved as look “${look.name}”`, true)
}
function removeCue(i) {
  const r = R(), c = r.cues[i]; if (!c) return
  pushUndo('remove cue ' + (i + 1))
  r.cues.splice(i, 1)
  if (i < r.pgm) r.pgm--; else if (i === r.pgm) r.pgm = -1
  if (i < r.pvw) r.pvw--; else if (i === r.pvw) r.pvw = Math.min(i, r.cues.length - 1)
  S.openCue = null
  toast(`Removed cue ${i + 1}`, true)
}
function moveCue(from, to) {
  const r = R(); if (from === to || from + 1 === to) return
  pushUndo('move cue'); const [c] = r.cues.splice(from, 1); const dest = to > from ? to - 1 : to
  r.cues.splice(dest, 0, c)
  const remap = (p) => (p === from ? dest : from < dest ? (p > from && p <= dest ? p - 1 : p) : (p >= dest && p < from ? p + 1 : p))
  r.pgm = remap(r.pgm); r.pvw = remap(r.pvw)
  if (S.openCue != null) S.openCue = remap(S.openCue)
  toast(`Moved to cue ${dest + 1}`, true)
}
function makeUnique(i) {
  const c = R().cues[i], l = lookById(c.lookId); if (!l) return
  pushUndo('make unique')
  const copy = { ...clone(l), id: uid('l'), name: `${l.name} (cue ${i + 1})` }
  S.looks.push(copy); placeInBank(copy.id); c.lookId = copy.id
  toast(`Cue ${i + 1} now has its own look “${copy.name}”`, true)
}
function selectCue(i) {
  const r = R(), c = r.cues[i]; if (!c) return
  r.pvw = i; loadLook(c.lookId, c)
}
function createRundown(name) { pushUndo('new rundown'); const r = { id: uid('r'), name: name || 'Untitled rundown', cues: [], pgm: -1, pvw: -1 }; S.rundowns.push(r); S.rundownId = r.id; return r }

/* ── show control ── */
function take(mode, label) {
  const dur = mode === 'cut' ? 0 : SPEEDS[S.speed]
  const prev = Object.fromEntries(OUTS.map((o) => [o.id, clone(S.program[o.id]?.layers ?? blank())]))
  for (const id of S.armed) S.program[id] = { layers: clone(S.layers[id]) }
  S.lastTake = { t0: Date.now(), dur, prev, outs: [...S.armed] }
  S.cleared = false; S.programLabel = label || SCENE_NAME[S.layers.wide.scene]; S.programLookId = isModified() ? null : S.loadedLookId
  if (!S.onAirSince) S.onAirSince = Date.now()
  S.log.unshift({ t: Date.now(), mode, outs: S.armed.map((id) => out(id).name), label: label || SCENE_NAME[S.layers.wide.scene] })
  S.log.length = Math.min(S.log.length, 6)
  if (dur) setTimeout(render, dur + 40)
}
function runAfter(c) {
  const r = R()
  if (c.after === 'nextRace') S.race.index = Math.min(3, S.race.index + 1)
  else if (c.after === 'nextMatch') S.tour.active = Math.min(S.tour.matches.length - 1, S.tour.active + 1)
  else if (c.after === 'resetStack') { r.pgm = -1; r.pvw = 0; return true }
  return false
}
function go() {
  const r = R(); if (S.edit || !r.cues.length) return
  let i = r.pvw
  if (i == null || i < 0 || i >= r.cues.length) i = r.pgm + 1
  if (i >= r.cues.length) { toast('End of rundown — Rewind to start again'); return }
  const c = r.cues[i], look = lookById(c.lookId)
  if (r.pvw !== i || S.loadedLookId !== c.lookId) { r.pvw = i; loadLook(c.lookId, c, true) }
  if (c.take) take(c.take, look?.name)
  r.pgm = i
  const reset = runAfter(c)
  if (!reset) r.pvw = i + 1 < r.cues.length ? i + 1 : -1
  if (r.pvw >= 0) loadLook(r.cues[r.pvw].lookId, r.cues[r.pvw], true)
}
function stepStandby(d) {
  const r = R(); const base = r.pvw >= 0 ? r.pvw : r.pgm + 1
  const n = Math.max(0, Math.min(r.cues.length - 1, base + d)); selectCue(n)
}
function rewind() { const r = R(); r.pgm = -1; r.pvw = 0; if (r.cues[0]) loadLook(r.cues[0].lookId, r.cues[0], true) }
function toggleArm(id) { S.armed = S.armed.includes(id) ? S.armed.filter((x) => x !== id) : [...S.armed, id] }
function emergency(kind) {
  if (kind === 'hold') S.hold = !S.hold
  else if (kind === 'ftb') S.ftb = !S.ftb
  else if (kind === 'clear') {
    for (const o of OUTS) S.program[o.id] = { layers: blank() }
    S.cleared = true; S.lastTake = null
  }
}
function setLayer(patch) {
  const id = S.outSel
  Object.assign(S.layers[id], patch)
}
