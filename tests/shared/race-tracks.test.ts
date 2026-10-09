import { describe, expect, it } from 'vitest'
import { indexCatalog } from '../../shared/catalog'
import { createDefaultState } from '../../shared/defaults'
import { clientMessageSchema } from '../../shared/protocol'
import { CommandError, reduce } from '../../shared/reducer'
import { commandSchema, showFileSchema, showStateSchema } from '../../shared/schema'
import { activeTournament, effectiveTrackId } from '../../shared/tournament'
import type { Command, ShowState } from '../../shared/types'
import { deriveView } from '../../shared/view'
import { fixtureCatalog } from '../fixtures/catalog'

const idx = indexCatalog(fixtureCatalog)
const ctx = { catalog: idx, now: 1000, random: () => 0 }
const run = (s: ShowState, ...cmds: Command[]) => cmds.reduce((a, c) => reduce(a, c, ctx), s)
const base = createDefaultState(idx, 0) // mushroom cup: mario-kart-stadium, water-park, sweet-sweet-canyon, thwomp-ruins
const T = (s: ShowState) => activeTournament(s)!
const wide = base.outputs.find((o) => o.id === 'wide')!
const L = { background: 'none' as const, scene: 'none' as const, trackCard: false, lowerThirds: { on: false, players: [0, 1, 2, 3] } }
const view = (s: ShowState, scene: 'nextRace' | 'none', trackCard = false) => deriveView(s.draft, { ...L, scene, trackCard }, wide, idx, activeTournament(s))
const nextRace = (s: ShowState) => {
  const sc = view(s, 'nextRace').scene
  if (sc?.kind !== 'nextRace') throw new Error('not a next race scene')
  return sc
}

describe('effectiveTrackId', () => {
  const race = base.draft.race
  it('is the cup order unless a race is overridden', () => {
    expect([0, 1, 2, 3].map((i) => effectiveTrackId(idx, race, i))).toEqual(['mario-kart-stadium', 'water-park', 'sweet-sweet-canyon', 'thwomp-ruins'])
    const o = { ...race, trackOverrides: [null, 'toad-harbor', null, null] }
    expect([0, 1, 2, 3].map((i) => effectiveTrackId(idx, o, i))).toEqual(['mario-kart-stadium', 'toad-harbor', 'sweet-sweet-canyon', 'thwomp-ruins'])
  })
  it('single-track mode ignores the cup and the overrides', () => {
    expect(effectiveTrackId(idx, { ...race, mode: 'track', trackId: 'toad-harbor', trackOverrides: ['water-park', null, null, null] }, 0)).toBe('toad-harbor')
  })
  it('is empty for an unknown cup or an index past the cup', () => {
    expect(effectiveTrackId(idx, { ...race, cupId: 'nope' }, 0)).toBe('')
    expect(effectiveTrackId(idx, race, 7)).toBe('')
  })
})

