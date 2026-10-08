'use strict'
/* Shared views: graphics stand-ins, monitors, top bar, transport, Show data, Setup. Layout-specific views are in layout-a.js / layout-b.js. */

/* ── graphics stand-ins (schematic; driven by the demo's live state so names and scores show up) ── */
function gfx(Lr, o = {}) {
  const part = o.part ?? Lr.part
  const st = standing(), maxT = Math.max(1, st[0]?.t || 1)
  const board = (right) => `<div class="st${right ? ' r' : ''}">${st.map((s) => `<i style="--w:${Math.max(10, (s.t / maxT) * 100)}%;--c:${PCOL[s.i]}"><em>${esc(s.name)}</em><u>${s.t}</u></i>`).join('')}</div>`
  const hero = (name, big, cls = '') => `<div class="hero ${cls}"><div class="med">${big}</div><div class="nm2">${esc(name)}</div></div>`
  const race = S.scores.races[S.race.index] ?? []
  const raceWinner = S.players[race.indexOf(1)]?.name ?? st[0]?.name ?? ''
  let h = `<div class="gfx"><div class="bgl bg${Lr.bg}"></div>`
  switch (Lr.scene) {
    case 'title':
      h += `<div class="ttl2" style="${Lr.logo === 'title' ? 'padding-left:24%' : ''}"><b>${esc(S.event.title)}</b><span>${esc(S.event.accent)} CHAMPIONSHIP</span></div>`
      if (Lr.logo === 'corner') h += '<div class="logo corner"></div>'
      if (Lr.logo === 'title') h += '<div class="logo intitle"></div>'
      break
    case 'lineup':
      h += `<div class="lu">${S.players.map((p, i) => `<i style="--c:${PCOL[i]};${i < (Lr.reveal ?? 4) ? '' : 'visibility:hidden'}">${esc(p.name)}</i>`).join('')}</div>`; break
    case 'nextRace':
      h += `<div class="nr"><div class="card2">${esc(trackName()).replace(' ', '<br>')}</div><div class="tx"><b>RACE ${S.race.index + 1}</b><span>${esc(S.race.cup).toUpperCase()}</span></div></div>`; break
    case 'standings': h += board(false); break
    case 'winner': h += hero(st[0]?.name ?? '', '1', 'mid'); break
    case 'raceWin': h += part === 'board' ? board(false) : hero(raceWinner, '1') + (part === 'full' ? board(true) : ''); break
    case 'cupWin': h += part === 'board' ? board(false) : hero(st[0]?.name ?? '', '★') + (part === 'full' ? board(true) : ''); break
    case 'bracket': h += '<div class="br"><div><i></i><i></i><i></i><i></i></div><div><i></i><i></i></div><div><i></i></div></div>'; break
    case 'matches': h += '<div class="mt"><i></i><i></i><i></i><i></i></div>'; break
    case 'notice': h += `<div class="nt"><i></i><i></i><i></i></div>${Lr.qr ? '<div class="qr sm"></div>' : ''}`; break
    case 'qr': h += '<div class="qr"></div>'; break
  }
  if (Lr.lt) h += `<div class="lts">${S.players.map((p, i) => ((Lr.ltp ?? [0, 1, 2, 3]).includes(i) ? `<i style="--c:${PCOL[i]}">${esc(p.name)}</i>` : '<i style="visibility:hidden"></i>')).join('')}</div>`
  if (Lr.track) h += `<div class="tcard">${esc(trackName()).toUpperCase()}</div>`
  return h + '</div>'
}
/** Thumbnail for a look (uses the wide layers). */
const thumb = (look, extra = '') => `<div class="th">${gfx(look.layers.wide)}${extra}</div>`

