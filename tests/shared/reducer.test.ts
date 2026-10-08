import { describe, expect, it } from 'vitest'
import { indexCatalog } from '../../shared/catalog'
import { createDefaultState } from '../../shared/defaults'
import { CommandError, reduce } from '../../shared/reducer'
import { commandSchema } from '../../shared/schema'
import { fixtureCatalog } from '../fixtures/catalog'

const idx = indexCatalog(fixtureCatalog)
const ctx = { catalog: idx, now: 1000, random: () => 0 }
const base = createDefaultState(idx, 0)
const taken = () => {
  let s = reduce(base, { type: 'setPlayer', index: 0, patch: { name: 'SAM' } }, ctx)
  s = reduce(reduce(s, { type: 'arm', outputIds: ['wide'] }, ctx), { type: 'take', mode: 'cut' }, ctx)
  return s
}

describe('reducer', () => {
  it('score changes update an on-air standings scene without a take', () => {
    let s = reduce(base, { type: 'setLayers', outputId: 'wide', patch: { scene: 'standings' } }, ctx)
    s = reduce(reduce(s, { type: 'arm', outputIds: ['wide'] }, ctx), { type: 'take', mode: 'cut' }, ctx)
    const takenAt = s.program.wide.takenAt
    s = reduce(s, { type: 'setAdjustment', index: 1, value: 7 }, { ...ctx, now: 5000 })
    const scene = s.program.wide.view.scene
    expect(scene?.kind === 'standings' && scene.rows[0].total).toBe(7)
    expect(s.program.wide.takenAt).toBe(takenAt)
  })
  it('setPlayer does not touch program and is pure', () => {
    const frozen = structuredClone(base)
    const s = reduce(base, { type: 'setPlayer', index: 0, patch: { name: 'SAM' } }, ctx)
    expect(s.draft.players[0].name).toBe('SAM'); expect(s.program.wide.view.lowerThirds).toEqual([])
    expect(base).toEqual(frozen)
  })
  it('take', () => {
    expect(reduce(base, { type: 'take', mode: 'auto' }, ctx)).toBe(base)
    const s = taken()
    expect(s.program.wide).toMatchObject({ mode: 'cut', speed: 'normal', takenAt: 1000 })
    expect(s.program.wide.view.background?.id).toBe('A')
    expect(s.program.twins.view.trackCard).toBeNull(); expect(s.clocks.onAirSince).toBe(1000)
    expect(reduce(s, { type: 'take', mode: 'auto' }, { ...ctx, now: 2000 }).clocks.onAirSince).toBe(1000)
    const explicit = reduce(base, { type: 'take', mode: 'auto', outputIds: ['twins'] }, ctx)
    expect(explicit.program.twins.view.trackCard).not.toBeNull(); expect(explicit.program.twins.mode).toBe('auto')
  })
  it('clear', () => {
    const c = reduce(taken(), { type: 'clear' }, ctx)
    expect(c.layers.wide).toMatchObject({ background: 'A', scene: 'none', trackCard: false })
    expect(c.layers.twins.lowerThirds.on).toBe(false)
    expect(c.program.wide.view.scene).toBeNull(); expect(c.program.wide.view.background?.id).toBe('A')
    expect(c.program.wide.mode).toBe('cut')
  })
  it('cup mode derives race X / Y from the cup; manual patch wins', () => {
    const s1 = reduce(base, { type: 'stepRace', delta: 1 }, ctx)
    expect(s1.draft.race).toMatchObject({ raceNo: 2, raceTotal: 4 })
    expect(reduce(s1, { type: 'setRace', patch: { raceNo: 7, raceTotal: 9 } }, ctx).draft.race).toMatchObject({ raceNo: 7, raceTotal: 9 })
  })
  it('hold / ftb', () => {
    expect(reduce(base, { type: 'hold', on: true }, ctx).overlay.hold).toEqual({ on: true, message: 'BACK SHORTLY' })
    expect(reduce(base, { type: 'hold', on: true, message: 'X' }, ctx).overlay.hold.message).toBe('X')
    expect(reduce(base, { type: 'ftb', on: true }, ctx).overlay.ftb).toBe(true)
  })
  it('stepRace', () => {
    const s3 = { ...base, draft: { ...base.draft, race: { ...base.draft.race, raceIndex: 3 as const } } }
    expect(reduce(s3, { type: 'stepRace', delta: 1 }, ctx).draft.race.raceIndex).toBe(3)
    expect(reduce(base, { type: 'stepRace', delta: -1 }, ctx).draft.race.raceIndex).toBe(0)
    expect(reduce(base, { type: 'stepRace', delta: 1 }, ctx).draft.race.trackId).toBe('water-park')
  })
  it('saveResults replaces by raceNo and sorts', () => {
    const a = { type: 'saveResults' as const, raceNo: 1, trackId: 'mario-kart-stadium' }
    const r = reduce(reduce(base, { ...a, positions: [1, 4, 3, 2] }, ctx), { ...a, positions: [2, 1, 3, 4] }, ctx)
    expect(r.draft.scores.races).toHaveLength(1); expect(r.draft.scores.races[0].positions).toEqual([2, 1, 3, 4])
    const two = reduce(reduce(base, { ...a, raceNo: 2, positions: [1, 2, 3, 4] }, ctx), { ...a, positions: [1, 2, 3, 4] }, ctx)
    expect(two.draft.scores.races.map((x) => x.raceNo)).toEqual([1, 2])
  })
  it('output errors', () => {
    expect(() => reduce(base, { type: 'addOutput', output: { ...base.outputs[0] } }, ctx)).toThrow(CommandError)
    expect(() => reduce(base, { type: 'addOutput', output: { ...base.outputs[0], id: 'Bad Id' } }, ctx)).toThrow(CommandError)
    expect(() => reduce(base, { type: 'setLayers', outputId: 'nope', patch: {} }, ctx)).toThrow(/nope/)
    expect(() => reduce(base, { type: 'arm', outputIds: ['nope'] }, ctx)).toThrow(CommandError)
  })
  it('add / remove / update output', () => {
    const added = reduce(base, { type: 'addOutput', output: { id: 'extra', name: 'Extra', format: 'hd', safeArea: { top: 0, right: 0, bottom: 0, left: 0 }, graphicsScale: 1 } }, ctx)
    expect(added.layers.extra.scene).toBe('none'); expect(added.program.extra.view.scene).toBeNull()
    const upd = reduce(taken(), { type: 'updateOutput', id: 'wide', patch: { graphicsScale: 2 } }, ctx)
    expect(upd.program.wide.view.graphicsScale).toBe(2)
    const armed = reduce(base, { type: 'arm', outputIds: ['wide'] }, ctx)
    const rm = reduce(armed, { type: 'removeOutput', id: 'wide' }, ctx)
    expect(rm.program.wide).toBeUndefined(); expect(rm.armed).toEqual([]); expect(rm.layers.wide).toBeUndefined()
    expect(rm.outputs.map((o) => o.id)).not.toContain('wide')
  })
  it('randomRace', () => {
    expect(reduce(base, { type: 'randomRace' }, ctx).draft.race).toMatchObject({ cupId: 'mushroom', raceIndex: 0 })
    const played = reduce(base, { type: 'saveResults', raceNo: 1, trackId: 'water-park', positions: [1, 2, 3, 4] }, ctx)
    expect(reduce(played, { type: 'randomRace' }, ctx).draft.race.cupId).toBe('flower')
    const tm = reduce(played, { type: 'setRace', patch: { mode: 'track' } }, ctx)
    expect(reduce(tm, { type: 'randomRace' }, ctx).draft.race.trackId).toBe('mario-kart-stadium')
    let all = tm
    for (const t of fixtureCatalog.tracks) all = reduce(all, { type: 'saveResults', raceNo: all.draft.scores.races.length + 1, trackId: t.id, positions: [1, 2, 3, 4] }, ctx)
    expect(reduce(all, { type: 'randomRace' }, ctx).draft.race.trackId).toBe('mario-kart-stadium')
  })
  it('importShow, resets', () => {
    const s = taken()
    const imp = reduce(s, { type: 'importShow', file: { draft: base.draft, outputs: base.outputs, layers: base.layers, transition: 'slow' } }, ctx)
    expect(imp.transition).toBe('slow'); expect(imp.armed).toEqual([]); expect(imp.program.wide.view.background).toBeNull()
    expect(imp.overlay.hold.on).toBe(false)
    const scored = reduce(base, { type: 'setAdjustment', index: 1, value: 4 }, ctx)
    expect(reduce(scored, { type: 'resetScores' }, ctx).draft.scores.adjustments).toEqual([0, 0, 0, 0])
    expect(reduce(s, { type: 'resetShow' }, ctx).draft.players[0].name).toBe('Player 1')
    expect(reduce(s, { type: 'resetOnAirClock' }, { ...ctx, now: 5000 }).clocks.onAirSince).toBe(5000)
  })
  it('registerFont, typography', () => {
    const f = reduce(base, { type: 'registerFont', family: 'Foo', file: 'foo.ttf' }, ctx)
    expect(f.uploadedFonts).toEqual([{ family: 'Foo', file: 'foo.ttf' }])
    expect(reduce(f, { type: 'registerFont', family: 'Foo', file: 'other.ttf' }, ctx)).toBe(f)
    const t = reduce(base, { type: 'setTypography', role: 'headings', patch: { look: 'plain' } }, ctx)
    expect(t.draft.typography.headings).toEqual({ font: 'Exo 2', look: 'plain' })
  })
  it('commandSchema', () => {
    expect(commandSchema.safeParse({ type: 'bogus' }).success).toBe(false)
    expect(commandSchema.safeParse({ type: 'setPlayer', index: 4, patch: {} }).success).toBe(false)
    expect(commandSchema.safeParse({ type: 'registerFont', family: 'A', file: 'a.ttf' }).success).toBe(true)
    expect(commandSchema.safeParse({ type: 'saveResults', raceNo: 1, trackId: 'x', positions: [1, 2, 3, 4] }).success).toBe(true)
  })
})
