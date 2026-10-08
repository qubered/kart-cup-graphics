import type { OutputConfig, OutputFormat } from '../../../shared/types'

export type Tile =
  | { kind: 'output'; outputId: string; view: 'program' | 'preview'; x: number; y: number; w: number; h: number }
  | { kind: 'info' | 'standings'; x: number; y: number; w: number; h: number }

export const MV_W = 1920
export const MV_H = 1080
const M = 10
const CANVAS: Record<OutputFormat, { w: number; h: number }> = {
  wide: { w: 3840, h: 1152 },
  twin: { w: 1920, h: 1152 },
  hd: { w: 1920, h: 1080 },
}

export function multiviewLayout(outputs: OutputConfig[]): Tile[] {
  const tiles: Tile[] = []
  const inner = MV_W - 2 * M
  const wide = outputs.find((o) => o.format === 'wide')
  let y = M
  if (wide) {
    const c = CANVAS.wide
    const h = Math.round((inner * c.h) / c.w)
    tiles.push({ kind: 'output', outputId: wide.id, view: 'program', x: M, y, w: inner, h })
    y += h + M
  }
  // Info row: [preview][info.......][standings]
  const pw = 620
  const rowH = wide ? Math.round((pw * CANVAS.wide.h) / CANVAS.wide.w) : 186
  const sw = 410
  let ix = M
  if (wide) {
    tiles.push({ kind: 'output', outputId: wide.id, view: 'preview', x: M, y, w: pw, h: rowH })
    ix = M + pw + M
  }
  const sx = MV_W - M - sw
  tiles.push({ kind: 'info', x: ix, y, w: sx - M - ix, h: rowH })
  // Standings runs the full height of the lower area (mockup); the bottom row sits to its left.
  tiles.push({ kind: 'standings', x: sx, y, w: sw, h: MV_H - M - y })
  y += rowH + M

  const rest = outputs.filter((o) => o !== wide)
  if (rest.length) {
    const aspects = rest.map((o) => CANVAS[o.format].w / CANVAS[o.format].h)
    const sum = aspects.reduce((a, b) => a + b, 0)
    const avail = sx - 2 * M - M * (rest.length - 1)
    const maxH = MV_H - M - y
    const h = Math.max(1, Math.floor(Math.min(maxH, avail / sum)))
    let x = M
    rest.forEach((o, i) => {
      const w = Math.floor(h * aspects[i])
      tiles.push({ kind: 'output', outputId: o.id, view: 'program', x, y, w, h })
      x += w + M
    })
  }
  return tiles
}
