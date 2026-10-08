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
    const imp = reduce(s, { type: 'importShow', file: { draft: base.draft, outputs: base.outputs, layers: base.layers, transition: 'slow', presets: [], stacks: [] } }, ctx)
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
  describe('presets and cues', () => {
    const designed = () => {
      let s = reduce(base, { type: 'setLayers', outputId: 'wide', patch: { scene: 'lineup' } }, ctx)
      s = reduce(s, { type: 'arm', outputIds: ['wide', 'twins'] }, ctx)
      return reduce(s, { type: 'savePreset', name: 'Lineup' }, ctx)
    }
    it('saves layers and arming, then restores both', () => {
      const s = designed()
      expect(s.presets).toHaveLength(1); expect(s.lastPreset).toBe('preset-1')
      expect(s.presets[0]).toMatchObject({ name: 'Lineup', armed: ['wide', 'twins'] })
      let moved = reduce(s, { type: 'setLayers', outputId: 'wide', patch: { scene: 'none' } }, ctx)
      moved = reduce(moved, { type: 'arm', outputIds: [] }, ctx)
      const back = reduce(moved, { type: 'recallPreset', id: 'preset-1' }, ctx)
      expect(back.layers.wide.scene).toBe('lineup'); expect(back.armed).toEqual(['wide', 'twins'])
      expect(back.program).toBe(moved.program)
    })
    it('snapshots by value, not reference', () => {
      const s = designed()
      const edited = reduce(s, { type: 'setLayers', outputId: 'wide', patch: { scene: 'winner' } }, ctx)
      expect(edited.presets[0].layers.wide.scene).toBe('lineup')
    })
    it('recall with take puts it on air', () => {
      const s = reduce(designed(), { type: 'setLayers', outputId: 'wide', patch: { scene: 'none' } }, ctx)
      const live = reduce(s, { type: 'recallPreset', id: 'preset-1', take: 'auto' }, ctx)
      expect(live.program.wide.view.scene?.kind).toBe('lineup'); expect(live.program.wide.mode).toBe('auto')
    })
    it('skips outputs that were removed and keeps ones added later', () => {
      let s = designed()
      s = reduce(s, { type: 'removeOutput', id: 'twins' }, ctx)
      s = reduce(s, { type: 'addOutput', output: { id: 'lobby', name: 'Lobby', format: 'hd', safeArea: { top: 0, right: 0, bottom: 0, left: 0 }, graphicsScale: 1 } }, ctx)
      s = reduce(s, { type: 'setLayers', outputId: 'lobby', patch: { background: 'C' } }, ctx)
      const back = reduce(s, { type: 'recallPreset', id: 'preset-1' }, ctx)
      expect(back.armed).toEqual(['wide']); expect(back.layers.lobby.background).toBe('C'); expect(back.layers.twins).toBeUndefined()
    })
    it('update, rename, delete', () => {
      let s = designed()
      s = reduce(s, { type: 'setLayers', outputId: 'wide', patch: { scene: 'winner' } }, ctx)
      s = reduce(s, { type: 'updatePreset', id: 'preset-1', name: 'Renamed', capture: true }, ctx)
      expect(s.presets[0]).toMatchObject({ name: 'Renamed' }); expect(s.presets[0].layers.wide.scene).toBe('winner')
      s = reduce(s, { type: 'savePreset', name: 'Two' }, ctx)
      const del = reduce(s, { type: 'deletePreset', id: 'preset-2' }, ctx)
      expect(del.presets.map((p) => p.id)).toEqual(['preset-1']); expect(del.lastPreset).toBeNull()
      expect(reduce(del, { type: 'savePreset', name: 'Three' }, ctx).presets[1].id).toBe('preset-2')
      expect(() => reduce(s, { type: 'recallPreset', id: 'nope' }, ctx)).toThrow(CommandError)
    })
    describe('cue stacks', () => {
      // preset-1 = lineup, preset-2 = winner; stack-1 = [lineup/cut, winner/auto, lineup/none] (lineup reused)
      const built = () => {
        let s = designed()
        s = reduce(s, { type: 'setLayers', outputId: 'wide', patch: { scene: 'winner' } }, ctx)
        s = reduce(s, { type: 'savePreset', name: 'Winner' }, ctx)
        s = reduce(s, { type: 'createStack', name: 'Show' }, ctx)
        s = reduce(s, { type: 'addCue', stackId: 'stack-1', presetId: 'preset-1', take: 'cut' }, ctx)
        s = reduce(s, { type: 'addCue', stackId: 'stack-1', presetId: 'preset-2', take: 'auto' }, ctx)
        return reduce(s, { type: 'addCue', stackId: 'stack-1', presetId: 'preset-1', take: null }, ctx)
      }
      it('allows reuse and any order, with a take mode per cue', () => {
        const s = built()
        expect(s.stacks[0].cues.map((c) => [c.presetId, c.take])).toEqual([['preset-1', 'cut'], ['preset-2', 'auto'], ['preset-1', null]])
        expect(new Set(s.stacks[0].cues.map((c) => c.id)).size).toBe(3)
        const ins = reduce(s, { type: 'addCue', stackId: 'stack-1', presetId: 'preset-2', take: 'cut', index: 0 }, ctx)
        expect(ins.stacks[0].cues[0]).toMatchObject({ presetId: 'preset-2', take: 'cut' })
        const moved = reduce(s, { type: 'moveCue', stackId: 'stack-1', cueId: 'cue-3', delta: -1 }, ctx)
        expect(moved.stacks[0].cues.map((c) => c.id)).toEqual(['cue-1', 'cue-3', 'cue-2'])
        expect(reduce(s, { type: 'moveCue', stackId: 'stack-1', cueId: 'cue-1', delta: -1 }, ctx)).toBe(s)
        const upd = reduce(s, { type: 'updateCue', stackId: 'stack-1', cueId: 'cue-3', presetId: 'preset-2', take: 'auto' }, ctx)
        expect(upd.stacks[0].cues[2]).toMatchObject({ presetId: 'preset-2', take: 'auto' })
      })
      it('GO fires the standby cue to air and the next cue goes to preview', () => {
        let s = { ...built(), armed: [] as string[] }
        // Select cue 1: its design is in Preview, nothing on air yet.
        s = reduce(s, { type: 'selectCue', stackId: 'stack-1', cueId: 'cue-1' }, ctx)
        expect(s.stacks[0]).toMatchObject({ selected: 'cue-1', current: null })
        expect(s.layers.wide.scene).toBe('lineup'); expect(s.armed).toEqual(['wide', 'twins']); expect(s.program.wide.view.scene).toBeNull()
        // GO: cue-1 to PGM (cut), cue-2 now standing by in PVW.
        s = reduce(s, { type: 'goStack', stackId: 'stack-1' }, ctx)
        expect(s.stacks[0]).toMatchObject({ current: 'cue-1', selected: 'cue-2' })
        expect(s.program.wide.view.scene?.kind).toBe('lineup'); expect(s.program.wide.mode).toBe('cut')
        expect(s.layers.wide.scene).toBe('winner')
        // GO again: cue-2 (auto) to PGM, cue-3 in PVW.
        s = reduce(s, { type: 'goStack', stackId: 'stack-1' }, ctx)
        expect(s.program.wide.view.scene?.kind).toBe('winner'); expect(s.program.wide.mode).toBe('auto')
        expect(s.stacks[0]).toMatchObject({ current: 'cue-2', selected: 'cue-3' }); expect(s.layers.wide.scene).toBe('lineup')
        // Last cue is recall-only: it previews, GO loads it without taking, then nothing is left.
        const before = s.program.wide
        s = reduce(s, { type: 'goStack', stackId: 'stack-1' }, ctx)
        expect(s.stacks[0]).toMatchObject({ current: 'cue-3', selected: null }); expect(s.program.wide).toBe(before)
        expect(reduce(s, { type: 'goStack', stackId: 'stack-1' }, ctx)).toBe(s)
      })
      it('with nothing selected GO starts at the top; stepSelection moves standby', () => {
        let s = reduce(built(), { type: 'goStack', stackId: 'stack-1' }, ctx)
        expect(s.stacks[0]).toMatchObject({ current: 'cue-1', selected: 'cue-2' })
        s = reduce(s, { type: 'stepSelection', stackId: 'stack-1', delta: 1 }, ctx)
        expect(s.stacks[0].selected).toBe('cue-3'); expect(s.layers.wide.scene).toBe('lineup')
        expect(reduce(s, { type: 'stepSelection', stackId: 'stack-1', delta: 1 }, ctx)).toBe(s)
        s = reduce(s, { type: 'stepSelection', stackId: 'stack-1', delta: -1 }, ctx)
        expect(s.stacks[0].selected).toBe('cue-2')
        // Jump back and refire an earlier cue (skipping ahead is allowed).
        s = reduce(s, { type: 'selectCue', stackId: 'stack-1', cueId: 'cue-1' }, ctx)
        s = reduce(s, { type: 'goStack', stackId: 'stack-1' }, ctx)
        expect(s.stacks[0]).toMatchObject({ current: 'cue-1', selected: 'cue-2' })
        expect(reduce(s, { type: 'resetStack', id: 'stack-1' }, ctx).stacks[0]).toMatchObject({ current: null, selected: null })
      })
      it('fireCue jumps anywhere; stacks track position independently', () => {
        let s = reduce(built(), { type: 'createStack', name: 'Other' }, ctx)
        s = reduce(s, { type: 'addCue', stackId: 'stack-2', presetId: 'preset-2', take: 'cut' }, ctx)
        s = reduce(s, { type: 'fireCue', stackId: 'stack-1', cueId: 'cue-2' }, ctx)
        expect(s.stacks.map((k) => k.current)).toEqual(['cue-2', null]); expect(s.stacks[0].selected).toBe('cue-3')
        expect(() => reduce(s, { type: 'fireCue', stackId: 'stack-1', cueId: 'cue-4' }, ctx)).toThrow(CommandError)
        expect(() => reduce(s, { type: 'addCue', stackId: 'stack-1', presetId: 'nope', take: null }, ctx)).toThrow(CommandError)
      })
      it('removing a cue or preset keeps stacks consistent', () => {
        let s = reduce(built(), { type: 'fireCue', stackId: 'stack-1', cueId: 'cue-2' }, ctx)
        const r = reduce(s, { type: 'removeCue', stackId: 'stack-1', cueId: 'cue-2' }, ctx)
        expect(r.stacks[0].current).toBe('cue-1')
        expect(reduce(s, { type: 'removeCue', stackId: 'stack-1', cueId: 'cue-3' }, ctx).stacks[0].selected).toBeNull()
        s = reduce(s, { type: 'deletePreset', id: 'preset-2' }, ctx)
        expect(s.stacks[0].cues.map((c) => c.id)).toEqual(['cue-1', 'cue-3']); expect(s.stacks[0].current).toBe('cue-1')
        expect(reduce(s, { type: 'deleteStack', id: 'stack-1' }, ctx).stacks).toEqual([])
      })
    })
    it('old state files without presets still parse', async () => {
      const { showStateSchema } = await import('../../shared/schema')
      const { presets: _p, lastPreset: _c, stacks: _k, ...old } = base
      const r = showStateSchema.safeParse(old)
      expect(r.success && r.data.presets).toEqual([]); expect(r.success && r.data.stacks).toEqual([])
    })
  })
})
