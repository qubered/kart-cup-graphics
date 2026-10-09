import { describe, expect, it } from 'vitest'
import { indexCatalog } from '../../shared/catalog'
import { createDefaultState } from '../../shared/defaults'
import { reduce } from '../../shared/reducer'
import type { Command, Cue, CueStack, ShowState } from '../../shared/types'
import {
  addedIds, afterFromValue, afterHint, dropDestination, effectiveScope, hasScopeOverride, loadedPreset, nextId, nextRundownName, nextScopeOverride,
  previewModified, railPosition, recallSummary, restoreCueCommand, rowFlags, scopeAsPatch, scopeRestore, standbyIndex, suggestLookName, takeFromValue, takeLabel, takeValue, usedByCount,
} from '../../web/src/control/live/rail/model'
import { fixtureCatalog } from '../fixtures/catalog'

const idx = indexCatalog(fixtureCatalog)
const ctx = { catalog: idx, now: 1000, random: () => 0 }
const run = (s: ShowState, ...cmds: Command[]) => cmds.reduce((a, c) => reduce(a, c, ctx), s)
const stackOf = (n: number, over: Partial<CueStack> = {}): CueStack => ({ id: 'stack-1', name: 'Run', cues: Array.from({ length: n }, (_, i) => ({ id: `cue-${i + 1}`, presetId: 'preset-1', take: 'cut' as const })), current: null, selected: null, ...over })

describe('standby, position and row flags', () => {
  it('standby is the selected cue, else the one after the current, else the first', () => {
    expect(standbyIndex(stackOf(4))).toBe(0)
    expect(standbyIndex(stackOf(4, { current: 'cue-2' }))).toBe(2)
    expect(standbyIndex(stackOf(4, { current: 'cue-2', selected: 'cue-4' }))).toBe(3)
    // nothing left: one past the end
    expect(standbyIndex(stackOf(4, { current: 'cue-4' }))).toBe(4)
    expect(standbyIndex(stackOf(0))).toBe(0)
  })
  it('agrees with the reducer: GO fires the cue the rail marks NEXT', () => {
    let s = run(createDefaultState(idx, 0), { type: 'savePreset', name: 'L' }, { type: 'createStack', name: 'Run' })
    for (let i = 0; i < 4; i++) s = run(s, { type: 'addCue', stackId: 'stack-1', presetId: 'preset-1', take: null })
    for (let step = 0; step < 4; step++) {
      const k = s.stacks[0]
      const next = standbyIndex(k)
      s = run(s, { type: 'goStack', stackId: 'stack-1' })
      expect(s.stacks[0].current).toBe(k.cues[next].id)
    }
    expect(standbyIndex(s.stacks[0])).toBe(4)
    s = run(s, { type: 'selectCue', stackId: 'stack-1', cueId: 'cue-2' })
    expect(standbyIndex(s.stacks[0])).toBe(1)
  })
  it('position is the standby cue, clamped at the end; 0/0 when empty', () => {
    expect(railPosition(stackOf(9, { current: 'cue-3', selected: 'cue-4' }))).toEqual({ pos: 4, total: 9 })
    expect(railPosition(stackOf(9, { current: 'cue-3' }))).toEqual({ pos: 4, total: 9 })
    expect(railPosition(stackOf(9, { current: 'cue-9' }))).toEqual({ pos: 9, total: 9 })
    expect(railPosition(stackOf(9))).toEqual({ pos: 1, total: 9 })
    expect(railPosition(stackOf(0))).toEqual({ pos: 0, total: 0 })
  })
  it('flags ON AIR, NEXT and the rows behind the current one', () => {
    const k = stackOf(5, { current: 'cue-3', selected: 'cue-4' })
    expect([0, 1, 2, 3, 4].map((i) => rowFlags(k, i))).toEqual([
      { onAir: false, next: false, done: true }, { onAir: false, next: false, done: true },
      { onAir: true, next: false, done: false }, { onAir: false, next: true, done: false }, { onAir: false, next: false, done: false },
    ])
    // the on-air cue can also be the standby one (tapped again)
    expect(rowFlags(stackOf(3, { current: 'cue-2', selected: 'cue-2' }), 1)).toEqual({ onAir: true, next: true, done: false })
    // nothing on air yet: no row is "done"
    expect(rowFlags(stackOf(3), 0)).toEqual({ onAir: false, next: true, done: false })
  })
})

