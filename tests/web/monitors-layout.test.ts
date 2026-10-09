import { describe, expect, it } from 'vitest'
import { MIN_PANE, clampHeight, monitorSize, naturalHeight } from '../../web/src/control/live/centre/layout'

const WIDE = 3840 / 1152
const TWIN = 1920 / 1152
const HD = 1920 / 1080
/** Pane height a result needs: one row side by side, or two rows plus the 12px gap (each monitor = picture + 30px of label bar and borders). */
const used = (w: number, aspect: number, stacked: boolean) => { const one = (w - 4) / aspect + 30; return stacked ? 2 * one + 12 : one }

describe('clampHeight', () => {
  it('keeps the pane between the minimum and the largest useful size', () => {
    expect(clampHeight(10, 500)).toBe(MIN_PANE)
    expect(clampHeight(300.4, 500)).toBe(300)
    expect(clampHeight(900, 500)).toBe(500)
    expect(clampHeight(900, 20)).toBe(MIN_PANE)
  })
})

describe('naturalHeight', () => {
  it('is the pane height with the monitors at the full column width', () => {
    // 1160px column, wide output: two 574px monitors side by side = 574-4 = 570px of picture at 10:3
    expect(naturalHeight(1160, WIDE, false)).toBe(Math.round(570 / WIDE + 30))
    expect(naturalHeight(1160, WIDE, true)).toBe(Math.round(2 * (1156 / WIDE + 30) + 12))
  })
  it('stacked is always taller than side by side', () => {
    for (const aspect of [WIDE, TWIN, HD]) expect(naturalHeight(1160, aspect, true)).toBeGreaterThan(naturalHeight(1160, aspect, false))
  })
})

describe('monitorSize', () => {
  it('at the natural height the monitors fill the column', () => {
    expect(monitorSize(1160, naturalHeight(1160, WIDE, false), WIDE, false)).toBeGreaterThanOrEqual(573)
    expect(monitorSize(1160, naturalHeight(1160, WIDE, true), WIDE, true)).toBeGreaterThanOrEqual(1159)
  })
  it('never exceeds the column or the pane height, whatever the output and arrangement', () => {
    for (const aspect of [WIDE, TWIN, HD]) for (const stacked of [false, true]) for (const boxW of [500, 900, 1160]) for (const height of [120, 200, 340, 500, 800]) {
      const w = monitorSize(boxW, height, aspect, stacked)
      expect(w).toBeGreaterThanOrEqual(0)
      expect(stacked ? w : 2 * w + 12).toBeLessThanOrEqual(boxW + 1)
      expect(used(w, aspect, stacked)).toBeLessThanOrEqual(height + 1)
    }
  })
  it('a shorter pane shrinks the monitors in proportion', () => {
    const big = monitorSize(1160, 200, WIDE, false), small = monitorSize(1160, 150, WIDE, false)
    expect(small).toBeLessThan(big)
    expect(monitorSize(1160, 400, WIDE, true)).toBeLessThan(monitorSize(1160, 700, WIDE, true))
  })
  it('is zero for a pane too small to hold a picture', () => {
    expect(monitorSize(1160, 20, WIDE, false)).toBe(0)
    expect(monitorSize(1160, 20, WIDE, true)).toBe(0)
  })
})
