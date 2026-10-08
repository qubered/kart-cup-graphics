'use strict'
/* Race (live race and map, players, scoreboard) and Tournament (set it up). Shared by layouts A and B. */

/* ───────────────────────── Race: the live race and its map, the players, the scoreboard ───────────────────────── */
const dots = (m) => `<span class="rdots">${Array.from({ length: m.race.count }, (_, i) => `<i class="${rowDone(m.scores.races[i]) ? 'done' : ''} ${i === m.race.index ? 'cur' : ''}"></i>`).join('')}</span>`
const trackHue = (name) => [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)
const trackThumb = (name) => `background:linear-gradient(135deg,hsl(${trackHue(name)} 70% 48%),hsl(${(trackHue(name) + 55) % 360} 65% 26%))`

function racePanel() {
  const m = activeMatch(), t = activeTournament(), idx = m.race.index
  const tiles = Array.from({ length: m.race.count }, (_, i) => { const name = trackOf(m, i), done = rowDone(m.scores.races[i]), part = !!m.scores.races[i] && !done
    return `<button class="rtile ${i === idx ? 'cur' : ''} ${done ? 'done' : ''}" data-act="setrace" data-i="${i}" aria-pressed="${i === idx}"><span class="rno">${done ? '✓' : i + 1}</span><span class="rth" style="${trackThumb(name)}"></span><span class="rnm"><b>${esc(name)}</b><small>${i === idx ? 'Live race' : done ? 'Complete' : part ? 'In progress' : 'Not started'}</small></span></button>` }).join('')
  const groups = Object.entries(CUPS).map(([cup, tr]) => `<optgroup label="${esc(cup)}">${tr.map((n) => `<option ${n === trackOf(m) ? 'selected' : ''}>${esc(n)}</option>`).join('')}</optgroup>`).join('')
  const over = !!m.race.tracks?.[idx]
  const ctx = t ? `<span><small>LIVE MATCH</small><b>${esc(m.label)}</b></span><span class="dim">${esc(m.race.cup)}</span><button class="linkb" data-act="gotour" data-p="overview">Change ›</button>`
    : `<span><small>NO TOURNAMENT</small><b>Free play</b></span><span class="dim">${esc(m.race.cup)}</span><button class="linkb" data-act="gotour" data-p="lib">Tournaments ›</button>`
  return `<section class="panel racep"><div class="ph"><span class="lab">Live race</span></div><div class="ctxbar">${ctx}</div>
    <div class="grow rtiles" style="overflow:auto">${tiles}</div>
    <div class="mapsel"><label><span class="lab">Map for race ${idx + 1}</span><select class="field sel44" data-chg="mapsel" data-i="${idx}" aria-label="Map for race ${idx + 1}">${groups}</select></label>
      ${over ? `<button class="linkb" data-act="mapreset" data-i="${idx}">Back to cup order</button>` : '<span class="dim sm">Follows the cup order. Pick another map if this race is played elsewhere.</span>'}</div></section>`
}

