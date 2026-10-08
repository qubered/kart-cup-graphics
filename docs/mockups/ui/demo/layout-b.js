'use strict'
/* Layout B — Look bank: monitors + tweak (left) · bank of look slots (right) · sequence strip (bottom). Bank page = Stream Deck page (5×3 keys). */

const SCENES_QUICK = ['title', 'lineup', 'nextRace', 'standings', 'raceWin', 'cupWin']

function tweakB() {
  const l = S.layers[S.outSel], pg = S.program[S.outSel]?.layers ?? blank(), so = sceneOptions(true), o = out(S.outSel)
  const scenes = S.moreScenes ? SCENES.map((s) => s[0]) : SCENES_QUICK
  const sceneRow = S.moreScenes
    ? `<div class="scgrid">${SCENES.map(([id, t]) => `<button class="${l.scene === id ? 'sel' : ''} ${pg.scene === id ? 'livedot' : ''}" data-act="layer" data-k="scene" data-v="${id}">${t}</button>`).join('')}</div>`
    : `<div class="seg">${scenes.map((id) => `<button class="${l.scene === id ? 'sel' : ''} ${pg.scene === id ? 'livedot' : ''}" data-act="layer" data-k="scene" data-v="${id}">${SCENE_NAME[id]}</button>`).join('')}<button data-act="more">More ▾</button></div>`
  return `<section class="panel tweak"><div class="tr"><span class="lab">Scene</span><div>${sceneRow}${S.moreScenes ? '<button class="linkb" data-act="more">Fewer ▴</button>' : ''}</div></div>
    <div class="tr"><span class="lab">Background</span><div class="two" style="grid-template-columns:1.9fr 1fr 1fr"><div class="seg">${[['A', 'A'], ['B', 'B'], ['C', 'C'], ['none', '—']].map(([v, t]) => opt('layer', 'bg', v, t, l.bg)).join('')}</div>${tgl('layerflip', 'track', 'Track', l.track, pg.track)}${tgl('layerflip', 'lt', 'Lower 3rds', l.lt, pg.lt)}</div></div>
    ${so.map(([k, h]) => `<div class="tr"><span class="lab">${k}</span><div>${h}</div></div>`).join('')}
    ${o.kind !== 'twin' && l.lt ? `<div class="tr"><span class="lab">Players</span><div class="chips4">${[0, 1, 2, 3].map((i) => `<button class="${l.ltp.includes(i) ? 'sel' : ''}" data-act="ltp" data-i="${i}">P${i + 1}</button>`).join('')}</div></div>` : ''}</section>`
}
function cueEditPanelB() {
  const r = R(), i = S.selCue, c = r.cues[i]
  if (!c) return `<section class="panel bank"><div class="ph"><span class="lab">Edit sequence</span></div><div class="empty" style="margin:auto;max-width:420px"><b>Tap a chip below to edit that cue</b><span>Drag a chip’s grip to reorder. Look, take, after and recall scope are edited here. The bank comes back when you switch to Run.</span></div></section>`
  const look = lookById(c.lookId)
  return `<section class="panel bank"><div class="ph"><span class="lab">Cue ${i + 1}</span><b style="color:#fff">${esc(look?.name ?? '')}</b><button class="xbtn" style="margin-left:auto" data-act="rmcue" data-i="${i}" aria-label="Remove cue ${i + 1}">✕</button></div>
    <div class="grow" style="overflow:auto;display:grid;grid-template-columns:320px 1fr;gap:16px;padding:16px;align-content:start"><div class="curthumb">${look ? thumb(look) : ''}</div><div style="max-width:560px">${cueEditor(r, c, i)}</div></div></section>`
}
function leftColB() {
  const o = out(S.outSel)
  return `<div class="lcol">${outTabs()}${monitorsBlock()}${tweakB()}${o.kind !== 'wide' ? logPanel() : ''}</div>`
}

