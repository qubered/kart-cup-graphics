import { describe, expect, it } from 'vitest'
import { indexCatalog } from '../../shared/catalog'
import { createDefaultState } from '../../shared/defaults'
import { clientMessageSchema } from '../../shared/protocol'
import { CommandError, reduce } from '../../shared/reducer'
import { commandSchema } from '../../shared/schema'
import type { Command, Preset, ShowState } from '../../shared/types'
import { fixtureCatalog } from '../fixtures/catalog'

const idx = indexCatalog(fixtureCatalog)
const ctx = { catalog: idx, now: 1000, random: () => 0 }
const run = (s: ShowState, ...cmds: Command[]) => cmds.reduce((a, c) => reduce(a, c, ctx), s)
const base = createDefaultState(idx, 0)

/** Preview shows a line-up on Wide, two outputs armed; one stack exists. */
const designed = () => run(base,
  { type: 'setLayers', outputId: 'wide', patch: { scene: 'lineup' } }, { type: 'arm', outputIds: ['wide', 'twins'] },
  { type: 'setPlayer', index: 0, patch: { name: 'SAM' } }, { type: 'createStack', name: 'Show' })

describe('addCueFromPreview', () => {
  it('saves Preview as a preset and appends a cue for it, in one step', () => {
    const s0 = designed()
    const s = run(s0, { type: 'addCueFromPreview', stackId: 'stack-1', name: 'Opening', take: 'cut' })
    expect(s.presets).toHaveLength(1)
    expect(s.presets[0]).toMatchObject({ id: 'preset-1', name: 'Opening', armed: ['wide', 'twins'] })
    expect(s.presets[0].layers.wide.scene).toBe('lineup'); expect(s.presets[0].draft.players[0].name).toBe('SAM')
    expect(s.stacks[0].cues).toEqual([{ id: 'cue-1', presetId: 'preset-1', take: 'cut' }])
    expect(s.lastPreset).toBe('preset-1')
    // exactly what savePreset followed by addCue would have produced
    expect(s).toEqual(run(s0, { type: 'savePreset', name: 'Opening', from: 'pvw' }, { type: 'addCue', stackId: 'stack-1', presetId: 'preset-1', take: 'cut' }))
    // Preview and Program are not touched
    expect(s.draft).toBe(s0.draft); expect(s.layers).toBe(s0.layers); expect(s.program).toBe(s0.program)
  })
  it('inserts at an index, with the preset scope and a cue action', () => {
    let s = run(designed(), { type: 'addCueFromPreview', stackId: 'stack-1', name: 'A', take: 'cut' }, { type: 'addCueFromPreview', stackId: 'stack-1', name: 'B', take: null })
    s = run(s, { type: 'addCueFromPreview', stackId: 'stack-1', name: 'C', take: 'auto', index: 1, scope: { scores: true, armed: false }, action: 'nextRace' })
    expect(s.stacks[0].cues.map((c) => [c.id, c.presetId, c.take, c.action])).toEqual([['cue-1', 'preset-1', 'cut', undefined], ['cue-3', 'preset-3', 'auto', 'nextRace'], ['cue-2', 'preset-2', null, undefined]])
    expect(s.presets[2].scope).toEqual({ layers: true, armed: false, style: true, match: true, players: true, scores: true, transition: true, mattify: true })
    expect(s.stacks[0].cues[1].scope).toBeUndefined()
    // an index past the end appends
    expect(run(s, { type: 'addCueFromPreview', stackId: 'stack-1', name: 'D', take: null, index: 99 }).stacks[0].cues[3].presetId).toBe('preset-4')
  })
  it('uses the layout-only default scope while a tournament is active', () => {
    const s = run(designed(), { type: 'createTournament', name: 'T' }, { type: 'addCueFromPreview', stackId: 'stack-1', name: 'L', take: 'cut' })
    expect(s.presets[0].scope).toMatchObject({ match: false, players: false, scores: false, layers: true })
  })
  it('fails as a whole: an unknown stack saves no preset', () => {
    expect(() => run(designed(), { type: 'addCueFromPreview', stackId: 'nope', name: 'X', take: null })).toThrow(CommandError)
  })
  it('schema', () => {
    const ok = { type: 'addCueFromPreview', stackId: 's', name: 'N', take: 'auto', index: 0, scope: { scores: true }, action: 'nextMatch' }
    expect(commandSchema.safeParse(ok).success).toBe(true)
    expect(commandSchema.safeParse({ type: 'addCueFromPreview', stackId: 's', name: 'N', take: null }).success).toBe(true)
    for (const bad of [{ name: '' }, { name: '   ' }, { name: 'x'.repeat(101) }, { take: 'fade' }, { take: undefined }, { index: -1 }, { index: 1.5 }, { action: 'bogus' }, { scope: { layers: 'yes' } }, { stackId: undefined }]) {
      expect(commandSchema.safeParse({ ...ok, ...bad }).success).toBe(false)
    }
  })
})

