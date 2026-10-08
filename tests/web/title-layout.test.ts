import { describe, expect, it } from 'vitest'
import { TITLE_LAYOUT, breakTitle } from '../../web/src/graphics/title-layout'

const measure = (t: string) => t.length * 118 // each char = 118 px at 100 px

describe('breakTitle', () => {
  it('wide is one line containing the accent', () => {
    const r = breakTitle('KART CUP', '2026', TITLE_LAYOUT.wide, measure)
    expect(r.lines).toEqual(['KART CUP 2026'])
    expect(r.accentLine).toBe(false)
  })
  it('hd keeps a short title on one line', () => {
    const r = breakTitle('KART CUP', '2026', TITLE_LAYOUT.hd, measure)
    expect(r.lines).toEqual(['KART CUP'])
    expect(r.accentLine).toBe(true)
  })
  it('twin splits the same title in two', () => {
    const r = breakTitle('KART CUP', '2026', TITLE_LAYOUT.twin, measure)
    expect(r.lines).toEqual(['KART', 'CUP'])
    expect(r.accentLine).toBe(true)
  })
  it('long titles use more lines but never more than maxLines', () => {
    const r = breakTitle('SUPER MEGA KART CHAMPIONSHIP', '', TITLE_LAYOUT.twin, measure)
    expect(r.lines.length).toBeLessThanOrEqual(3)
    expect(r.lines.join(' ')).toBe('SUPER MEGA KART CHAMPIONSHIP')
    expect(r.accentLine).toBe(false)
  })
  it('handles an empty title', () => {
    expect(breakTitle('', 'X', TITLE_LAYOUT.hd, measure).lines).toEqual([])
  })
})
