import { describe, expect, it } from 'vitest'
import { indexCatalog } from '../../shared/catalog'
import { createDefaultState, EMPTY_LAYERS } from '../../shared/defaults'
import { countPendingChanges } from '../../shared/diff'
import { deriveView } from '../../shared/view'
import { fixtureCatalog } from '../fixtures/catalog'

const idx = indexCatalog(fixtureCatalog)
const st = createDefaultState(idx, 0)
const hd = st.outputs[2]
const on = { ...EMPTY_LAYERS, lowerThirds: { on: true, players: [2, 0] } }

describe('countPendingChanges', () => {
  const a = deriveView(st.draft, on, hd, idx)
  it('zero when identical', () => expect(countPendingChanges(a, a)).toBe(0))
  it('one per changed lower third', () => {
    const renamed = { ...st.draft, players: st.draft.players.map((p, i) => (i === 0 ? { ...p, name: 'SAM' } : p)) }
    expect(countPendingChanges(deriveView(renamed, on, hd, idx), a)).toBe(1)
  })
  it('background change', () => expect(countPendingChanges(deriveView(st.draft, { ...on, background: 'B' }, hd, idx), a)).toBe(1))
  it('fonts group counts once', () => {
    const d = { ...st.draft, typography: { ...st.draft.typography, headings: { font: 'Saira', look: 'plain' as const }, names: { font: 'Saira' } } }
    expect(countPendingChanges(deriveView(d, on, hd, idx), a)).toBe(1)
  })
  it('undefined program counts non-empty sections', () => {
    expect(countPendingChanges(deriveView(st.draft, { ...on, scene: 'title', trackCard: true }, hd, idx), undefined)).toBe(4)
  })
})
