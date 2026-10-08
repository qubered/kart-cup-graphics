import { describe, expect, it } from 'vitest'
import { indexCatalog } from '../../shared/catalog'
import { createDefaultState } from '../../shared/defaults'
import { buildOutputPayload } from '../../shared/protocol'
import { reduce } from '../../shared/reducer'
import { commandSchema } from '../../shared/schema'
import { deriveView } from '../../shared/view'
import { fixtureCatalog } from '../fixtures/catalog'

const idx = indexCatalog(fixtureCatalog)
const ctx = { catalog: idx, now: 1000, random: () => 0 }
const base = createDefaultState(idx, 0)

describe('custom logo', () => {
  it('setLogo stores the url, reaches outputs, and null clears it', () => {
    const on = reduce(base, { type: 'setLogo', url: '/uploads/logo-1.png' }, ctx)
    expect(buildOutputPayload(on, 'wide', 'program', idx).logo).toBe('/uploads/logo-1.png')
    const off = reduce(on, { type: 'setLogo', url: null }, ctx)
    expect(buildOutputPayload(off, 'wide', 'program', idx).logo).toBeNull()
    expect(off.settings).toEqual({ mattify: false })
  })
  it('only accepts server-generated upload paths', () => {
    expect(commandSchema.safeParse({ type: 'setLogo', url: '/uploads/logo-1.png' }).success).toBe(true)
    expect(commandSchema.safeParse({ type: 'setLogo', url: 'https://x/y.png' }).success).toBe(false)
  })
  it('title scene logo mode defaults to corner and follows the layer', () => {
    const out = base.outputs[0]
    const view = (logo?: 'off' | 'corner' | 'title') => deriveView(base.draft, { ...base.layers.wide, scene: 'title', logo }, out, idx).scene
    expect(view()).toMatchObject({ kind: 'title', logo: 'corner' })
    expect(view('title')).toMatchObject({ logo: 'title' })
    expect(view('off')).toMatchObject({ logo: 'off' })
  })
})