describe('duplicatePreset', () => {
  const two = () => run(designed(), { type: 'savePreset', name: 'Lineup' }, { type: 'setLayers', outputId: 'wide', patch: { scene: 'winner' } }, { type: 'savePreset', name: 'Winner' })
  it('deep-copies with a new id, right after the source, named "<name> copy"', () => {
    const s0 = two()
    const s = run(s0, { type: 'duplicatePreset', id: 'preset-1' })
    expect(s.presets.map((p) => [p.id, p.name])).toEqual([['preset-1', 'Lineup'], ['preset-3', 'Lineup copy'], ['preset-2', 'Winner']])
    expect(s.presets[1]).toEqual({ ...s0.presets[0], id: 'preset-3', name: 'Lineup copy' })
    expect(s.presets[1].layers).not.toBe(s.presets[0].layers); expect(s.presets[1].draft).not.toBe(s.presets[0].draft)
    expect(s.presets[1].scope).not.toBe(s.presets[0].scope); expect(s.presets[1].armed).not.toBe(s.presets[0].armed)
    // the original is untouched
    expect(s.presets[0]).toBe(s0.presets[0])
  })
  it('does not change lastPreset, stacks or the draft', () => {
    const s0 = two()
    const s = run(s0, { type: 'duplicatePreset', id: 'preset-1' })
    expect(s.lastPreset).toBe(s0.lastPreset); expect(s.lastPreset).toBe('preset-2')
    expect(s.stacks).toBe(s0.stacks); expect(s.draft).toBe(s0.draft)
  })
  it('keeps the default name unique: copy, copy 2, copy 3', () => {
    let s = two()
    s = run(s, { type: 'duplicatePreset', id: 'preset-1' }, { type: 'duplicatePreset', id: 'preset-1' }, { type: 'duplicatePreset', id: 'preset-1' })
    expect(s.presets.map((p) => p.name)).toEqual(['Lineup', 'Lineup copy 3', 'Lineup copy 2', 'Lineup copy', 'Winner'])
    // copying a copy
    expect(run(s, { type: 'duplicatePreset', id: 'preset-3' }).presets.find((p) => p.id === 'preset-6')?.name).toBe('Lineup copy copy')
  })
  it('takes an explicit name as is, and keeps names within the limit', () => {
    const s = two()
    expect(run(s, { type: 'duplicatePreset', id: 'preset-1', name: 'Mine' }).presets[1].name).toBe('Mine')
    expect(run(s, { type: 'duplicatePreset', id: 'preset-1', name: '  Spaced  ' }).presets[1].name).toBe('Spaced')
    const long = run(s, { type: 'updatePreset', id: 'preset-1', name: 'x'.repeat(100) }, { type: 'duplicatePreset', id: 'preset-1' }, { type: 'duplicatePreset', id: 'preset-1' })
    expect(long.presets.map((p) => p.name.length)).toEqual([100, 100, 100, 6])
    expect(long.presets[1].name.endsWith(' copy 2')).toBe(true); expect(long.presets[2].name.endsWith(' copy')).toBe(true)
  })
  it('rejects an unknown preset, and the schema rejects garbage', () => {
    expect(() => run(two(), { type: 'duplicatePreset', id: 'nope' })).toThrow(CommandError)
    expect(commandSchema.safeParse({ type: 'duplicatePreset', id: 'p' }).success).toBe(true)
    expect(commandSchema.safeParse({ type: 'duplicatePreset', id: 'p', name: 'N' }).success).toBe(true)
    for (const bad of [{ id: undefined }, { id: 3 }, { name: '' }, { name: 'x'.repeat(101) }, { name: 5 }]) expect(commandSchema.safeParse({ type: 'duplicatePreset', id: 'p', ...bad }).success).toBe(false)
  })
})

