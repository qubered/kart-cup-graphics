/*
 * Kart Cup — mockup helpers (reference only; plain ES2020, no build).
 *
 * URL params understood by every mockup page:
 *   format=wide|twin|hd   canvas size (where the page supports it)
 *   fit=0                 render at 1:1 instead of scaling to the window
 *   guides=1              outline every [data-guide] element with its x,y w×h in canvas pixels
 *   embed=1               black page background, no caption (used by iframes in the UI mockups)
 *   camera=0              hide the stand-in camera so overlay transparency shows
 *   lowfx=1               fewer particles (monitors / multiview)
 *   style=chrome|classic  event title style        look=classic|chrome|plain  heading look
 *   pre, title, accent, wm, hold, names (comma list), track   override sample text
 */
window.MK = (function () {
  'use strict';
  const P = new URLSearchParams(location.search);
  const param = (k, d) => (P.has(k) ? P.get(k) : d);
  const FORMATS = { wide: { w: 3840, h: 1152 }, twin: { w: 1920, h: 1152 }, hd: { w: 1920, h: 1080 } };
  const G = 'https://mario.wiki.gallery/images/';   /* real app: /assets/... from catalog.json */
  const lowfx = param('lowfx') === '1';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------------- sample show data ---------------- */
  const names = (param('names', '') || '').split(',').filter(Boolean);
  const SAMPLE = {
    event: { pre: param('pre', 'YOUR COMPANY PRESENTS'), title: param('title', 'KART CUP'), accent: param('accent', '2026'),
             watermark: param('wm', 'MARIO KART'), hold: param('hold', 'BACK SHORTLY') },
    players: [
      { slot: 0, name: 'SAM',   character: 'Mario',  icon: G + '4/4f/MK8DX_Mario_Icon.png',  colour: '#e60012', text: '#ffffff' },
      { slot: 1, name: 'PRIYA', character: 'Peach',  icon: G + '1/1f/MK8DX_Peach_Icon.png',  colour: '#1e6cff', text: '#ffffff' },
      { slot: 2, name: 'TOM',   character: 'Yoshi',  icon: G + '3/38/MK8DX_Yoshi_Icon.png',  colour: '#22b14c', text: '#ffffff' },
      { slot: 3, name: 'ALEX',  character: 'Bowser', icon: G + 'd/d9/MK8DX_Bowser_Icon.png', colour: '#ffc400', text: '#14213d' },
    ].map((p, i) => (names[i] ? Object.assign({}, p, { name: names[i] }) : p)),
    race: { label: 'RACE 1 / 4', cup: 'Mushroom Cup', emblem: G + '1/15/MK8_MushroomCup.png', index: 0,
            track: param('track', 'Mario Kart Stadium'), image: G + '2/22/MK8_Mario_Kart_Stadium.png',
            tracks: [
              { name: 'Mario Kart Stadium', thumb: G + '5/50/MK8D_Mario_Kart_Stadium_Course_Icon_Full.png' },
              { name: 'Water Park',         thumb: G + '7/7d/MK8D_Water_Park_Course_Icon_Full.png' },
              { name: 'Sweet Sweet Canyon', thumb: G + 'a/af/MK8D_Sweet_Sweet_Canyon_Course_Icon_Full.png' },
              { name: 'Thwomp Ruins',       thumb: G + '8/8b/MK8D_Thwomp_Ruins_Course_Icon_Full.png' },
            ] },
    standings: { rows: [ { slot: 0, total: 27, delta: 15 }, { slot: 3, total: 22, delta: 12 }, { slot: 1, total: 19, delta: 10 }, { slot: 2, total: 18, delta: 9 } ],
                 footer: 'AFTER RACE 2 · MUSHROOM CUP' },
  };

  /* ---------------- layout maths (identical to plan Task 8) ---------------- */
  function lowerThirdSlots(format, slots, safe = { top: 0, right: 0, bottom: 0, left: 0 }, scale = 1) {
    const f = FORMATS[format];
    if (format === 'twin') {
      const xs = [40, 490, 1000, 1450];
      return slots.map((s) => ({ slot: s, x: xs[s] + safe.left, y: f.h - 70 - 160 - safe.bottom, scale: 1 }));
    }
    const k = format === 'wide' ? 1.5 * scale : scale, gap = format === 'wide' ? 30 : 20, w = 430 * k;
    const total = slots.length * w + (slots.length - 1) * gap, x0 = (f.w - total) / 2;
    return slots.map((s, i) => ({ slot: s, x: x0 + i * (w + gap), y: f.h - 70 - 160 * k - safe.bottom, scale: k }));
  }
  function trackCardSlots(format, safe = { top: 0, right: 0, bottom: 0, left: 0 }) {
    const base = format === 'twin' ? [{ x: 40, y: 40 }, { x: 1000, y: 40 }] : [{ x: 40, y: 40 }];
    return base.map((p) => ({ x: p.x + safe.left, y: p.y + safe.top }));
  }

  /* ---------------- component builders (HTML strings) ---------------- */
  function medallion(img, cls = '', stars = true) {
    return `<div class="medallion ${cls}" data-guide="medallion"><div class="in">${img ? `<img src="${img}" alt="">` : ''}${stars ? '<div class="stars">★★★</div>' : ''}</div></div>`;
  }
  function lowerThird(p, pos) {
    return `<div class="lower-third" data-guide="lower-third P${p.slot + 1}" data-slot="${p.slot}" style="left:${pos.x}px;top:${pos.y}px;transform:scale(${pos.scale});--pc:${p.colour};--pt:${p.text}">
      <div class="bar"><div class="chk"></div></div><div class="chip">P${p.slot + 1}</div>
      <div class="txt"><div class="name" data-fit="214"><span>${esc(p.name)}</span></div><div class="char">${esc(p.character)}</div></div>
      ${medallion(p.icon)}</div>`;
  }
  function trackCard(r, pos) {
    return `<div class="track-card" data-guide="track-card" style="left:${pos.x}px;top:${pos.y}px">
      <div class="bar"><div class="chk"></div></div>${medallion(r.emblem, 'emblem', false)}
      <div class="row"><span class="race">${esc(r.label)}</span><span class="cup">${esc(r.cup)}</span></div>
      <div class="track-name" data-fit="352"><span>${esc(r.track)}</span></div></div>`;
  }
  /* EVENT TITLE LOCKUP — line breaking rule (the app must implement the same):
       wide ("line"): TITLE ACCENT on one line.
       hd / twin ("stack"): the accent gets its own line; the title is split into 1..maxLines lines (hd 2, twin 3) at spaces.
       Candidate splits are scored by the size they would fit at (measured), capped by ts and by maxH / (lines × 1.16).
       Pick the FEWEST lines whose size ≥ 85% of ts; if none reaches 85%, the split with the largest size.
       Then every line is fitted to max (fitText, no floor) and all lines take the smallest size. */
  const TITLE_SIZES = {
    wide: { layout: 'line',  ts: 210, ps: 58, ms: 90, max: 3600, maxLines: 1, maxH: 9999, top: '50%', holdTop: '42%' },
    hd:   { layout: 'stack', ts: 190, ps: 50, ms: 64, max: 1700, maxLines: 2, maxH: 640,  top: '50%', holdTop: '42%' },
    twin: { layout: 'stack', ts: 170, ps: 40, ms: 56, max: 860,  maxLines: 3, maxH: 760,  top: '50%', holdTop: '43%' },   /* per 960 half */
  };
  function titleLockup(e, style, z, extraStyle = '') {
    return `<div class="title-lockup" data-guide="title-lockup" data-style="${style}" data-layout="${z.layout}" style="--ts:${z.ts}px;--ps:${z.ps}px;${extraStyle}">
      <div class="pre">${esc(e.pre)}</div><div class="lines" data-title="${esc(e.title)}" data-accent="${esc(e.accent)}" data-layout="${z.layout}"
        data-ts="${z.ts}" data-max="${z.max}" data-max-lines="${z.maxLines}" data-maxh="${z.maxH}"></div></div>`;
  }
  function titleLine(t, a, max) {
    const txt = [t, a].filter(Boolean).join(' ');
    const inner = (t ? `<span class="m">${esc(t)}</span>` : '') + (t && a ? ' ' : '') + (a ? `<span class="a">${esc(a)}</span>` : '');
    return `<div class="ln" data-fit="${max}" data-fit-min="0" data-fit-group="title" data-t="${esc(txt)}">${inner}</div>`;
  }
  function layoutTitles(root) {
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.font = `900 100px ${getComputedStyle(document.documentElement).getPropertyValue('--font-event').trim()}`;
    const fitSize = (txt, max) => max / (ctx.measureText(txt).width / 100 + 0.28);          /* 0.28em = left+right padding */
    const splits = (w, n) => (n === 1 ? [[w.join(' ')]] : Array.from({ length: w.length - n + 1 }, (_, i) => i + 1)
      .flatMap((k) => splits(w.slice(k), n - 1).map((rest) => [w.slice(0, k).join(' ')].concat(rest))));
    root.querySelectorAll('.lines[data-title]').forEach((box) => {
      const d = box.dataset, ts = +d.ts, max = +d.max, accent = d.accent;
      if (d.layout === 'line') { box.innerHTML = titleLine(d.title, accent, max); return; }
      const words = d.title.split(/\s+/).filter(Boolean), cands = [];
      for (let n = 1; n <= Math.min(+d.maxLines, words.length); n++) splits(words, n).forEach((ls) => {
        const all = accent ? ls.concat([accent]) : ls;
        const size = Math.min(ts, ...all.map((t) => fitSize(t, max)), +d.maxh / (all.length * 1.16));
        cands.push({ ls, n, size });
      });
      const best = cands.filter((c) => c.size >= 0.85 * ts).sort((x, y) => x.n - y.n || y.size - x.size)[0]
                || cands.sort((x, y) => y.size - x.size || x.n - y.n)[0];
      box.innerHTML = best.ls.map((t) => titleLine(t, '', max)).join('') + (accent ? titleLine('', accent, max) : '');
      box.querySelectorAll('.ln').forEach((l) => { l.style.fontSize = Math.floor(best.size) + 'px'; });
    });
  }
  const UPRIGHT = ['Mario Kart F2', 'MK F2', 'Lexend Zetta', 'Titan One', 'Luckiest Guy', 'Lilita One', 'Russo One'];
  function heading(text, look, hs, opts = {}) {
    const full = text + (opts.accent ? ' ' + opts.accent : '');
    const up = opts.font && UPRIGHT.includes(opts.font) ? ' upright' : '';
    const ff = opts.font ? `font-family:${opts.font === 'Mario Kart F2' ? 'var(--font-event)' : `'${opts.font}','Rubik',sans-serif`};` : '';
    return `<div class="heading${up}" data-guide="heading" data-look="${look}" data-t="${esc(full)}" style="--hs:${hs}px;${ff}${opts.style || ''}"><span class="m">${esc(text)}</span>${opts.accent ? ` <span class="a">${esc(opts.accent)}</span>` : ''}</div>`;
  }

  /* ---------------- backgrounds ---------------- */
  function bgSky(f, watermark) {
    return `<div class="layer bg-sky" data-bg="A"><div class="checker"></div>
      <div class="wm w1">${esc(watermark)}</div><div class="wm w2">${esc(watermark)}</div>
      <svg class="crest c1" viewBox="0 0 400 400"><use href="#i-crest"/></svg><svg class="crest c2" viewBox="0 0 400 400"><use href="#i-crest"/></svg>
      <div class="sweep-track"><div class="sweep"></div></div><div class="sparkles" data-sparkles></div></div>`;
  }
  function bgPattern(f) {
    return `<div class="layer bg-pattern" data-bg="B"><svg class="pat" width="${f.w + 1250}" height="${f.h + 280}"><rect width="100%" height="100%" fill="url(#pat-b)"/></svg><div class="vignette"></div></div>`;
  }
  /* ---------- background D · Player Announce (checkered bands + player colour) ---------- */
  const mixHex = (hex, to, t) => { const a = parseInt(hex.slice(1), 16), b = parseInt(to.slice(1), 16), c = (sh) => Math.round(((a >> sh) & 255) * (1 - t) + ((b >> sh) & 255) * t);
    return '#' + [16, 8, 0].map((sh) => c(sh).toString(16).padStart(2, '0')).join(''); };
  function bgPlayer(f, p, demo) {
    /* --pc / --pc-d / --pc-l are derived from the player's colour; Chromium 103 has no color-mix(), so compute them (real app: shared/palette.ts). */
    const vars = `--pc:${p.colour};--pc-d:${mixHex(p.colour, '#000000', .55)};--pc-l:${mixHex(p.colour, '#ffffff', .38)};--pc-ink:${p.text}`;
    const standIn = demo ? `<div class="pa-demo" data-guide="stand-in content (not part of background)"><img src="${p.art}" alt=""><div class="pa-pre">PLAYER ${p.slot + 1}</div><div class="pa-name" data-fit="${Math.round(f.w * (f.w > 2000 ? .3 : .62))}"><span>${esc(p.name)}</span></div><div class="pa-char">${esc(p.character)}</div></div>` : '';
    return `<div class="layer bg-player" data-bg="D" style="${vars}">
      <div class="pa-rays"></div><div class="pa-stripes"><i></i><i></i><i></i><i></i></div>
      <div class="pa-slot s1">P${p.slot + 1}</div><div class="pa-slot s2">P${p.slot + 1}</div>
      <div class="pa-fade top"></div><div class="pa-fade bottom"></div>
      <div class="pa-flag top" data-guide="flag band top"><div class="pa-track"></div></div><div class="pa-trim top"></div>
      <div class="pa-flag bottom" data-guide="flag band bottom"><div class="pa-track"></div></div><div class="pa-trim bottom"></div>
      <div class="sparkles" data-sparkles></div><div class="pa-vig"></div>${standIn}</div>`;
  }

  function bgStickers(f, e) {
    const copies = Math.ceil(f.w / 1280) + 2; let uses = '';
    for (let i = -1; i < copies; i++) if (i !== 0) uses += `<use href="#sheet-tile" x="${i * 1280}"/>`;
    const tile = STICKER_TILE.replace('>WM<', '>' + esc(e.watermark) + '<');   /* wordmark bands use the watermark text */
    return `<div class="layer bg-stickers" data-bg="C"><svg class="sheet" width="${(copies + 1) * 1280}" height="${f.h}">${tile}${uses}</svg>
      <div class="parade" data-parade style="width:${f.w * 2}px"></div><div class="road"></div>
      <div class="logo" data-guide="logo plate"><span>${esc(e.title)}${e.accent ? ` <span class="acc">${esc(e.accent)}</span>` : ''}</span><small>${esc(e.pre)}</small></div></div>`;
  }
  /* sticker tile 1280×1152 on a 24px grid. Rows: A stickers (y24–194), B wordmark (238–438), C stickers (482–652), D wordmark offset +640, E = row A offset +320 */
  const STICKER_TILE = `<g id="sheet-tile">
    <g id="rowA">
      <rect class="st-o" x="12" y="24" width="400" height="73" rx="8"/><text class="st-t" x="212" y="76" font-size="38" font-style="italic" text-anchor="middle" data-max="360">BULLET SPEED TRIAL</text>
      <rect class="st-f" x="12" y="121" width="400" height="73" rx="8"/><text class="st-k" x="212" y="174" font-size="46" font-style="italic" text-anchor="middle" data-max="360">TURBO OIL</text>
      <rect class="st-o" x="436" y="24" width="170" height="170" rx="10"/><text class="st-t" x="521" y="128" font-size="96" text-anchor="middle" data-max="130">08</text>
      <rect class="st-f" x="448" y="146" width="146" height="36" rx="4"/><text class="st-k" x="521" y="173" font-size="22" text-anchor="middle" data-max="130" letter-spacing="2">KART CUP</text>
      <rect class="st-o" x="630" y="24" width="320" height="170" rx="10"/><use href="#i-mush" x="648" y="62" width="92" height="92" style="color:var(--sticker-line)"/>
      <text class="st-t" x="756" y="82" font-size="28" data-max="176">MUSHROOM</text><text class="st-t" x="756" y="130" font-size="44" font-style="italic" data-max="176">PISTON</text><text class="st-t" x="756" y="170" font-size="28" data-max="176">ENGINES</text>
      <rect class="st-o" x="974" y="24" width="140" height="73" rx="8"/><use href="#i-box" x="1018" y="34" width="52" height="52" style="color:var(--sticker-line)"/>
      <rect class="st-o" x="974" y="121" width="140" height="73" rx="8"/><use href="#i-star" x="1018" y="131" width="52" height="52" style="color:var(--sticker-line)"/>
      <use href="#i-shield" x="1136" y="39" width="136" height="140" style="color:var(--sticker-line)"/>
    </g>
    <g id="rowB"><text class="st-t wordmark" x="24" y="404" font-size="190" font-style="italic" data-fitw="980">WM</text>
      <rect class="st-f" x="1048" y="248" width="210" height="180" rx="18"/><text class="st-k" x="1153" y="400" font-size="180" font-style="italic" text-anchor="middle">8</text></g>
    <g id="rowC">
      <circle class="st-o" cx="97" cy="567" r="82"/><text class="st-t" x="97" y="588" font-size="58" text-anchor="middle" data-max="130">180</text>
      <rect class="st-f" x="206" y="482" width="170" height="170" rx="10"/><path class="st-k" d="M236 522 L276 567 L236 612 L256 612 L296 567 L256 522 Z M286 522 L326 567 L286 612 L306 612 L346 567 L306 522 Z"/>
      <rect class="st-o" x="400" y="482" width="400" height="73" rx="8"/><text class="st-t" x="600" y="534" font-size="44" font-style="italic" text-anchor="middle" data-max="360">SUPER STAR</text>
      <rect class="st-o" x="400" y="579" width="400" height="73" rx="8"/><text class="st-t" x="600" y="630" font-size="38" font-style="italic" text-anchor="middle" data-max="360">POWER BATTERY</text>
      <use href="#i-sign" x="824" y="482" width="170" height="170" style="color:var(--sticker-line)"/>
      <rect class="st-o" x="1018" y="482" width="250" height="170" rx="10"/>
      <path class="st-t" d="M1083 498 L1113 540 L1097 540 L1097 600 L1069 600 L1069 540 L1053 540 Z M1173 498 L1203 540 L1187 540 L1187 600 L1159 600 L1159 540 L1143 540 Z"/>
      <text class="st-t" x="1143" y="636" font-size="22" text-anchor="middle" data-max="220" letter-spacing="2">THIS SIDE UP</text>
    </g>
    <use href="#rowB" transform="translate(640 458)"/><use href="#rowA" transform="translate(320 916)"/></g>`;

  /* ---------------- camera stand-in ---------------- */
  function camera(format) {
    const f = FORMATS[format];
    if (format === 'twin') return `<div class="cam" style="left:0;width:960px"><div class="ppl" style="left:110px;top:330px"></div><div class="ppl" style="left:550px;top:330px"></div></div>
      <div class="cam alt" style="left:960px;width:960px"><div class="ppl" style="left:110px;top:330px"></div><div class="ppl" style="left:550px;top:330px"></div></div><div class="seam"></div>`;
    const n = format === 'wide' ? 4 : 2; let s = `<div class="cam" style="left:0;width:${f.w}px">`;
    for (let i = 0; i < n; i++) s += `<div class="ppl" style="left:${(f.w / n) * i + (f.w / n - 300) / 2}px;top:${f.h * 0.3}px"></div>`;
    return s + '</div>';
  }

  /* ---------------- icon library (own drawings, currentColor) ---------------- */
  const ICONS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <symbol id="i-wheel" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" stroke-width="12"/><path fill="currentColor" d="M12 44 Q50 33 88 44 L88 56 Q64 54 58 64 L58 90 L42 90 L42 64 Q36 54 12 56 Z"/><circle cx="50" cy="52" r="11" fill="currentColor"/></symbol>
    <symbol id="i-tire" viewBox="0 0 100 100"><circle cx="50" cy="50" r="33" fill="none" stroke="currentColor" stroke-width="24"/><circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" stroke-width="4" stroke-dasharray="7 5"/><circle cx="50" cy="50" r="9" fill="currentColor"/></symbol>
    <symbol id="i-tire2" viewBox="0 0 100 100"><rect x="24" y="8" width="52" height="84" rx="22" fill="none" stroke="currentColor" stroke-width="10"/><path d="M30 32h40M30 44h40M30 56h40M30 68h40" stroke="currentColor" stroke-width="5"/></symbol>
    <symbol id="i-speedo" viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" stroke-width="6"/><path d="M50 14v10M22 30l7 6M78 30l-7 6M14 58h10M86 58H76" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><path d="M46 60 L50 24 L54 60 Z" fill="currentColor"/><circle cx="50" cy="60" r="7" fill="currentColor"/></symbol>
    <symbol id="i-sign" viewBox="0 0 100 100"><rect x="19" y="19" width="62" height="62" rx="8" transform="rotate(45 50 50)" fill="none" stroke="currentColor" stroke-width="9"/><path d="M40 72 C40 56 60 58 60 44 L60 36" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/><path d="M50 38 L60 25 L70 38 Z" fill="currentColor"/></symbol>
    <symbol id="i-shield" viewBox="0 0 100 100"><path d="M50 8 L86 20 L82 62 Q76 82 50 94 Q24 82 18 62 L14 20 Z" fill="none" stroke="currentColor" stroke-width="8" stroke-linejoin="round"/><text x="50" y="72" text-anchor="middle" font-family="Rubik,sans-serif" font-weight="900" font-style="italic" font-size="54" fill="currentColor">8</text></symbol>
    <symbol id="i-box" viewBox="0 0 100 100"><rect x="12" y="12" width="76" height="76" rx="16" fill="none" stroke="currentColor" stroke-width="8"/><text x="50" y="73" text-anchor="middle" font-family="Rubik,sans-serif" font-weight="900" font-size="58" fill="currentColor">?</text></symbol>
    <symbol id="i-mush" viewBox="0 0 100 100"><path fill="currentColor" fill-rule="evenodd" d="M8 58 C8 26 26 10 50 10 C74 10 92 26 92 58 Z M38 32 a12 12 0 1 0 24 0 a12 12 0 1 0 -24 0 M17 46 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0 M69 46 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0"/><path fill="currentColor" fill-rule="evenodd" d="M30 61 H70 V80 Q70 92 50 92 Q30 92 30 80 Z M40 72 a3 6 0 1 0 6 0 a3 6 0 1 0 -6 0 M54 72 a3 6 0 1 0 6 0 a3 6 0 1 0 -6 0"/></symbol>
    <symbol id="i-star" viewBox="0 0 100 100"><path fill="currentColor" fill-rule="evenodd" d="M50 8 L61.8 35.8 L91.8 38.4 L69 58.2 L75.9 87.6 L50 72 L24.1 87.6 L31 58.2 L8.2 38.4 L38.2 35.8 Z M41 50 a3 7 0 1 0 6 0 a3 7 0 1 0 -6 0 M53 50 a3 7 0 1 0 6 0 a3 7 0 1 0 -6 0"/></symbol>
    <symbol id="i-flag" viewBox="0 0 100 100"><path d="M18 8 V94" stroke="currentColor" stroke-width="7" stroke-linecap="round"/><rect x="22" y="12" width="64" height="44" fill="none" stroke="currentColor" stroke-width="5"/><g fill="currentColor"><rect x="22" y="12" width="16" height="14.7"/><rect x="54" y="12" width="16" height="14.7"/><rect x="38" y="26.7" width="16" height="14.7"/><rect x="70" y="26.7" width="16" height="14.7"/><rect x="22" y="41.3" width="16" height="14.7"/><rect x="54" y="41.3" width="16" height="14.7"/></g></symbol>
    <symbol id="i-crest" viewBox="0 0 400 400"><path d="M200 20 L356 110 L356 290 L200 380 L44 290 L44 110 Z" fill="none" stroke="currentColor" stroke-width="22" stroke-linejoin="round"/><path d="M200 62 L320 132 L320 268 L200 338 L80 268 L80 132 Z" fill="none" stroke="currentColor" stroke-width="8" stroke-linejoin="round"/><circle cx="200" cy="205" r="80" fill="none" stroke="currentColor" stroke-width="16"/><path d="M200 205 L200 150 M200 205 L238 228" stroke="currentColor" stroke-width="14" stroke-linecap="round"/><path d="M110 250 Q100 180 140 130 M290 250 Q300 180 260 130" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round" stroke-dasharray="2 22"/></symbol>
    <symbol id="kart" viewBox="0 0 240 150"><g fill="#111"><circle cx="58" cy="112" r="32"/><circle cx="192" cy="116" r="26"/><path d="M22 96 L70 74 L170 78 L222 94 L218 110 L30 114 Z"/><path d="M60 78 L74 40 L88 42 L82 80 Z"/><path d="M84 80 L96 46 Q110 38 124 48 L132 80 Z"/><circle cx="112" cy="30" r="20"/><path d="M98 18 Q118 2 138 16 L150 22 L126 24 Z"/><path d="M118 56 L150 64 L156 58 L162 76 L150 78 Z"/></g><circle cx="58" cy="112" r="11" fill="#f3f3f3"/><circle cx="192" cy="116" r="9" fill="#f3f3f3"/></symbol>
    <symbol id="bike" viewBox="0 0 240 150"><g fill="#111"><circle cx="48" cy="116" r="28"/><circle cx="192" cy="116" r="28"/><path d="M48 116 L96 78 L176 82 L192 116" stroke="#111" stroke-width="16" fill="none" stroke-linejoin="round"/><path d="M92 82 L118 44 Q134 34 148 46 L156 84 Z"/><circle cx="142" cy="28" r="19"/><path d="M128 16 Q148 2 166 16 L176 22 L152 24 Z"/><path d="M150 56 L182 66 L186 78 L160 74 Z"/></g><circle cx="48" cy="116" r="10" fill="#f3f3f3"/><circle cx="192" cy="116" r="10" fill="#f3f3f3"/></symbol>
    <g id="pattern-tile"><!-- 1250×280, two offset rows, 120px icons -->
      <use href="#i-wheel" x="65" y="10" width="120" height="120"/><use href="#i-shield" x="315" y="10" width="120" height="120"/><use href="#i-sign" x="565" y="10" width="120" height="120"/>
      <use href="#i-tire2" x="815" y="10" width="120" height="120"/><use href="#i-star" x="1065" y="10" width="120" height="120"/>
      <use href="#i-speedo" x="-60" y="150" width="120" height="120"/><use href="#i-speedo" x="1190" y="150" width="120" height="120"/><use href="#i-tire" x="190" y="150" width="120" height="120"/>
      <use href="#i-mush" x="440" y="150" width="120" height="120"/><use href="#i-box" x="690" y="150" width="120" height="120"/><use href="#i-flag" x="940" y="150" width="120" height="120"/></g>
    <pattern id="pat-b" patternUnits="userSpaceOnUse" width="1250" height="280" style="color:var(--pattern-icon)"><use href="#pattern-tile"/></pattern>
  </defs></svg>`;

  /* ---------------- runtime decorations ---------------- */
  const rnd = (a, b) => a + Math.random() * (b - a);
  function sparkles(root, f) {
    root.querySelectorAll('[data-sparkles]').forEach((layer) => {
      const n = Math.round(150 * (f.w * f.h) / (3840 * 1152) / (lowfx ? 5 : 1));
      for (let i = 0; i < n; i++) {
        const big = Math.random() < 0.18, el = document.createElement(big ? 'b' : 'i');
        el.style.left = rnd(0, f.w) + 'px'; el.style.top = rnd(0, f.h) + 'px';
        if (!big) { const s = rnd(4, 12); el.style.width = s + 'px'; el.style.height = s + 'px'; }
        el.style.animationDelay = rnd(0, 4) + 's'; el.style.animationDuration = rnd(2.4, 5) + 's';
        layer.appendChild(el);
      }
    });
  }
  function parade(root, f) {
    root.querySelectorAll('[data-parade]').forEach((p) => {
      /* 7 vehicles per canvas width (positions given for 3840 and scaled), duplicated one width to the right for a seamless loop */
      const base = [60, 600, 1100, 1700, 2300, 2800, 3350], sc = [1, 1.15, 0.9, 1.25, 1, 1.1, 0.95];
      [0, f.w].forEach((off) => base.forEach((x, i) => {
        const ns = 'http://www.w3.org/2000/svg', s = document.createElementNS(ns, 'svg'), u = document.createElementNS(ns, 'use');
        s.setAttribute('width', 240 * sc[i]); s.setAttribute('height', 150 * sc[i]); s.setAttribute('viewBox', '0 0 240 150');
        u.setAttribute('href', i % 3 === 1 ? '#bike' : '#kart'); s.appendChild(u);
        s.style.left = (x * (f.w / 3840) + off) + 'px'; s.style.animationDelay = (i * 0.13) + 's'; p.appendChild(s);
      }));
    });
  }
  function confetti(root, f) {
    root.querySelectorAll('[data-confetti]').forEach((c) => {
      const cols = ['#e60012', '#ffd21f', '#1e6cff', '#22b14c', '#ff3df2', '#ffffff'], n = lowfx ? 20 : 90;
      for (let i = 0; i < n; i++) { const e = document.createElement('i'); e.style.cssText = `left:${rnd(0, f.w)}px;background:${cols[i % cols.length]};animation-duration:${rnd(4, 8)}s;animation-delay:${-rnd(0, 8)}s`; c.appendChild(e); }
    });
  }
  /* fitText — same rule as the app's fitText action:
     1) shrink font-size 1px at a time down to a floor of 60% of the base size (data-fit-min overrides the ratio; 0 = no floor),
     2) if it still overflows, compress the inner <span> horizontally with scaleX(max / width). Never overflows, never tiny. */
  function fitText(root) {
    root.querySelectorAll('[data-fit]').forEach((e) => {
      const max = +e.getAttribute('data-fit'), ratio = e.hasAttribute('data-fit-min') ? +e.getAttribute('data-fit-min') : 0.6;
      const base = parseFloat(getComputedStyle(e).fontSize), floor = Math.max(8, base * ratio); let fs = base;
      while (e.scrollWidth > max && fs > floor) { fs -= 1; e.style.fontSize = fs + 'px'; }
      const span = e.querySelector(':scope > span');
      if (e.scrollWidth > max && span) span.style.transform = `scaleX(${(max / span.offsetWidth).toFixed(4)})`;
    });
    /* data-fit-group: every member takes the group's smallest fitted size (title lockup lines) */
    const groups = {};
    root.querySelectorAll('[data-fit-group]').forEach((e) => { const g = e.closest('.title-lockup') || root; const k = e.getAttribute('data-fit-group');
      (groups[k] = groups[k] || new Map()).set(g, (groups[k].get(g) || []).concat(e)); });
    Object.values(groups).forEach((m) => m.forEach((els) => { const min = Math.min(...els.map((e) => parseFloat(getComputedStyle(e).fontSize))); els.forEach((e) => { e.style.fontSize = min + 'px'; }); }));
    root.querySelectorAll('svg text[data-max]').forEach((t) => {
      t.removeAttribute('textLength'); const w = t.getComputedTextLength(), m = +t.getAttribute('data-max');
      if (w > m) { t.setAttribute('textLength', m); t.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
    });
    root.querySelectorAll('svg text[data-fitw]').forEach((t) => {
      t.setAttribute('font-size', 190); const w = t.getComputedTextLength(), m = +t.getAttribute('data-fitw');
      if (w > m) t.setAttribute('font-size', Math.floor(190 * m / w));
    });
  }

  /* ---------------- page frame: canvas, fit, guides ---------------- */
  const PAGE_CSS = `
    html,body{margin:0;height:100%;overflow:hidden}
    body.mk-page{background:#2a2d33 repeating-conic-gradient(#33373e 0 25%, #2a2d33 0 50%) 0 0/24px 24px; font-family:system-ui,sans-serif}
    body.mk-page.embed{background:#000}
    .mk-canvas.fitted{position:absolute;transform-origin:0 0}
    .mk-caption{position:fixed;left:10px;bottom:10px;z-index:99;font:12px/1.3 system-ui,sans-serif;color:#cbd5e1;background:rgba(0,0,0,.6);padding:6px 9px;border-radius:6px;pointer-events:none}
    body.embed .mk-caption{display:none}
    .mk-guide{position:absolute;border:2px dashed #ff00d4;z-index:999;pointer-events:none}
    .mk-guide span.bottom{top:auto;bottom:-2px;transform:translateY(100%);background:#7c3aed}
    .mk-guide span{position:absolute;left:-2px;top:-2px;transform:translateY(-100%);background:#ff00d4;color:#fff;font:600 var(--gf,14px)/1.2 ui-monospace,Menlo,monospace;padding:2px 6px;white-space:nowrap}`;
  function page(format, build, caption) {
    const f = FORMATS[format];
    const st = document.createElement('style'); st.textContent = PAGE_CSS; document.head.appendChild(st);
    document.body.classList.add('mk-page'); if (param('embed') === '1') document.body.classList.add('embed');
    document.body.insertAdjacentHTML('afterbegin', ICONS);
    const c = document.createElement('div'); c.className = 'mk-canvas'; c.id = 'canvas'; c.dataset.format = format;
    c.style.setProperty('--w', f.w + 'px'); c.style.setProperty('--h', f.h + 'px');
    c.innerHTML = build(f, SAMPLE); document.body.appendChild(c);
    if (caption) document.body.insertAdjacentHTML('beforeend', `<div class="mk-caption">${esc(caption)} · ${f.w}×${f.h} · ?guides=1 ?fit=0</div>`);
    sparkles(c, f); parade(c, f); confetti(c, f);
    let scale = 1;
    const fit = () => {
      if (param('fit') === '0') { document.documentElement.style.overflow = document.body.style.overflow = 'auto'; return; }
      scale = Math.min(innerWidth / f.w, innerHeight / f.h); c.classList.add('fitted');
      c.style.transform = `scale(${scale})`; c.style.left = (innerWidth - f.w * scale) / 2 + 'px'; c.style.top = (innerHeight - f.h * scale) / 2 + 'px';
    };
    addEventListener('resize', fit); fit();
    const imgs = Array.from(c.querySelectorAll('img')).map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))).filter(Boolean);
    Promise.all([document.fonts.ready, Promise.race([Promise.all(imgs), new Promise((r) => setTimeout(r, 4000))])]).then(() => {
      layoutTitles(c); fitText(c); if (param('guides') === '1') guides(c, () => scale); document.body.setAttribute('data-ready', '');
    });
    return { canvas: c, f, SAMPLE };
  }
  function guides(c, getScale) {
    const s = getScale(), cr = c.getBoundingClientRect();
    c.style.setProperty('--gf', Math.max(12, 13 / s) + 'px');
    c.querySelectorAll('[data-guide]').forEach((e) => {
      const r = e.getBoundingClientRect(), x = Math.round((r.left - cr.left) / s), y = Math.round((r.top - cr.top) / s), w = Math.round(r.width / s), h = Math.round(r.height / s);
      const g = document.createElement('div'); g.className = 'mk-guide'; g.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
      const nested = !!e.parentElement.closest('[data-guide]');
      g.innerHTML = `<span${nested ? ' class="bottom"' : ''}>${esc(e.getAttribute('data-guide'))} · ${x},${y} · ${w}×${h}</span>`; c.appendChild(g);
    });
  }

  return { P, param, FORMATS, SAMPLE, TITLE_SIZES, lowfx, esc, lowerThirdSlots, trackCardSlots, medallion, lowerThird, trackCard, titleLockup, heading,
           bgSky, bgPattern, bgStickers, bgPlayer, camera, page };
})();
