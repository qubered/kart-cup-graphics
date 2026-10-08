import { describe, expect, it } from 'vitest'
import { layoutBracket, layoutMatches } from '../../web/src/graphics/scenes/matches/layout'
import type { MatchesLayout } from '../../shared/types'

const CANVASES = [{ w: 3840, h: 1152 }, { w: 1920, h: 1080 }, { w: 1920, h: 1152 }]
const LAYOUTS: MatchesLayout[] = ['grid', 'row', 'stack', 'focus']

describe('layoutMatches', () => {
  it('keeps every card inside the canvas and never overlaps', () => {
    for (const c of CANVASES) for (const l of LAYOUTS) for (let n = 1; n <= 6; n++) {
      const s = layoutMatches(l, n, c, 1)
      expect(s).toHaveLength(n)
      for (const a of s) {
        expect(a.x).toBeGreaterThanOrEqual(0); expect(a.y).toBeGreaterThanOrEqual(0)
        expect(a.x + a.w).toBeLessThanOrEqual(c.w); expect(a.y + a.h).toBeLessThanOrEqual(c.h)
      }
      for (const a of s) for (const b of s) if (a !== b) {
        expect(a.x + a.w <= b.x + 0.5 || b.x + b.w <= a.x + 0.5 || a.y + a.h <= b.y + 0.5 || b.y + b.h <= a.y + 0.5).toBe(true)
      }
    }
  })
  it('focus makes the focused card the only large one', () => {
    const s = layoutMatches('focus', 4, { w: 3840, h: 1152 }, 2)
    expect(s[2].focus).toBe(true)
    expect(s.filter((x) => x.orient === 'strip')).toHaveLength(3)
  })
  it('twin 2-up row splits at the middle of the canvas', () => {
    const [a, b] = layoutMatches('row', 2, { w: 1920, h: 1152 })
    expect(a.x + a.w).toBeLessThan(960); expect(b.x).toBeGreaterThan(960)
  })
  it('returns nothing for no cards', () => expect(layoutMatches('grid', 0, CANVASES[0])).toEqual([]))
})

describe('layoutBracket', () => {
  it('puts one column per round and a slot anchor per player', () => {
    const { boxes } = layoutBracket([
      { round: 0, nodes: [1, 2, 3, 4].map((i) => ({ matchId: `s${i}`, slotCount: 4, fed: false })) },
      { round: 1, nodes: [{ matchId: 'f', slotCount: 4, fed: true }] },
    ], CANVASES[1])
    expect(boxes).toHaveLength(5)
    expect(boxes.find((b) => b.matchId === 'f')!.slotY).toHaveLength(4)
    expect(boxes.find((b) => b.matchId === 'f')!.x).toBeGreaterThan(boxes[0].x + boxes[0].w)
  })
})
