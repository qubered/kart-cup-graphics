'use strict'
/* Layout A — Rundown-first: rundown rail (left) · monitors + Looks library (centre) · this screen's scenes and their options (right). */

const takeLbl = (t) => (t === 'cut' ? 'CUT' : t === 'auto' ? 'AUTO' : 'RECALL')
const AFTERS = [['', 'Nothing'], ['nextRace', 'Then next race'], ['nextMatch', 'Then next match'], ['resetStack', 'Then reset rundown']]
const afterText = (a) => (AFTERS.find((x) => x[0] === (a || '')) ?? AFTERS[0])[1]
function scopeSummary(s) {
  const g = groupsFromScope(s), on = GROUPS.filter((x) => g[x.key]).map((x) => x.label.toLowerCase())
  const extra = SCOPE8.filter(([k]) => s[k] && !GROUPS.some((x) => g[x.key] && x.keys.includes(k))).length
  return (on.join(' + ') || 'nothing') + (extra ? ' (custom)' : '')
}
const cueStatus = (r, i) => (i === r.pgm ? 'pgm' : i === r.pvw ? 'pvw' : i < r.pgm ? 'done' : '')
const tag = (r, i) => (i === r.pgm ? '<span class="tag pgm">ON AIR</span>' : i === r.pvw ? '<span class="tag pvw">NEXT</span>' : '')