/* ── monitors ── */
function monitor(kind, o) {
  const pv = kind === 'pv'
  const Lr = pv ? S.layers[o.id] : (S.program[o.id]?.layers ?? blank())
  let inner = gfx(Lr)
  if (!pv) {
    const t = S.lastTake, age = t ? Date.now() - t.t0 : 0
    if (t && t.dur && age < t.dur && t.outs.includes(o.id)) inner += `<div class="fadeprev" style="animation-duration:${t.dur}ms;animation-delay:-${age}ms">${gfx(t.prev[o.id])}</div>`
    if (S.hold) inner += `<div class="gfx holdov"><b>HOLD</b><span>${esc(S.event.hold)}</span></div>`
    if (S.ftb) inner += '<div class="gfx ftbov"></div>'
  }
  const tag = pv ? `PREVIEW · ${o.name.toUpperCase()}` : `PROGRAM · ${o.name.toUpperCase()}${S.hold ? ' · HOLD' : ''}${S.ftb ? ' · FTB' : ''}${S.cleared ? ' · CLEARED' : ''}`
  const src = pv ? `${isModified() ? '<span class="tag mod">MODIFIED</span>' : ''}${esc(lookById(S.loadedLookId)?.name ?? 'Unsaved')}` : esc(S.programLabel || '')
  return `<div class="mon ${pv ? 'pv' : 'pg'}" style="aspect-ratio:${o.ar}"><div class="t">${tag}</div><div class="src">${src}</div>${inner}</div>`
}
function monitorsBlock() {
  const o = out(S.outSel)
  return o.kind === 'wide' ? monitor('pv', o) + monitor('pg', o) : `<div class="pair">${monitor('pv', o)}${monitor('pg', o)}</div>`
}
function outTabs() {
  return `<div class="otabs">${OUTS.map((o) => { const p = S.outOnline[o.id] ? pendingCount(o.id) : 0
    return `<button class="otab ${o.id === S.outSel ? 'on' : ''}" data-act="out" data-o="${o.id}"><i class="led ${S.outOnline[o.id] ? 'on' : ''}"></i>${o.name}${p ? `<span class="p">${p}</span>` : ''}</button>` }).join('')}<span class="sp"></span><button class="otab" data-act="say" data-m="Multiview opens in a new tab in the real app">Multiview ↗</button></div>`
}
function logPanel() {
  const rows = S.log.map((e) => `<div class="lg"><span class="dim mono">${new Date(e.t).toLocaleTimeString([], { hour12: false })}</span><span class="pill ${e.mode}">${e.mode.toUpperCase()}</span><b>${esc(e.label)}</b><span class="dim">→ ${e.outs.join(', ')}</span></div>`).join('') || '<div class="dim" style="padding:12px">Nothing taken yet this session.</div>'
  return `<section class="panel logp"><div class="ph"><span class="lab">Recent takes</span></div><div class="grow" style="overflow:hidden">${rows}</div></section>`
}

