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
  it('clientMessageSchema accepts the control overhaul commands', () => {
    const snapshot = JSON.parse(JSON.stringify({ draft: s.draft, layers: s.layers, armed: s.armed, transition: s.transition, mattify: false, lastPreset: null }))
    const preset = { id: 'preset-1', name: 'P', scope: { layers: true, armed: true, style: true, match: false, players: false, scores: false, transition: true, mattify: true }, layers: s.layers, armed: [], draft: s.draft, transition: 'normal', mattify: false }
    const cmds: unknown[] = [
      { type: 'addCueFromPreview', stackId: 'stack-1', name: 'N', take: 'cut', index: 0, scope: { scores: false }, action: 'nextRace' },
      { type: 'duplicatePreset', id: 'preset-1', name: 'Copy' },
      { type: 'makeCuePresetUnique', stackId: 'stack-1', cueId: 'cue-1' },
      { type: 'setPreset', preset: JSON.parse(JSON.stringify(preset)), index: 0 },
      { type: 'moveCueTo', stackId: 'stack-1', cueId: 'cue-1', index: 3 },
      { type: 'restoreSnapshot', snapshot },
      { type: 'setRoundName', round: 0, name: 'Semis' }, { type: 'setRoundName', round: 0, name: null },
      { type: 'setRaceTrack', raceIndex: 3, trackId: 'water-park' }, { type: 'setRaceTrack', raceIndex: 0, trackId: null },
      { type: 'setRace', patch: { trackOverrides: [null, 'water-park', null, null] } },
    ]
    for (const command of cmds) expect(clientMessageSchema.safeParse({ type: 'command', command }).success).toBe(true)
    expect(clientMessageSchema.safeParse({ type: 'command', command: { type: 'moveCueTo', stackId: 'k', cueId: 'c' } }).success).toBe(false)
    expect(clientMessageSchema.safeParse({ type: 'command', command: { type: 'restoreSnapshot', snapshot: {} } }).success).toBe(false)
  })
})
