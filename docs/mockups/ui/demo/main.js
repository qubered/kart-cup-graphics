'use strict'
/* Render loop, event handling, drag and drop, keyboard, prototype chrome. */

const $ = (id) => document.getElementById(id)
const params = new URLSearchParams(location.search)

/* ── render ── */
function render() {
  normalize()
  const ui = $('ui')
  const ae = document.activeElement, fid = ae?.dataset?.in, sel = fid ? [ae.selectionStart, ae.selectionEnd] : null
  const scrolls = [...ui.querySelectorAll('.grow')].map((e) => e.scrollTop)
  ui.className = 'ui' + (S.connected ? '' : ' off')
  ui.innerHTML = topBar() + (S.layout === 'A' ? viewA() : viewB()) + transport() + chrome()
  ui.querySelectorAll('.grow').forEach((e, i) => { if (scrolls[i]) e.scrollTop = scrolls[i] })
  if (fid) { const el = ui.querySelector(`[data-in="${fid}"]`); if (el) { el.focus(); try { el.setSelectionRange(sel[0], sel[1]) } catch (e) { /* number inputs */ } } }
  protoRender(); fit(); save()
}
function fit() {
  const top = params.get('chrome') === '0' ? 0 : 40
  const s = params.get('fit') === '0' ? 1 : Math.min(innerWidth / 1600, (innerHeight - top) / 1000)
  const ui = $('ui')
  ui.style.transform = `scale(${s})`; ui.style.top = top + 'px'; ui.style.left = Math.max(0, (innerWidth - 1600 * s) / 2) + 'px'
}
addEventListener('resize', fit)