/* ── small controls ── */
/** One option button in a segmented control. `live` = this value is what is on air for the selected output. */
function opt(act, key, val, label, cur, extra = '') {
  const live = S.program[S.outSel]?.layers?.[key] === val
  return `<button class="${cur === val ? 'sel' : ''} ${live ? 'livedot' : ''}" data-act="${act}" data-k="${key}" data-v="${val}" ${extra}>${label}</button>`
}
function tgl(act, key, label, on, live) {
  return `<button class="tgl ${on ? 'on' : ''} ${live ? 'livedot' : ''}" data-act="${act}" data-k="${key}" aria-pressed="${on}"><span class="tt"><b>${label}</b></span><span class="sw"></span></button>`
}
/** Scene-specific options for the selected output's Preview. Returns [] when the scene has none. */
function sceneOptions(compact) {
  const l = S.layers[S.outSel], o = out(S.outSel), pg = S.program[S.outSel]?.layers ?? blank(), rows = []
  if (l.scene === 'lineup') { const seg = `<div class="seg">${[0, 1, 2, 3, 4].map((n) => `<button class="${(l.reveal ?? 4) === n ? 'sel' : ''} ${(pg.reveal ?? 4) === n && pg.scene === 'lineup' ? 'livedot' : ''}" data-act="layer" data-k="reveal" data-v="${n}">${n === 4 ? 'All' : n === 0 ? 'None' : 'P1' + (n > 1 ? '–' + n : '')}</button>`).join('')}</div>`, nx = '<button class="btn" data-act="reveal-next">Next player ▸</button>'
    rows.push(['Reveal', compact ? `<div class="two" style="grid-template-columns:2.2fr 1fr">${seg}${nx}</div>` : `${seg}<div style="margin-top:8px">${nx}</div>`]) }
  if (l.scene === 'raceWin' || l.scene === 'cupWin') { const seg = `<div class="seg">${['full', 'hero', 'board'].map((p) => opt('layer', 'part', p, p[0].toUpperCase() + p.slice(1), l.part)).join('')}</div>`, m = '<div class="field">Active match<span class="car">▾</span></div>', sp = '<button class="btn" data-act="say" data-m="Split: hero on this output, scoreboard on another">Split outputs</button>'
    rows.push(['Part', compact ? `<div class="two" style="grid-template-columns:1.3fr 1fr 1fr">${seg}${m}${sp}</div>` : `${seg}<div class="grid2" style="margin-top:8px">${m}${sp}</div>`]) }
  if (l.scene === 'notice') rows.push(['Notice', tgl('layerflip', 'qr', 'Show QR codes', l.qr, pg.qr && pg.scene === 'notice')])
  if (l.scene === 'qr' && o.kind !== 'twin') rows.push(['Layout', `<div class="seg">${[['center', 'Centre'], ['title', 'Title + QR'], ['sides', 'Sides']].filter((x) => o.kind === 'wide' || x[0] !== 'sides').map(([v, t]) => opt('layer', 'qrStyle', v, t, l.qrStyle)).join('')}</div>`])
  if (l.scene === 'title') rows.push(['Logo', `<div class="seg">${[['off', 'Off'], ['corner', 'Corner'], ['title', 'In title']].map(([v, t]) => opt('layer', 'logo', v, t, l.logo)).join('')}</div>`])
  return rows
}
const BGS = [['A', 'A · Sky'], ['B', 'B · Icons'], ['C', 'C · Stickers'], ['none', 'None']]
const sectionHtml = (title, sum, body) => `<div class="sec"><div class="sh"><span class="lab">${title}</span>${sum ? `<span class="sum">${sum}</span>` : ''}</div>${body}</div>`

