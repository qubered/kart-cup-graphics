import { describe, expect, it } from 'vitest'
import { indexCatalog } from '../../shared/catalog'
import { createDefaultState } from '../../shared/defaults'
import { buildControlPayload, buildOutputPayload, clientMessageSchema } from '../../shared/protocol'
import { reduce } from '../../shared/reducer'
import { fixtureCatalog } from '../fixtures/catalog'

const idx = indexCatalog(fixtureCatalog)
const ctx = { catalog: idx, now: 1000, random: () => 0 }
const s = createDefaultState(idx, 0)

describe('protocol', () => {
  it('output payloads', () => {
    expect(buildOutputPayload(s, 'ghost', 'program', idx).view).toBeNull()
    expect(buildOutputPayload(s, 'ghost', 'preview', idx).view).toBeNull()
    expect(buildOutputPayload(reduce(s, { type: 'hold', on: true }, ctx), 'wide', 'program', idx).hold?.message).toBe('BACK SHORTLY')
    expect(buildOutputPayload(s, 'wide', 'program', idx).hold).toBeNull()
    expect(buildOutputPayload(s, 'wide', 'preview', idx).frame).toEqual({ mode: 'cut', speed: 'normal', takenAt: 0 })
    expect(buildOutputPayload(s, 'wide', 'preview', idx).view?.background?.id).toBe('A')
    expect(buildOutputPayload(s, 'wide', 'program', idx).view?.background).toBeNull()
    const taken = reduce(reduce(s, { type: 'arm', outputIds: ['wide'] }, ctx), { type: 'take', mode: 'auto' }, ctx)
    expect(buildOutputPayload(taken, 'wide', 'program', idx).frame).toEqual({ mode: 'auto', speed: 'normal', takenAt: 1000 })
    expect(buildOutputPayload(reduce(s, { type: 'ftb', on: true }, ctx), 'wide', 'program', idx).ftb).toBe(true)
  })
  it('control payload pending', () => {
    const p = buildControlPayload(s, {}, idx)
    expect(p.pending.wide).toBeGreaterThan(0)
    const taken = reduce(s, { type: 'take', mode: 'cut', outputIds: ['wide'] }, ctx)
    expect(buildControlPayload(taken, {}, idx).pending.wide).toBe(0)
  })
  it('clientMessageSchema', () => {
    expect(clientMessageSchema.safeParse({ type: 'ping' }).success).toBe(true)
    expect(clientMessageSchema.safeParse({ type: 'subscribe', sub: { role: 'output', outputId: 'wide', view: 'program' } }).success).toBe(true)
    expect(clientMessageSchema.safeParse({ type: 'subscribe', sub: { role: 'output', outputId: 'wide', view: 'x' } }).success).toBe(false)
    expect(clientMessageSchema.safeParse({ type: 'command', command: { type: 'clear' } }).success).toBe(true)
    expect(clientMessageSchema.safeParse({ type: 'command', command: { type: 'bogus' } }).success).toBe(false)
    expect(clientMessageSchema.safeParse('hi').success).toBe(false)
  })
})
