import { describe, expect, it } from 'vitest'
import { DEFAULT_WIN_SCREEN } from '../../shared/tournament'
import type { WinScreenConfig } from '../../shared/types'
import { visibleBlocks, winLayout } from '../../web/src/graphics/scenes/win/layout'

const cfg = (over: Partial<WinScreenConfig['blocks']> = {}, layout: WinScreenConfig['layout'] = 'heroLeft'): WinScreenConfig => ({
  layout, blocks: { ...DEFAULT_WIN_SCREEN.blocks, ...over },
})

describe('win layout', () => {
  it('part narrows the visible blocks, toggles remove them', () => {
    expect(visibleBlocks(cfg(), 'full')).toEqual({ hero: true, board: true })
    expect(visibleBlocks(cfg(), 'hero')).toEqual({ hero: true, board: false })
    expect(visibleBlocks(cfg(), 'board')).toEqual({ hero: false, board: true })
    expect(visibleBlocks(cfg({ hero: false }), 'full')).toEqual({ hero: false, board: true })
  })
  it('heroLeft puts the hero left of the board on every format', () => {
    for (const f of ['wide', 'hd'] as const) {
      const l = winLayout(f, 'full', cfg(), 4, 3)
      expect(l.hero!.left + l.hero!.dw * l.hero!.scale).toBeLessThan(l.board!.left)
    }
  })
  it('heroCentre stacks the board below a centred hero, board compact', () => {
    const l = winLayout('hd', 'full', cfg({}, 'heroCentre'), 4, 3)
    expect(l.board!.compact).toBe(true)
    expect(l.hero!.top + l.hero!.dh * l.hero!.scale).toBeLessThanOrEqual(l.board!.top)
    expect(l.hero!.left + (l.hero!.dw * l.hero!.scale) / 2).toBeCloseTo(960, 0)
  })
  it('stays inside the canvas for all formats, parts and layouts', () => {
    const size = { wide: [3840, 1152], twin: [1920, 1152], hd: [1920, 1080] } as const
    for (const f of ['wide', 'twin', 'hd'] as const)
      for (const part of ['full', 'hero', 'board'] as const)
        for (const layout of ['heroLeft', 'heroCentre'] as const)
          for (const races of [0, 3, 6]) {
            const l = winLayout(f, part, cfg({}, layout), 4, races)
            for (const p of [l.hero, l.board]) {
              if (!p) continue
              expect(p.left).toBeGreaterThanOrEqual(0)
              expect(p.top).toBeGreaterThanOrEqual(0)
              expect(p.left + p.dw * p.scale).toBeLessThanOrEqual(size[f][0] + 0.5)
              expect(p.top + p.dh * p.scale).toBeLessThanOrEqual(size[f][1] + 0.5)
            }
          }
  })
  it('board-only moves the cup/track meta into the board header', () => {
    expect(winLayout('twin', 'board', cfg(), 4, 3).metaInBoard).toBe(true)
    expect(winLayout('twin', 'board', cfg({ cupEmblem: false, trackName: false }), 4, 3).metaInBoard).toBe(false)
    expect(winLayout('wide', 'full', cfg(), 4, 3).metaInBoard).toBe(false)
  })
})
