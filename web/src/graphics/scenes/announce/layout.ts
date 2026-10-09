// Pure geometry for the announce scene. The hero is designed at a fixed size and uniformly scaled (transform) into the area between
// the two flag bands, so it looks the same on every output. Same rule as win/layout.ts: medallion beside the text when the area is wide.
import type { OutputFormat } from '../../../../../shared/types'

export const TWIN_HALF = 960
const MAX_SCALE = 1.35
const CANVAS: Record<OutputFormat, { w: number; h: number }> = { wide: { w: 3840, h: 1152 }, twin: { w: 1920, h: 1152 }, hd: { w: 1920, h: 1080 } }

/** Flag square = 5.2% of the canvas height (60 px @1152). A band is two squares tall. */
export const flagSquare = (h: number): number => h * 0.052
/** Height of a flag band plus its trim: the part of the top and bottom edge the hero must stay clear of. */
export const bandHeight = (h: number): number => Math.round(flagSquare(h) * 2 + h * 0.024)

export interface HeroDesign {
  dw: number; dh: number; med: number; head: number; nm: number; nmw: number; ch: number; chs: number; sub: number; gap: number
}
export const HERO_H: HeroDesign = { dw: 1640, dh: 640, med: 480, head: 110, nm: 210, nmw: 1100, ch: 52, chs: 10, sub: 60, gap: 60 }
export const HERO_V: HeroDesign = { dw: 900, dh: 880, med: 340, head: 90, nm: 150, nmw: 860, ch: 40, chs: 8, sub: 44, gap: 6 }

export interface AnnouncePlaced { left: number; top: number; scale: number; horizontal: boolean; design: HeroDesign }

/** Where the hero(es) go: one centred hero, or (twin) one per 960 half so nothing straddles x = 960. */
export function announceLayout(format: OutputFormat): { band: number; heroes: AnnouncePlaced[] } {
  const { w, h } = CANVAS[format]
  const band = bandHeight(h)
  const region = { x: 40, y: band + 20, w: (format === 'twin' ? TWIN_HALF : w) - 80, h: h - 2 * band - 40 }
  const horizontal = region.w / region.h > 2.2
  const design = horizontal ? HERO_H : HERO_V
  const scale = Math.min(region.w / design.dw, region.h / design.dh, MAX_SCALE)
  const left = region.x + (region.w - design.dw * scale) / 2
  const top = region.y + (region.h - design.dh * scale) / 2
  const xs = format === 'twin' ? [0, TWIN_HALF] : [0]
  return { band, heroes: xs.map((dx) => ({ left: left + dx, top, scale, horizontal, design })) }
}
