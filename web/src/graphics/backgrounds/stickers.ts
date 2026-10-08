export const TILE_W = 1280
export const TILE_H = 1152
/** Wordmark bands: B and D (D is offset by half a tile). */
export const BANDS = [
  { y: 288, h: 168, dx: 0 },
  { y: 744, h: 168, dx: 640 },
] as const
export const BAND_MAX = 980

export type StickerShape = 'round' | 'ellipse' | 'tag' | 'stripe'
export interface Sticker { x: number; y: number; w: number; h: number; text: string; shape: StickerShape; tone: number; rot: number; size: number }

const rowA = { y: 24, h: 240 }
const rowC = { y: 480, h: 240 }
const rowE = { y: 936, h: 192 }

const s = (row: { y: number; h: number }, x: number, w: number, text: string, shape: StickerShape, tone: number, rot: number, size: number): Sticker =>
  ({ x, y: row.y, w, h: row.h, text, shape, tone, rot, size })

/** One 1280x1152 tile of stickers on a 24px grid (rows A, C, E). */
export const STICKERS: Sticker[] = [
  s(rowA, 24, 360, 'FASTEST LAP', 'round', 0, -2, 64),
  s(rowA, 408, 240, '1ST', 'ellipse', 2, 3, 120),
  s(rowA, 672, 312, 'ITEM BOX', 'tag', 1, -1.5, 64),
  s(rowA, 1008, 240, 'BOOST', 'stripe', 3, 2, 60),
  s(rowC, 24, 288, 'BLUE SHELL', 'stripe', 1, 2, 56),
  s(rowC, 336, 408, 'DRIFT KING', 'round', 3, -2.5, 72),
  s(rowC, 768, 216, '150cc', 'ellipse', 0, 2, 64),
  s(rowC, 1008, 240, 'LAP 3/3', 'tag', 2, -2, 58),
  s(rowE, 24, 288, 'START', 'tag', 2, -2, 70),
  s(rowE, 336, 360, 'GOAL!', 'round', 1, 2, 88),
  s(rowE, 720, 264, 'MUSHROOM', 'stripe', 0, -1.5, 52),
  s(rowE, 1008, 240, 'STAR', 'ellipse', 3, 2.5, 68),
]

/** Grey sticker tones: [fill, ink]. */
export const TONES: [string, string][] = [
  ['#dcdcdc', '#9d9d9d'],
  ['#cfcfcf', '#f6f6f6'],
  ['#e6e6e6', '#a8a8a8'],
  ['#c4c4c4', '#ededed'],
]