describe('take and after', () => {
  it('maps takes to labels and values', () => {
    expect([takeLabel('cut'), takeLabel('auto'), takeLabel(null)]).toEqual(['CUT', 'AUTO', 'RECALL'])
    expect([takeValue('cut'), takeValue('auto'), takeValue(null)]).toEqual(['cut', 'auto', 'none'])
    expect([takeFromValue('cut'), takeFromValue('auto'), takeFromValue('none'), takeFromValue('')]).toEqual(['cut', 'auto', null, null])
  })
  it('after: values, hints', () => {
    expect([afterFromValue('nextRace'), afterFromValue('nextMatch'), afterFromValue('resetStack'), afterFromValue(''), afterFromValue('x')]).toEqual(['nextRace', 'nextMatch', 'resetStack', null, null])
    expect([afterHint('nextRace'), afterHint('nextMatch'), afterHint('resetStack'), afterHint(undefined)]).toEqual(['↳ then next race', '↳ then next match', '↳ then reset rundown', ''])
  })
})

describe('recall options', () => {
  const base = createDefaultState(idx, 0)
  // A Look that recalls its look and the armed outputs, not the race and players.
  const withLook = run(base, { type: 'savePreset', name: 'L', scope: { match: false, players: false } })
  const preset = withLook.presets[0]
  it('summarises the effective scope in groups', () => {
    expect(preset.scope).toMatchObject({ layers: true, armed: true, style: true, transition: true, mattify: true, match: false, players: false, scores: false })
    expect(recallSummary(effectiveScope(preset, {}), false)).toBe('look + outputs armed')
    expect(recallSummary({ ...preset.scope, match: true, players: true }, false)).toBe('look + outputs armed + race & players')
    expect(recallSummary({ ...preset.scope, scores: true }, false)).toBe('look + outputs armed + scores')
    expect(recallSummary(effectiveScope(undefined, {}), false)).toBe('nothing')
  })
  it('says (custom) for an override or for flags that do not form whole groups', () => {
    expect(recallSummary(effectiveScope(preset, {}), true)).toBe('look + outputs armed (custom)')
    expect(recallSummary({ ...preset.scope, style: false }, false)).toBe('outputs armed (custom)')
    expect(recallSummary({ ...preset.scope, match: true }, false)).toBe('look + outputs armed (custom)')
  })
  it('cue overrides sit on top of the Look', () => {
    const cue: Pick<Cue, 'scope'> = { scope: { players: true, armed: false } }
    expect(effectiveScope(preset, cue)).toEqual({ ...preset.scope, players: true, armed: false })
    expect(hasScopeOverride(cue)).toBe(true)
    expect(hasScopeOverride({})).toBe(false)
    expect(hasScopeOverride({ scope: {} })).toBe(false)
  })
  it('a chip cycles inherit, on, off, inherit', () => {
    expect(nextScopeOverride(undefined)).toBe(true)
    expect(nextScopeOverride(true)).toBe(false)
    expect(nextScopeOverride(false)).toBeNull()
  })
  it('puts one override back the way it was', () => {
    expect(scopeRestore({ scope: { players: true } }, 'players')).toEqual({ players: true })
    expect(scopeRestore({ scope: { players: false } }, 'players')).toEqual({ players: false })
    expect(scopeRestore({}, 'players')).toEqual({ players: null })
    expect(scopeRestore({ scope: { scores: true } }, 'players')).toEqual({ players: null })
  })
  it('the inverse patch really undoes the change in the reducer', () => {
    let s = run(withLook, { type: 'createStack', name: 'Run' }, { type: 'addCue', stackId: 'stack-1', presetId: 'preset-1', take: 'cut', scope: { players: true } })
    const before = s.stacks[0].cues[0]
    s = run(s, { type: 'updateCue', stackId: 'stack-1', cueId: 'cue-1', scope: { players: nextScopeOverride(before.scope?.players) } })
    expect(s.stacks[0].cues[0].scope).toEqual({ players: false })
    s = run(s, { type: 'updateCue', stackId: 'stack-1', cueId: 'cue-1', scope: scopeRestore(before, 'players') })
    expect(s.stacks[0].cues[0]).toEqual(before)
  })
})

