import { describe, expect, it } from 'vitest'
import { indexCatalog } from '../../shared/catalog'
import { createDefaultState, EMPTY_LAYERS } from '../../shared/defaults'
import { reduce } from '../../shared/reducer'
import { commandSchema, showDataSchema } from '../../shared/schema'
import { deriveView } from '../../shared/view'
import { fixtureCatalog } from '../fixtures/catalog'

const idx = indexCatalog(fixtureCatalog)
const ctx = { catalog: idx, now: () => 0, id: () => 'id' } as unknown as Parameters<typeof reduce>[2]

describe('QR scene', () => {
  const st = createDefaultState(idx, 0)
  it('ships with two labelled codes and text by default', () => {
    expect(st.draft.qr.items.map((i) => i.label)).toEqual(['External', 'Internal'])
    expect(st.draft.qr.text).toContain('donation')
  })
  it('setQr patches text and items independently', () => {
    const a = reduce(st, { type: 'setQr', patch: { text: 'Hi' } }, ctx)
    expect(a.draft.qr.text).toBe('Hi')
    expect(a.draft.qr.items).toEqual(st.draft.qr.items)
    const items: [{ label: string; url: string }, { label: string; url: string }] = [{ label: 'A', url: 'https://a.test' }, { label: 'B', url: 'https://b.test' }]
    expect(reduce(a, { type: 'setQr', patch: { items } }, ctx).draft.qr).toEqual({ text: 'Hi', items })
  })
  it('derives the scene on every format, defaulting to the centre style', () => {
    for (const o of st.outputs) {
      const scene = deriveView(st.draft, { ...EMPTY_LAYERS, scene: 'qr' }, o, idx).scene
      expect(scene).toMatchObject({ kind: 'qr', style: 'center', items: st.draft.qr.items })
    }
    const wide = deriveView(st.draft, { ...EMPTY_LAYERS, scene: 'qr', qrStyle: 'title' }, st.outputs[0], idx).scene
    expect(wide).toMatchObject({ kind: 'qr', style: 'title', title: { title: st.draft.event.title } })
  })
  it('validates commands and layers', () => {
    expect(commandSchema.safeParse({ type: 'setQr', patch: { text: 'x' } }).success).toBe(true)
    expect(commandSchema.safeParse({ type: 'setQr', patch: { items: [{ label: 'a', url: 'b' }] } }).success).toBe(false)
    expect(commandSchema.safeParse({ type: 'setLayers', outputId: 'wide', patch: { scene: 'qr', qrStyle: 'sides' } }).success).toBe(true)
    expect(commandSchema.safeParse({ type: 'setLayers', outputId: 'wide', patch: { qrStyle: 'nope' } }).success).toBe(false)
  })
  it('older show data without QR content still loads with the defaults', () => {
    const { qr: _q, ...old } = st.draft
    expect(showDataSchema.parse(old).qr).toEqual(st.draft.qr)
  })
})
