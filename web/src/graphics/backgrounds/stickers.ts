import { STICKER_TILE, TILE_H, TILE_W } from './icons'

export { TILE_H, TILE_W }

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))

/** The sticker tile with the wordmark bands set to `watermark` (same substitution as the mockup). */
export function stickerTile(watermark: string): string {
  return STICKER_TILE.replace('>WM<', '>' + esc(watermark) + '<')
}

/** `<use>` copies of the tile (the original sits at x = 0), as in the mockup. */
export function tileUses(w: number): string {
  const copies = Math.ceil(w / TILE_W) + 2
  let uses = ''
  for (let i = -1; i < copies; i++) if (i !== 0) uses += `<use href="#sheet-tile" x="${i * TILE_W}"/>`
  return uses
}
export const tileCopies = (w: number) => Math.ceil(w / TILE_W) + 2

/** Parade: 7 vehicles per 3840 px (positions scaled to the canvas), duplicated one canvas width to the right for a seamless loop. */
export const PARADE_X = [60, 600, 1100, 1700, 2300, 2800, 3350]
export const PARADE_SCALE = [1, 1.15, 0.9, 1.25, 1, 1.1, 0.95]
export function paradeVehicles(w: number) {
  return [0, w].flatMap(off => PARADE_X.map((x, i) => ({
    id: `${off}-${i}`, href: i % 3 === 1 ? '#bike' : '#kart', w: 240 * PARADE_SCALE[i], h: 150 * PARADE_SCALE[i],
    left: x * (w / 3840) + off, delay: i * 0.13,
  })))
}

const BASE_ATTR = 'data-base'
/**
 * Fit SVG sticker text. `text[data-max]`: shrink the font-size 1px at a time down to 60% of its base size, then compress the
 * glyphs to `data-max` with textLength/spacingAndGlyphs (the SVG equivalent of scaleX). `text[data-fitw]` (wordmark): shrink only.
 */
export function fitStickerText(root: Element) {
  root.querySelectorAll<SVGTextElement>('text[data-max], text[data-fitw]').forEach(t => {
    if (!t.hasAttribute(BASE_ATTR)) t.setAttribute(BASE_ATTR, t.getAttribute('font-size') ?? '16')
    const base = +t.getAttribute(BASE_ATTR)!
    t.removeAttribute('textLength'); t.removeAttribute('lengthAdjust')
    t.setAttribute('font-size', String(base))
    const wordmark = t.hasAttribute('data-fitw')
    const max = +(t.getAttribute(wordmark ? 'data-fitw' : 'data-max') as string)
    let w = t.getComputedTextLength()
    if (w <= max) return
    if (wordmark) { t.setAttribute('font-size', String(Math.floor(base * max / w))); return }
    const floor = Math.max(8, base * 0.6)
    let fs = base
    while (w > max && fs > floor) { fs -= 1; t.setAttribute('font-size', String(fs)); w = t.getComputedTextLength() }
    if (w > max) { t.setAttribute('textLength', String(max - 2)); t.setAttribute('lengthAdjust', 'spacingAndGlyphs') }
  })
}