/* ── rundown rail ── */
function rdMenu() {
  const r = R()
  return `<div class="rdmenu">${S.rundowns.map((x) => `<button class="rdi ${x.id === r.id ? 'on' : ''}" data-act="rdpick" data-id="${x.id}"><span>${esc(x.name)}</span><span class="dim">${x.cues.length} cues</span></button>`).join('')}
    <div class="rdact"><button class="btn sm" data-act="rdnew">＋ New</button>${S.rdRename != null ? `<input class="field inp" data-in="rdname" value="${esc(S.rdRename)}" maxlength="30"><button class="btn sm acc" data-act="rdrenamego">Save</button>` : '<button class="btn sm" data-act="rdrename">Rename</button>'}<button class="btn sm danger" data-act="rddel" ${S.rundowns.length < 2 ? 'disabled' : ''}>${S.confirm === 'rddel' ? 'Tap again' : 'Delete'}</button></div></div>`
}
function cueEditor(r, c, i) {
  const look = lookById(c.lookId), used = usedBy(c.lookId), eff = cueEffScope(look, c)
  return `<div class="ceditor">
    <div class="r"><span>Look</span><select class="field sel44" data-chg="cuelook" data-i="${i}">${S.looks.map((l) => `<option value="${l.id}" ${l.id === c.lookId ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select></div>
    ${used > 1 ? `<div class="warn"><span>⚠ Used by ${used} cues</span><button class="btn sm" style="margin-left:auto" data-act="unique" data-i="${i}">Make unique</button></div>` : '<div class="warn dim" style="color:var(--ui-muted)"><span>Only this cue uses this look</span></div>'}
    <div class="r"><span>Take</span><div class="seg blue">${[['cut', 'Cut'], ['auto', 'Auto'], ['none', 'Recall only']].map(([v, t]) => `<button class="${(c.take ?? 'none') === v ? 'sel' : ''}" data-act="cuetake" data-i="${i}" data-t="${v}">${t}</button>`).join('')}</div></div>
    <div class="r"><span>After</span><select class="field sel44" data-chg="cueafter" data-i="${i}">${AFTERS.map(([v, t]) => `<option value="${v}" ${(c.after || '') === v ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
    <div class="r"><span>Recalls</span><button class="field recallb" data-act="advcue" data-i="${i}"><span>${scopeSummary(eff)}</span><span class="car">Customise ${S.advCue === i ? '▴' : '›'}</span></button></div>
    ${S.advCue === i ? `<div class="advgrid">${SCOPE8.map(([k, t]) => { const own = c.scope?.[k], on = own ?? look?.scope8[k]
      return `<button class="chipx ${on ? 'on' : ''} ${own !== undefined ? 'forced' : ''}" data-act="cuescope" data-i="${i}" data-k="${k}" title="${own === undefined ? 'Inherits the look. Tap to force on.' : 'Forced for this cue. Tap to cycle.'}">${t}${own === undefined ? '' : own ? ' ✓' : ' ✕'}</button>` }).join('')}</div><div class="dim" style="font-size:11px;margin-left:72px">Tap cycles: inherit the look → force on → force off.</div>` : ''}
  </div>`
}
function rundownRail() {
  const r = R(), n = r.cues.length
  const pos = r.pvw >= 0 ? r.pvw + 1 : Math.max(0, r.pgm + 1)
  const head = `<div class="ph"><button class="btn sm rdbtn" data-act="rdmenu" aria-expanded="${S.rdMenu}"><span class="rdn">${esc(r.name)}</span> <span class="dim">${S.rdMenu ? '▴' : '▾'}</span></button><span class="dim cnt">${pos}/${n}</span>
    <div class="seg s36 modeseg" style="margin-left:auto;width:108px"><button data-act="mode" data-m="run" class="${S.edit ? '' : 'sel'}">Run</button><button data-act="mode" data-m="edit" class="${S.edit ? 'sel e' : ''}">Edit</button></div></div>`
  let rows = ''
  r.cues.forEach((c, i) => {
    const look = lookById(c.lookId), st = cueStatus(r, i), name = esc(look?.name ?? '(missing look)')
    const sub = `${tag(r, i)}${c.after ? `<span class="then">↳ ${afterText(c.after).toLowerCase()}</span>` : ''}`
    if (!S.edit) {
      rows += `<div class="cue ${st}" data-act="selcue" data-i="${i}" role="button" tabindex="0"><span class="bar"></span><span class="n">${i + 1}</span><div style="min-width:0"><div class="nm">${name}</div><div class="sub">${sub}</div></div><div class="rt"><span class="pill ${c.take ?? 'none'}">${takeLbl(c.take)}</span></div></div>`
    } else {
      const open = S.openCue === i
      rows += `<div class="cue ed ${st} ${open ? 'open' : ''}" data-di="${i}" data-act="opencue" data-i="${i}"><span class="grip" data-drag="cue:${i}" aria-label="Drag to reorder"><i></i></span><span class="n">${i + 1}</span><div style="min-width:0"><div class="nm">${name}</div><div class="sub">${sub}</div></div><div class="rt"><span class="pill ${c.take ?? 'none'}">${takeLbl(c.take)}</span><button class="xbtn" data-act="rmcue" data-i="${i}" aria-label="Remove cue ${i + 1}">✕</button></div></div>${open ? cueEditor(r, c, i) : ''}`
    }
  })
  if (!n) rows = `<div class="empty"><b>No cues yet</b><span>${S.edit ? 'Set up Preview how you want it, then tap “Add cue from Preview”.' : 'Switch to Edit to build this rundown.'}</span></div>`
  const stby = r.pvw >= 0 ? r.cues[r.pvw] : null
  const foot = !S.edit
    ? `<div class="gofoot"><button class="go ${stby ? '' : 'off'}" data-act="go" ${stby ? '' : 'disabled'}><span class="gl">GO</span><span class="gt"><small>${stby ? `Fires cue ${r.pvw + 1} · ${takeLbl(stby.take)}` : 'End of rundown'}</small><b>${stby ? esc(lookById(stby.lookId)?.name ?? '') : 'Rewind to start again'}</b></span><kbd>G</kbd></button>
        <div class="gnav"><button class="btn sm" data-act="back">◀ Back</button><button class="btn sm" data-act="skip">Skip ▶</button><button class="btn sm" data-act="rewind">Rewind</button></div></div>`
    : `<div class="gofoot"><button class="btn ghost addprev" data-act="addprev"><span>＋ Add cue from Preview</span><span class="dim sm">${esc(lookById(S.loadedLookId)?.name ?? 'New look')}${isModified() ? ' · modified' : ''} → saved as a new look</span></button>
        <div class="dim sm" style="text-align:center">Add from the Looks library: tap ＋ on a look, or drag its grip onto this list</div><button class="btn sm" data-act="rdnew">＋ New rundown</button>
        <button class="go off" style="height:46px" disabled><span class="gl" style="font-size:20px">GO</span><span class="gt"><small>Locked while editing</small></span></button></div>`
  return `<section class="panel">${head}${S.rdMenu ? rdMenu() : ''}${S.edit ? '<div class="editbar">EDITING — GO is locked. Switch to Run to fire cues.</div>' : ''}<div class="grow rdlist" data-drop="rundown" style="overflow:auto;position:relative">${rows}</div>${foot}</section>`
}

/* ── centre: monitors, then the Looks library (saved presets) ── */
const trunc = (s, n = 12) => (s.length > n ? s.slice(0, n) + '…' : s)
function manageBar(l) {
  const n = usedBy(l.id), del = S.confirm === 'del:' + l.id
  return `<div class="ph libh manage"><b class="mname">${S.libRename === l.id ? `<input class="field inp sm" data-in="libren" value="${esc(l.name)}" maxlength="40" aria-label="Look name">` : esc(l.name)}</b><span class="dim sm">${n ? `in ${n} cue${n > 1 ? 's' : ''}` : 'not in a rundown'}</span>
    <span class="mact"><button class="btn sm" data-act="libren" data-id="${l.id}">${S.libRename === l.id ? 'Save name' : 'Rename'}</button><button class="btn sm" data-act="libdup" data-id="${l.id}">Duplicate</button><button class="btn sm" data-act="libadd" data-id="${l.id}">＋ Add as cue</button>
    <button class="btn sm ${del ? 'amberb' : 'danger'}" data-act="libdel" data-id="${l.id}">${del ? `Tap again${n ? ` · ${n} cue${n > 1 ? 's' : ''}` : ''}` : 'Delete'}</button><button class="btn sm acc" data-act="libmenu" data-id="${l.id}">Done</button></span></div>`
}
function libraryPanel() {
  const look = lookById(S.loadedLookId), mod = isModified(), used = look ? usedBy(look.id) : 0
  const f = S.libFilter.trim().toLowerCase(), list = S.looks.filter((l) => l.name.toLowerCase().includes(f)), menuLook = S.libMenu ? lookById(S.libMenu) : null
  const upd = S.confirm === 'upd'
    ? `<button class="btn amberb updb" data-act="upd"><span>Tap again to overwrite<br><small>affects ${used} cue${used === 1 ? '' : 's'}</small></span></button>`
    : `<button class="btn updb" data-act="upd" ${look && mod ? '' : 'disabled'}>Update “${esc(trunc(look?.name ?? '', 10))}”</button>`
  const head = menuLook ? manageBar(menuLook)
    : `<div class="ph libh"><span class="lab">Looks</span><span class="dim cnt">${S.looks.length}</span><input class="field inp sm libf" data-in="libfilter" placeholder="Filter…" value="${esc(S.libFilter)}" aria-label="Filter looks">
      <span class="libst">Preview: <b>${esc(look?.name ?? 'unsaved')}</b> ${mod ? '<span class="tag mod">● MODIFIED</span>' : '<span class="tag pvw">SAVED</span>'}</span>${upd}<button class="btn acc" data-act="saveopen">Save as new…</button></div>`
  const tiles = list.map((l) => { const pvw = l.id === S.loadedLookId, pgm = l.id === S.programLookId, n = usedBy(l.id)
    return `<div class="ltile ${pvw ? 'inpvw' : ''} ${pgm ? 'airtile' : ''} ${S.libMenu === l.id ? 'managing' : ''}"><button class="ltb" data-act="loadlook" data-id="${l.id}" aria-label="Load ${esc(l.name)} into Preview">${thumb(l, pgm ? '<span class="tag pgm">ON AIR</span>' : pvw ? '<span class="tag pvw">IN PREVIEW</span>' : '')}<span class="ltn">${esc(l.name)}</span><span class="lsub">${n ? `${n} cue${n > 1 ? 's' : ''}` : 'no cue'}</span></button>
      <span class="gripc" data-drag="look:${l.id}" aria-label="Drag ${esc(l.name)} onto the rundown"><i></i></span><button class="lmore" data-act="libmenu" data-id="${l.id}" aria-label="Manage ${esc(l.name)}">⋯</button>${S.edit ? `<button class="ladd" data-act="libadd" data-id="${l.id}" aria-label="Add ${esc(l.name)} as a cue">＋</button>` : ''}</div>` }).join('')
  return `<section class="panel libp">${head}<div class="grow libgrid">${tiles || '<div class="empty" style="grid-column:1/-1"><b>No looks yet</b><span>Set up Preview with the scene editor, then tap “Save as new…”.</span></div>'}</div></section>`
}
function centreA() {
  const o = out(S.outSel)
  return `<section class="centre">${outTabs()}<div class="pair">${monitor('pv', o)}${monitor('pg', o)}</div>${libraryPanel()}</section>`
}

/* ── right bar: the screen's scenes, then the options for the chosen scene ── */
function sceneEditorA() {
  const o = out(S.outSel), l = S.layers[o.id], pg = S.program[o.id]?.layers ?? blank(), look = lookById(S.loadedLookId), mod = isModified(), so = sceneOptions()
  const scenes = SCENES.map(([id, label]) => `<button class="scb ${l.scene === id ? 'sel' : ''} ${pg.scene === id ? 'livedot' : ''}" data-act="layer" data-k="scene" data-v="${id}" aria-pressed="${l.scene === id}"><span class="sct"><span class="th">${gfx({ ...l, scene: id, bg: id === 'none' ? 'none' : l.bg, track: false, lt: false })}</span></span><span class="scl">${label}</span></button>`).join('')
  return `<section class="panel scenep"><div class="ph"><span class="lab">${esc(o.name)} screen</span><span class="dim" style="font-size:12px">${o.fmt}</span></div>
    <div class="stat3"><span>Based on <b>${esc(look?.name ?? 'nothing yet')}</b></span>${mod ? '<span class="tag mod">● MODIFIED</span>' : '<span class="tag pvw">SAVED</span>'}<button class="btn sm" style="margin-left:auto" data-act="revert" ${look && mod ? '' : 'disabled'}>↺ Revert</button></div>
    <div class="grow" style="overflow:auto">
      ${sectionHtml('Scene', SCENE_NAME[l.scene], `<div class="scgrid2">${scenes}</div>`)}
      ${l.scene === 'none' ? '' : sectionHtml(`${SCENE_NAME[l.scene]} options`, '', so.length ? so.map(([k, h]) => `<div class="optrow"><span class="lab">${k}</span>${h}</div>`).join('') : '<div class="dim" style="font-size:12px">No extra options for this scene.</div>')}
      ${sectionHtml('Background', l.bg === 'none' ? 'None' : 'Pattern ' + l.bg, `<div class="seg bgseg">${BGS.map(([v, t]) => opt('layer', 'bg', v, t.split(' ')[0], l.bg)).join('')}</div>`)}
      ${sectionHtml('Overlays', [l.track && 'Track card', l.lt && 'Lower thirds'].filter(Boolean).join(' · ') || 'none',
        `<div class="grid2">${tgl('layerflip', 'track', 'Track card', l.track, pg.track)}${tgl('layerflip', 'lt', 'Lower thirds', l.lt, pg.lt)}</div>${o.kind !== 'twin' ? `<div class="chips4">${[0, 1, 2, 3].map((i) => `<button class="${l.lt && l.ltp.includes(i) ? 'sel' : ''} ${l.lt ? '' : 'dis'}" data-act="ltp" data-i="${i}">P${i + 1}</button>`).join('')}</div>` : ''}`)}
    </div></section>`
}

function savePanel() {
  const f = S.saveForm, g = groupsFromScope(f.scope8), r = R()
  return `<div class="ph"><button class="btn sm" data-act="savecancel">← Back</button><b style="color:#fff">Save look</b></div>
    <div class="grow" style="overflow:auto"><div class="savef">
      <div><div class="lab" style="margin-bottom:6px">Name</div><input class="field inp big" data-in="savename" value="${esc(f.name)}" maxlength="40" aria-label="Look name"></div>
      <div><div class="lab" style="margin-bottom:6px">Save from</div><div class="seg blue"><button class="${f.from === 'pvw' ? 'sel' : ''}" data-act="savefrom" data-f="pvw">Preview</button><button class="${f.from === 'pgm' ? 'sel' : ''}" data-act="savefrom" data-f="pgm">On air now</button></div></div>
      <div style="display:grid;gap:8px"><div class="lab">Remember when recalled</div>
        ${GROUPS.map((x) => `<button class="tgl ${g[x.key] ? 'on' : ''}" data-act="savegroup" data-g="${x.key}" aria-pressed="${g[x.key]}"><span class="tt"><b>${x.label}</b><small>${x.hint}</small></span><span class="sw"></span></button>`).join('')}
        <button class="linkb" data-act="saveadv">${f.adv ? 'Hide advanced ▴' : 'Advanced: choose from all 8 parts ›'}</button>
        ${f.adv ? `<div class="advgrid">${SCOPE8.map(([k, t]) => `<button class="chipx ${f.scope8[k] ? 'on' : ''}" data-act="savescope" data-k="${k}">${t}</button>`).join('')}</div>` : ''}</div>
      <button class="tgl ${f.addCue ? 'on' : ''}" data-act="saveaddcue" aria-pressed="${f.addCue}"><span class="tt"><b>Also add to “${esc(r.name)}” as cue ${r.cues.length + 1}</b><small>Take: ${takeLbl(f.take === 'none' ? null : f.take).toLowerCase()} · changeable later</small></span><span class="sw"></span></button>
      ${f.addCue ? `<div class="seg blue">${[['cut', 'Cut'], ['auto', 'Auto'], ['none', 'Recall only']].map(([v, t]) => `<button class="${f.take === v ? 'sel' : ''}" data-act="savetake" data-t="${v}">${t}</button>`).join('')}</div>` : ''}
      <div class="row2"><button class="btn" data-act="savecancel">Cancel</button><button class="btn acc" data-act="savego" ${f.name.trim() ? '' : 'disabled'}>Save look</button></div></div></div>`
}
function inspectorA() {
  if (S.saveOpen) return `<section class="panel">${savePanel()}</section>`
  return sceneEditorA()
}

/* ── workspace dispatch (A) ── */
function viewA() {
  if (S.view === 'setup') return setupView()
  if (S.view === 'race') return raceView()
  if (S.view === 'tour') return tourView()
  return `<div class="main">${rundownRail()}${centreA()}${inspectorA()}</div>`
}
