import type { MatchesLayout } from '../../../../../shared/types'

export interface Area { x: number; y: number; w: number; h: number }
/** 'v' = header on top, players stacked; 'h' = header on the left, players side by side; 'strip' = one slim line (focus layout). */
export type Orient = 'v' | 'h' | 'strip'
export interface Slot extends Area { index: number; orient: Orient; focus: boolean }
export interface Canvas { w: number; h: number }

/** Where the heading sits and how big it is, per canvas. */
export function headingSpec(c: Canvas): { size: number; top: number } {
  return c.w > 3000 ? { size: 100, top: 30 } : { size: 80, top: 30 }
}

/** The part of the canvas below the heading that cards may use. */
export function contentArea(c: Canvas): Area {
  const wide = c.w > 3000
  const mx = wide ? 90 : 55
  const top = wide ? 190 : 165
  return { x: mx, y: top, w: c.w - mx * 2, h: c.h - top - 50 }
}

const rowCap = (c: Canvas) => (c.w > 3000 ? 150 : 125)
const headerMax = (c: Canvas) => (c.w > 3000 ? 96 : 80)
const gapOf = (c: Canvas) => (c.w > 3000 ? 40 : 30)
/** Tallest a card is ever drawn: header plus four capped rows. */
const cardMaxH = (c: Canvas) => headerMax(c) + 4 * rowCap(c)

const centre = (outer: number, inner: number) => (outer - inner) / 2

function placeGrid(n: number, cols: number, rows: number, cellMaxW: number, cellMaxH: number, orient: Orient, c: Canvas): Slot[] {
  const A = contentArea(c)
  const gap = gapOf(c)
  const cw = Math.min((A.w - (cols - 1) * gap) / cols, cellMaxW)
  const ch = Math.min((A.h - (rows - 1) * gap) / rows, cellMaxH)
  const x0 = A.x + centre(A.w, cols * cw + (cols - 1) * gap)
  const y0 = A.y + centre(A.h, rows * ch + (rows - 1) * gap)
  const out: Slot[] = []
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols)
    const inRow = Math.min(cols, n - r * cols)
    const xr = x0 + centre(cols * cw + (cols - 1) * gap, inRow * cw + (inRow - 1) * gap)
    out.push({ index: i, x: xr + (i - r * cols) * (cw + gap), y: y0 + r * (ch + gap), w: cw, h: ch, orient, focus: false })
  }
  return out
}

/** Pixel rectangles for `n` cards (canvas pixels). `focusIndex` is the large card in the focus layout. */
export function layoutMatches(layout: MatchesLayout, n: number, c: Canvas, focusIndex = 0): Slot[] {
  if (n <= 0) return []
  const A = contentArea(c)
  const gap = gapOf(c)
  const wide = c.w > 3000
  if (layout === 'row') return placeGrid(n, n, 1, 1000, cardMaxH(c), 'v', c)
  if (layout === 'stack') return placeGrid(n, 1, n, A.w, wide ? 250 : 240, 'h', c)
  if (layout === 'focus' && n > 1) {
    const f = Math.min(Math.max(focusIndex, 0), n - 1)
    const others = [...Array(n).keys()].filter((i) => i !== f)
    const out: Slot[] = []
    if (c.w / c.h > 1.5) {
      // focus left, strips stacked on the right
      const fw = Math.round(A.w * (wide ? 0.5 : 0.56))
      const ch = Math.min(A.h, cardMaxH(c))
      const y0 = A.y + centre(A.h, ch)
      out[f] = { index: f, x: A.x, y: y0, w: fw, h: ch, orient: 'v', focus: true }
      const sx = A.x + fw + gap
      const sh = Math.min((ch - (others.length - 1) * gap) / others.length, wide ? 200 : 170)
      const y1 = y0 + centre(ch, others.length * sh + (others.length - 1) * gap)
      others.forEach((idx, k) => { out[idx] = { index: idx, x: sx, y: y1 + k * (sh + gap), w: A.w - fw - gap, h: sh, orient: 'strip', focus: false } })
    } else {
      // focus on top, strips stacked below
      const fh = Math.round(A.h * 0.6)
      out[f] = { index: f, x: A.x, y: A.y, w: A.w, h: fh, orient: 'v', focus: true }
      const rest = A.h - fh - gap
      const sh = Math.min((rest - (others.length - 1) * gap) / others.length, 120)
      others.forEach((idx, k) => { out[idx] = { index: idx, x: A.x, y: A.y + fh + gap + k * (sh + gap), w: A.w, h: sh, orient: 'strip', focus: false } })
    }
    return out
  }
  if (layout === 'focus') return placeGrid(1, 1, 1, A.w, cardMaxH(c), 'v', c).map((s) => ({ ...s, focus: true }))
  // grid
  const cols = n <= 1 ? 1 : n <= 4 ? 2 : 3
  return placeGrid(n, cols, Math.ceil(n / cols), wide ? 1900 : A.w, cardMaxH(c), 'v', c)
}

export interface BracketBox extends Area { matchId: string; round: number; style: 'winner' | 'slots'; slotY: number[]; head: number }

/** Bracket geometry: one column per round, nodes spread evenly. `slots` boxes list every player (rows), `winner` boxes only the winner. */
export function layoutBracket(
  rounds: { round: number; nodes: { matchId: string; slotCount: number; fed: boolean }[] }[], c: Canvas,
): { boxes: BracketBox[]; colW: number } {
  const A = contentArea(c)
  const wide = c.w > 3000
  const R = rounds.length
  if (R === 0) return { boxes: [], colW: 0 }
  const gapX = wide ? 380 : 150
  const colW = Math.min((A.w - (R - 1) * gapX) / R, wide ? 1250 : 840)
  const total = R * colW + (R - 1) * gapX
  const x0 = A.x + centre(A.w, total)
  const gapY = wide ? 28 : 20
  const boxes: BracketBox[] = []
  rounds.forEach((rd, ri) => {
    const nn = rd.nodes.length
    const x = x0 + ri * (colW + gapX)
    const fed = rd.nodes.some((n) => n.fed)
    // winner boxes are slim; slot boxes grow with their rows
    const maxH = fed ? Math.min(A.h, 100 + 4 * (wide ? 150 : 125)) : (wide ? 230 : 210)
    const h = Math.min((A.h - (nn - 1) * gapY) / nn, maxH)
    const y0 = A.y + centre(A.h, nn * h + (nn - 1) * gapY)
    rd.nodes.forEach((n, k) => {
      const y = y0 + k * (h + gapY)
      const head = Math.round(Math.min(78, h * 0.27))
      const rowH = (h - head - 16) / Math.max(1, n.slotCount)
      boxes.push({
        matchId: n.matchId, round: rd.round, x, y, w: colW, h, head, style: n.fed ? 'slots' : 'winner',
        slotY: Array.from({ length: n.slotCount }, (_, i) => y + head + 8 + rowH * i + rowH / 2),
      })
    })
  })
  return { boxes, colW }
}