function playersPad() {
  const m = activeMatch(), idx = m.race.index, row = m.scores.races[idx] ?? [0, 0, 0, 0]
  const done = rowDone(m.scores.races[idx]), complete = isComplete(m), last = idx >= m.race.count - 1, placed = row.filter(Boolean).length
  const taken = (pl) => row.indexOf(pl)
  const rows = m.players.map((p, i) => `<div class="prowp"><div class="who"><i class="pcb" style="background:${PCOL[i]}">P${i + 1}</i><span class="whoedit"><input class="field inp sm" data-in="pfree:${i}" value="${esc(p.name)}" maxlength="14" aria-label="Player ${i + 1} name"><select class="field" data-chg="pchar2" data-id="${m.id}" data-i="${i}" aria-label="Player ${i + 1} character">${CHARS.map((c) => `<option ${c === p.char ? 'selected' : ''}>${c}</option>`).join('')}</select></span></div>
      <div class="places" role="radiogroup" aria-label="${esc(p.name)} finishing place">${[1, 2, 3, 4].map((pl) => { const by = taken(pl), mine = by === i
        return `<button class="place ${mine ? 'sel' : ''} ${by >= 0 && !mine ? 'taken' : ''}" role="radio" aria-checked="${mine}" data-act="place" data-s="${i}" data-p="${pl}"><b>${ORD[pl - 1]}</b><small>+${POINTS[pl - 1]}</small>${by >= 0 && !mine ? `<i class="by" style="background:${PCOL[by]}"></i>` : ''}</button>` }).join('')}</div>
      <div class="rpts">${row[i] ? '+' + POINTS[row[i] - 1] : '—'}</div>
      <div class="radj" aria-label="Adjustment ${esc(p.name)}"><button data-act="adj" data-s="${i}" data-d="-1" aria-label="Minus one point">−</button><b class="${m.scores.adj[i] ? 'nz' : ''}">${m.scores.adj[i] > 0 ? '+' : ''}${m.scores.adj[i] || 0}</b><button data-act="adj" data-s="${i}" data-d="1" aria-label="Plus one point">+</button></div></div>`).join('')
  let foot
  if (done) foot = `<div class="padmsg ok">Race ${idx + 1} is complete</div><div class="acts"><button class="btn" data-act="clearrace">↺ Clear race</button>${last ? '<button class="btn big" disabled>That was the last race</button>' : `<button class="btn acc big" data-act="nextrace">Next race ▶ <small>${esc(trackOf(m, idx + 1))}</small></button>`}</div>`
  else foot = `<div class="padmsg">${placed ? `${placed} of 4 placed. Tap a place for each remaining player.` : 'Tap each player’s finishing place. Tap a taken place to move it.'}</div><div class="acts"><button class="btn" data-act="clearrace" ${placed ? '' : 'disabled'}>↺ Clear race</button><button class="btn big" disabled>${last ? 'Complete the race to finish the match' : 'Complete the race to continue'}</button></div>`
  return `<section class="panel padp"><div class="ph"><span class="lab">Players &amp; result</span><b style="color:#fff">Race ${idx + 1}</b><span class="dim">· ${esc(trackOf(m))}</span></div>
    <div class="prowp hdr"><span style="text-align:left;padding-left:44px">PLAYER</span><div class="places hdrp">${ORD.map((o) => `<span>${o}</span>`).join('')}</div><span>RACE</span><span>ADJUST</span></div>
    <div class="grow padrows">${rows}</div><div class="padfoot">${foot}</div></section>`
}

function scoreboardPanel() {
  const m = activeMatch(), t = activeTournament(), st = standingOf(m), n = recordedCount(m), complete = isComplete(m), ws = winnerSlot(m)
  const rows = st.map((s, k) => { const adj = m.scores.adj[s.i] || 0
    return `<div class="sbrow ${k === 0 && n ? 'lead' : ''}"><span class="rkn">${k + 1}</span><i class="pcb sm" style="background:${PCOL[s.i]}">P${s.i + 1}</i><b class="sbn">${esc(s.name)}</b>
      <span class="sbr">${Array.from({ length: m.race.count }, (_, r) => { const row = m.scores.races[r]; const pt = row && row[s.i] ? POINTS[row[s.i] - 1] : null; return `<i class="${r === m.race.index ? 'cur' : ''} ${pt == null ? 'none' : ''}">${pt ?? '·'}</i>` }).join('')}</span>
      <span class="sba ${adj ? 'nz' : ''}">${adj ? (adj > 0 ? '+' : '') + adj : ''}</span><span class="sbt">${s.t}</span></div>` }).join('')
  const nx = t ? t.matches[t.matches.findIndex((x) => x.id === m.id) + 1] : null
  const gap = n && st[1] ? st[0].t - st[1].t : 0, tie = n > 0 && st[1] && st[0].t === st[1].t
  const status = complete
    ? `<div class="wincard"><div><span class="lab">${esc(m.label)} winner</span><b>${esc(m.players[ws].name)}</b><small>${totalsOf(m)[ws]} pts${m.winnerOverride != null ? ' · set by hand' : tie ? ' · tie broken by the last race' : ''}</small></div>${nx ? `<button class="btn acc big" data-act="nextmatch">Next match ▶ <small>${esc(nx.label)}</small></button>` : '<span class="dim sm">That was the last match.</span>'}</div>`
    : `<div class="sbnote">${n ? `${esc(st[0].name)} leads${gap ? ` by ${gap} pt${gap === 1 ? '' : 's'}` : ' (level)'} after ${n} of ${m.race.count} race${m.race.count === 1 ? '' : 's'}.` : 'No race recorded yet.'}</div>`
  return `<section class="panel sbp"><div class="ph"><span class="lab">Scoreboard</span><span class="dim" style="font-size:12px">${n} of ${m.race.count} races</span></div>
    <div class="sbrow hdr"><span></span><span></span><span class="sbn">PLAYER</span><span class="sbr">${Array.from({ length: m.race.count }, (_, r) => `<i>R${r + 1}</i>`).join('')}</span><span class="sba">ADJ</span><span class="sbt">TOTAL</span></div>
    <div class="grow">${rows}</div><div class="sbfoot">${status}<div class="dim sm" style="margin-top:8px">This is the table the Standings and race-win graphics read.</div></div></section>`
}
function raceView() { return `<div class="racegrid">${racePanel()}${playersPad()}${scoreboardPanel()}</div>` }

