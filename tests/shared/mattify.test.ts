import { describe, expect, it } from 'vitest'
import { indexCatalog } from '../../shared/catalog'
import { createDefaultState } from '../../shared/defaults'
import { MATTIFY_IMAGE } from '../../shared/mattify'
import { buildOutputPayload } from '../../shared/protocol'
import { reduce } from '../../shared/reducer'
import { commandSchema, showStateSchema } from '../../shared/schema'
import { MATTIFY_OPACITY, patternTile, PATTERN_TILE } from '../../web/src/graphics/backgrounds/icons'
import { fixtureCatalog } from '../fixtures/catalog'

const idx = indexCatalog(fixtureCatalog)
const ctx = { catalog: idx, now: 1000, random: () => 0 }
const base = createDefaultState(idx, 0)

describe('mattify setting', () => {
  it('is off by default and toggles with setMattify', () => {
    expect(base.settings.mattify).toBe(false)
    const on = reduce(base, { type: 'setMattify', on: true }, ctx)
    expect(on.settings.mattify).toBe(true)
    expect(reduce(on, { type: 'setMattify', on: false }, ctx).settings.mattify).toBe(false)
  })
  it('is a no-op (same state object) when unchanged', () => {
    expect(reduce(base, { type: 'setMattify', on: false }, ctx)).toBe(base)
  })
  it('does not touch Program, so it needs no Take', () => {
    const on = reduce(base, { type: 'setMattify', on: true }, ctx)
    expect(on.program).toBe(base.program)
    expect(on.draft).toBe(base.draft)
  })
  it('survives resetShow and importShow', () => {
    const on = reduce(base, { type: 'setMattify', on: true }, ctx)
    expect(reduce(on, { type: 'resetShow' }, ctx).settings.mattify).toBe(true)
    const file = { draft: on.draft, outputs: on.outputs, layers: on.layers, transition: on.transition, presets: [], stacks: [] }
    expect(reduce(on, { type: 'importShow', file }, ctx).settings.mattify).toBe(true)
  })
  it('command schema accepts a boolean only', () => {
    expect(commandSchema.safeParse({ type: 'setMattify', on: true }).success).toBe(true)
    expect(commandSchema.safeParse({ type: 'setMattify', on: 'yes' }).success).toBe(false)
    expect(commandSchema.safeParse({ type: 'setMattify' }).success).toBe(false)
  })
  it('state files saved before the setting existed still load, with it off', () => {
    const { settings: _drop, ...old } = base
    const r = showStateSchema.safeParse(old)
    expect(r.success).toBe(true)
    expect(r.success && r.data.settings).toEqual({ mattify: false })
  })
  it('rides every output payload (program and preview)', () => {
    const on = reduce(base, { type: 'setMattify', on: true }, ctx)
    expect(buildOutputPayload(base, 'wide', 'program', idx).mattify).toBe(false)
    expect(buildOutputPayload(on, 'wide', 'program', idx).mattify).toBe(true)
    expect(buildOutputPayload(on, 'wide', 'preview', idx).mattify).toBe(true)
    expect(buildOutputPayload(on, 'ghost', 'program', idx).mattify).toBe(true)
  })
})

describe('patternTile', () => {
  it('keeps the mushroom when off', () => {
    expect(patternTile(false)).toBe(PATTERN_TILE)
    expect(patternTile(false)).toContain('href="#i-mush"')
  })
  it('swaps only the mushroom for the image when on', () => {
    const t = patternTile(true)
    expect(t).not.toContain('href="#i-mush"')
    expect(t).toContain(`<image data-mattify href="${MATTIFY_IMAGE}" x="440" y="150" width="120" height="120"`)
    expect(t).toContain(`opacity="${MATTIFY_OPACITY}"`)
    // every other icon is untouched
    for (const id of ['i-wheel', 'i-shield', 'i-sign', 'i-tire2', 'i-star', 'i-speedo', 'i-logo', 'i-box', 'i-flag'])
      expect(t).toContain(`href="#${id}"`)
  })
})

describe('mattify opacity', () => {
  // Black at MATTIFY_OPACITY over the pattern background must land on the pattern icon colour.
  const bg = [0x05, 0x53, 0xa6], icon = [0x03, 0x45, 0x8f]
  it('makes black match the other icons', () => {
    const over = bg.map((c) => (1 - MATTIFY_OPACITY) * c)
    for (let i = 0; i < 3; i++) expect(Math.abs(over[i] - icon[i])).toBeLessThan(3)
  })
})
