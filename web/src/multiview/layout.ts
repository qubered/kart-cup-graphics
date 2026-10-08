import type { OutputConfig, OutputFormat } from '../../../shared/types'

export type Tile =
  | { kind: 'output'; outputId: string; view: 'program' | 'preview'; x: number; y: number; w: number; h: number }
  | { kind: 'info' | 'cues' | 'standings'; x: number; y: number; w: number; h: number }

export const MV_W = 1920
export const MV_H = 1080
const M = 10
const LEFT_MAX = 1300 // widest the PGM|PVW rows may get; the rest is the info / cue list / standings column
const INFO_H = 200
const STANDINGS_H = 300
const CANVAS: Record<OutputFormat, { w: number; h: number }> = {
  wide: { w: 3840, h: 1152 },
  twin: { w: 1920, h: 1152 },
  hd: { w: 1920, h: 1080 },
}

/** One row per output: PGM on the left, PVW beside it, both at the output's aspect. Info, cue list and standings stack in the right column. */
export function multiviewLayout(outputs: OutputConfig[]): Tile[] {
  const tiles: Tile[] = []
  let x0 = M
  if (outputs.length) {
    const inv = outputs.map((o) => CANVAS[o.format].h / CANVAS[o.format].w)
    const avail = MV_H - 2 * M - M * (outputs.length - 1)
    const w = Math.max(1, Math.floor(Math.min(avail / inv.reduce((a, b) => a + b, 0), (LEFT_MAX - M) / 2)))
    let y = M
    outputs.forEach((o, i) => {
      const h = Math.max(1, Math.round(w * inv[i]))
      tiles.push({ kind: 'output', outputId: o.id, view: 'program', x: M, y, w, h })
      tiles.push({ kind: 'output', outputId: o.id, view: 'preview', x: M + w + M, y, w, h })
      y += h + M
    })
    x0 = M + 2 * w + 2 * M
  }
  const rw = MV_W - M - x0
  const cuesY = M + INFO_H + M
  const stY = MV_H - M - STANDINGS_H
  tiles.push({ kind: 'info', x: x0, y: M, w: rw, h: INFO_H })
  tiles.push({ kind: 'cues', x: x0, y: cuesY, w: rw, h: stY - M - cuesY })
  tiles.push({ kind: 'standings', x: x0, y: stY, w: rw, h: STANDINGS_H })
  return tiles
}
