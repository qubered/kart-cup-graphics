import { describe, expect, it } from 'vitest'
import { indexCatalog } from '../../shared/catalog'
import { createDefaultState, EMPTY_LAYERS } from '../../shared/defaults'
import { reduce } from '../../shared/reducer'
import { commandSchema, showDataSchema } from '../../shared/schema'
import { deriveView } from '../../shared/view'
import type { NoticeDoc } from '../../shared/types'
import { fixtureCatalog } from '../fixtures/catalog'

const idx = indexCatalog(fixtureCatalog)
const ctx = { catalog: idx, now: () => 0, id: () => 'id' } as unknown as Parameters<typeof reduce>[2]
const doc: NoticeDoc = { blocks: [{ align: 'center', runs: [{ text: 'HELLO', bold: true, color: '#ff0000', font: 'Saira', size: 80 }] }] }

describe('notice board', () => {
  const st = createDefaultState(idx, 0)
  it('setNotice updates the draft and the notice scene view', () => {
    const s = reduce(st, { type: 'setNotice', doc }, ctx)
    expect(s.draft.notice).toEqual(doc)
    expect(deriveView(s.draft, { ...EMPTY_LAYERS, scene: 'notice' }, s.outputs[0], idx).scene).toEqual({ kind: 'notice', doc })
  })
  it('is not offered on twin outputs', () => {
    expect(deriveView(st.draft, { ...EMPTY_LAYERS, scene: 'notice' }, st.outputs[1], idx).scene).toBeNull()
  })
  it('validates commands and rejects bad colours', () => {
    expect(commandSchema.safeParse({ type: 'setNotice', doc }).success).toBe(true)
    const bad = { blocks: [{ align: 'left', runs: [{ text: 'x', color: 'red;background:url(x)' }] }] }
    expect(commandSchema.safeParse({ type: 'setNotice', doc: bad }).success).toBe(false)
  })
  it('older show data without a notice still loads', () => {
    const { notice: _n, ...old } = st.draft
    expect(showDataSchema.parse(old).notice).toEqual({ blocks: [] })
  })
})