/* ── actions ── */
const flip = (o, k) => { o[k] = !o[k] }
function act(a, d) {
  const r = R(), l = S.layers[S.outSel]
  switch (a) {
    case 'view': S.view = d.v; S.saveOpen = false; S.rdMenu = false; break
    case 'out': S.outSel = d.o; break
    case 'say': toast(d.m); break
    case 'undo': undo(); break
    case 'toastx': S.toast = null; break
    case 'arm': toggleArm(d.o); break
    case 'armall': S.armed = OUTS.map((o) => o.id); break
    case 'take': take(d.m); break
    case 'speed': S.speed = d.s; break
    case 'emerg': emergency(d.e); break
    case 'layer': setLayer({ [d.k]: d.k === 'reveal' ? Number(d.v) : d.v }); break
    case 'layerflip': flip(l, d.k); break
    case 'ltp': l.ltp = l.ltp.includes(+d.i) ? l.ltp.filter((x) => x !== +d.i) : [...l.ltp, +d.i].sort(); break
    case 'reveal-next': l.reveal = Math.min(4, (l.reveal ?? 4) + 1); break
    case 'mattify': S.mattify = !S.mattify; break
    case 'online': S.outOnline[d.o] = !S.outOnline[d.o]; break
    case 'snav': S.snav = d.n; break
    case 'reset': try { localStorage.removeItem(STORE_KEY) } catch (e) { /* ignore */ } { const layout = S.layout; boot(true); S.layout = layout } toast('Demo reset'); break
    /* race control (operate the live match) */
    case 'setmatch': setActiveMatch(d.id); break
    case 'gotour': S.view = 'tour'; S.tpage = d.p || 'overview'; break
    case 'mapreset': { const mm = activeMatch(), def = (CUPS[mm.race.cup] ?? CUPS['Mushroom Cup'])[+d.i % 4]; setMap(+d.i, def); break }
    case 'setrace': setRaceIndex(+d.i); break
    case 'place': setPlace(+d.s, +d.p); break
    case 'adj': adjust(+d.s, +d.d); break
    case 'clearrace': clearRace(); break
    case 'nextrace': nextRace(); break
    case 'nextmatch': nextMatch(); break
    case 'showscene': showScene(d.s); if (d.go) S.view = 'live'; break

    /* tournament set-up */
    case 'tpage': S.tpage = d.p; S.confirm = null; break
    case 'tfix': S.tpage = d.p; if (d.id) S.tmatch = d.id; break
    case 'tmatchsel': S.tmatch = d.id; break
    case 'tnew': S.tnew = { name: '', template: 'bracket' }; break
    case 'tnewtpl': S.tnew.template = d.v; break
    case 'tnewcancel': S.tnew = null; break
    case 'tnewgo': if (S.tnew.name.trim()) { createTournament(S.tnew.name.trim(), S.tnew.template); S.tnew = null } break
    case 'tload': loadTournament(d.id); break
    case 'tclose': loadTournament(null); break
    case 'trename': { const t = S.tournaments.find((x) => x.id === d.id); S.trename = { id: d.id, name: t.name }; break }
    case 'trenamego': { const t = S.tournaments.find((x) => x.id === S.trename.id); if (t && S.trename.name.trim()) { pushUndo('rename tournament'); t.name = S.trename.name.trim() } S.trename = null; break }
    case 'tdup': duplicateTournament(d.id, false); break
    case 'tdupclean': duplicateTournament(d.id, true); break
    case 'tdel': if (twoTap('tdel:' + d.id)) deleteTournament(d.id); break
    case 'addmatch': addMatch(+d.r); break
    case 'addround': addRound(); break
    case 'rmround': if (twoTap('rr:' + d.r)) removeRound(+d.r); break
    case 'fillprev': fillFromPrevious(+d.r); break
    case 'rmmatch': if (twoTap('rm:' + d.id)) removeMatch(d.id); break
    case 'wincfg': activeTournament().winScreen[d.k] = d.v; break
    case 'winblock': { const w = activeTournament().winScreen.blocks; w[d.k] = !w[d.k]; break }
    case 'mscfg': activeTournament().matchesScene[d.k] = d.v; break
    case 'msdetail': activeTournament().matchesScene.detail[d.f] = d.v; break
    case 'msmarker': { const ms = activeTournament().matchesScene; ms.liveMarker = !ms.liveMarker; break }
    case 'brcfg': { const br = activeTournament().bracket; br[d.k] = !br[d.k]; break }

    /* rundown (A and B) */
    case 'mode': S.edit = d.m === 'edit'; S.openCue = null; S.advCue = null; S.rdMenu = false; break
    case 'seqmode': S.seqEdit = d.m === 'edit'; S.selCue = null; S.advCue = null; S.rdMenu = false; break
    case 'rdmenu': S.rdMenu = !S.rdMenu; S.rdRename = null; break
    case 'rdpick': S.rundownId = d.id; S.rdMenu = false; S.openCue = null; S.selCue = null; break
    case 'rdnew': createRundown(); S.rdMenu = false; S.edit = true; S.seqEdit = true; toast('New rundown — add cues from Preview or the Looks library', true); break
    case 'rdrename': S.rdRename = r.name; break
    case 'rdrenamego': if ((S.rdRename ?? '').trim()) { pushUndo('rename rundown'); r.name = S.rdRename.trim() } S.rdRename = null; break
    case 'rddel': if (S.rundowns.length > 1 && twoTap('rddel')) { pushUndo('delete rundown'); S.rundowns = S.rundowns.filter((x) => x.id !== r.id); S.rundownId = S.rundowns[0].id; S.rdMenu = false; toast(`Deleted rundown “${r.name}”`, true) } break
    case 'selcue': selectCue(+d.i); break
    case 'chipedit': S.selCue = S.selCue === +d.i ? null : +d.i; S.advCue = null; break
    case 'opencue': S.openCue = S.openCue === +d.i ? null : +d.i; S.advCue = null; break
    case 'rmcue': removeCue(+d.i); S.selCue = null; break
    case 'unique': makeUnique(+d.i); break
    case 'cuetake': pushUndo('change take'); r.cues[+d.i].take = d.t === 'none' ? null : d.t; break
    case 'advcue': S.advCue = S.advCue === +d.i ? null : +d.i; break
    case 'cuescope': { const c = r.cues[+d.i]; pushUndo('cue recall'); c.scope = c.scope || {}; const own = c.scope[d.k]; if (own === undefined) c.scope[d.k] = true; else if (own) c.scope[d.k] = false; else delete c.scope[d.k]; break }
    case 'go': go(); break
    case 'back': stepStandby(-1); break
    case 'skip': stepStandby(1); break
    case 'rewind': rewind(); break
    case 'addprev': addCueFromPreview(); break
    case 'rec': S.rec = !S.rec; if (S.rec) toast('Recording — tap looks in the bank to append them as cues'); break

    /* looks and the inspector (A) */
    case 'revert': { const look = lookById(S.loadedLookId); if (look) { pushUndo('revert'); applyLook(look, { layers: true, armed: true }); toast(`Preview reverted to “${look.name}”`, true) } break }
    case 'saveopen': S.saveForm = { name: suggestName(), from: 'pvw', scope8: scopeFromGroups(DEFAULT_GROUPS), adv: false, addCue: false, take: 'auto' }; S.saveOpen = true; break
    case 'savecancel': S.saveOpen = false; break
    case 'savefrom': S.saveForm.from = d.f; break
    case 'savegroup': { const g = GROUPS.find((x) => x.key === d.g), on = groupsFromScope(S.saveForm.scope8)[d.g]; g.keys.forEach((k) => { S.saveForm.scope8[k] = !on }); break }
    case 'saveadv': flip(S.saveForm, 'adv'); break
    case 'savescope': flip(S.saveForm.scope8, d.k); break
    case 'saveaddcue': flip(S.saveForm, 'addCue'); break
    case 'savetake': S.saveForm.take = d.t; break
    case 'savego': {
      const f = S.saveForm; pushUndo('save look')
      const look = createLook(f.name.trim(), f.from, null, { scope8: f.scope8 }); let msg = `Saved look “${look.name}”`
      if (f.addCue) { const { at } = addCue(look.id, null, { take: f.take === 'none' ? null : f.take }); msg += ` and added as cue ${at + 1}` }
      S.saveOpen = false; toast(msg, true); break
    }
    case 'upd': { const look = lookById(S.loadedLookId); if (look && twoTap('upd')) updateLook(look.id, 'pvw'); break }
    case 'loadlook': loadLook(d.id); S.libMenu = null; break
    case 'libadd': { pushUndo('add cue'); const { at } = addCue(d.id); toast(`Added “${lookById(d.id).name}” as cue ${at + 1}`, true); break }
    case 'libmenu': S.libMenu = S.libMenu === d.id ? null : d.id; S.libRename = null; S.confirm = null; break
    case 'libren': if (S.libRename === d.id) { renameLook(d.id, S.libRenVal ?? ''); S.libRename = null } else { S.libRename = d.id; S.libRenVal = lookById(d.id).name } break
    case 'libdup': { const c = duplicateLook(d.id); if (c) toast(`Duplicated as “${c.name}”`, true); break }
    case 'libdel': if (twoTap('del:' + d.id)) { deleteLook(d.id); S.libMenu = null; S.slotMenu = null } break

    /* bank (B) */
    case 'page': S.bank.page = +d.i; S.confirm = null; S.slotMenu = null; break
    case 'pagenew': pushUndo('new page'); S.bank.pages.push({ name: 'Page ' + (S.bank.pages.length + 1), slots: Array(SLOTS).fill(null) }); S.bank.page = S.bank.pages.length - 1; break
    case 'bankedit': S.bankEdit = !S.bankEdit; S.store = false; S.slotMenu = null; S.confirm = null; break
    case 'store': S.store = !S.store; S.bankEdit = false; S.confirm = null; break
    case 'storeto': {
      const i = +d.i, slots = S.bank.pages[S.bank.page].slots, id = slots[i]
      if (!id) { pushUndo('store look'); const look = createLook(null, 'pvw', DEFAULT_GROUPS, { slot: i }); S.store = false; toast(`Stored “${look.name}” in slot ${i + 1}`, true) }
      else if (twoTap('store:' + i)) { updateLook(id, 'pvw'); S.store = false }
      break
    }
    case 'loadslot': { const id = S.bank.pages[S.bank.page].slots[+d.i]; if (id) { loadLook(id); if (S.rec) { pushUndo('record cue'); const { at } = addCue(id); toast(`Recorded cue ${at + 1}: ${lookById(id).name}`, true) } } break }
    case 'slotmenu': S.slotMenu = S.slotMenu === +d.i ? null : +d.i; S.libRename = null; S.confirm = null; break
    case 'slotren': { const id = S.bank.pages[S.bank.page].slots[+d.i]; if (S.libRename === id) { renameLook(id, S.libRenVal ?? ''); S.libRename = null } else { S.libRename = id; S.libRenVal = lookById(id).name } break }
    case 'slotclear': pushUndo('clear slot'); S.bank.pages[S.bank.page].slots[+d.i] = null; S.slotMenu = null; toast(`Cleared slot ${+d.i + 1} — the look is still in the Looks library`, true); break
    case 'more': S.moreScenes = !S.moreScenes; break
    case 'deck': S.modal = 'deck'; break
  }
}