describe('makeCuePresetUnique', () => {
  // preset-1 Lineup, preset-2 Winner; stack-1 = [cue-1 lineup/cut, cue-2 winner/auto + after + scope, cue-3 lineup/null]
  const built = () => {
    let s = run(designed(), { type: 'savePreset', name: 'Lineup' }, { type: 'setLayers', outputId: 'wide', patch: { scene: 'winner' } }, { type: 'savePreset', name: 'Winner' })
    s = run(s, { type: 'addCue', stackId: 'stack-1', presetId: 'preset-1', take: 'cut' },
      { type: 'addCue', stackId: 'stack-1', presetId: 'preset-1', take: 'auto', action: 'nextRace', scope: { scores: true } },
      { type: 'addCue', stackId: 'stack-1', presetId: 'preset-2', take: null })
    return s
  }
  it('copies the cue\'s preset and re-points only that cue, keeping its settings and position', () => {
    const s0 = built()
    const s = run(s0, { type: 'makeCuePresetUnique', stackId: 'stack-1', cueId: 'cue-2' })
    expect(s.presets.map((p) => [p.id, p.name])).toEqual([['preset-1', 'Lineup'], ['preset-3', 'Lineup copy'], ['preset-2', 'Winner']])
    expect(s.presets[1]).toEqual({ ...s0.presets[0], id: 'preset-3', name: 'Lineup copy' })
    expect(s.stacks[0].cues.map((c) => [c.id, c.presetId])).toEqual([['cue-1', 'preset-1'], ['cue-2', 'preset-3'], ['cue-3', 'preset-2']])
    expect(s.stacks[0].cues[1]).toEqual({ id: 'cue-2', presetId: 'preset-3', take: 'auto', action: 'nextRace', scope: { scores: true } })
    expect(s.stacks[0].cues[0]).toBe(s0.stacks[0].cues[0])
  })
  it('takes an explicit name, and still copies when the cue is the preset\'s only user', () => {
    const s = run(built(), { type: 'makeCuePresetUnique', stackId: 'stack-1', cueId: 'cue-3', name: 'Winner for race 2' })
    expect(s.presets.map((p) => p.name)).toEqual(['Lineup', 'Winner', 'Winner for race 2'])
    expect(s.stacks[0].cues[2].presetId).toBe('preset-3')
  })
  it('numbers repeated copies, and leaves lastPreset, current and selected alone', () => {
    let s = run(built(), { type: 'fireCue', stackId: 'stack-1', cueId: 'cue-1' })
    s = run(s, { type: 'selectCue', stackId: 'stack-1', cueId: 'cue-3' })
    const before = { ...s.stacks[0] }
    const last = s.lastPreset
    s = run(s, { type: 'makeCuePresetUnique', stackId: 'stack-1', cueId: 'cue-1' }, { type: 'makeCuePresetUnique', stackId: 'stack-1', cueId: 'cue-2' })
    expect(s.presets.map((p) => p.name)).toEqual(['Lineup', 'Lineup copy 2', 'Lineup copy', 'Winner'])
    expect(s.stacks[0]).toMatchObject({ current: before.current, selected: before.selected }); expect(s.lastPreset).toBe(last)
  })
  it('rejects unknown stacks and cues, and a cue whose preset is gone', () => {
    const s = built()
    expect(() => run(s, { type: 'makeCuePresetUnique', stackId: 'nope', cueId: 'cue-1' })).toThrow(CommandError)
    expect(() => run(s, { type: 'makeCuePresetUnique', stackId: 'stack-1', cueId: 'nope' })).toThrow(/Unknown cue/)
    const dangling = { ...s, presets: s.presets.filter((p) => p.id !== 'preset-2') }
    expect(() => run(dangling, { type: 'makeCuePresetUnique', stackId: 'stack-1', cueId: 'cue-3' })).toThrow(/Unknown preset/)
  })
  it('schema', () => {
    expect(commandSchema.safeParse({ type: 'makeCuePresetUnique', stackId: 's', cueId: 'c' }).success).toBe(true)
    expect(commandSchema.safeParse({ type: 'makeCuePresetUnique', stackId: 's', cueId: 'c', name: 'N' }).success).toBe(true)
    for (const bad of [{ stackId: undefined }, { cueId: undefined }, { name: '' }, { name: 1 }]) expect(commandSchema.safeParse({ type: 'makeCuePresetUnique', stackId: 's', cueId: 'c', ...bad }).success).toBe(false)
  })
})