describe('setRaceTrack', () => {
  it('overriding the current race changes trackId, the track card and the Next race scene', () => {
    const s = run(base, { type: 'setRaceTrack', raceIndex: 0, trackId: 'toad-harbor' })
    expect(s.draft.race).toMatchObject({ raceIndex: 0, trackId: 'toad-harbor', trackOverrides: ['toad-harbor', null, null, null], cupId: 'mushroom' })
    const card = view(s, 'none', true).trackCard
    expect(card).toMatchObject({ trackName: 'Toad Harbor', cupName: 'Mushroom Cup' })
    const sc = nextRace(s)
    expect(sc.trackName).toBe('Toad Harbor')
    expect(sc.cupTracks.map((t) => [t.name, t.current])).toEqual([['Toad Harbor', true], ['Water Park', false], ['Sweet Sweet Canyon', false], ['Thwomp Ruins', false]])
  })
  it('overriding another race leaves the live race alone until the race steps there', () => {
    let s = run(base, { type: 'setRaceTrack', raceIndex: 2, trackId: 'twisted-mansion' })
    expect(s.draft.race.trackId).toBe('mario-kart-stadium'); expect(s.draft.race.trackOverrides).toEqual([null, null, 'twisted-mansion', null])
    expect(nextRace(s).cupTracks.map((t) => [t.name, t.current])).toEqual([['Mario Kart Stadium', true], ['Water Park', false], ['Twisted Mansion', false], ['Thwomp Ruins', false]])
    s = run(s, { type: 'stepRace', delta: 1 })
    expect(s.draft.race).toMatchObject({ raceIndex: 1, trackId: 'water-park', raceNo: 2 })
    s = run(s, { type: 'stepRace', delta: 1 })
    expect(s.draft.race).toMatchObject({ raceIndex: 2, trackId: 'twisted-mansion', raceNo: 3 }); expect(nextRace(s).trackName).toBe('Twisted Mansion')
    expect(nextRace(s).cupTracks.map((t) => t.current)).toEqual([false, false, true, false])
    s = run(s, { type: 'stepRace', delta: 1 })
    expect(s.draft.race.trackId).toBe('thwomp-ruins')
    s = run(s, { type: 'stepRace', delta: -1 })
    expect(s.draft.race.trackId).toBe('twisted-mansion')
    // setRace to a raceIndex follows too
    expect(run(s, { type: 'setRace', patch: { raceIndex: 0 } }).draft.race.trackId).toBe('mario-kart-stadium')
    expect(run(s, { type: 'setRace', patch: { raceIndex: 3 } }).draft.race.trackId).toBe('thwomp-ruins')
  })
  it('null clears one race, and picking the cup\'s own track counts as no override', () => {
    let s = run(base, { type: 'setRaceTrack', raceIndex: 0, trackId: 'toad-harbor' }, { type: 'setRaceTrack', raceIndex: 3, trackId: 'shy-guy-falls' })
    expect(s.draft.race.trackOverrides).toEqual(['toad-harbor', null, null, 'shy-guy-falls'])
    const cleared = run(s, { type: 'setRaceTrack', raceIndex: 0, trackId: null })
    expect(cleared.draft.race).toMatchObject({ trackId: 'mario-kart-stadium', trackOverrides: [null, null, null, 'shy-guy-falls'] })
    expect(run(s, { type: 'setRaceTrack', raceIndex: 0, trackId: 'mario-kart-stadium' }).draft.race.trackOverrides).toEqual([null, null, null, 'shy-guy-falls'])
    // when the last one goes the property goes with it
    s = run(cleared, { type: 'setRaceTrack', raceIndex: 3, trackId: null })
    expect(s.draft.race).toEqual(base.draft.race); expect('trackOverrides' in s.draft.race).toBe(false)
    // setting the same map twice, or clearing nothing, changes nothing
    const once = run(base, { type: 'setRaceTrack', raceIndex: 1, trackId: 'toad-harbor' })
    expect(run(once, { type: 'setRaceTrack', raceIndex: 1, trackId: 'toad-harbor' })).toBe(once)
    expect(run(base, { type: 'setRaceTrack', raceIndex: 1, trackId: null })).toBe(base)
  })
  it('the same map may be picked for more than one race, and the scene flags the race by position', () => {
    const s = run(base, { type: 'setRaceTrack', raceIndex: 0, trackId: 'water-park' }, { type: 'setRaceTrack', raceIndex: 2, trackId: 'water-park' }, { type: 'stepRace', delta: 1 }, { type: 'stepRace', delta: 1 })
    expect(s.draft.race.trackId).toBe('water-park')
    expect(nextRace(s).cupTracks.map((t) => [t.name, t.current])).toEqual([['Water Park', false], ['Water Park', false], ['Water Park', true], ['Thwomp Ruins', false]])
  })
  it('leaves the race counter alone', () => {
    const s0 = run(base, { type: 'setRace', patch: { raceNo: 7, raceTotal: 9 } })
    const s = run(s0, { type: 'setRaceTrack', raceIndex: 0, trackId: 'toad-harbor' })
    expect(s.draft.race).toMatchObject({ raceNo: 7, raceTotal: 9 })
  })
  it('changing the cup clears the overrides; the same cup does not', () => {
    const s = run(base, { type: 'setRaceTrack', raceIndex: 0, trackId: 'toad-harbor' }, { type: 'setRaceTrack', raceIndex: 2, trackId: 'water-park' })
    const flower = run(s, { type: 'setRace', patch: { cupId: 'flower' } })
    expect(flower.draft.race.trackOverrides).toBeUndefined(); expect('trackOverrides' in flower.draft.race).toBe(false)
    expect(flower.draft.race).toMatchObject({ cupId: 'flower', raceIndex: 0, trackId: 'mario-circuit' })
    expect(run(s, { type: 'setRace', patch: { cupId: 'mushroom' } }).draft.race.trackOverrides).toEqual(['toad-harbor', null, 'water-park', null])
    expect(run(s, { type: 'setRace', patch: { cupId: 'flower', raceIndex: 0 } }).draft.race.trackOverrides).toBeUndefined()
    // a patch that brings its own maps for the new cup keeps them
    const both = run(s, { type: 'setRace', patch: { cupId: 'flower', trackOverrides: [null, 'mario-circuit', null, null] } })
    expect(both.draft.race).toMatchObject({ cupId: 'flower', trackOverrides: [null, 'mario-circuit', null, null] })
  })
  it('randomRace drops the overrides, even when it lands on the same cup', () => {
    const s = run(base, { type: 'setRaceTrack', raceIndex: 0, trackId: 'toad-harbor' })
    const r = run(s, { type: 'randomRace' }) // random() = 0 picks the first cup, mushroom, again
    expect(r.draft.race).toMatchObject({ cupId: 'mushroom', raceIndex: 0, trackId: 'mario-kart-stadium' }); expect('trackOverrides' in r.draft.race).toBe(false)
    // single-track mode has no per-race maps
    expect(run(s, { type: 'setRace', patch: { mode: 'track', trackId: 'water-park' } }).draft.race.trackId).toBe('water-park')
  })
  it('is tidied by setRace too: wrong-length lists are padded, entries equal to the cup order vanish', () => {
    const s = run(base, { type: 'setRace', patch: { trackOverrides: ['mario-kart-stadium', 'toad-harbor'] } })
    expect(s.draft.race.trackOverrides).toEqual([null, 'toad-harbor', null, null])
    expect(run(base, { type: 'setRace', patch: { trackOverrides: [null, null, null, null] } }).draft.race.trackOverrides).toBeUndefined()
    const cur = run(base, { type: 'setRace', patch: { trackOverrides: ['toad-harbor', null, null, null] } })
    expect(cur.draft.race.trackId).toBe('toad-harbor')
  })
  it('rejects single-track mode, unknown tracks and bad indexes', () => {
    const track = run(base, { type: 'setRace', patch: { mode: 'track', trackId: 'water-park' } })
    expect(() => run(track, { type: 'setRaceTrack', raceIndex: 0, trackId: 'toad-harbor' })).toThrow(CommandError)
    expect(() => run(base, { type: 'setRaceTrack', raceIndex: 0, trackId: 'nope' })).toThrow(/Unknown track/)
    expect(() => run(base, { type: 'setRaceTrack', raceIndex: 4 as 3, trackId: null })).toThrow(CommandError)
  })
  it('stays on the draft only: Program keeps what was taken', () => {
    let s = run(base, { type: 'setLayers', outputId: 'wide', patch: { scene: 'nextRace' } }, { type: 'arm', outputIds: ['wide'] }, { type: 'take', mode: 'cut' })
    s = run(s, { type: 'setRaceTrack', raceIndex: 0, trackId: 'toad-harbor' })
    const onAir = s.program.wide.view.scene
    expect(onAir?.kind === 'nextRace' && onAir.trackName).toBe('Mario Kart Stadium')
    expect(s.program.wide.draft?.race.trackOverrides).toBeUndefined()
    expect(run(s, { type: 'take', mode: 'cut' }).program.wide.view.scene).toMatchObject({ trackName: 'Toad Harbor' })
  })
  it('a preset or Preview snapshot carries the maps with the race', () => {
    let s = run(base, { type: 'setRaceTrack', raceIndex: 1, trackId: 'toad-harbor' }, { type: 'savePreset', name: 'P' })
    s = run(s, { type: 'setRaceTrack', raceIndex: 1, trackId: null }, { type: 'recallPreset', id: 'preset-1' })
    expect(s.draft.race.trackOverrides).toEqual([null, 'toad-harbor', null, null])
  })
})

