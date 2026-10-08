'use strict'
/* Prototype state for the control-page demo. Everything here is simulated in the browser; no server.
   It mirrors the real data model closely enough to feel right:
   - a look is a full snapshot with a scope (preset); a cue is { lookId, take, after, scope? }
   - outputs have their own layers; Take copies Preview to Program for armed outputs (and pins a snapshot of the data)
   - a tournament has matches; the ACTIVE match is the draft (S.race / S.players / S.scores point at it), as in the real app */

const STORE_KEY = 'kcg-control-demo-v3'
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
const CUPS = {
  'Mushroom Cup': ['Mario Kart Stadium', 'Water Park', 'Sweet Sweet Canyon', 'Thwomp Ruins'],
  'Flower Cup': ['Mario Circuit', 'Toad Harbor', 'Twisted Mansion', 'Shy Guy Falls'],
  'Star Cup': ['Sunshine Airport', 'Dolphin Shoals', 'Electrodrome', 'Mount Wario'],
  'Special Cup': ['Cloudtop Cruise', 'Bone-Dry Dunes', "Bowser's Castle", 'Rainbow Road'],
}
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
const ORD = ['1st', '2nd', '3rd', '4th']

const clone = (x) => JSON.parse(JSON.stringify(x))
const uid = (p) => p + Math.random().toString(36).slice(2, 7)
const blank = () => ({ scene: 'none', bg: 'none', track: false, lt: false, part: 'hero', reveal: 4, qr: false, qrStyle: 'center', logo: 'corner', ltp: [0, 1, 2, 3], matchRef: 'active', matchSet: 'all' })
const L = (o) => ({ ...blank(), ...o })
const scopeFromGroups = (g) => Object.fromEntries(SCOPE8.map(([k]) => [k, GROUPS.some((gr) => gr.keys.includes(k) && g[gr.key])]))
const groupsFromScope = (s) => Object.fromEntries(GROUPS.map((g) => [g.key, g.keys.every((k) => s[k])]))
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

let S

/* ── tournaments / matches ── */
const WIN_DEFAULT = () => ({ layout: 'heroLeft', blocks: { hero: true, board: true, racePoints: true, cupEmblem: false, trackName: true } })
const MATCHES_DEFAULT = () => ({ layout: 'grid', detail: { wide: 'full', twin: 'compact', hd: 'compact' }, pendingScores: 'zeros', liveMarker: true })
const BRACKET_DEFAULT = () => ({ showScores: true, showStatus: true })
function mkMatch(id, label, round, cup, names, chars, results = []) {
  const races = Array.from({ length: 4 }, (_, i) => results[i] ?? null)
  return { id, label, round, race: { index: Math.min(3, results.length), cup, count: 4 }, players: names.map((n, i) => ({ name: n, char: chars[i % chars.length] })),
    scores: { races, adj: [0, 0, 0, 0] }, winnerOverride: null, slotSources: null, left: false }
}
function mkTournament(id, name, matches, activeMatchId) {
  return { id, name, matches, activeMatchId, roundNames: {}, winScreen: WIN_DEFAULT(), matchesScene: MATCHES_DEFAULT(), bracket: BRACKET_DEFAULT() }
}
const defaultNames = () => ['Player 1', 'Player 2', 'Player 3', 'Player 4']
function bracketTemplate(name) {
  const semis = [0, 1, 2, 3].map((i) => mkMatch(uid('m'), `Semi ${i + 1}`, 0, ['Mushroom Cup', 'Flower Cup', 'Star Cup', 'Special Cup'][i], defaultNames(), ['Mario', 'Luigi', 'Peach', 'Yoshi']))
  const final = mkMatch(uid('m'), 'Final', 1, 'Special Cup', defaultNames(), ['Mario', 'Luigi', 'Peach', 'Yoshi'])
  final.slotSources = semis.map((s) => ({ matchId: s.id, auto: true }))
  const t = mkTournament(uid('t'), name, [...semis, final], semis[0].id)
  t.roundNames = { 0: 'Semi-finals', 1: 'Final' }
  return t
}

