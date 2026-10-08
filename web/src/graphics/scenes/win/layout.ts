// Pure geometry for the win screens (raceWin / cupWin). Hero and board are designed at a fixed "design" size
// and uniformly scaled (transform) into a region of the canvas, so every part looks identical on every output.
import type { OutputFormat, RaceWinView, CupWinView, ScenePart, WinScreenConfig } from '../../../../../shared/types'

export const MAX_RACE_COLUMNS = 6
const MAX_SCALE = 1.35

export interface Rect { x: number; y: number; w: number; h: number }
export interface Placed { left: number; top: number; scale: number; dw: number; dh: number }
export interface HeroPlaced extends Placed { horizontal: boolean }
export interface BoardPlaced extends Placed { compact: boolean; races: number }
export interface WinLayout { hero: HeroPlaced | null; board: BoardPlaced | null; metaInBoard: boolean }

const CANVAS: Record<OutputFormat, { w: number; h: number }> = { wide: { w: 3840, h: 1152 }, twin: { w: 1920, h: 1152 }, hd: { w: 1920, h: 1080 } }

/** Design size of the hero: medallion beside the text (horizontal) or stacked above it. */
export function heroDesign(horizontal: boolean): { dw: number; dh: number } {
  return horizontal ? { dw: 1640, dh: 640 } : { dw: 900, dh: 880 }
}

/** Design size of the scoreboard. `races` = number of per-race columns shown (0 when the racePoints block is off). */
export function boardDesign(rows: number, races: number, compact: boolean, metaInBoard: boolean): { dw: number; dh: number } {
  const r = Math.max(1, rows)
  if (compact) return { dw: 880 + 100 * races, dh: (races > 0 ? 44 : 0) + r * 106 + (metaInBoard ? 110 : 0) }
  return { dw: 1160 + 130 * races, dh: (races > 0 ? 60 : 0) + r * 166 + (metaInBoard ? 130 : 0) }
}

export function raceColumns(scene: RaceWinView | CupWinView): number {
  return scene.config.blocks.racePoints ? Math.min(MAX_RACE_COLUMNS, scene.races.length) : 0
}

/** Is a block on screen for this part? (A toggled-off block never shows; the part narrows further.) */
export function visibleBlocks(config: WinScreenConfig, part: ScenePart): { hero: boolean; board: boolean } {
  return { hero: config.blocks.hero && part !== 'board', board: config.blocks.board && part !== 'hero' }
}

function fit(region: Rect, dw: number, dh: number): Placed {
  const scale = Math.min(region.w / dw, region.h / dh, MAX_SCALE)
  return { scale, dw, dh, left: region.x + (region.w - dw * scale) / 2, top: region.y + (region.h - dh * scale) / 2 }
}

export function winLayout(format: OutputFormat, part: ScenePart, config: WinScreenConfig, rows: number, races: number): WinLayout {
  const { w, h } = CANVAS[format]
  const vis = visibleBlocks(config, part)
  const both = vis.hero && vis.board
  const wide = format === 'wide'
  const m = 40
  const metaInBoard = !vis.hero && vis.board && (config.blocks.cupEmblem || config.blocks.trackName)
  const heroAt = (region: Rect): HeroPlaced => {
    const horizontal = region.w / region.h > 2.2
    const d = heroDesign(horizontal)
    return { ...fit(region, d.dw, d.dh), horizontal }
  }
  const boardAt = (region: Rect, compact: boolean): BoardPlaced => {
    const d = boardDesign(rows, races, compact, metaInBoard)
    return { ...fit(region, d.dw, d.dh), compact, races }
  }
  if (!both) {
    const region = { x: m, y: m, w: w - 2 * m, h: h - 2 * m }
    return { hero: vis.hero ? heroAt(region) : null, board: vis.board ? boardAt(region, false) : null, metaInBoard }
  }
  if (config.layout === 'heroCentre') {
    const boardH = wide ? 500 : 400
    const hero = heroAt({ x: m, y: 30, w: w - 2 * m, h: h - boardH - 30 - m - 20 })
    const board = boardAt({ x: m, y: h - boardH - m, w: w - 2 * m, h: boardH }, true)
    return { hero, board, metaInBoard: false }
  }
  const heroW = wide ? 1500 : 700
  const hero = heroAt({ x: m, y: m, w: heroW, h: h - 2 * m })
  const board = boardAt({ x: m + heroW + 40, y: m + 20, w: w - heroW - 3 * m - 40, h: h - 2 * m - 40 }, false)
  return { hero, board, metaInBoard: false }
}
