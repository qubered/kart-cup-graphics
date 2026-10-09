import { describe, expect, it } from 'vitest'
import { MIN_PANE, clampHeight, monitorSize } from '../../web/src/control/live/centre/layout'

const WIDE = 3840 / 1152
const TWIN = 1920 / 1152
const HD = 1920 / 1080
/** Total height of the pair for a result: one row (side by side) or two rows plus the 12px gap, each monitor = picture + 30px of label bar and borders. */
const used = (r: { stacked: boolean; w: number }, aspect: number) => { const one = (r.w - 4) / aspect + 30; return r.stacked ? 2 * one + 12 : one }

describe('clampHeight', () => {
  it('keeps the pane between the minimum and what the Looks library leaves', () => {
    expect(clampHeight(10, 500)).toBe(MIN_PANE)
    expect(clampHeight(300.4, 500)).toBe(300)
    expect(clampHeight(900, 500)).toBe(500)
    expect(clampHeight(900, 20)).toBe(MIN_PANE)
  })
})

describe('monitorSize', () => {
  it('never exceeds the box or the height, whatever the output', () => {
    for (const aspect of [WIDE, TWIN, HD]) for (const boxW of [500, 900, 1160]) for (const height of [120, 200, 340, 500, 800]) {
      const r = monitorSize(boxW, height, aspect)
      expect(r.w).toBeGreaterThanOrEqual(0)
      expect(r.stacked ? r.w : 2 * r.w + 12).toBeLessThanOrEqual(boxW + 1)
      expect(used(r, aspect)).toBeLessThanOrEqual(height + 1)
    }
  })
  it('a short pane keeps Preview and Program side by side and shrinks them to fit', () => {
    const r = monitorSize(1160, 150, WIDE)
    expect(r.stacked).toBe(false)
    expect(r.w).toBeLessThan((1160 - 12) / 2)
  })
  it('a tall pane stacks a wide output into two big monitors', () => {
    const r = monitorSize(1160, 700, WIDE)
    expect(r.stacked).toBe(true)
    expect(r.w).toBeGreaterThan((1160 - 12) / 2)
  })
  it('a roomy pane stays side by side at the full column width when stacking would not be bigger', () => {
    expect(monitorSize(1160, 400, TWIN)).toEqual({ stacked: false, w: 574 })
  })
  it('is zero for a pane too small to hold a picture', () => {
    expect(monitorSize(1160, 20, WIDE).w).toBe(0)
  })
})
