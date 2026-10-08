'use strict'
/* Render loop, event handling, drag and drop, keyboard, prototype chrome. */

const $ = (id) => document.getElementById(id)
const params = new URLSearchParams(location.search)

/* ── render ── */
function render() {
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
    case 'dtab': S.dtab = d.t; break
    case 'raceidx': S.race.index = d.i != null ? +d.i : Math.max(0, Math.min(3, S.race.index + +d.d)); break
    case 'confirmres': { const st = S.looks.find((x) => x.layers.wide.scene === 'standings'); if (st) { loadLook(st.id); toast('Standings loaded into Preview — nothing is on air yet') } break }
    case 'tmatch': S.tour.active = +d.i; break
    case 'nextmatch': S.tour.active = Math.min(S.tour.matches.length - 1, S.tour.active + 1); break

    /* rundown (A and B) */
    case 'mode': S.edit = d.m === 'edit'; S.openCue = null; S.advCue = null; S.rdMenu = false; break
    case 'seqmode': S.seqEdit = d.m === 'edit'; S.selCue = null; S.advCue = null; S.rdMenu = false; break
    case 'rdmenu': S.rdMenu = !S.rdMenu; S.rdRename = null; break
    case 'rdpick': S.rundownId = d.id; S.rdMenu = false; S.openCue = null; S.selCue = null; break
    case 'rdnew': createRundown(); S.rdMenu = false; S.edit = true; S.seqEdit = true; toast('New rundown — add cues from Preview or the Library', true); break
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
    case 'rtab': S.rtab = d.t; S.saveOpen = false; break
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
      S.saveOpen = false; S.rtab = 'library'; toast(msg, true); break
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
    case 'slotclear': pushUndo('clear slot'); S.bank.pages[S.bank.page].slots[+d.i] = null; S.slotMenu = null; toast(`Cleared slot ${+d.i + 1} — the look is still in the Library`, true); break
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
  if (k === 'pos') { const row = S.scores.races[S.race.index] ?? (S.scores.races[S.race.index] = [1, 2, 3, 4]), v = Number(t.value), j = row.indexOf(v); if (j >= 0 && j !== i) row[j] = row[i]; row[i] = v }
  else if (k === 'pchar') S.players[i].char = t.value
  else if (k === 'cuelook') { pushUndo('change look'); r.cues[i].lookId = t.value; if (r.pvw === i) loadLook(t.value, r.cues[i], true) }
  else if (k === 'cueafter') { pushUndo('change after'); r.cues[i].after = t.value || null }
  render()
})
document.addEventListener('input', (e) => {
  const t = e.target, k = t.dataset?.in; if (!k) return
  let rerender = true
  if (/^pn\d$/.test(k)) S.players[+k[2]].name = t.value.toUpperCase().slice(0, 14)
  else if (/^adj\d$/.test(k)) S.scores.adj[+k[3]] = Number(t.value) || 0
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
    ['Fire the show', 'Tap cue 6 “Standings” in the rundown: it loads into Preview (green). Press <kbd>G</kbd> or the big GO: it goes to Program with the cue’s Cut/Auto and the next cue loads. Cue 5 has “then next race” so the race number moves on.'],
    ['Change Preview, then save or update', 'Tap a different scene tile. Preview shows MODIFIED. Open <b>Library</b>: “Update …” needs two taps and says how many cues it affects; “Save as new…” opens the inline form. Try the Undo toast.'],
    ['Build a rundown from what you see', 'Switch the rundown to <b>Edit</b>. “Add cue from Preview” saves a look and appends a cue in one tap. Drag a Library card’s grip onto the rundown, or tap “＋ Cue”.'],
    ['Reorder and edit a cue', 'In Edit, drag the grip to reorder, tap a row to open its editor (look, take, after, recalls). “Make unique” appears when a look is shared.'],
    ['Show data', 'Open <b>Show data</b>: change a player name and a result position; the monitors and standings follow. “Confirm results” loads Standings into Preview only.'],
    ['Emergency and safety', 'Try HOLD, CLEAR and FTB. Keys: Space = AUTO, Enter = CUT, H, Shift+Esc, Shift+B, 1–4 arm outputs, Ctrl/Cmd+Z undo. Use “Simulate disconnect” above.'],
  ],
  B: [
    ['Load and take', 'Tap a slot: it loads into Preview only. Tap CUT or AUTO (or press Space / Enter) to put it on air. A red outline marks the on-air look.'],
    ['STORE a look', 'Tap <b>STORE</b>, then an empty slot to save Preview there. Change Preview, STORE again and tap a filled slot twice to overwrite it.'],
    ['Edit the bank', 'Tap <b>Edit bank</b>: drag a grip to swap slots, tap a slot to rename, clear or delete. Use “Show deck” to see the page as a Stream Deck.'],
    ['Record a sequence', 'Tap <b>REC</b>, then tap looks in the order you want. Or use “Add Preview as cue”. GO steps through the sequence.'],
    ['Edit the sequence', 'Switch the strip to <b>Edit</b>: drag chip grips to reorder; tap a chip to edit its look, take and after in the panel on the left.'],
    ['Pages', 'Use the page tabs (Pre-show, Races, Results, Sponsors) and ＋ to add a page. Pages map to Companion pages.'],
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
