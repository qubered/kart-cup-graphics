import type { OutputFormat, QrStyle } from '../../../shared/types'
import type { TitleLayout } from './title-layout'

export interface QrBox { x: number; y: number; w: number; h: number }
/** How a panel arranges its content: trio = code | text | code (one row); duo = two codes in a row, text under; row = one code, text beside; col = one code, text under. */
export type QrPanelKind = 'trio' | 'duo' | 'row' | 'col'
export interface QrPanel { box: QrBox; kind: QrPanelKind; items: number[]; qr: number; text: number }
export interface QrLayout {
  panels: QrPanel[]
  /** Where the event title sits (a box on the canvas) and the lockup sizing inside it. */
  title: { box: QrBox; top: string; layout: Partial<TitleLayout> } | null
}

/**
 * Geometry of the QR scene per output format and style, in canvas px. Clear of the lower-third band at the bottom.
 * Twins: one code + text per 960 px half, whatever the style.
 */
export function qrLayout(format: OutputFormat, style: QrStyle): QrLayout {
  if (format === 'twin') {
    return {
      panels: [0, 1].map((i) => ({ box: { x: i * 960 + 60, y: 120, w: 840, h: 780 }, kind: 'col' as const, items: [i], qr: 300, text: 28 })),
      title: null,
    }
  }
  if (format === 'wide') {
    if (style === 'center') {
      return { panels: [{ box: { x: 520, y: 150, w: 2800, h: 700 }, kind: 'trio', items: [0, 1], qr: 320, text: 40 }], title: null }
    }
    const sides: QrPanel[] = [0, 1].map((i) => ({ box: { x: i ? 2640 : 100, y: 150, w: 1100, h: 700 }, kind: 'row' as const, items: [i], qr: 300, text: 32 }))
    return {
      panels: sides,
      title: style === 'title'
        ? { box: { x: 1300, y: 0, w: 1240, h: 1152 }, top: '46%', layout: { layout: 'stack', ts: 170, ps: 46, max: 1160, maxLines: 3, maxH: 700 } }
        : null,
    }
  }
  if (style === 'title') {
    return {
      panels: [{ box: { x: 160, y: 520, w: 1600, h: 470 }, kind: 'duo', items: [0, 1], qr: 200, text: 28 }],
      title: { box: { x: 0, y: 0, w: 1920, h: 500 }, top: '50%', layout: { layout: 'stack', ts: 130, ps: 40, max: 1600, maxLines: 2, maxH: 400 } },
    }
  }
  return { panels: [{ box: { x: 160, y: 100, w: 1600, h: 780 }, kind: 'duo', items: [0, 1], qr: 300, text: 34 }], title: null }
}