describe('setPreset', () => {
  const three = () => run(designed(), { type: 'savePreset', name: 'One' }, { type: 'setLayers', outputId: 'wide', patch: { scene: 'winner' } }, { type: 'savePreset', name: 'Two' },
    { type: 'setLayers', outputId: 'wide', patch: { scene: 'standings' } }, { type: 'savePreset', name: 'Three' })
  it('replaces an existing preset in place', () => {
    const s0 = three()
    const edited: Preset = { ...structuredClone(s0.presets[1]), name: 'Two!', transition: 'slow' }
    const s = run(s0, { type: 'setPreset', preset: edited })
    expect(s.presets.map((p) => p.name)).toEqual(['One', 'Two!', 'Three']); expect(s.presets[1].transition).toBe('slow')
    expect(s.presets[0]).toBe(s0.presets[0])
    // `index` is ignored when the id exists
    expect(run(s0, { type: 'setPreset', preset: edited, index: 0 }).presets.map((p) => p.id)).toEqual(['preset-1', 'preset-2', 'preset-3'])
  })
  it('inserts an unknown id at the index (default end, clamped)', () => {
    const s0 = three()
    const p: Preset = { ...structuredClone(s0.presets[0]), id: 'preset-9', name: 'New' }
    expect(run(s0, { type: 'setPreset', preset: p }).presets.map((x) => x.id)).toEqual(['preset-1', 'preset-2', 'preset-3', 'preset-9'])
    expect(run(s0, { type: 'setPreset', preset: p, index: 1 }).presets.map((x) => x.id)).toEqual(['preset-1', 'preset-9', 'preset-2', 'preset-3'])
    expect(run(s0, { type: 'setPreset', preset: p, index: 0 }).presets[0].id).toBe('preset-9')
    expect(run(s0, { type: 'setPreset', preset: p, index: 99 }).presets[3].id).toBe('preset-9')
    // ids keep counting up after a manually-inserted one
    expect(run(s0, { type: 'setPreset', preset: p }, { type: 'savePreset', name: 'Next' }).presets[4].id).toBe('preset-10')
  })
  it('undoes an overwrite', () => {
    const s0 = three()
    const original = structuredClone(s0.presets[0])
    const changed = run(s0, { type: 'setLayers', outputId: 'wide', patch: { scene: 'notice' } }, { type: 'updatePreset', id: 'preset-1', from: 'pvw' })
    expect(changed.presets[0]).not.toEqual(original)
    const back = run(changed, { type: 'setPreset', preset: original })
    expect(back.presets).toEqual(s0.presets)
  })
  it('undoes a rename and a delete', () => {
    const s0 = three()
    const original = structuredClone(s0.presets[1])
    const renamed = run(s0, { type: 'updatePreset', id: 'preset-2', name: 'Other' })
    expect(run(renamed, { type: 'setPreset', preset: original }).presets).toEqual(s0.presets)
    const deleted = run(s0, { type: 'deletePreset', id: 'preset-2' })
    expect(deleted.presets.map((p) => p.id)).toEqual(['preset-1', 'preset-3'])
    expect(run(deleted, { type: 'setPreset', preset: original, index: 1 }).presets).toEqual(s0.presets)
  })
  it('is lenient about outputs the show does not have', () => {
    const s0 = three()
    const p = structuredClone(s0.presets[0])
    p.layers.ghost = structuredClone(p.layers.wide); p.armed = ['wide', 'ghost', 'wide', 'twins']
    const s = run(s0, { type: 'setPreset', preset: p })
    expect(Object.keys(s.presets[0].layers).sort()).toEqual(['pillars', 'stream', 'twins', 'wide'])
    expect(s.presets[0].armed).toEqual(['wide', 'twins'])
  })
  it('stores a copy, and leaves cues, lastPreset, Preview and Program alone', () => {
    let s0 = three()
    s0 = run(s0, { type: 'addCue', stackId: 'stack-1', presetId: 'preset-1', take: 'cut' })
    const p = structuredClone(s0.presets[0])
    const s = run(s0, { type: 'setPreset', preset: p })
    p.name = 'mutated'; p.layers.wide.scene = 'none'
    expect(s.presets[0].name).toBe('One'); expect(s.presets[0].layers.wide.scene).toBe('lineup')
    expect(s.stacks).toBe(s0.stacks); expect(s.lastPreset).toBe(s0.lastPreset); expect(s.draft).toBe(s0.draft); expect(s.layers).toBe(s0.layers); expect(s.program).toBe(s0.program)
  })
  it('schema validates the whole preset', () => {
    const preset = JSON.parse(JSON.stringify(three().presets[0]))
    const parse = (p: unknown, extra: object = {}) => commandSchema.safeParse({ type: 'setPreset', preset: p, ...extra })
    expect(parse(preset).success).toBe(true)
    expect(parse(preset, { index: 2 }).success).toBe(true)
    expect(clientMessageSchema.safeParse({ type: 'command', command: { type: 'setPreset', preset } }).success).toBe(true)
    expect(parse(preset, { index: -1 }).success).toBe(false); expect(parse(preset, { index: 0.5 }).success).toBe(false)
    expect(parse(undefined).success).toBe(false); expect(parse('preset-1').success).toBe(false); expect(parse({}).success).toBe(false)
    const mut = (f: (p: Record<string, any>) => void) => { const c = JSON.parse(JSON.stringify(preset)); f(c); return c }
    expect(parse(mut((p) => { p.id = '' })).success).toBe(false)
    expect(parse(mut((p) => { p.name = 'x'.repeat(101) })).success).toBe(false)
    expect(parse(mut((p) => { p.layers.wide.scene = 'bogus' })).success).toBe(false)
    expect(parse(mut((p) => { p.layers.wide.lowerThirds = 3 })).success).toBe(false)
    expect(parse(mut((p) => { p.armed = 'wide' })).success).toBe(false)
    expect(parse(mut((p) => { p.transition = 'instant' })).success).toBe(false)
    expect(parse(mut((p) => { delete p.mattify })).success).toBe(false)
    expect(parse(mut((p) => { p.draft.players = p.draft.players.slice(0, 3) })).success).toBe(false)
    expect(parse(mut((p) => { p.draft.race.trackOverrides = ['a'] })).success).toBe(false)
    expect(parse(mut((p) => { delete p.draft })).success).toBe(false)
  })
})