describe('restoring a removed cue', () => {
  it('scopeAsPatch skips an empty override', () => {
    expect(scopeAsPatch(undefined)).toBeUndefined()
    expect(scopeAsPatch({})).toBeUndefined()
    expect(scopeAsPatch({ scores: true })).toEqual({ scores: true })
  })
  it('addCue at the old index brings back the same cue content', () => {
    let s = run(createDefaultState(idx, 0), { type: 'savePreset', name: 'A' }, { type: 'savePreset', name: 'B' }, { type: 'createStack', name: 'Run' })
    s = run(s,
      { type: 'addCue', stackId: 'stack-1', presetId: 'preset-1', take: 'cut' },
      { type: 'addCue', stackId: 'stack-1', presetId: 'preset-2', take: null, action: 'nextRace', scope: { scores: true, armed: false } },
      { type: 'addCue', stackId: 'stack-1', presetId: 'preset-1', take: 'auto' })
    const cue = s.stacks[0].cues[1]
    const removed = run(s, { type: 'removeCue', stackId: 'stack-1', cueId: cue.id })
    expect(removed.stacks[0].cues).toHaveLength(2)
    const back = run(removed, restoreCueCommand('stack-1', cue, 1))
    expect(back.stacks[0].cues.map((c) => [c.presetId, c.take, c.action, c.scope])).toEqual(s.stacks[0].cues.map((c) => [c.presetId, c.take, c.action, c.scope]))
  })
})

describe('Looks: usage, loaded Look, modified', () => {
  const designed = run(createDefaultState(idx, 0), { type: 'setLayers', outputId: 'wide', patch: { scene: 'lineup' } }, { type: 'arm', outputIds: ['wide', 'twins'] }, { type: 'savePreset', name: 'Lineup' })
  it('counts the cues that use a Look across every rundown', () => {
    const s = run(designed, { type: 'createStack', name: 'A' }, { type: 'createStack', name: 'B' },
      { type: 'addCue', stackId: 'stack-1', presetId: 'preset-1', take: 'cut' }, { type: 'addCue', stackId: 'stack-1', presetId: 'preset-1', take: 'cut' }, { type: 'addCue', stackId: 'stack-2', presetId: 'preset-1', take: 'cut' })
    expect(usedByCount(s, 'preset-1')).toBe(3)
    expect(usedByCount(s, 'preset-9')).toBe(0)
  })
  it('the loaded Look is lastPreset', () => {
    expect(loadedPreset(designed)?.name).toBe('Lineup')
    expect(loadedPreset({ ...designed, lastPreset: null })).toBeUndefined()
    expect(loadedPreset({ ...designed, lastPreset: 'gone' })).toBeUndefined()
  })
  it('Preview is modified once layers or arming differ from the Look', () => {
    expect(previewModified(designed)).toBe(false)
    expect(previewModified(run(designed, { type: 'setLayers', outputId: 'wide', patch: { scene: 'standings' } }))).toBe(true)
    expect(previewModified(run(designed, { type: 'setLayers', outputId: 'twins', patch: { background: 'A' } }))).toBe(true)
    expect(previewModified(run(designed, { type: 'arm', outputIds: ['wide'] }))).toBe(true)
    // arming order does not matter
    expect(previewModified(run(designed, { type: 'arm', outputIds: ['twins', 'wide'] }))).toBe(false)
    // show data is not part of the comparison (layers and arming only)
    expect(previewModified(run(designed, { type: 'setPlayer', index: 0, patch: { name: 'SAM' } }))).toBe(false)
    // without a loaded Look there is nothing to compare with
    expect(previewModified({ ...run(designed, { type: 'setLayers', outputId: 'wide', patch: { scene: 'standings' } }), lastPreset: null })).toBe(false)
  })
  it('ignores parts the Look does not recall', () => {
    const s = run(designed, { type: 'updatePreset', id: 'preset-1', scope: { layers: false } }, { type: 'setLayers', outputId: 'wide', patch: { scene: 'standings' } })
    expect(previewModified(s)).toBe(false)
    expect(previewModified(run(s, { type: 'arm', outputIds: [] }))).toBe(true)
  })
  it('recalling a Look leaves Preview unmodified', () => {
    const s = run(designed, { type: 'setLayers', outputId: 'wide', patch: { scene: 'none' } }, { type: 'arm', outputIds: [] }, { type: 'recallPreset', id: 'preset-1' })
    expect(previewModified(s)).toBe(false)
  })
})