/* ── selectors ── */
const activeTournament = () => S.tournaments.find((t) => t.id === S.activeTournamentId) ?? null
const activeMatch = () => { const t = activeTournament(); return (t && t.matches.find((m) => m.id === t.activeMatchId)) || S.free }
function relinkDraft() { const m = activeMatch(); S.race = m.race; S.players = m.players; S.scores = m.scores }
const rowDone = (r) => !!r && r.every((p) => p > 0) && new Set(r).size === r.length
const recordedCount = (m) => m.scores.races.filter(rowDone).length
const isComplete = (m) => recordedCount(m) >= m.race.count
const totalsOf = (m) => m.players.map((_, i) => m.scores.races.reduce((t, row) => t + (row && row[i] ? POINTS[row[i] - 1] ?? 0 : 0), 0) + (m.scores.adj[i] || 0))
function lastRowIdx(m) { for (let i = m.scores.races.length - 1; i >= 0; i--) if (rowDone(m.scores.races[i])) return i; return -1 }
/** Players ranked by total; ties go to the better finish in the last recorded race. */
function standingOf(m) {
  const t = totalsOf(m), li = lastRowIdx(m), row = li >= 0 ? m.scores.races[li] : null
  return t.map((v, i) => ({ i, t: v, name: m.players[i].name, last: row ? row[i] : 9 })).sort((a, b) => b.t - a.t || a.last - b.last)
}
function winnerSlot(m) { if (m.winnerOverride != null) return m.winnerOverride; return recordedCount(m) ? standingOf(m)[0].i : null }
function matchStatus(t, m) { return t && t.activeMatchId === m.id ? 'live' : isComplete(m) || m.winnerOverride != null || m.left ? 'done' : 'pending' }
const totals = () => totalsOf(activeMatch())
const standing = () => standingOf(activeMatch())
/** The map for race `idx` (default: the live race). Follows the cup order unless the operator picked another map for that race. */
const trackOf = (m, idx) => { const i = idx ?? m.race.index; return m.race.tracks?.[i] || (CUPS[m.race.cup] ?? CUPS['Mushroom Cup'])[i % 4] || '' }
const trackName = () => trackOf(activeMatch())
const matchById = (id) => activeTournament()?.matches.find((m) => m.id === id) ?? (S.free && S.free.id === id ? S.free : undefined)
const rounds = (t) => [...new Set(t.matches.map((m) => m.round))].sort((a, b) => a - b)
function roundName(t, r) { const rs = rounds(t); return t.roundNames?.[r] || (rs.length > 1 && r === rs[rs.length - 1] ? 'Final round' : 'Round ' + (rs.indexOf(r) + 1)) }
const raceLabel = (m) => `Race ${m.race.index + 1} / ${m.race.count}`
function liveCtx() { const t = activeTournament(); return { draft: activeMatch(), tour: t, event: S.event } }
/** Auto slots follow their source match's winner (placeholder text until it has one). */
function fillFinal(t) {
  for (const m of t.matches) {
    if (!m.slotSources) continue
    m.slotSources.forEach((src, i) => {
      if (!src?.auto) return
      const sm = t.matches.find((x) => x.id === src.matchId); if (!sm) return
      const w = winnerSlot(sm)
      m.players[i] = w == null ? { name: ('Winner ' + sm.label).toUpperCase().slice(0, 14), char: 'Toad', placeholder: true } : { name: sm.players[w].name, char: sm.players[w].char }
    })
  }
}
function normalize() {
  const t = activeTournament(); if (t) fillFinal(t)
  if (!S.tmatch || !t || !t.matches.some((m) => m.id === S.tmatch)) S.tmatch = t?.activeMatchId ?? null
  if (!t) S.tpage = 'lib'
  else if (S.tpage && S.tpage.startsWith('round:') && !t.matches.some((x) => x.round === +S.tpage.slice(6))) S.tpage = 'overview'
  relinkDraft()
}