describe('schema and persistence', () => {
  it('setRaceTrack', () => {
    const ok = { type: 'setRaceTrack', raceIndex: 2, trackId: 'water-park' }
    expect(commandSchema.safeParse(ok).success).toBe(true)
    expect(commandSchema.safeParse({ ...ok, trackId: null }).success).toBe(true)
    expect(clientMessageSchema.safeParse({ type: 'command', command: ok }).success).toBe(true)
    for (const bad of [{ raceIndex: 4 }, { raceIndex: -1 }, { raceIndex: '1' }, { raceIndex: undefined }, { trackId: undefined }, { trackId: '' }, { trackId: 5 }, { trackId: 'x'.repeat(101) }]) {
      expect(commandSchema.safeParse({ ...ok, ...bad }).success).toBe(false)
    }
  })
  it('setRace and updateMatch patches may carry trackOverrides (length 4)', () => {
    const o = ['a', null, null, 'b']
    expect(commandSchema.safeParse({ type: 'setRace', patch: { trackOverrides: o } }).success).toBe(true)
    expect(commandSchema.safeParse({ type: 'updateMatch', matchId: 'm', patch: { race: { trackOverrides: o } } }).success).toBe(true)
    for (const bad of [['a'], [null, null, null, null, null], [1, null, null, null], 'a', { 0: 'a' }]) {
      expect(commandSchema.safeParse({ type: 'setRace', patch: { trackOverrides: bad } }).success).toBe(false)
      expect(commandSchema.safeParse({ type: 'updateMatch', matchId: 'm', patch: { race: { trackOverrides: bad } } }).success).toBe(false)
    }
  })
  it('state and show files keep the overrides; older files without them still load', () => {
    const s = run(base, { type: 'setRaceTrack', raceIndex: 1, trackId: 'toad-harbor' }, { type: 'createTournament', name: 'T' })
    const state = showStateSchema.parse(JSON.parse(JSON.stringify(s)))
    expect(state.draft.race.trackOverrides).toEqual([null, 'toad-harbor', null, null])
    expect(T(state).matches[0].data.race.trackOverrides).toEqual([null, 'toad-harbor', null, null])
    const file = { draft: s.draft, outputs: s.outputs, layers: s.layers, transition: s.transition, presets: s.presets, stacks: s.stacks, tournaments: s.tournaments }
    const parsed = showFileSchema.parse(JSON.parse(JSON.stringify(file)))
    expect(parsed.tournaments[0].matches[0].data.race.trackOverrides).toEqual([null, 'toad-harbor', null, null])
    const imported = run(base, { type: 'importShow', file: parsed })
    expect(imported.draft.race.trackOverrides).toEqual([null, 'toad-harbor', null, null])
    expect(showStateSchema.safeParse(JSON.parse(JSON.stringify(base))).success).toBe(true)
  })
})