describe('suggested Look names', () => {
  const base = createDefaultState(idx, 0)
  const withScene = (scene: string, extra: object = {}) => run(base, { type: 'setLayers', outputId: 'wide', patch: { scene: scene as never, ...extra } })
  it('uses the scene of the chosen output', () => {
    expect(suggestLookName(withScene('standings'), 'wide')).toBe('Standings')
    expect(suggestLookName(withScene('lineup'), 'wide')).toBe('Line-up')
    expect(suggestLookName(withScene('raceWin', { part: 'hero' }), 'wide')).toBe('Race win — hero')
    expect(suggestLookName(withScene('cupWin', { part: 'board' }), 'wide')).toBe('Cup win — board')
    expect(suggestLookName(withScene('none', { background: 'A' }), 'wide')).toBe('Holding')
    expect(suggestLookName(withScene('none', { background: 'none' }), 'wide')).toBe('Overlays only')
    // another output, and an unknown one falls back to the first
    const twins = run(withScene('standings'), { type: 'setLayers', outputId: 'twins', patch: { scene: 'title' } })
    expect(suggestLookName(twins, 'twins')).toBe('Title')
    expect(suggestLookName(twins, 'nope')).toBe('Standings')
    expect(suggestLookName(twins)).toBe('Standings')
  })
  it('numbers a name that is already taken', () => {
    let s = withScene('standings')
    s = run(s, { type: 'savePreset', name: 'Standings' })
    expect(suggestLookName(s, 'wide')).toBe('Standings 2')
    s = run(s, { type: 'savePreset', name: 'Standings 2' })
    expect(suggestLookName(s, 'wide')).toBe('Standings 3')
  })
  it('derives from the loaded Look when Preview has been changed from it', () => {
    let s = run(withScene('standings'), { type: 'savePreset', name: 'Semi standings' })
    expect(suggestLookName(s, 'wide')).toBe('Standings')
    s = run(s, { type: 'setLayers', outputId: 'wide', patch: { trackCard: true } })
    expect(suggestLookName(s, 'wide')).toBe('Semi standings 2')
    s = run(s, { type: 'savePreset', name: 'Semi standings 2' }, { type: 'setLayers', outputId: 'wide', patch: { scene: 'winner' } })
    expect(suggestLookName(s, 'wide')).toBe('Semi standings 3')
  })
  it('stays within the name limit', () => {
    let s = run(withScene('standings'), { type: 'savePreset', name: 'x'.repeat(100) }, { type: 'setLayers', outputId: 'wide', patch: { trackCard: true } })
    expect(suggestLookName(s, 'wide').length).toBeLessThanOrEqual(100)
    s = run(s, { type: 'savePreset', name: 'x'.repeat(98) + ' 2' })
    expect(suggestLookName(s, 'wide').length).toBeLessThanOrEqual(100)
  })
})