function seed() {
  const m1 = mkMatch('m1', 'Semi 1', 0, 'Mushroom Cup', ['ALEX', 'PRIYA', 'TOM', 'MEI'], ['Mario', 'Luigi', 'Yoshi', 'Peach'], [[2, 1, 3, 4], [1, 2, 3, 4], [1, 3, 2, 4], [2, 1, 4, 3]])
  const m2 = mkMatch('m2', 'Semi 2', 0, 'Flower Cup', ['JORDAN', 'SAM', 'LEE', 'KAI'], ['Bowser', 'Daisy', 'Wario', 'Toad'], [[3, 1, 2, 4], [2, 1, 3, 4], [4, 1, 2, 3], [3, 2, 1, 4]])
  const m3 = mkMatch('m3', 'Semi 3', 0, 'Star Cup', ['NINA', 'OMAR', 'ZOE', 'FELIX'], ['Peach', 'Mario', 'Daisy', 'Luigi'], [[1, 2, 4, 3], [2, 1, 3, 4]])
  const m4 = mkMatch('m4', 'Semi 4', 0, 'Special Cup', ['RUBY', 'THEO', 'IVY', 'MAX'], ['Yoshi', 'Wario', 'Toad', 'Bowser'])
  const m5 = mkMatch('m5', 'Final', 1, 'Special Cup', defaultNames(), ['Mario', 'Luigi', 'Peach', 'Yoshi'])
  m5.slotSources = ['m1', 'm2', 'm3', 'm4'].map((id) => ({ matchId: id, auto: true }))
  const t1 = mkTournament('t1', 'Kart Cup 2026', [m1, m2, m3, m4, m5], 'm3')
  t1.roundNames = { 0: 'Semi-finals', 1: 'Final' }
  const p1 = mkMatch('p1', 'Practice heat', 0, 'Mushroom Cup', ['ALEX', 'PRIYA', 'TOM', 'MEI'], ['Mario', 'Luigi', 'Yoshi', 'Peach'], [[1, 2, 3, 4]])
  const t2 = mkTournament('t2', 'Practice night', [p1], 'p1')
  const free = mkMatch('free', 'Free play', 0, 'Mushroom Cup', ['P1', 'P2', 'P3', 'P4'], ['Mario', 'Luigi', 'Peach', 'Yoshi'])

  const base = { armed: ['wide', 'twin', 'stream'], style: { title: 'KART CUP', accent: '2026', hold: 'BACK SHORTLY' }, transition: 'normal', mattify: true }
  const mk = (id, name, w, tw = {}, st = null) => ({
    id, name, ...clone(base), match: 0, players: clone(m3.players), scores: clone(m3.scores),
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
    mk('l9', 'Bracket', { scene: 'bracket', bg: 'B' }),
    mk('l10', 'All matches', { scene: 'matches', bg: 'B' }),
  ]
  const cue = (lookId, take, after = null) => ({ id: uid('c'), lookId, take, after })
  const cues = [cue('l1', 'cut'), cue('l3', 'auto'), cue('l4', 'auto'), cue('l5', 'cut', 'nextRace'), cue('l6', 'auto'), cue('l4', 'auto'), cue('l5', 'cut', 'nextRace'), cue('l6', 'auto'), cue('l7', 'auto', 'nextMatch')]
  const slots = (...ids) => [...ids, ...Array(SLOTS - ids.length).fill(null)]
  const s = {
    layout: 'A', view: 'live', rtab: 'look', outSel: 'wide', snav: 'Outputs', tpage: 'overview', tmatch: 'm3', tnew: null, trename: null, matchRefSel: 'active', matchSetSel: 'all',
    looks, rundowns: [{ id: 'r1', name: 'Per-match show', cues, pgm: 2, pvw: 3 }], rundownId: 'r1',
    bank: { page: 1, pages: [{ name: 'Pre-show', slots: slots('l1', 'l2', 'l3', 'l8') }, { name: 'Races', slots: slots('l4', 'l5', 'l6', 'l7') }, { name: 'Tournament', slots: slots('l9', 'l10') }, { name: 'Sponsors', slots: slots('l8') }] },
    layers: {}, program: {}, armed: [...base.armed], speed: 'normal', mattify: true, event: clone(base.style),
    tournaments: [t1, t2], activeTournamentId: 't1', free,
    loadedLookId: 'l5', programLabel: 'Next race', programLookId: 'l4', onAirSince: Date.now() - (42 * 60 + 17) * 1000,
    outOnline: { wide: true, twin: true, stream: true, pillars: false },
    // ephemeral UI state
    hold: false, ftb: false, cleared: false, lastTake: null, log: [],
    edit: false, openCue: null, rdMenu: false, rdRename: null, advCue: null,
    saveOpen: false, saveForm: null, libFilter: '', libMenu: null, libRename: null,
    store: false, bankEdit: false, slotMenu: null, rec: false, seqEdit: false, selCue: null,
    confirm: null, toast: null, undo: [], connected: true, modal: null,
  }
  S = s
  normalize()
  s.layers = clone(looks[4].layers)
  const ctx = clone(liveCtx())
  for (const o of OUTS) s.program[o.id] = { layers: clone(looks[3].layers[o.id]), ctx }
  return s
}

const PERSIST = ['layout', 'looks', 'rundowns', 'rundownId', 'bank', 'layers', 'program', 'armed', 'speed', 'mattify', 'event', 'tournaments', 'activeTournamentId', 'free', 'loadedLookId', 'onAirSince', 'outOnline', 'programLabel', 'programLookId']
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(Object.fromEntries(PERSIST.map((k) => [k, S[k]])))) } catch (e) { /* storage may be blocked */ } }
function boot(fresh) {
  seed()
  if (!fresh) { try { const raw = localStorage.getItem(STORE_KEY); if (raw) Object.assign(S, JSON.parse(raw)) } catch (e) { /* ignore */ } }
  normalize()
}

