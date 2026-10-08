import type { OutputFormat } from '../../../shared/types'

/** Per-format event-title layout (docs/mockups/shared/mockup.js TITLE_SIZES). Twin values are per 960 px half. */
export interface TitleLayout {
  layout: 'line' | 'stack'
  /** Title line size in px. */
  ts: number
  /** Pre-title pill size in px. */
  ps: number
  /** Hold message size in px. */
  ms: number
  /** Maximum line width in px. */
  max: number
  maxLines: number
  maxH: number
  /** Vertical centre of the lockup on the title scene / on HOLD. */
  top: string
  holdTop: string
}

export const TITLE_LAYOUT: Record<OutputFormat, TitleLayout> = {
  wide: { layout: 'line', ts: 210, ps: 58, ms: 90, max: 3600, maxLines: 1, maxH: 9999, top: '50%', holdTop: '42%' },
  hd: { layout: 'stack', ts: 190, ps: 50, ms: 64, max: 1700, maxLines: 2, maxH: 640, top: '50%', holdTop: '42%' },
  twin: { layout: 'stack', ts: 170, ps: 40, ms: 56, max: 860, maxLines: 3, maxH: 760, top: '50%', holdTop: '43%' },
}

export interface BrokenTitle { lines: string[]; accentLine: boolean; size: number }

/** All ways to split `w` into exactly `n` non-empty consecutive groups, joined with spaces. */
function splits(w: string[], n: number): string[][] {
  if (n === 1) return [[w.join(' ')]]
  const out: string[][] = []
  for (let k = 1; k <= w.length - n + 1; k++) {
    for (const rest of splits(w.slice(k), n - 1)) out.push([w.slice(0, k).join(' '), ...rest])
  }
  return out
}

/**
 * Chooses the line breaks for the event title (port of layoutTitles() in the mockups).
 * `measure(text)` = width of the text at 100 px in the event-title font.
 * - line layout: one line holding title + accent (accentLine false), size = ts (fitText shrinks it to fit).
 * - stack layout: the accent gets its own line; the title is split into 1..maxLines lines. The fewest lines whose
 *   size reaches 85% of ts win; otherwise the split with the largest size. `size` is the unfloored fitted size.
 */
export function breakTitle(title: string, accent: string, cfg: TitleLayout, measure: (text: string) => number): BrokenTitle {
  if (cfg.layout === 'line') {
    return { lines: [[title, accent].filter(Boolean).join(' ')], accentLine: false, size: cfg.ts }
  }
  const words = title.split(/\s+/).filter(Boolean)
  if (!words.length) return { lines: [], accentLine: !!accent, size: cfg.ts }
  const fit = (t: string) => cfg.max / (measure(t) / 100 + 0.28) // 0.28em = left + right padding
  const cands: { ls: string[]; n: number; size: number }[] = []
  for (let n = 1; n <= Math.min(cfg.maxLines, words.length); n++) {
    for (const ls of splits(words, n)) {
      const all = accent ? [...ls, accent] : ls
      cands.push({ ls, n, size: Math.min(cfg.ts, ...all.map(fit), cfg.maxH / (all.length * 1.16)) })
    }
  }
  const best =
    cands.filter((c) => c.size >= 0.85 * cfg.ts).sort((x, y) => x.n - y.n || y.size - x.size)[0] ??
    [...cands].sort((x, y) => y.size - x.size || x.n - y.n)[0]
  return { lines: best.ls, accentLine: !!accent, size: best.size }
}