/* ── clicks, changes, input ── */
let suppressUntil = 0
document.addEventListener('click', (e) => { if (Date.now() < suppressUntil) { e.stopPropagation(); e.preventDefault() } }, true)
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-act]'); if (!t || t.disabled || !t.closest('#ui')) return
  act(t.dataset.act, t.dataset); render()
})
document.addEventListener('change', (e) => {
  const t = e.target, k = t.dataset?.chg; if (!k) return
  const r = R(), i = +t.dataset.i
  if (k === 'mapsel') setMap(+t.dataset.i, t.value)
  else if (k === 'mcup') { const mt = matchById(t.dataset.id); pushUndo('change cup'); mt.race.cup = t.value }
  else if (k === 'mraces') { const mt = matchById(t.dataset.id); pushUndo('change races'); const n = +t.value; mt.race.count = n; while (mt.scores.races.length < n) mt.scores.races.push(null); mt.scores.races.length = n; mt.race.index = Math.min(mt.race.index, n - 1) }
  else if (k === 'pchar2') { const mt = matchById(t.dataset.id); mt.players[+t.dataset.i].char = t.value }
  else if (k === 'psrc') { pushUndo('change slot source'); setSlotSource(t.dataset.id, +t.dataset.i, t.value) }
  else if (k === 'rpos') { const mt = matchById(t.dataset.id), ri = +t.dataset.r, pi = +t.dataset.i, v = +t.value; pushUndo('edit result'); const row = mt.scores.races[ri] ?? (mt.scores.races[ri] = [0, 0, 0, 0]); if (v) { const j = row.indexOf(v); if (j >= 0 && j !== pi) row[j] = 0 } row[pi] = v; if (row.every((p) => p === 0)) mt.scores.races[ri] = null }
  else if (k === 'mwin') { const mt = matchById(t.dataset.id); pushUndo('set winner'); mt.winnerOverride = t.value === '' ? null : +t.value }
  else if (k === 'livematch') setActiveMatch(t.value)
  else if (k === 'cuelook') { pushUndo('change look'); r.cues[i].lookId = t.value; if (r.pvw === i) loadLook(t.value, r.cues[i], true) }
  else if (k === 'cueafter') { pushUndo('change after'); r.cues[i].after = t.value || null }
  render()
})
document.addEventListener('input', (e) => {
  const t = e.target, k = t.dataset?.in; if (!k) return
  let rerender = true
  if (k.startsWith('pfree:')) { setPlayerName(null, +k.slice(6), t.value) }
  else if (k.startsWith('pname:')) { const [, id, i] = k.split(':'); setPlayerName(id, +i, t.value) }
  else if (k.startsWith('adj2:')) { const [, id, i] = k.split(':'); matchById(id).scores.adj[+i] = Number(t.value) || 0 }
  else if (k.startsWith('mlabel:')) { const mt = matchById(k.slice(7)); mt.label = t.value }
  else if (k === 'tnewname') S.tnew.name = t.value
  else if (k === 'tname') { activeTournament().name = t.value }
  else if (k.startsWith('rname:')) { const tt = activeTournament(); tt.roundNames = tt.roundNames || {}; tt.roundNames[+k.slice(6)] = t.value }
  else if (k === 'trename') S.trename.name = t.value
  else if (k === 'title') S.event.title = t.value
  else if (k === 'accent') S.event.accent = t.value
  else if (k === 'hold') S.event.hold = t.value
  else if (k === 'libfilter') S.libFilter = t.value
  else if (k === 'savename') S.saveForm.name = t.value
  else if (k === 'libren') { S.libRenVal = t.value; rerender = false }
  else if (k === 'rdname') { S.rdRename = t.value; rerender = false }
  if (rerender) render()
})
document.addEventListener('keydown', (e) => {
  if (e.target.dataset?.in && e.key === 'Enter') { e.target.blur(); const b = $('ui').querySelector('[data-act=savego]'); if (e.target.dataset.in === 'savename' && b && !b.disabled) { b.click() } return }
  const tag = e.target.tagName, typing = /INPUT|TEXTAREA|SELECT/.test(tag)
  if (S.modal && e.key === 'Escape') { S.modal = null; protoRender(); return }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); undo(); render(); return }
  if (e.ctrlKey || e.metaKey || e.altKey || !S.connected) return
  let handled = true
  if (e.shiftKey && e.key === 'Escape') emergency('clear')
  else if (e.shiftKey && (e.key === 'B' || e.key === 'b')) emergency('ftb')
  else if (typing || e.shiftKey) handled = false
  else if (e.key === 'Escape') { S.saveOpen = false; S.store = false; S.bankEdit = false; S.confirm = null; S.libMenu = null; S.slotMenu = null; S.rdMenu = false }
  else if (e.key === 'g' || e.key === 'G') go()
  else if (e.key === 'Enter') take('cut')
  else if (e.key === ' ') take('auto')
  else if (e.key === 'h' || e.key === 'H') emergency('hold')
  else if (/^[1-9]$/.test(e.key) && OUTS[+e.key - 1]) toggleArm(OUTS[+e.key - 1].id)
  else handled = false
  if (handled) { e.preventDefault(); render() }
})
document.addEventListener('keyup', (e) => { if (e.key === ' ' && e.target.tagName === 'BUTTON') e.preventDefault() })

