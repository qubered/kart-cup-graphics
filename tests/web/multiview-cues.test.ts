import { describe, expect, it } from 'vitest'
import { cueWindow } from '../../web/src/multiview/cues'
import type { CueStack, Preset } from '../../shared/types'

const presets = ['A', 'B'].map((n, i): Preset => ({ id: `p${i}`, name: n, layers: {}, armed: [] }))
const stack = (n: number, current: string | null, selected: string | null): CueStack => ({
  id: 's', name: 'S', current, selected,
  cues: Array.from({ length: n }, (_, i) => ({ id: `c${i}`, presetId: `p${i % 2}`, take: i % 2 ? 'auto' : 'cut' })),
})

describe('cueWindow', () => {
  it('shows everything when it fits, reusing presets by name', () => {
    const w = cueWindow(stack(3, 'c0', 'c1'), presets, 8)
    expect(w.rows.map((r) => [r.n, r.name, r.take, r.status])).toEqual([[1, 'A', 'cut', 'pgm'], [2, 'B', 'auto', 'pvw'], [3, 'A', 'cut', '']])
    expect(w).toMatchObject({ before: 0, after: 0 })
  })
  it('keeps the standby cue (with one above) in view when the list is long', () => {
    const w = cueWindow(stack(20, 'c9', 'c10'), presets, 4)
    expect(w.rows.map((r) => r.id)).toEqual(['c9', 'c10', 'c11', 'c12'])
    expect(w).toMatchObject({ before: 9, after: 7 })
    expect(cueWindow(stack(20, 'c18', 'c19'), presets, 4).rows.map((r) => r.id)).toEqual(['c16', 'c17', 'c18', 'c19'])
    expect(cueWindow(stack(20, null, null), presets, 4).rows[0].id).toBe('c0')
  })
  it('handles empty stacks', () => {
    expect(cueWindow(stack(0, null, null), presets, 4).rows).toEqual([])
  })
})