/* ── bank ── */
function slotHtml(id, i) {
  const no = i + 1, look = id && lookById(id)
  if (!look) {
    return S.store
      ? `<button class="slot empty armed" data-act="storeto" data-i="${i}" data-si="${i}"><span class="no">${no}</span><div class="th"><div class="ghostp">${gfx(S.layers.wide)}</div></div><span class="nm">＋ Store Preview here</span></button>`
      : `<div class="slot empty" data-si="${i}"><span class="no">${no}</span><div class="th">empty</div><span class="nm">—</span></div>`
  }
  const st = id === S.programLookId ? 'pgm' : id === S.loadedLookId ? 'pvw' : '', conf = S.confirm === 'store:' + i, n = usedBy(id)
  const act = S.store ? 'storeto' : S.bankEdit ? 'slotmenu' : 'loadslot'
  const menu = S.bankEdit && S.slotMenu === i
  return `<div class="slot filled ${st} ${S.store ? 'armed' : ''} ${conf ? 'confirm' : ''} ${S.bankEdit ? 'editing' : ''}" data-si="${i}"><span class="no">${no}</span>${st === 'pgm' ? '<span class="tag pgm">ON AIR</span>' : st === 'pvw' ? '<span class="tag pvw">PVW</span>' : ''}
    <button class="sthumb" data-act="${act}" data-i="${i}" aria-label="${esc(look.name)}">${thumb(look, conf ? `<div class="ov"><span>Tap again to overwrite<small>“${esc(look.name)}” · ${n} cue${n === 1 ? '' : 's'}</small></span></div>` : '')}</button>
    ${menu ? `<div class="smenu"><button class="btn sm" data-act="slotren" data-i="${i}">${S.libRename === id ? 'Save name' : 'Rename'}</button><button class="btn sm" data-act="slotclear" data-i="${i}">Clear slot</button><button class="btn sm ${S.confirm === 'del:' + id ? 'amberb' : 'danger'}" data-act="libdel" data-id="${id}">${S.confirm === 'del:' + id ? 'Tap again' : 'Delete look'}</button><button class="btn sm" data-act="slotmenu" data-i="${i}">Done</button></div>` : ''}
    <div class="nmrow">${S.libRename === id && menu ? `<input class="field inp sm" data-in="libren" value="${esc(look.name)}" maxlength="40">` : `<span class="nm">${esc(look.name)}</span>`}${S.bankEdit ? `<span class="gripx" data-drag="slot:${i}" aria-label="Drag to move or add to the sequence"><i></i></span>` : ''}</div></div>`
}
function bankB() {
  const pgs = S.bank.pages, pg = pgs[S.bank.page]
  const tabs = pgs.map((p, i) => `<button class="pgtab ${i === S.bank.page ? 'on' : ''}" data-act="page" data-i="${i}">${esc(p.name)}<span class="ct">${p.slots.filter(Boolean).length}</span></button>`).join('')
  return `<section class="panel bank"><div class="bh">${tabs}<button class="pgtab" style="padding:0 12px" data-act="pagenew" aria-label="Add page">＋</button>
      <button class="btn sm ${S.bankEdit ? 'amberon' : ''}" style="margin-left:auto" data-act="bankedit" aria-pressed="${S.bankEdit}">${S.bankEdit ? 'Done editing' : 'Edit bank'}</button><button class="store ${S.store ? 'on' : ''}" style="margin-left:8px" data-act="store" aria-pressed="${S.store}">${S.store ? '● STORING' : 'STORE'}</button></div>
    ${S.store ? '<div class="storebar">STORE — tap an empty slot to save Preview there · tap a filled slot twice to overwrite it · Esc to cancel</div>' : ''}
    ${S.bankEdit ? '<div class="storebar" style="background:#1f2a3d;color:#bfdbfe;border-color:#2f4467">EDIT BANK — drag the grip to move or swap slots, or drop it on the sequence to add a cue. Loads are locked.</div>' : ''}
    <div class="slots" data-drop="bank">${pg.slots.map((id, i) => slotHtml(id, i)).join('')}</div>
    <div class="deckhint"><i class="deckdot"></i>Companion page ${S.bank.page + 1} · maps to Stream Deck keys 1–15 · key colours match the screen<button class="linkb" data-act="deck">Show deck ›</button></div></section>`
}