/* ── drag and drop (pointer based, so it works with a finger as well as a mouse) ── */
let drag = null
const mark = document.createElement('div'); mark.id = 'dropmark'; document.body.appendChild(mark)
const ghost = document.createElement('div'); ghost.id = 'dragghost'; document.body.appendChild(ghost)
function dragName() {
  if (drag.type === 'cue') return lookById(R().cues[+drag.id]?.lookId)?.name
  if (drag.type === 'slot') return lookById(S.bank.pages[S.bank.page].slots[+drag.id])?.name
  return lookById(drag.id)?.name
}
function findDrop(e) {
  const els = document.elementsFromPoint(e.clientX, e.clientY)
  const zone = els.find((el) => el.dataset?.drop)
  if (!zone) return null
  if (zone.dataset.drop === 'bank') {
    if (drag.type !== 'slot') return null
    const s = els.find((el) => el.dataset?.si !== undefined); if (!s) return null
    return { zone: 'bank', index: +s.dataset.si, rect: s.getBoundingClientRect(), box: true }
  }
  const items = [...zone.querySelectorAll('[data-di]')], horiz = zone.dataset.drop === 'seq'
  let idx = 0
  items.forEach((it, i) => { const b = it.getBoundingClientRect(), c = horiz ? b.left + b.width / 2 : b.top + b.height / 2; if ((horiz ? e.clientX : e.clientY) > c) idx = i + 1 })
  const zr = zone.getBoundingClientRect()
  let rect
  if (!items.length) rect = horiz ? { left: zr.left + 4, top: zr.top, width: 3, height: zr.height } : { left: zr.left, top: zr.top + 4, width: zr.width, height: 3 }
  else {
    const ref = items[Math.min(idx, items.length - 1)].getBoundingClientRect(), after = idx >= items.length
    rect = horiz ? { left: (after ? ref.right + 3 : ref.left - 5), top: ref.top, width: 3, height: ref.height } : { left: zr.left, top: after ? ref.bottom - 1 : ref.top - 1, width: zr.width, height: 3 }
  }
  return { zone: zone.dataset.drop, index: idx, rect }
}
function applyDrop(d, drop) {
  if (drop.zone === 'bank') {
    const slots = S.bank.pages[S.bank.page].slots, a = +d.id, b = drop.index; if (a === b) return
    pushUndo('move slot'); [slots[a], slots[b]] = [slots[b], slots[a]]; toast(`Moved to slot ${b + 1}`, true); return
  }
  if (d.type === 'cue') { moveCue(+d.id, drop.index); return }
  const lookId = d.type === 'slot' ? S.bank.pages[S.bank.page].slots[+d.id] : d.id
  if (!lookId) return
  pushUndo('add cue'); const { at } = addCue(lookId, drop.index); toast(`Added “${lookById(lookId).name}” as cue ${at + 1}`, true)
}
function endDrag() { mark.style.display = 'none'; ghost.style.display = 'none' }
document.addEventListener('pointerdown', (e) => {
  const h = e.target.closest('[data-drag]'); if (!h || e.button || !h.closest('#ui')) return
  const [type, id] = h.dataset.drag.split(':')
  drag = { type, id, x: e.clientX, y: e.clientY, on: false, drop: null }
  e.preventDefault()
})
document.addEventListener('pointermove', (e) => {
  if (!drag) return
  if (!drag.on) { if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return; drag.on = true; ghost.textContent = dragName() ?? ''; ghost.style.display = 'block' }
  ghost.style.left = e.clientX + 12 + 'px'; ghost.style.top = e.clientY + 8 + 'px'
  drag.drop = findDrop(e)
  if (drag.drop) { const r = drag.drop.rect; Object.assign(mark.style, { display: 'block', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' }); mark.className = drag.drop.box ? 'box' : '' }
  else mark.style.display = 'none'
})
function dragEnd(apply) {
  if (!drag) return
  const d = drag; drag = null
  if (!d.on) return
  endDrag(); suppressUntil = Date.now() + 40
  if (apply && d.drop) { applyDrop(d, d.drop); render() }
}
document.addEventListener('pointerup', () => dragEnd(true))
document.addEventListener('pointercancel', () => dragEnd(false))

/* ── prototype chrome (outside the design) ── */
const GUIDE = {
  A: [
    ['Fire the show', 'Tap cue 5 “Standings” in the rundown: it loads into Preview (green). Press <kbd>G</kbd> or the big GO: it goes to Program with the cue’s Cut/Auto and the next cue loads. Cue 7 has “then next race”, the last cue “then next match”.'],
    ['Pick scenes per screen', 'Pick a screen (Wide, Twins, Stream…) above the monitors. The right bar lists that screen’s scenes (Title, Line-up, Next race, Standings…), then the options for the chosen scene, then Background and Overlays. Everything lands in Preview first.'],
    ['Looks library: load, update, save', 'The Looks tiles under the monitors are your saved presets. Tap one to load it into Preview (never Program). Change a scene or option and Preview shows MODIFIED: “Update …” needs two taps and says how many cues it affects, “Save as new…” opens the inline form. ⋯ on a tile renames, duplicates or deletes it. Try the Undo toast.'],
    ['Build a rundown from what you see', 'Switch the rundown to <b>Edit</b>. “Add cue from Preview” saves a look and appends a cue in one tap. Drag a Looks tile’s grip onto the rundown, or tap its ＋. Drag a cue grip to reorder.'],
    ['Run a race', 'Open <b>Race</b>. Left: pick the live race and its map. Middle: tap each player’s finishing place (names and characters are editable here too). Right: the scoreboard updates as you tap. Then <b>Next race ▶</b>; after the last race the winner appears with <b>Next match ▶</b>.'],
    ['Show the result on the graphics', 'The Race page never touches the graphics. Use the scene picker on the <b>Live</b> page (Race win, Standings, Cup win, Bracket, Matches). “Match shown: Previous” keeps the match you just finished on screen after you move on.'],
    ['Set up a tournament', 'Open <b>Tournament</b>. The left outline lists each round: click one to edit its matches (tabs), players and results. The Final’s players fill automatically from the semis. <b>Overview</b> lists anything still to fix; <b>All ›</b> manages tournaments.'],
    ['Emergency and safety', 'Try HOLD, CLEAR and FTB. Keys: Space = AUTO, Enter = CUT, H, Shift+Esc, Shift+B, 1–4 arm outputs, Ctrl/Cmd+Z undo. Use “Simulate disconnect” above.'],
  ],
  B: [
    ['Load and take', 'Tap a slot: it loads into Preview only. Tap CUT or AUTO (or press Space / Enter) to put it on air. A red outline marks the on-air look.'],
    ['STORE a look', 'Tap <b>STORE</b>, then an empty slot to save Preview there. Change Preview, STORE again and tap a filled slot twice to overwrite it.'],
    ['Edit the bank', 'Tap <b>Edit bank</b>: drag a grip to swap slots, tap a slot to rename, clear or delete. Use “Show deck” to see the page as a Stream Deck.'],
    ['Record and edit a sequence', 'Tap <b>REC</b>, then tap looks in the order you want, or use “Add Preview as cue”. Switch the strip to <b>Edit</b> to drag chips and edit a cue’s take and after on the left. GO steps through the sequence.'],
    ['Run a race', 'Open <b>Race</b> (same page as option A): pick the live race and map, tap finishing places, watch the scoreboard. The “Tournament” bank page holds Bracket and All matches looks.'],
    ['Set up a tournament', 'Open <b>Tournament</b>: the outline on the left lists the rounds; each opens its matches, players and results. The Overview shows what is still to fix.'],
  ],
}
function protoRender() {
  const p = $('proto'); if (!p) return
  const hide = params.get('chrome') === '0'
  p.style.display = hide ? 'none' : 'flex'
  p.innerHTML = `<span class="plabel">Prototype</span><div class="pseg"><button data-pa="layout" data-v="A" class="${S.layout === 'A' ? 'on' : ''}">A · Rundown-first</button><button data-pa="layout" data-v="B" class="${S.layout === 'B' ? 'on' : ''}">B · Look bank</button></div>
    <button data-pa="guide">Guide</button><button data-pa="deckp">Stream Deck map</button><button data-pa="disc" class="${S.connected ? '' : 'on'}">${S.connected ? 'Simulate disconnect' : 'Reconnect'}</button><button data-pa="reset">Reset demo</button><span class="phint">Simulated show · no server · saved in this browser</span>`
  const m = $('modal')
  if (!S.modal) { m.style.display = 'none'; m.innerHTML = ''; return }
  m.style.display = 'grid'
  if (S.modal === 'guide') {
    m.innerHTML = `<div class="mbox"><div class="mh"><b>Try this — Option ${S.layout}</b><button data-pa="close" aria-label="Close">✕</button></div><ol>${GUIDE[S.layout].map(([h, t]) => `<li><b>${h}</b><span>${t}</span></li>`).join('')}</ol><div class="mf">Everything is simulated. The graphics are schematic stand-ins, not the real renderer.</div></div>`
  } else {
    const pg = S.bank.pages[S.bank.page]
    m.innerHTML = `<div class="mbox deck"><div class="mh"><b>Stream Deck · Companion page ${S.bank.page + 1} — ${esc(pg.name)}</b><button data-pa="close" aria-label="Close">✕</button></div>
      <div class="deckgrid">${pg.slots.map((id, i) => { const l = id && lookById(id), st = id && id === S.programLookId ? 'pgm' : id && id === S.loadedLookId ? 'pvw' : ''
        return `<div class="key ${st} ${l ? '' : 'empty'}">${l ? `<div class="kth">${gfx(l.layers.wide)}</div><span>${esc(l.name)}</span>` : '<span class="dim">empty</span>'}<i>${i + 1}</i></div>` }).join('')}</div>
      <div class="mf">Same page on the hardware. Key border colours follow the screen: green = Preview, red = on air. Pressing a key loads the look to Preview, exactly like tapping the slot.</div></div>`
  }
}
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-pa]'); if (!t) { if (e.target.id === 'modal') { S.modal = null; protoRender() } return }
  const a = t.dataset.pa
  if (a === 'layout') { S.layout = t.dataset.v; S.saveOpen = false; S.rdMenu = false; S.view = 'live' }
  else if (a === 'guide') S.modal = 'guide'
  else if (a === 'deckp') S.modal = 'deck'
  else if (a === 'close') S.modal = null
  else if (a === 'disc') S.connected = !S.connected
  else if (a === 'reset') act('reset', {})
  render()
})

/* ── boot ── */
function start() {
  boot(params.get('fresh') === '1')
  if (params.get('layout')) S.layout = params.get('layout').toUpperCase() === 'B' ? 'B' : 'A'
  if (params.get('view')) S.view = params.get('view')
  render()
  setInterval(() => { const c = $('clock'), o = $('onair'); if (c) c.textContent = clockText(); if (o && S.onAirSince) o.textContent = hhmmss(Date.now() - S.onAirSince) }, 1000)
}
window.DEMO = { get S() { return S }, render, act, go, take }
start()