describe('moveCueTo', () => {
  // stack-1 = cue-1 .. cue-4 (lineup), cue-2 current, cue-3 selected is set per test
  const built = () => {
    let s = run(designed(), { type: 'savePreset', name: 'L' })
    for (let i = 0; i < 4; i++) s = run(s, { type: 'addCue', stackId: 'stack-1', presetId: 'preset-1', take: 'cut' })
    return s
  }
  const order = (s: ShowState) => s.stacks[0].cues.map((c) => c.id)
  it('moves a cue to a position', () => {
    const s = built()
    expect(order(run(s, { type: 'moveCueTo', stackId: 'stack-1', cueId: 'cue-1', index: 2 }))).toEqual(['cue-2', 'cue-3', 'cue-1', 'cue-4'])
    expect(order(run(s, { type: 'moveCueTo', stackId: 'stack-1', cueId: 'cue-4', index: 0 }))).toEqual(['cue-4', 'cue-1', 'cue-2', 'cue-3'])
    expect(order(run(s, { type: 'moveCueTo', stackId: 'stack-1', cueId: 'cue-2', index: 2 }))).toEqual(['cue-1', 'cue-3', 'cue-2', 'cue-4'])
    // agrees with moveCue by one step
    expect(order(run(s, { type: 'moveCueTo', stackId: 'stack-1', cueId: 'cue-3', index: 1 }))).toEqual(order(run(s, { type: 'moveCue', stackId: 'stack-1', cueId: 'cue-3', delta: -1 })))
  })
  it('clamps the index, and does nothing when the cue is already there', () => {
    const s = built()
    expect(order(run(s, { type: 'moveCueTo', stackId: 'stack-1', cueId: 'cue-1', index: 99 }))).toEqual(['cue-2', 'cue-3', 'cue-4', 'cue-1'])
    expect(order(run(s, { type: 'moveCueTo', stackId: 'stack-1', cueId: 'cue-4', index: -5 }))).toEqual(['cue-4', 'cue-1', 'cue-2', 'cue-3'])
    expect(run(s, { type: 'moveCueTo', stackId: 'stack-1', cueId: 'cue-2', index: 1 })).toBe(s)
    expect(run(s, { type: 'moveCueTo', stackId: 'stack-1', cueId: 'cue-4', index: 50 })).toBe(s)
  })
  it('current and selected follow the cue', () => {
    let s = run(built(), { type: 'fireCue', stackId: 'stack-1', cueId: 'cue-2' })
    expect(s.stacks[0]).toMatchObject({ current: 'cue-2', selected: 'cue-3' })
    s = run(s, { type: 'moveCueTo', stackId: 'stack-1', cueId: 'cue-2', index: 3 })
    expect(order(s)).toEqual(['cue-1', 'cue-3', 'cue-4', 'cue-2']); expect(s.stacks[0]).toMatchObject({ current: 'cue-2', selected: 'cue-3' })
    s = run(s, { type: 'moveCueTo', stackId: 'stack-1', cueId: 'cue-3', index: 0 })
    expect(order(s)).toEqual(['cue-3', 'cue-1', 'cue-4', 'cue-2']); expect(s.stacks[0]).toMatchObject({ current: 'cue-2', selected: 'cue-3' })
    // the standby cue is still cue-3: GO fires it
    expect(run(s, { type: 'goStack', stackId: 'stack-1' }).stacks[0].current).toBe('cue-3')
  })
  it('rejects unknown stacks and cues, and the schema rejects garbage', () => {
    const s = built()
    expect(() => run(s, { type: 'moveCueTo', stackId: 'nope', cueId: 'cue-1', index: 0 })).toThrow(CommandError)
    expect(() => run(s, { type: 'moveCueTo', stackId: 'stack-1', cueId: 'nope', index: 0 })).toThrow(/Unknown cue/)
    const ok = { type: 'moveCueTo', stackId: 's', cueId: 'c', index: 0 }
    expect(commandSchema.safeParse(ok).success).toBe(true)
    for (const bad of [{ index: undefined }, { index: -1 }, { index: 1.5 }, { index: '1' }, { cueId: undefined }, { stackId: 1 }]) expect(commandSchema.safeParse({ ...ok, ...bad }).success).toBe(false)
  })
})

describe('client messages', () => {
  it('accepts the new preset and cue commands', () => {
    const preset = JSON.parse(JSON.stringify(run(designed(), { type: 'savePreset', name: 'P' }).presets[0]))
    const cmds: unknown[] = [
      { type: 'addCueFromPreview', stackId: 'stack-1', name: 'N', take: null },
      { type: 'duplicatePreset', id: 'preset-1' },
      { type: 'makeCuePresetUnique', stackId: 'stack-1', cueId: 'cue-1' },
      { type: 'setPreset', preset, index: 0 },
      { type: 'moveCueTo', stackId: 'stack-1', cueId: 'cue-1', index: 2 },
    ]
    for (const command of cmds) expect(clientMessageSchema.safeParse({ type: 'command', command }).success).toBe(true)
  })
})