/* ── top bar / transport / chrome ── */
const clockText = () => new Date().toLocaleTimeString([], { hour12: false })
function topBar() {
  const items = [['Live', 'live'], ['Show data', 'data'], ['Setup', 'setup']], r = S.race
  return `<div class="top"><div class="ttl">${esc(S.event.title)} ${esc(S.event.accent)}</div><div class="nav">${items.map(([l, v]) => `<button data-act="view" data-v="${v}" class="${S.view === v ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div class="now">Now: <b>Race ${r.index + 1} / 4</b> · ${esc(r.cup)} · ${esc(trackName())}</div>
    <div class="stat">${OUTS.map((o) => `<span><i class="led ${S.outOnline[o.id] ? 'on' : ''}"></i>${o.name}</span>`).join('')}<span>On air <span class="onair" id="onair">${hhmmss(Date.now() - S.onAirSince)}</span></span><span class="clock" id="clock">${clockText()}</span></div></div>`
}
function transport() {
  const chips = OUTS.map((o) => { const on = S.outOnline[o.id], armed = S.armed.includes(o.id), p = on ? pendingCount(o.id) : 0
    return `<button class="oc ${armed ? 'arm' : ''} ${on ? '' : 'off'}" data-act="arm" data-o="${o.id}" aria-pressed="${armed}">${p ? `<span class="p">${p}</span>` : ''}<div class="nn"><i class="led ${on ? 'on' : ''}"></i>${o.name}</div><div class="s">${on ? (armed ? 'armed · ' : '') + o.fmt : 'offline'}</div></button>` }).join('')
  return `<div class="tbar"><div class="tg"><span class="lab">Take to</span><div class="row">${chips}<button class="oc all" data-act="armall">ALL</button></div></div>
    <div class="tg"><span class="lab">Take Preview</span><div class="row"><button class="bb cut" data-act="take" data-m="cut">CUT<small>Enter</small></button><button class="bb auto" data-act="take" data-m="auto">AUTO<small>Space</small></button>
      <div class="seg blue spdseg">${['fast', 'normal', 'slow'].map((s) => `<button class="${S.speed === s ? 'sel' : ''}" data-act="speed" data-s="${s}">${s[0].toUpperCase() + s.slice(1)}</button>`).join('')}</div></div></div>
    <div class="tg emerg"><span class="lab">Emergency</span>
      <button class="bb hold ${S.hold ? 'ison' : ''}" data-act="emerg" data-e="hold" aria-pressed="${S.hold}">HOLD<small>${S.hold ? 'ON · tap to release' : esc(S.event.hold)}</small></button>
      <button class="bb clear" data-act="emerg" data-e="clear">CLEAR<small>graphics off</small></button>
      <button class="bb ftb ${S.ftb ? 'ison' : ''}" data-act="emerg" data-e="ftb" aria-pressed="${S.ftb}">FTB<small>${S.ftb ? 'ON · tap to restore' : 'to black'}</small></button></div></div>`
}
function chrome() {
  return `${S.connected ? '' : '<div class="banner" role="alert">Disconnected — reconnecting… controls are disabled</div>'}${S.toast ? `<div class="toast" role="status"><span>${esc(S.toast.text)}</span>${S.toast.undo ? '<button class="tundo" data-act="undo">Undo</button>' : ''}<button class="tx" data-act="toastx" aria-label="Dismiss">✕</button></div>` : ''}`
}

/* ── Show data workspace ── */
const posSelect = (i) => `<select class="field sel44" data-chg="pos" data-i="${i}">${[1, 2, 3, 4].map((p) => `<option value="${p}" ${S.scores.races[S.race.index]?.[i] === p ? 'selected' : ''}>${p}</option>`).join('')}</select>`
function raceCard() {
  return `<div class="card"><div class="ch"><span class="lab">Race</span><span class="dim" style="margin-left:auto;font-size:12px">${esc(S.race.cup)}</span></div><div style="padding:12px;display:grid;gap:10px">
    <div class="field">${esc(trackName())}<span class="car">▾</span></div>
    <div class="racepick"><button class="btn sm" data-act="raceidx" data-d="-1" aria-label="Previous race">◀</button>${[0, 1, 2, 3].map((n) => `<button class="btn sm ${n === S.race.index ? 'acc' : ''}" style="opacity:${n < S.race.index ? .55 : 1}" data-act="raceidx" data-i="${n}">${n + 1}</button>`).join('')}<button class="btn sm" data-act="raceidx" data-d="1" aria-label="Next race">▶</button></div></div></div>`
}
function playersCard() {
  return `<div class="card"><div class="ch"><span class="lab">Players</span></div>${S.players.map((p, i) => `<div class="prow"><span class="n" style="background:${PCOL[i]}">P${i + 1}</span><input class="field inp" data-in="pn${i}" value="${esc(p.name)}" maxlength="14" aria-label="Player ${i + 1} name"><select class="field sel44" data-chg="pchar" data-i="${i}">${CHARS.map((c) => `<option ${c === p.char ? 'selected' : ''}>${c}</option>`).join('')}</select><span class="sw8" style="background:${PCOL[i]}"></span></div>`).join('')}</div>`
}
function resultsCard() {
  const t = totals()
  return `<div class="card flush"><div class="ch"><span class="lab">Results · Race ${S.race.index + 1}</span></div><table class="res"><tr><th>PLAYER</th><th>POS</th><th>+/−</th><th>TOTAL</th></tr>
    ${S.players.map((p, i) => `<tr><td><i class="pc" style="background:${PCOL[i]}"></i>${esc(p.name)}</td><td>${posSelect(i)}</td><td><input class="field inp adj" type="number" data-in="adj${i}" value="${S.scores.adj[i] || 0}" aria-label="Adjustment ${esc(p.name)}"></td><td class="num">${t[i]}</td></tr>`).join('')}</table>
    <div style="padding:12px;display:grid;gap:8px"><button class="btn acc" data-act="confirmres">Confirm results &amp; show standings →</button><span class="dim" style="font-size:12px">Loads the Standings look into Preview. Nothing goes to air.</span></div></div>`
}
function tournamentCard() {
  return `<div class="card flush"><div class="ch"><span class="lab">Matches</span><button class="btn sm" style="margin-left:auto" data-act="nextmatch">Next match ▸</button></div>${S.tour.matches.map((m, i) => `<button class="mrow ${i === S.tour.active ? 'act' : ''}" data-act="tmatch" data-i="${i}"><span>${esc(m.label)}</span><span class="pill ${i < S.tour.active ? '' : i === S.tour.active ? 'auto' : 'none'}">${i < S.tour.active ? 'DONE' : i === S.tour.active ? 'ACTIVE' : 'NEXT'}</span></button>`).join('')}</div>`
}

/* ── Setup workspace ── */
function setupView() {
  const nav = ['Outputs', 'Text & fonts', 'Show file']
  let body = ''
  if (S.snav === 'Outputs') {
    body = `<div class="ph"><span class="lab">Outputs</span><span class="dim" style="font-size:12px;margin-left:8px">Where graphics are sent. Monitors and the transport stay visible on Live.</span></div><table class="otbl"><tr><th>Output</th><th>Canvas</th><th>Status</th><th>Page</th><th></th></tr>${OUTS.map((o) => `<tr><td><i class="led ${S.outOnline[o.id] ? 'on' : ''}"></i> <b style="color:#fff">${o.name}</b></td><td class="dim">${o.fmt}</td><td><button class="btn sm" data-act="online" data-o="${o.id}">${S.outOnline[o.id] ? 'Connected' : 'Offline'} · simulate</button></td><td><code>/out/${o.id}</code></td><td><button class="btn sm" data-act="say" data-m="Copied /out/${o.id}">Copy</button> <button class="btn sm" data-act="say" data-m="Fill / key URLs copied">Fill / key URLs</button></td></tr>`).join('')}</table>`
  } else if (S.snav === 'Text & fonts') {
    body = `<div class="ph"><span class="lab">Text &amp; fonts</span></div><div class="setf"><label>Event title<input class="field inp" data-in="title" value="${esc(S.event.title)}" maxlength="24"></label><label>Accent<input class="field inp" data-in="accent" value="${esc(S.event.accent)}" maxlength="24"></label><label>HOLD message<input class="field inp" data-in="hold" value="${esc(S.event.hold)}" maxlength="28"></label>
      <label>Heading font<div class="field">Luckiest Guy<span class="car">▾</span></div></label><button class="tgl ${S.mattify ? 'on' : ''}" data-act="mattify" style="max-width:360px"><span class="tt"><b>Mattify</b><small>Matte icon background</small></span><span class="sw"></span></button></div>`
  } else {
    body = `<div class="ph"><span class="lab">Show file</span></div><div class="setf"><div class="dim">Export or import looks, rundowns, tournaments and settings.</div><div class="row" style="display:flex;gap:10px"><button class="btn" data-act="say" data-m="Prototype: export is not wired">Export show…</button><button class="btn" data-act="say" data-m="Prototype: import is not wired">Import show…</button></div>
      <hr style="border:0;border-top:1px solid var(--ui-line);width:100%"><div class="dim">Prototype only: clear everything stored in this browser and start over.</div><button class="btn danger" style="max-width:240px" data-act="reset">Reset demo</button></div>`
  }
  return `<div class="main setupwrap"><div class="setup"><section class="panel"><div class="ph"><span class="lab">Setup</span></div><div class="snav">${nav.map((n) => `<button data-act="snav" data-n="${n}" class="${S.snav === n ? 'on' : ''}">${n}</button>`).join('')}</div></section><section class="panel">${body}</section></div></div>`
}