/* ───────────────────────── Tournament (set-up): outline on the left, one focused page on the right ───────────────────────── */
const cupSel = (m) => `<select class="field sel44" data-chg="mcup" data-id="${m.id}" aria-label="Cup">${Object.keys(CUPS).map((c) => `<option ${c === m.race.cup ? 'selected' : ''}>${c}</option>`).join('')}</select>`
const roundWarn = (v, r) => v.issues.filter((x) => x.page === 'round:' + r).length

function tourRail(t, v) {
  if (!t) return `<section class="panel stepnav"><div class="ph"><span class="lab">Tournament</span></div><div class="steps"><button class="step on" data-act="tpage" data-p="lib"><span class="stx"><b>Tournaments</b><small>Create or load one to begin</small></span></button></div></section>`
  const item = (page, title, sub, badge, extra = '') => `<button class="step ${S.tpage === page ? 'on' : ''}" data-act="tpage" data-p="${page}"><span class="stx"><b>${title}</b><small>${sub}</small>${extra}</span>${badge}</button>`
  const ok = '<i class="sb ok">✓</i>', warn = (n) => `<i class="sb warn">${n}</i>`
  const rs = rounds(t)
  const rounds_ = rs.map((r) => { const ms = t.matches.filter((x) => x.round === r), done = ms.filter((x) => matchStatus(t, x) === 'done').length, w = roundWarn(v, r), live = ms.some((x) => x.id === t.activeMatchId)
    return item('round:' + r, `${esc(roundName(t, r))}${live ? ' <em class="live">LIVE</em>' : ''}`, `${ms.length} match${ms.length === 1 ? '' : 'es'} · ${done} done`, w ? warn(w) : ok,
      `<span class="rdots2">${ms.map((x) => `<i class="${matchStatus(t, x)}"></i>`).join('')}</span>`) }).join('')
  return `<section class="panel stepnav"><div class="ph"><span class="lab">Tournament</span></div>
    <button class="tsw" data-act="tpage" data-p="lib"><span><small>Loaded</small><b>${esc(t.name)}</b></span><span class="dim">All ›</span></button>
    <div class="steps">${item('overview', 'Overview', v.review.ok ? 'Ready to run' : `${v.review.warn} thing${v.review.warn === 1 ? '' : 's'} to fix`, v.review.ok ? ok : warn(v.review.warn))}
      <div class="grp">ROUNDS</div>${rounds_}<button class="step addr" data-act="addround"><span class="stx"><b>＋ Add round</b></span></button>
      <div class="grp">SCENES</div>${item('graphics', 'Graphics', 'Win screen, matches, bracket', '')}</div></section>`
}