describe('maps in a tournament', () => {
  const start = () => run(base, { type: 'createTournament', name: 'Cup' })
  it('the active match mirrors the draft\'s maps', () => {
    const s = run(start(), { type: 'setRaceTrack', raceIndex: 0, trackId: 'toad-harbor' })
    expect(T(s).matches[0].data.race).toMatchObject({ trackId: 'toad-harbor', trackOverrides: ['toad-harbor', null, null, null] })
  })
  it('updateMatch sets a non-active match\'s maps, and they apply when it goes live', () => {
    let s = run(start(), { type: 'updateMatch', matchId: 'match-2', patch: { race: { trackOverrides: [null, null, 'toad-harbor', null] } } })
    expect(s.draft.race.trackOverrides).toBeUndefined()
    expect(T(s).matches[1].data.race).toMatchObject({ trackOverrides: [null, null, 'toad-harbor', null], raceNo: 1, trackId: 'mario-kart-stadium' })
    s = run(s, { type: 'nextMatch' })
    expect(s.draft.race.trackOverrides).toEqual([null, null, 'toad-harbor', null])
    s = run(s, { type: 'stepRace', delta: 1 }, { type: 'stepRace', delta: 1 })
    expect(s.draft.race.trackId).toBe('toad-harbor')
    // overriding the match's current race via updateMatch updates its trackId at once
    s = run(s, { type: 'updateMatch', matchId: 'match-3', patch: { race: { trackOverrides: ['twisted-mansion', null, null, null] } } }, { type: 'setActiveMatch', matchId: 'match-3' })
    expect(s.draft.race).toMatchObject({ raceIndex: 0, trackId: 'twisted-mansion' })
    expect(run(s, { type: 'setActiveMatch', matchId: 'match-2' }).draft.race.raceIndex).toBe(2)
  })
  it('updateMatch with a new cup clears that match\'s maps', () => {
    const s = run(start(), { type: 'updateMatch', matchId: 'match-2', patch: { race: { trackOverrides: [null, 'toad-harbor', null, null] } } },
      { type: 'updateMatch', matchId: 'match-2', patch: { race: { cupId: 'flower' } } })
    expect(T(s).matches[1].data.race.trackOverrides).toBeUndefined()
  })
  it('nextMatch picks up a stale trackId from an older file', () => {
    const s0 = start()
    const stale = { ...s0, tournaments: s0.tournaments.map((t) => ({ ...t, matches: t.matches.map((m, i) => (i === 1 ? { ...m, data: { ...m.data, race: { ...m.data.race, trackOverrides: ['toad-harbor', null, null, null], trackId: 'water-park' } } } : m)) })) }
    expect(run(stale, { type: 'nextMatch' }).draft.race.trackId).toBe('toad-harbor')
  })
  it('new matches start on the cup order; duplicates keep the maps (also with scores reset)', () => {
    let s = run(start(), { type: 'setRaceTrack', raceIndex: 0, trackId: 'toad-harbor' })
    s = run(s, { type: 'addMatch', label: 'Extra' })
    expect('trackOverrides' in T(s).matches[5].data.race).toBe(false); expect(T(s).matches[5].data.race.trackId).toBe('mario-kart-stadium')
    expect(T(s).matches[1].data.race.trackOverrides).toBeUndefined()
    const dup = run(s, { type: 'duplicateTournament', id: 'tournament-1' })
    expect(T(dup).matches[0].data.race.trackOverrides).toEqual(['toad-harbor', null, null, null]); expect(dup.draft.race.trackOverrides).toEqual(['toad-harbor', null, null, null])
    const reset = run(s, { type: 'duplicateTournament', id: 'tournament-1', resetScores: true })
    expect(T(reset).matches[0].data.race.trackOverrides).toEqual(['toad-harbor', null, null, null]); expect(reset.draft.race).toMatchObject({ raceIndex: 0, trackId: 'toad-harbor' })
    // the copy is independent of the original
    const edited = run(dup, { type: 'setRaceTrack', raceIndex: 0, trackId: null })
    expect(edited.tournaments[0].matches[0].data.race.trackOverrides).toEqual(['toad-harbor', null, null, null])
  })
  it('the matches scene and win screens still show the cup name for a match with maps', () => {
    const s = run(start(), { type: 'setRaceTrack', raceIndex: 1, trackId: 'toad-harbor' })
    const v = deriveView(s.draft, { ...L, scene: 'matches' }, wide, idx, T(s))
    expect(v.scene?.kind === 'matches' && v.scene.cards[0].cupName).toBe('Mushroom Cup')
  })
})
