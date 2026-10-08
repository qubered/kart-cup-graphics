import { describe, expect, it } from 'vitest'
import { enterDuration, exitDuration, overshoot } from '../../web/src/graphics/motion'
import { lowerThirdSlots, trackCardSlots } from '../../web/src/graphics/layouts'

const z = { top: 0, right: 0, bottom: 0, left: 0 }
describe('motion', () => {
  it('durations', () => {
    expect(enterDuration('cut', 'slow')).toBe(0)
    expect(enterDuration('auto', 'normal')).toBe(500)
    expect(exitDuration('auto', 'normal')).toBe(300)
  })
  it('overshoot', () => {
    expect(overshoot(0)).toBeCloseTo(0)
    expect(overshoot(1)).toBeCloseTo(1)
    expect(Math.max(...Array.from({ length: 101 }, (_, i) => overshoot(i / 100)))).toBeGreaterThan(1)
  })
})
describe('layouts', () => {
  it('twin', () => {
    expect(lowerThirdSlots('twin', [0, 1, 2, 3], z, 1).map((s) => [s.x, s.y])).toEqual([[40, 922], [490, 922], [1000, 922], [1450, 922]])
    expect(lowerThirdSlots('twin', [0], { ...z, bottom: 30 }, 1)[0].y).toBe(892)
  })
  it('hd and wide', () => {
    expect(lowerThirdSlots('hd', [0, 1], z, 1).map((s) => s.x)).toEqual([520, 970])
    expect(lowerThirdSlots('wide', [0, 1, 2, 3], z, 1)[0]).toMatchObject({ x: 585, y: 842, scale: 1.5 })
  })
  it('track cards', () => {
    expect(trackCardSlots('twin', { ...z, left: 10, top: 5 })).toEqual([{ x: 50, y: 45 }, { x: 1010, y: 45 }])
    expect(trackCardSlots('hd', z)).toEqual([{ x: 40, y: 40 }])
  })
})