function pageLib() {
  const nf = S.tnew
  const form = nf ? `<div class="newt"><div class="lab">New tournament</div><div class="nrow"><input class="field inp" data-in="tnewname" placeholder="Name, e.g. Kart Cup 2027" value="${esc(nf.name)}" maxlength="40" aria-label="Tournament name"><div class="seg blue" style="width:340px">${[['bracket', '4 semis + final'], ['empty', 'One empty match']].map(([val, tx]) => `<button class="${nf.template === val ? 'sel' : ''}" data-act="tnewtpl" data-v="${val}">${tx}</button>`).join('')}</div>
      <button class="btn" data-act="tnewcancel">Cancel</button><button class="btn acc" data-act="tnewgo" ${nf.name.trim() ? '' : 'disabled'}>Create</button></div></div>` : ''
  const rows = S.tournaments.map((t) => { const act = t.id === S.activeTournamentId, done = t.matches.filter((m) => matchStatus(t, m) === 'done').length, ren = S.trename?.id === t.id
    return `<div class="trow2 ${act ? 'on' : ''}"><div class="tinfo">${ren ? `<input class="field inp" data-in="trename" value="${esc(S.trename.name)}" maxlength="40" aria-label="Tournament name">` : `<b>${esc(t.name)}</b>`}<small>${rounds(t).length} round${rounds(t).length === 1 ? '' : 's'} · ${t.matches.length} match${t.matches.length === 1 ? '' : 'es'} · ${done} done${act ? ' · <span class="loaded">LOADED</span>' : ''}</small></div>
      <div class="tacts">${act ? '<button class="btn" data-act="tclose">Close</button>' : `<button class="btn acc" data-act="tload" data-id="${t.id}">Load</button>`}${ren ? '<button class="btn acc" data-act="trenamego">Save name</button>' : `<button class="btn" data-act="trename" data-id="${t.id}">Rename</button>`}<button class="btn" data-act="tdup" data-id="${t.id}">Duplicate</button><button class="btn" data-act="tdupclean" data-id="${t.id}">Duplicate, clear scores</button>
      <button class="btn ${S.confirm === 'tdel:' + t.id ? 'amberb' : 'danger'}" data-act="tdel" data-id="${t.id}">${S.confirm === 'tdel:' + t.id ? 'Tap again to delete' : 'Delete'}</button></div></div>` }).join('')
  return `<div class="ph"><span class="lab">All tournaments</span><button class="btn acc" style="margin-left:auto" data-act="tnew">＋ New tournament</button></div>${form}<div class="grow" style="overflow:auto">${rows || '<div class="empty"><b>No tournaments yet</b><span>Create one to run several matches (for example 4 semis then a final) from one page.</span></div>'}</div>
    <div class="hintbar">Several can be saved; one is loaded. The Race page always operates the live match of the loaded tournament. With none loaded the app is in free play.</div>`
}

function pageOverview(t, v) {
  const live = activeMatch()
  const chk = [['Rounds and matches', `${rounds(t).length} round${rounds(t).length === 1 ? '' : 's'}, ${t.matches.length} match${t.matches.length === 1 ? '' : 'es'}`, v.bracket], ['Players', v.players.ok ? 'Every slot has a name or an auto source' : `${v.players.warn} slot${v.players.warn === 1 ? '' : 's'} still to name`, v.players]]
  const glance = rounds(t).map((r) => `<div class="rgroup"><div class="rhead">${esc(roundName(t, r)).toUpperCase()}</div><div class="rcards">${t.matches.filter((m) => m.round === r).map((m) => { const st = matchStatus(t, m), ws = winnerSlot(m), tot = totalsOf(m), has = recordedCount(m) > 0
    return `<button class="mc2 ${st}" data-act="tfix" data-p="round:${r}" data-id="${m.id}"><span class="l1"><b>${esc(m.label)}</b><em class="${st}">${st === 'live' ? 'LIVE' : st === 'done' ? 'DONE' : 'NEXT'}</em></span><span class="l2">${m.players.map((p, i) => `<i class="${ws === i && has ? 'w' : ''}" style="--c:${PCOL[i]}">${esc(p.name.slice(0, 6))}${has ? `<small>${tot[i]}</small>` : ''}</i>`).join('')}</span>${dots(m)}</button>` }).join('')}</div></div>`).join('<div class="rarrow">▸</div>')
  return `<div class="ph"><span class="lab">Overview</span><input class="field inp tname" data-in="tname" value="${esc(t.name)}" maxlength="40" aria-label="Tournament name"></div>
    <div class="grow" style="overflow:auto;padding:16px;display:grid;gap:14px;align-content:start">
      <div><div class="lab" style="margin-bottom:8px">Bracket at a glance <span class="dim" style="text-transform:none;letter-spacing:0">· tap a match to edit its round</span></div><div class="glance">${glance}</div></div>
      <div class="ovgrid"><div style="display:grid;gap:8px">${chk.map(([n, d, st]) => `<div class="rv ${st.ok ? 'ok' : 'warn'}"><i class="sb ${st.ok ? 'ok' : 'warn'}">${st.ok ? '✓' : st.warn}</i><div><b>${n}</b><small>${d}</small></div></div>`).join('')}
        ${v.issues.length ? `<div class="issues"><div class="lab">To fix</div>${v.issues.slice(0, 6).map((x) => `<button class="issue" data-act="tfix" data-p="${x.page}" data-id="${x.id ?? ''}"><span>${esc(x.text)}</span><em>Fix ›</em></button>`).join('')}${v.issues.length > 6 ? `<div class="dim sm">and ${v.issues.length - 6} more</div>` : ''}</div>` : ''}</div>
        <div style="display:grid;gap:8px;align-content:start"><div class="rv live"><div><b>Live match</b><small>${esc(live.label)} · ${raceLabel(live)}. The Race page operates this match.</small></div></div>
          <select class="field sel44" data-chg="livematch" aria-label="Live match">${t.matches.map((m) => `<option value="${m.id}" ${m.id === t.activeMatchId ? 'selected' : ''}>${esc(m.label)}</option>`).join('')}</select>
          ${(() => { const i = t.matches.findIndex((x) => x.id === t.activeMatchId), nx = t.matches[i + 1]; return nx ? `<button class="btn" data-act="nextmatch">Next match ▶ <small class="dim">${esc(nx.label)}</small></button>` : '' })()}
          <button class="btn acc big go2" data-act="view" data-v="race">Go to Race ▶</button></div></div></div>`
}