describe('rundown names and ids', () => {
  it('names a new rundown "Rundown n", skipping taken names', () => {
    expect(nextRundownName([])).toBe('Rundown 1')
    expect(nextRundownName([{ name: 'Show' }])).toBe('Rundown 2')
    expect(nextRundownName([{ name: 'Show' }, { name: 'Rundown 3' }])).toBe('Rundown 4')
    expect(nextRundownName([{ name: 'Rundown 2' }, { name: 'Other' }])).toBe('Rundown 3')
  })
  it('predicts the id the server hands out', () => {
    expect(nextId('stack', [])).toBe('stack-1')
    expect(nextId('stack', ['stack-1', 'stack-3'])).toBe('stack-4')
    expect(nextId('stack', ['custom', 'stack-2'])).toBe('stack-3')
    let s = run(createDefaultState(idx, 0), { type: 'createStack', name: 'A' }, { type: 'createStack', name: 'B' }, { type: 'createStack', name: 'C' }, { type: 'deleteStack', id: 'stack-2' })
    expect(nextId('stack', s.stacks.map((k) => k.id))).toBe('stack-4')
    s = run(s, { type: 'createStack', name: 'D' })
    expect(s.stacks[2].id).toBe('stack-4')
  })
  it('finds what a command added', () => {
    expect(addedIds([{ id: 'a' }, { id: 'b' }], [{ id: 'a' }, { id: 'n' }, { id: 'b' }])).toEqual(['n'])
    expect(addedIds([], [{ id: 'a' }, { id: 'b' }])).toEqual(['a', 'b'])
    expect(addedIds([{ id: 'a' }], [{ id: 'a' }])).toEqual([])
  })
})

describe('drop destination', () => {
  it('moving down: the slot counts the dragged cue itself', () => {
    expect(dropDestination(0, 3)).toBe(2)
    expect(dropDestination(1, 4)).toBe(3)
  })
  it('moving up lands on the slot', () => {
    expect(dropDestination(3, 0)).toBe(0)
    expect(dropDestination(3, 1)).toBe(1)
  })
  it('dropping where it already is changes nothing', () => {
    expect(dropDestination(2, 2)).toBe(2)
    expect(dropDestination(2, 3)).toBe(2)
  })
  it('moveCueTo with that destination matches what the drop looked like', () => {
    let s = run(createDefaultState(idx, 0), { type: 'savePreset', name: 'L' }, { type: 'createStack', name: 'Run' })
    for (let i = 0; i < 5; i++) s = run(s, { type: 'addCue', stackId: 'stack-1', presetId: 'preset-1', take: null })
    const order = (st: ShowState) => st.stacks[0].cues.map((c) => c.id.replace('cue-', '')).join('')
    expect(order(s)).toBe('12345')
    // drop cue 1 into slot 3 (between cues 3 and 4)
    expect(order(run(s, { type: 'moveCueTo', stackId: 'stack-1', cueId: 'cue-1', index: dropDestination(0, 3) }))).toBe('23145')
    // drop cue 5 into slot 1 (between cues 1 and 2)
    expect(order(run(s, { type: 'moveCueTo', stackId: 'stack-1', cueId: 'cue-5', index: dropDestination(4, 1) }))).toBe('15234')
    // drop cue 2 at the very bottom (slot 5)
    expect(order(run(s, { type: 'moveCueTo', stackId: 'stack-1', cueId: 'cue-2', index: dropDestination(1, 5) }))).toBe('13452')
  })
})
