import { describe, expect, it } from 'vitest'
import { mixHex } from '../../shared/palette'
import type { Layers, PlayerView } from '../../shared/types'
import { layersKey } from '../../web/src/control/live/centre/looks'
import { nextAnnounce } from '../../web/src/control/live/scene/scenes'
import { sceneVariant } from '../../web/src/graphics/scene-variant'
import { TWIN_HALF, announceLayout, bandHeight } from '../../web/src/graphics/scenes/announce/layout'

const L = (over: Partial<Layers> = {}): Layers => ({ background: 'none', scene: 'announce', trackCard: false, lowerThirds: { on: false, players: [] }, ...over })
const pv = (slot: number): PlayerView => ({ slot, name: 'A', character: 'Mario', icon: '', art: '', colour: '#e60012', textColour: '#fff', subtitle: '' })

describe('announce layout', () => {
  it('wide and HD put the medallion beside the text, one hero, clear of the flag bands', () => {
    for (const f of ['wide', 'hd'] as const) {
      const { heroes, band } = announceLayout(f)
      const h = f === 'wide' ? 1152 : 1080
      expect(heroes).toHaveLength(1)
      expect(heroes[0].horizontal).toBe(true)
      expect(heroes[0].top).toBeGreaterThanOrEqual(band)
      expect(heroes[0].top + heroes[0].design.dh * heroes[0].scale).toBeLessThanOrEqual(h - band)
      expect(heroes[0].scale).toBeLessThanOrEqual(1.35)
    }
  })
  it('twin repeats a stacked hero in each 960 half and never crosses x = 960', () => {
    const { heroes } = announceLayout('twin')
    expect(heroes).toHaveLength(2)
    expect(heroes.every((h) => !h.horizontal)).toBe(true)
    expect(heroes[1].left - heroes[0].left).toBe(TWIN_HALF)
    const [a, b] = heroes
    expect(a.left).toBeGreaterThanOrEqual(0)
    expect(a.left + a.design.dw * a.scale).toBeLessThanOrEqual(TWIN_HALF)
    expect(b.left).toBeGreaterThanOrEqual(TWIN_HALF)
    expect(b.left + b.design.dw * b.scale).toBeLessThanOrEqual(2 * TWIN_HALF)
  })
  it('band height scales with the canvas (≈ 12% of it)', () => {
    expect(bandHeight(1152)).toBe(147)
    expect(bandHeight(1080)).toBe(138)
  })
})

describe('announce helpers', () => {
  it('mixHex shades toward black and white', () => {
    expect(mixHex('#e60012', '#000000', 0)).toBe('#e60012')
    expect(mixHex('#e60012', '#000000', 1)).toBe('#000000')
    expect(mixHex('#102030', '#ffffff', 1)).toBe('#ffffff')
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080')
  })
  it('next player wraps P4 to P1', () => {
    expect([nextAnnounce({}), nextAnnounce({ announceSlot: 0 }), nextAnnounce({ announceSlot: 2 }), nextAnnounce({ announceSlot: 3 })]).toEqual([1, 1, 3, 0])
  })
  it('another player is another look (and another variant); unset means P1', () => {
    expect(layersKey(L())).toBe(layersKey(L({ announceSlot: 0 })))
    expect(layersKey(L({ announceSlot: 2 }))).not.toBe(layersKey(L()))
    expect(layersKey(L({ scene: 'lineup', announceSlot: 2 }))).toBe(layersKey(L({ scene: 'lineup' }))) // ignored by other scenes
    expect(sceneVariant({ kind: 'announce', player: pv(1) })).not.toBe(sceneVariant({ kind: 'announce', player: pv(2) }))
  })
})
