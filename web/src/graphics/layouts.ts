import type { OutputFormat, SafeArea } from '../../../shared/types'

const CARD_W = 430
const CARD_H = 160
const TWIN_X = [40, 490, 1000, 1450]
const CANVAS_W: Record<OutputFormat, number> = { wide: 3840, twin: 1920, hd: 1920 }
const CANVAS_H: Record<OutputFormat, number> = { wide: 1152, twin: 1152, hd: 1080 }

export function lowerThirdSlots(
  format: OutputFormat,
  slots: number[],
  safe: SafeArea,
  scale: number,
): { slot: number; x: number; y: number; scale: number }[] {
  if (format === 'twin') {
    const y = 1152 - 70 - CARD_H - safe.bottom
    return slots.map((slot) => ({ slot, x: (TWIN_X[slot] ?? TWIN_X[0]) + safe.left, y, scale }))
  }
  const eff = format === 'wide' ? scale * 1.5 : scale
  const gap = format === 'wide' ? 30 : 20
  const w = CARD_W * eff
  const n = slots.length
  const total = n * w + Math.max(0, n - 1) * gap
  const x0 = safe.left + (CANVAS_W[format] - safe.left - safe.right - total) / 2
  const y = CANVAS_H[format] - 70 - CARD_H * eff - safe.bottom
  return slots.map((slot, i) => ({ slot, x: x0 + i * (w + gap), y, scale: eff }))
}

export function trackCardSlots(format: OutputFormat, safe: SafeArea): { x: number; y: number }[] {
  const y = 40 + safe.top
  return format === 'twin'
    ? [{ x: 40 + safe.left, y }, { x: 1000 + safe.left, y }]
    : [{ x: 40 + safe.left, y }]
}