function playerRow(m, i) {
  const p = m.players[i], src = m.slotSources?.[i], t = activeTournament(), choices = t.matches.filter((x) => x.id !== m.id && x.round < m.round), auto = !!src?.auto
  return `<div class="prow2 ${auto ? 'auto' : ''}"><i class="pcb" style="background:${PCOL[i]}">P${i + 1}</i>
    <input class="field inp ${p.placeholder ? 'ph' : ''}" data-in="pname:${m.id}:${i}" value="${esc(p.name)}" maxlength="14" aria-label="P${i + 1} name" ${auto ? 'disabled' : ''}>
    <select class="field sel44" data-chg="pchar2" data-id="${m.id}" data-i="${i}" aria-label="P${i + 1} character" ${auto ? 'disabled' : ''}>${CHARS.map((c) => `<option ${c === p.char ? 'selected' : ''}>${c}</option>`).join('')}</select>
    ${choices.length ? `<select class="field sel44 srcsel" data-chg="psrc" data-id="${m.id}" data-i="${i}" aria-label="P${i + 1} comes from"><option value="">Manual</option>${choices.map((c) => `<option value="${c.id}" ${src?.matchId === c.id && auto ? 'selected' : ''}>Winner of ${esc(c.label)}${isComplete(c) ? '' : ' (so far)'}</option>`).join('')}</select>` : ''}</div>`
}
function resultsTable(m) {
  const tot = totalsOf(m), ws = winnerSlot(m), computed = recordedCount(m) ? standingOf(m)[0].i : null
  const rowsH = m.scores.races.map((r, ri) => `<tr><td>${ri + 1}<span class="dim"> · ${esc(trackOf(m, ri))}</span></td>${m.players.map((p, i) => `<td><select class="field sel44 rs" data-chg="rpos" data-id="${m.id}" data-r="${ri}" data-i="${i}" aria-label="Race ${ri + 1} ${esc(p.name)}"><option value="0">—</option>${[1, 2, 3, 4].map((n) => `<option value="${n}" ${r && r[i] === n ? 'selected' : ''}>${ORD[n - 1]}</option>`).join('')}</select></td>`).join('')}<td>${r && !rowDone(r) ? '<span class="warnt">incomplete</span>' : ''}</td></tr>`).join('')
  return `<table class="res rtable"><tr><th>RACE</th>${m.players.map((p, i) => `<th><i class="pc" style="background:${PCOL[i]}"></i>${esc(p.name)}</th>`).join('')}<th></th></tr>${rowsH}
    <tr class="adjr"><td>Adjustment</td>${m.players.map((p, i) => `<td><input class="field inp adj" type="number" step="1" data-in="adj2:${m.id}:${i}" value="${m.scores.adj[i] || 0}" aria-label="Adjustment ${esc(p.name)}"></td>`).join('')}<td></td></tr>
    <tr class="totr"><td>Total</td>${tot.map((vv, i) => `<td class="num ${ws === i ? 'win' : ''}">${vv}${ws === i ? ' ★' : ''}</td>`).join('')}<td></td></tr></table>
    <div class="ovr2"><label>Winner<select class="field sel44" data-chg="mwin" data-id="${m.id}"><option value="">Auto${computed == null ? ' (no results yet)' : ': ' + esc(m.players[computed].name)}</option>${m.players.map((p, i) => `<option value="${i}" ${m.winnerOverride === i ? 'selected' : ''}>${esc(p.name)} (P${i + 1})</option>`).join('')}</select></label>
    <div class="dim sm">Corrections for any match, live or not. Ties go to the last race. A hand-picked winner fills the next round too. During the show use the Race page.</div></div>`
}
function pageRound(t, r, v) {
  const ms = t.matches.filter((x) => x.round === r), rs = rounds(t), hasPrev = rs.indexOf(r) > 0
  const m = ms.find((x) => x.id === S.tmatch) ?? ms[0]; S.tmatch = m.id
  const st = matchStatus(t, m)
  const tabs = ms.map((x) => { const s2 = matchStatus(t, x), bad = v.issues.some((q) => q.id === x.id)
    return `<button class="mtab ${x.id === m.id ? 'on' : ''}" data-act="tmatchsel" data-id="${x.id}"><b>${esc(x.label)}</b><em class="${s2}">${s2 === 'live' ? 'LIVE' : s2 === 'done' ? 'DONE' : ''}</em>${bad ? '<i class="sb warn">!</i>' : ''}</button>` }).join('') + `<button class="mtab add" data-act="addmatch" data-r="${r}" aria-label="Add match">＋ Add match</button>`
  return `<div class="ph rph"><input class="field inp rname" data-in="rname:${r}" value="${esc(roundName(t, r))}" maxlength="24" aria-label="Round name"><span class="dim">${ms.length} match${ms.length === 1 ? '' : 'es'}</span>
      ${hasPrev ? `<button class="btn sm" style="margin-left:auto" data-act="fillprev" data-r="${r}">Fill players from the previous round’s winners</button>` : '<span style="margin-left:auto"></span>'}
      <button class="btn sm ${S.confirm === 'rr:' + r ? 'amberb' : 'danger'}" data-act="rmround" data-r="${r}" ${rs.length < 2 ? 'disabled' : ''}>${S.confirm === 'rr:' + r ? 'Tap again to remove round' : 'Remove round'}</button></div>
    <div class="mtabs" role="tablist">${tabs}</div>
    <div class="rbody"><div class="rleft grow" style="overflow:auto"><div class="msettings"><input class="field inp" data-in="mlabel:${m.id}" value="${esc(m.label)}" maxlength="24" aria-label="Match label">${cupSel(m)}
        <select class="field sel44 racesel" data-chg="mraces" data-id="${m.id}" aria-label="Races">${[1, 2, 3, 4, 5, 6].map((n) => `<option value="${n}" ${n === m.race.count ? 'selected' : ''}>${n} race${n > 1 ? 's' : ''}</option>`).join('')}</select></div>
      <div class="msub">${st === 'live' ? '<span class="tag pgm">LIVE MATCH</span>' : `<button class="btn sm" data-act="setmatch" data-id="${m.id}">Make live</button>`}<button class="btn sm ${S.confirm === 'rm:' + m.id ? 'amberb' : 'danger'}" style="margin-left:auto" data-act="rmmatch" data-id="${m.id}" ${t.matches.length < 2 ? 'disabled' : ''}>${S.confirm === 'rm:' + m.id ? 'Tap again to remove' : 'Remove match'}</button></div>
      <div class="lab" style="margin:12px 0 6px">Players</div>${[0, 1, 2, 3].map((i) => playerRow(m, i)).join('')}</div>
      <div class="rright grow" style="overflow:auto"><div class="lab" style="margin:0 0 6px">Results</div>${resultsTable(m)}</div></div>`
}
function stepGraphics(t) {
  const w = t.winScreen, ms = t.matchesScene, br = t.bracket, prev = (scene, extra = {}, kind) => `<div class="gprev"><div class="mon pv" style="aspect-ratio:16/9;border-width:1px">${gfx({ ...blank(), scene, bg: 'B', part: 'full', ...extra }, liveCtx(), { kind })}</div></div>`
  const seg = (act, key, cur, list) => `<div class="seg s36">${list.map(([vv, l]) => `<button class="${cur === vv ? 'sel' : ''}" data-act="${act}" data-k="${key}" data-v="${vv}">${l}</button>`).join('')}</div>`
  const blocks = [['hero', 'Winner hero'], ['board', 'Scoreboard'], ['racePoints', 'Per-race points'], ['cupEmblem', 'Cup emblem'], ['trackName', 'Track name']]
  return `<div class="ph"><span class="lab">Graphics</span><span class="dim" style="font-size:12px;margin-left:8px">What the tournament scenes show. Previews use the live data.</span></div>
    <div class="grow gcards" style="overflow:auto">
    <section class="gc"><div class="gch"><b>Win screens</b><span class="dim">race win · cup win</span></div>${prev('raceWin', { part: 'full' })}
      <div class="gopt"><span class="lab">Layout</span>${seg('wincfg', 'layout', w.layout, [['heroLeft', 'Hero left, board right'], ['heroCentre', 'Hero centre, board below']])}</div>
      <div class="gopt"><span class="lab">Blocks</span><div class="tgrid">${blocks.map(([k, l]) => `<button class="tgl ${w.blocks[k] ? 'on' : ''}" data-act="winblock" data-k="${k}" aria-pressed="${w.blocks[k]}"><span class="tt"><b>${l}</b></span><span class="sw"></span></button>`).join('')}</div></div>
      <button class="btn" data-act="showscene" data-s="raceWin" data-go="live">Send to Preview</button></section>
    <section class="gc"><div class="gch"><b>Matches scene</b><span class="dim">all matches at a glance</span></div>${prev('matches', {}, 'wide')}
      <div class="gopt"><span class="lab">Layout</span>${seg('mscfg', 'layout', ms.layout, [['grid', '2×2'], ['row', '4 across'], ['stack', '1×4'], ['focus', 'Focus']])}</div>
      ${['wide', 'twin', 'hd'].map((f) => `<div class="gopt"><span class="lab">Detail · ${f === 'hd' ? 'HD' : f[0].toUpperCase() + f.slice(1)}</span><div class="seg s36">${[['full', 'Full'], ['compact', 'Compact'], ['winner', 'Winner only']].map(([vv, l]) => `<button class="${ms.detail[f] === vv ? 'sel' : ''}" data-act="msdetail" data-f="${f}" data-v="${vv}">${l}</button>`).join('')}</div></div>`).join('')}
      <div class="gopt"><span class="lab">Pending matches</span>${seg('mscfg', 'pendingScores', ms.pendingScores, [['zeros', 'Show 0s'], ['hide', 'Hide scores']])}<button class="tgl ${ms.liveMarker ? 'on' : ''}" style="min-height:36px" data-act="msmarker" aria-pressed="${ms.liveMarker}"><span class="tt"><b>Live marker</b></span><span class="sw"></span></button></div>
      <button class="btn" data-act="showscene" data-s="matches" data-go="live">Send to Preview</button></section>
    <section class="gc"><div class="gch"><b>Bracket scene</b><span class="dim">rounds feeding the final</span></div>${prev('bracket')}
      <div class="gopt"><span class="lab">Show</span><div class="tgrid">${[['showScores', 'Scores'], ['showStatus', 'Status']].map(([k, l]) => `<button class="tgl ${br[k] ? 'on' : ''}" data-act="brcfg" data-k="${k}" aria-pressed="${br[k]}"><span class="tt"><b>${l}</b></span><span class="sw"></span></button>`).join('')}</div></div>
      <button class="btn" data-act="showscene" data-s="bracket" data-go="live">Send to Preview</button></section></div>`
}
function tourView() {
  const t = activeTournament(), v = validateTournament(t)
  if (!t) S.tpage = 'lib'
  let body
  if (S.tpage === 'lib') body = pageLib()
  else if (S.tpage === 'graphics') body = stepGraphics(t)
  else if (S.tpage && S.tpage.startsWith('round:')) body = pageRound(t, +S.tpage.slice(6), v)
  else body = pageOverview(t, v)
  return `<div class="tourgrid">${tourRail(t, v)}<section class="panel stepbody">${body}</section></div>`
}
