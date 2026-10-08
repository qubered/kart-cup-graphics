const PC = ['#ef4444', '#3b82f6', '#22c55e', '#eab308'], PN = ['ALEX', 'PRIYA', 'TOM', 'MEI']
const SCENES = [['none', 'None'], ['title', 'Title'], ['lineup', 'Line-up'], ['nextRace', 'Next race'], ['standings', 'Standings'], ['winner', 'Winner'],
  ['raceWin', 'Race win'], ['cupWin', 'Cup win'], ['bracket', 'Bracket'], ['matches', 'Matches'], ['notice', 'Notice'], ['qr', 'QR codes']]
const OUTS = [
  { id: 'wide', name: 'Wide', fmt: '3840×1152', on: 1, armed: 1, pend: 0 }, { id: 'twin', name: 'Twins', fmt: '1920×1152', on: 1, armed: 1, pend: 2 },
  { id: 'stream', name: 'Stream', fmt: '1920×1080', on: 1, armed: 1, pend: 0 }, { id: 'pillars', name: 'Pillars', fmt: '1920×1080', on: 0, armed: 0, pend: 0 },
]
const LOOKS = {
  hold: { name: 'Holding', scene: 'none', bg: 'C', used: 2 }, title: { name: 'Title', scene: 'title', bg: 'A', used: 1 }, lineup: { name: 'Line-up reveal', scene: 'lineup', bg: 'B', used: 1 },
  next: { name: 'Next race', scene: 'nextRace', bg: 'B', used: 2 }, win: { name: 'Race win — hero', scene: 'raceWin', bg: 'B', used: 2 }, stand: { name: 'Standings', scene: 'standings', bg: 'B', used: 1 },
  cup: { name: 'Cup win', scene: 'cupWin', bg: 'A', used: 1 }, notice: { name: 'Sponsor notice', scene: 'notice', bg: 'C', used: 0 },
}
const CUES = [['hold', 'cut'], ['title', 'auto'], ['lineup', 'auto'], ['next', 'auto'], ['win', 'cut', 'Next race'], ['stand', 'auto'], ['next', 'auto'], ['win', 'cut', 'Next race'], ['cup', 'auto']]
  .map(([look, take, after]) => ({ 0: look, 1: take, 2: after, look, take, after }))

function gfx(scene, bg, o = {}) {
  let h = `<div class="gfx"><div class="bgl bg${bg}"></div>`
  const rows = (right) => `<div class="st${right ? ' r' : ''}">${[88, 70, 52, 34].map((w, i) => `<i style="--w:${w}%;--c:${PC[i]}"></i>`).join('')}</div>`
  if (scene === 'title') h += `<div class="ttl2"><b>KART CUP</b><span>2026 CHAMPIONSHIP</span></div>`
  else if (scene === 'lineup') h += `<div class="lu">${PN.map((n, i) => `<i style="--c:${PC[i]}">${n}</i>`).join('')}</div>`
  else if (scene === 'nextRace') h += `<div class="nr"><div class="card2">WATER<br>PARK</div><div class="tx"><b>RACE 2</b><span>MUSHROOM CUP</span></div></div>`
  else if (scene === 'standings') h += rows(false)
  else if (scene === 'winner') h += `<div class="hero mid"><div class="med">1</div><div class="nm2">ALEX</div></div>`
  else if (scene === 'raceWin' || scene === 'cupWin') h += `<div class="hero${o.part === 'hero' ? '' : ''}"><div class="med">${scene === 'cupWin' ? '★' : '1'}</div><div class="nm2">ALEX</div></div>` + (o.part === 'hero' ? '' : rows(true))
  else if (scene === 'bracket') h += `<div class="br"><div><i></i><i></i><i></i><i></i></div><div><i></i><i></i></div><div><i></i></div></div>`
  else if (scene === 'matches') h += `<div class="mt"><i></i><i></i><i></i><i></i></div>`
  else if (scene === 'notice') h += `<div class="nt"><i></i><i></i><i></i></div>`
  else if (scene === 'qr') h += `<div class="qr"></div>`
  if (o.lt) h += `<div class="lts">${PN.map((n, i) => `<i style="--c:${PC[i]}">${n}</i>`).join('')}</div>`
  if (o.track) h += `<div class="tcard">WATER PARK</div>`
  return h + '</div>'
}


function topBar(items, view) {
const nav = items.map(([label, v]) => `<button data-act="view" data-v="${v}" class="${view === v ? 'on' : ''}">${label}</button>`).join('')
return `<div class="top"><div class="ttl">Kart Cup 2026</div><div class="nav">${nav}</div>
  <div class="now">Now: <b>Race 2 / 4</b> · Mushroom Cup · Water Park</div>
  <div class="stat">${OUTS.map((o) => `<span><i class="led ${o.on ? 'on' : ''}"></i>${o.name}</span>`).join('')}<span>On air <span class="onair">00:42:17</span></span><span class="clock">20:14:05</span></div></div>`
}

function transport() {
  const chips = OUTS.map((o) => `<button class="oc ${o.armed ? 'arm' : ''} ${o.on ? '' : 'off'}">${o.pend ? `<span class="p">${o.pend}</span>` : ''}<div class="nn"><i class="led ${o.on ? 'on' : ''}"></i>${o.name}</div><div class="s">${o.on ? (o.armed ? 'armed · ' : '') + o.fmt : 'offline'}</div></button>`).join('')
  return `<div class="tbar"><div class="tg"><span class="lab">Take to</span><div class="row">${chips}<button class="oc all">ALL</button></div></div>
    <div class="tg"><span class="lab">Take Preview</span><div class="row"><button class="bb cut" data-act="cut">CUT<small>Enter</small></button><button class="bb auto" data-act="auto">AUTO<small>Space</small></button>
      <div class="seg blue spdseg"><button>Fast</button><button class="sel">Normal</button><button>Slow</button></div></div></div>
    <div class="tg emerg"><span class="lab">Emergency</span><button class="bb hold">HOLD<small>H</small></button><button class="bb clear">CLEAR<small>⇧Esc</small></button><button class="bb ftb">FTB<small>⇧B</small></button></div></div>`
}


function fit() {
const u = document.getElementById('ui'), q = new URLSearchParams(location.search)
const s = q.get('fit') === '0' ? 1 : Math.min(innerWidth / 1600, innerHeight / 1000)
u.style.transform = `scale(${s})`
}
addEventListener('resize', fit)