/* ── selectors (show) ── */
const R = () => S.rundowns.find((r) => r.id === S.rundownId) || S.rundowns[0]
const lookById = (id) => S.looks.find((l) => l.id === id)
const usedBy = (id) => S.rundowns.reduce((n, r) => n + r.cues.filter((c) => c.lookId === id).length, 0)
const out = (id) => OUTS.find((o) => o.id === id)
const cueEffScope = (look, cue) => ({ ...look.scope8, ...(cue?.scope ?? {}) })
const LAYER_KEYS = ['scene', 'bg', 'track', 'lt', 'part', 'reveal', 'qr', 'qrStyle', 'logo', 'ltp', 'matchRef', 'matchSet']
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
  const base = sc === 'raceWin' ? `Race win — ${l.part}` : sc === 'cupWin' ? `Cup win — ${l.part}` : sc === 'none' ? (l.bg === 'none' ? 'Overlays only' : 'Holding') : (SCENE_NAME[sc] || 'Look')
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
const UNDO_SKIP = ['program', 'onAirSince', 'layout']
function contentSnap() { return JSON.stringify(Object.fromEntries([...PERSIST, 'selCue', 'tmatch'].filter((k) => !UNDO_SKIP.includes(k)).map((k) => [k, S[k]]))) }
function pushUndo(label) { S.undo.push({ label, snap: contentSnap() }); if (S.undo.length > 40) S.undo.shift() }
function undo() {
  const u = S.undo.pop(); if (!u) { toast('Nothing to undo'); return }
  Object.assign(S, JSON.parse(u.snap)); S.confirm = null; S.openCue = null; S.saveOpen = false; S.libMenu = null; S.slotMenu = null
  normalize(); toast(`Undone: ${u.label}`)
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
  const tour = !!activeTournament()   // while a tournament is active, match data is never recalled (it comes from the active match)
  if (scope.layers) S.layers = clone(look.layers)
  if (scope.armed) S.armed = clone(look.armed)
  if (scope.style) S.event = clone(look.style)
  if (scope.match && !tour) S.race.index = look.match
  if (scope.players && !tour) activeMatch().players = clone(look.players)
  if (scope.scores && !tour) activeMatch().scores = clone(look.scores)
  if (scope.transition) S.speed = look.transition
  if (scope.mattify) S.mattify = look.mattify
  S.loadedLookId = look.id
  relinkDraft()
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
/** nextMatch resets every rundown and stands by on its first cue (as the real app does). */
function resetRundowns() { for (const r of S.rundowns) { r.pgm = -1; r.pvw = r.cues.length ? 0 : -1 } const r = R(); if (r.cues[0]) loadLook(r.cues[0].lookId, r.cues[0], true) }

/* ── show control ── */
function take(mode, label) {
  const dur = mode === 'cut' ? 0 : SPEEDS[S.speed]
  const prev = Object.fromEntries(OUTS.map((o) => [o.id, clone(S.program[o.id] ?? { layers: blank(), ctx: clone(liveCtx()) })]))
  const ctx = clone(liveCtx())   // on-air graphics keep the data they were taken with
  for (const id of S.armed) S.program[id] = { layers: clone(S.layers[id]), ctx }
  S.lastTake = { t0: Date.now(), dur, prev, outs: [...S.armed] }
  S.cleared = false; S.programLabel = label || SCENE_NAME[S.layers.wide.scene]; S.programLookId = isModified() ? null : S.loadedLookId
  if (!S.onAirSince) S.onAirSince = Date.now()
  S.log.unshift({ t: Date.now(), mode, outs: S.armed.map((id) => out(id).name), label: label || SCENE_NAME[S.layers.wide.scene] })
  S.log.length = Math.min(S.log.length, 6)
  if (dur) setTimeout(render, dur + 40)
}
function runAfter(c) {
  const r = R()
  if (c.after === 'nextRace') { const m = activeMatch(); m.race.index = Math.min(m.race.count - 1, m.race.index + 1) }
  else if (c.after === 'nextMatch') { nextMatch(true); return true }
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
  if (reset) { const r0 = R(); if (r0.cues[0] && r0.pvw === 0) loadLook(r0.cues[0].lookId, r0.cues[0], true) }
  else { r.pvw = i + 1 < r.cues.length ? i + 1 : -1; if (r.pvw >= 0) loadLook(r.cues[r.pvw].lookId, r.cues[r.pvw], true) }
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
  else if (kind === 'clear') { const ctx = clone(liveCtx()); for (const o of OUTS) S.program[o.id] = { layers: blank(), ctx }; S.cleared = true; S.lastTake = null }
}
function setLayer(patch) { Object.assign(S.layers[S.outSel], patch) }

/* ── race operation (the live match) ── */
function setPlace(slot, place) {
  const m = activeMatch(), idx = m.race.index
  pushUndo('result')
  const row = m.scores.races[idx] ?? (m.scores.races[idx] = [0, 0, 0, 0])
  if (row[slot] === place) row[slot] = 0
  else { const j = row.indexOf(place); if (j >= 0) row[j] = 0; row[slot] = place }
  if (row.every((p) => p === 0)) m.scores.races[idx] = null
}
function clearRace() { const m = activeMatch(); pushUndo('clear race'); m.scores.races[m.race.index] = null; toast(`Cleared race ${m.race.index + 1}`, true) }
function setRaceIndex(i) { const m = activeMatch(); m.race.index = Math.max(0, Math.min(m.race.count - 1, i)) }
function nextRace() {
  const m = activeMatch(); if (m.race.index >= m.race.count - 1) return
  pushUndo('next race'); m.race.index++
  toast(`Race ${m.race.index + 1} of ${m.race.count} · ${trackOf(m)}`, true)
}
function setMap(i, name) {
  const m = activeMatch(); pushUndo('change map')
  const def = (CUPS[m.race.cup] ?? CUPS['Mushroom Cup'])[i % 4]; m.race.tracks = m.race.tracks || []
  if (name === def) delete m.race.tracks[i]; else m.race.tracks[i] = name
  toast(`Race ${i + 1} is now on ${name}`, true)
}
function adjust(slot, d) { const m = activeMatch(); pushUndo('adjustment'); m.scores.adj[slot] = (m.scores.adj[slot] || 0) + d }
function setActiveMatch(id) {
  const t = activeTournament(); if (!t || t.activeMatchId === id) return
  pushUndo('switch match'); t.activeMatchId = id; S.tmatch = id; normalize()
  toast(`Live match is now ${activeMatch().label} — nothing changes on air until you Take`, true)
}
function nextMatch(fromCue) {
  const t = activeTournament(); if (!t) return
  const i = t.matches.findIndex((m) => m.id === t.activeMatchId), nx = t.matches[i + 1]
  if (!nx) { toast('That was the last match'); return }
  if (!fromCue) pushUndo('next match')
  activeMatch().left = true; t.activeMatchId = nx.id; S.tmatch = nx.id; normalize()
  resetRundowns()
  toast(`Live match is now ${nx.label} — rundown reset to its first cue`, !fromCue)
}
/** Put a tournament scene into Preview for the selected output, using the chosen match reference. */
function showScene(scene) {
  const l = S.layers[S.outSel]; pushUndo('show ' + scene)
  Object.assign(l, { scene, matchRef: S.matchRefSel, matchSet: S.matchSetSel }); if (l.bg === 'none') l.bg = 'B'
  if (scene === 'raceWin' && l.part === 'board') l.part = 'full'
}

/* ── tournament set-up ── */
function createTournament(name, template) {
  pushUndo('new tournament')
  const t = template === 'empty' ? mkTournament(uid('t'), name, [mkMatch(uid('m'), 'Match 1', 0, 'Mushroom Cup', defaultNames(), ['Mario', 'Luigi', 'Peach', 'Yoshi'])], null) : bracketTemplate(name)
  if (!t.activeMatchId) t.activeMatchId = t.matches[0].id
  S.tournaments.push(t); S.activeTournamentId = t.id; S.tpage = 'round:0'; S.tmatch = t.activeMatchId; normalize()
  toast(`Created “${name}” — now set up its matches`, true)
}
function loadTournament(id) { pushUndo('load tournament'); S.activeTournamentId = id; normalize(); toast(id ? `Loaded “${activeTournament().name}”` : 'Tournament closed — free play', true) }
function deleteTournament(id) {
  const t = S.tournaments.find((x) => x.id === id); if (!t) return
  pushUndo('delete tournament'); S.tournaments = S.tournaments.filter((x) => x.id !== id)
  if (S.activeTournamentId === id) S.activeTournamentId = null
  normalize(); toast(`Deleted “${t.name}”`, true)
}
function duplicateTournament(id, resetScores) {
  const t = S.tournaments.find((x) => x.id === id); if (!t) return
  pushUndo('duplicate tournament')
  const c = clone(t), map = {}
  c.id = uid('t'); c.name = t.name + (resetScores ? ' (clean)' : ' copy')
  for (const m of c.matches) map[m.id] = uid('m')
  for (const m of c.matches) {
    m.slotSources = m.slotSources?.map((s) => (s ? { ...s, matchId: map[s.matchId] ?? s.matchId } : s)) ?? null
    if (resetScores) { m.scores = { races: Array(m.race.count).fill(null), adj: [0, 0, 0, 0] }; m.winnerOverride = null; m.left = false; m.race.index = 0 }
  }
  c.activeMatchId = map[c.activeMatchId] ?? map[c.matches[0].id]
  c.matches.forEach((m) => { m.id = map[m.id] })
  S.tournaments.push(c); S.activeTournamentId = c.id; S.tmatch = c.activeMatchId; normalize()
  toast(`Duplicated as “${c.name}”${resetScores ? ' with scores cleared' : ''}`, true)
}
function addMatch(round) {
  const t = activeTournament(); if (!t) return
  pushUndo('add match')
  const n = t.matches.filter((m) => m.round === round).length + 1
  const m = mkMatch(uid('m'), round === 0 ? `Match ${t.matches.length + 1}` : `R${round + 1} Match ${n}`, round, 'Mushroom Cup', defaultNames(), ['Mario', 'Luigi', 'Peach', 'Yoshi'])
  t.matches.push(m); t.matches.sort((a, b) => a.round - b.round); S.tmatch = m.id
}
function removeMatch(id) {
  const t = activeTournament(); if (!t || t.matches.length < 2) return
  const m = t.matches.find((x) => x.id === id); pushUndo('remove match')
  t.matches = t.matches.filter((x) => x.id !== id)
  for (const x of t.matches) if (x.slotSources) x.slotSources = x.slotSources.map((s) => (s?.matchId === id ? null : s))
  if (t.activeMatchId === id) t.activeMatchId = t.matches[0].id
  normalize(); toast(`Removed “${m.label}”`, true)
}
function setSlotSource(mid, slot, sourceId) {
  const m = matchById(mid); if (!m) return
  m.slotSources = m.slotSources ?? [null, null, null, null]
  m.slotSources[slot] = sourceId ? { matchId: sourceId, auto: true } : null
}
function setPlayerName(mid, slot, name) {
  const m = matchById(mid) ?? activeMatch(); m.players[slot].name = name.toUpperCase().slice(0, 14); m.players[slot].placeholder = false
  if (m.slotSources?.[slot]) m.slotSources[slot] = { ...m.slotSources[slot], auto: false }   // hand-editing a slot turns auto off for it
}
function addRound() {
  const t = activeTournament(); if (!t) return
  pushUndo('add round'); const r = Math.max(...t.matches.map((x) => x.round)) + 1
  const mt = mkMatch(uid('m'), t.roundNames?.[r] ? t.roundNames[r] : `R${r + 1} Match 1`, r, 'Mushroom Cup', defaultNames(), ['Mario', 'Luigi', 'Peach', 'Yoshi'])
  t.matches.push(mt); S.tmatch = mt.id; S.tpage = 'round:' + r
}
function removeRound(r) {
  const t = activeTournament(); if (!t) return
  const ids = t.matches.filter((x) => x.round === r).map((x) => x.id); if (ids.length >= t.matches.length) { toast('A tournament needs at least one round'); return }
  pushUndo('remove round'); t.matches = t.matches.filter((x) => x.round !== r)
  for (const x of t.matches) if (x.slotSources) x.slotSources = x.slotSources.map((s) => (s && ids.includes(s.matchId) ? null : s))
  if (ids.includes(t.activeMatchId)) t.activeMatchId = t.matches[0].id
  delete t.roundNames?.[r]; S.tpage = 'overview'; normalize(); toast(`Removed ${ids.length} match${ids.length === 1 ? '' : 'es'}`, true)
}
/** Convenience for a later round: slot i of every match takes the winner of the i-th match of the previous round. */
function fillFromPrevious(r) {
  const t = activeTournament(), rs = rounds(t), prev = rs[rs.indexOf(r) - 1]; if (prev === undefined) return
  const pm = t.matches.filter((x) => x.round === prev); pushUndo('fill from previous round')
  for (const mt of t.matches.filter((x) => x.round === r)) mt.slotSources = [0, 1, 2, 3].map((i) => (pm[i] ? { matchId: pm[i].id, auto: true } : null))
  toast(`${roundName(t, r)} now takes its players from the winners of ${roundName(t, prev)}`, true)
}
function validateTournament(t) {
  const v = { lib: { ok: !!t, warn: 0 }, bracket: { ok: true, warn: 0 }, players: { ok: true, warn: 0 }, results: { ok: true, warn: 0 }, graphics: { ok: true, warn: 0 }, review: { ok: true, warn: 0 }, issues: [] }
  if (!t) { v.review.ok = false; return v }
  for (const m of t.matches) {
    if (!m.label.trim()) { v.bracket.warn++; v.issues.push({ page: 'round:' + m.round, text: 'A match has no label', id: m.id }) }
    m.players.forEach((p, i) => {
      if (m.slotSources?.[i]?.auto) return
      if (!p.name.trim() || /^player \d$/i.test(p.name.trim())) { v.players.warn++; v.issues.push({ page: 'round:' + m.round, text: `${m.label}: P${i + 1} is still “${p.name || 'empty'}”`, id: m.id }) }
    })
    if (m.slotSources && m.slotSources.some((s) => !s)) { v.players.warn++; v.issues.push({ page: 'round:' + m.round, text: `${m.label}: a slot has no source`, id: m.id }) }
  }
  v.bracket.ok = v.bracket.warn === 0; v.players.ok = v.players.warn === 0
  v.review.warn = v.bracket.warn + v.players.warn; v.review.ok = v.review.warn === 0
  return v
}
