import { describe, expect, it } from 'vitest'
import { multiviewLayout } from '../../web/src/multiview/layout'
import { DEFAULT_OUTPUTS } from '../../shared/defaults'
import type { OutputConfig } from '../../shared/types'

const overlap = (a: { x: number; y: number; w: number; h: number }, b: typeof a) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

function check(outputs: OutputConfig[]) {
  const t = multiviewLayout(outputs)
  expect(t.every((x) => x.x >= 0 && x.y >= 0 && x.x + x.w <= 1920 && x.y + x.h <= 1080)).toBe(true)
  for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) expect(overlap(t[i], t[j])).toBe(false)
  return t
}

describe('multiviewLayout', () => {
  it('default outputs', () => {
    const t = check(DEFAULT_OUTPUTS)
    expect(t.find((x) => x.kind === 'output' && x.outputId === 'wide' && x.view === 'program')).toMatchObject({ x: 10, y: 10, w: 1900, h: 570 })
    expect(t.find((x) => x.kind === 'output' && x.outputId === 'wide' && x.view === 'preview')).toMatchObject({ w: 620 })
    expect(t.find((x) => x.kind === 'standings')).toMatchObject({ w: 410, x: 1500 })
    expect(t.filter((x) => x.kind === 'output' && x.view === 'program')).toHaveLength(4)
  })
  it('no wide output, and many outputs', () => {
    const hd = (id: string): OutputConfig => ({ id, name: id, format: 'hd', safeArea: { top: 0, right: 0, bottom: 0, left: 0 }, graphicsScale: 1 })
    check([hd('a'), hd('b')])
    check([...DEFAULT_OUTPUTS, hd('x'), hd('y'), hd('z')])
    check([])
  })
})