/* ── sequence strip ── */
function seqB() {
  const r = R(), n = r.cues.length, stby = r.pvw >= 0 ? r.cues[r.pvw] : null
  const chips = r.cues.map((c, i) => { const look = lookById(c.lookId), st = cueStatus(r, i)
    return `<div class="chip ${st} ${S.seqEdit && S.selCue === i ? 'editing' : ''}" data-di="${i}" data-act="${S.seqEdit ? 'chipedit' : 'selcue'}" data-i="${i}" role="button" tabindex="0"><span class="no">${i + 1}</span>${st === 'pgm' ? '<span class="tag pgm tg2">ON AIR</span>' : st === 'pvw' ? '<span class="tag pvw tg2">NEXT</span>' : ''}
      <div class="th">${look ? gfx(look.layers.wide) : ''}<span class="pill ${c.take ?? 'none'}">${takeLbl(c.take)}</span>${c.after ? '<span class="then tag" style="color:#fbbf24;background:rgba(0,0,0,.7)">↳ ' + afterText(c.after).replace('Then ', '') + '</span>' : ''}</div>
      <span class="nm">${esc(look?.name ?? '?')}</span>${S.seqEdit ? `<span class="gripx top" data-drag="cue:${i}" aria-label="Drag to reorder"><i></i></span>` : ''}</div>` }).join('')
  const menu = S.rdMenu ? `<div class="rdrow">${S.rundowns.map((x) => `<button class="btn sm ${x.id === r.id ? 'acc' : ''}" data-act="rdpick" data-id="${x.id}">${esc(x.name)} · ${x.cues.length}</button>`).join('')}<button class="btn sm" data-act="rdnew">＋ New</button>${S.rdRename != null ? `<input class="field inp sm" data-in="rdname" value="${esc(S.rdRename)}" maxlength="30"><button class="btn sm acc" data-act="rdrenamego">Save</button>` : '<button class="btn sm" data-act="rdrename">Rename</button>'}<button class="btn sm danger" data-act="rddel" ${S.rundowns.length < 2 ? 'disabled' : ''}>${S.confirm === 'rddel' ? 'Tap again' : 'Delete'}</button></div>` : ''
  return `<section class="panel seqp"><div class="sqh"><span class="lab">Sequence</span><button class="btn sm rdbtn" style="height:34px;padding:0 10px" data-act="rdmenu">${esc(r.name)} <span class="dim">${S.rdMenu ? '▴' : '▾'}</span></button><span class="dim" style="font-size:12px">${r.pvw >= 0 ? r.pvw + 1 : Math.max(0, r.pgm + 1)} / ${n}${S.seqEdit ? ' · EDITING — GO is locked' : ' · tap a chip to set Next'}</span>
      <button class="btn sm" style="margin-left:auto;height:34px;border-color:var(--ui-accent);color:#bfdbfe" data-act="addprev">＋ Add Preview as cue</button>
      <button class="rec ${S.rec ? 'on' : ''}" data-act="rec" aria-pressed="${S.rec}"><i class="led" style="background:#ef4444"></i>${S.rec ? 'RECORDING — tap looks in order' : 'REC'}</button>
      <div class="seg s36 modeseg" style="width:112px"><button data-act="seqmode" data-m="run" class="${S.seqEdit ? '' : 'sel'}">Run</button><button data-act="seqmode" data-m="edit" class="${S.seqEdit ? 'sel e' : ''}">Edit</button></div></div>
    <div class="sqb">${menu || `<div class="chips" data-drop="seq">${chips || '<div class="empty" style="flex:1"><b>Empty sequence</b><span>Tap REC and tap looks in order, or “Add Preview as cue”.</span></div>'}</div>`}
      <div class="gob"><button class="go ${stby && !S.seqEdit ? '' : 'off'}" data-act="go" ${stby && !S.seqEdit ? '' : 'disabled'}><span class="gl">GO</span><span class="gt"><small>${S.seqEdit ? 'Locked while editing' : stby ? `cue ${r.pvw + 1} · ${takeLbl(stby.take)}` : 'End of sequence'}</small><b>${stby && !S.seqEdit ? esc(lookById(stby.lookId)?.name ?? '') : ''}</b></span></button>
        <div class="nav2"><button class="btn" data-act="back">◀ Back</button><button class="btn" data-act="skip">Skip ▶</button><button class="btn" data-act="rewind">Rewind</button></div></div></div></section>`
}

function viewB() {
  if (S.view === 'setup') return setupView()
  if (S.view === 'race') return raceView()
  if (S.view === 'tour') return tourView()
  return `<div class="mainb">${leftColB()}${S.seqEdit ? cueEditPanelB() : bankB()}${seqB()}</div>`
}
