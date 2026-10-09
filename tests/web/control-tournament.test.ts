import { describe, expect, it } from 'vitest'
import {
  adjustmentForTotal, choiceToRef, defaultTrackId, nextRaceNo, rangeSet, refToChoice, removeRace, setPosition, slotSourceChoices, splitAcrossOutputs, toggleRound,
} from '../../web/src/control/tournament'
import { indexCatalog } from '../../shared/catalog'
import type { Layers, OutputConfig, RaceState } from '../../shared/types'
import { fixtureCatalog } from '../fixtures/catalog'

const out = (id: string, format: OutputConfig['format']): OutputConfig => ({ id, name: id, format, safeArea: { top: 0, right: 0, bottom: 0, left: 0 }, graphicsScale: 1 })
const lay = (over: Partial<Layers>): Layers => ({ background: 'A', scene: 'none', trackCard: false, lowerThirds: { on: false, players: [] }, ...over })

describe('results editing', () => {
  it('sets one position, creating and sorting races', () => {
    const a = setPosition([], 2, 't2', 1, 3)
    expect(a).toEqual([{ raceNo: 2, trackId: 't2', positions: [0, 3, 0, 0] }])
    const b = setPosition(a, 1, 't1', 0, 1)
    expect(b.map((r) => r.raceNo)).toEqual([1, 2])
    expect(setPosition(b, 2, 't2', 1, 4)[1].positions).toEqual([0, 4, 0, 0])
  })
  it('removes a race and finds the next number', () => {
    const r = [{ raceNo: 1, trackId: 'a', positions: [1, 2, 3, 4] }, { raceNo: 2, trackId: 'b', positions: [2, 1, 3, 4] }]
    expect(removeRace(r, 1).map((x) => x.raceNo)).toEqual([2])
    expect(nextRaceNo(r)).toBe(3)
    expect(nextRaceNo([])).toBe(1)
  })
  it('computes the adjustment that reaches a typed total', () => {
    const r = [{ raceNo: 1, trackId: 'a', positions: [1, 2, 3, 4] }]
    expect(adjustmentForTotal(r, 0, 20)).toBe(5)
    expect(adjustmentForTotal(r, 1, 12)).toBe(0)
  })
})

describe('refs and sets', () => {
  it('round-trips match refs', () => {
    expect(refToChoice(undefined)).toBe('active')
    expect(choiceToRef('previous')).toBe('previous')
    expect(choiceToRef('match-3')).toEqual({ matchId: 'match-3' })
    expect(refToChoice({ matchId: 'match-3' })).toBe('match-3')
  })
  it('builds ranges and toggles rounds', () => {
    expect(rangeSet(undefined, 3, 4, 5)).toEqual({ range: [2, 3] })
    expect(rangeSet(undefined, 4, 2, 5)).toEqual({ range: [1, 3] })
    expect(rangeSet({ rounds: [0] }, null, null, 5)).toEqual({ rounds: [0] })
    expect(toggleRound({}, 0)).toEqual({ rounds: [0] })
    expect(toggleRound({ rounds: [0] }, 0)).toEqual({})
    expect(toggleRound({ rounds: [1], range: [0, 1] }, 0)).toEqual({ range: [0, 1], rounds: [0, 1] })
  })
  it('offers earlier rounds first as slot sources', () => {
    const ms = [{ id: 'z', label: 'Z', round: 2 }, { id: 'a', label: 'A', round: 0 }, { id: 'f', label: 'F', round: 1 }]
    expect(slotSourceChoices(ms, 'f').map((c) => c.matchId)).toEqual(['a', 'z'])
  })
})

describe('split across outputs', () => {
  const outputs = [out('wide', 'wide'), out('twins', 'twin'), out('hd', 'hd')]
  it('hero stays, the board goes to the twin', () => {
    const cmds = splitAcrossOutputs(outputs, 'wide', { wide: lay({ scene: 'cupWin', matchRef: 'previous' }) })
    expect(cmds).toEqual([
      { type: 'setLayers', outputId: 'wide', patch: { scene: 'cupWin', part: 'hero', matchRef: 'previous' } },
      { type: 'setLayers', outputId: 'twins', patch: { scene: 'cupWin', part: 'board', matchRef: 'previous' } },
    ])
  })
  it('null for other scenes or a single output', () => {
    expect(splitAcrossOutputs(outputs, 'wide', { wide: lay({ scene: 'lineup' }) })).toBeNull()
    expect(splitAcrossOutputs([out('wide', 'wide')], 'wide', { wide: lay({ scene: 'raceWin' }) })).toBeNull()
  })
})

describe('default track for a result', () => {
  const catalog = indexCatalog(fixtureCatalog)
  const cup: RaceState = { mode: 'cup', cupId: 'mushroom', raceIndex: 0, trackId: 'mario-kart-stadium', raceNo: 1, raceTotal: 4 }
  it('follows the cup order by race number', () => {
    expect([1, 2, 3, 4].map((n) => defaultTrackId(catalog, cup, n))).toEqual(['mario-kart-stadium', 'water-park', 'sweet-sweet-canyon', 'thwomp-ruins'])
    expect(defaultTrackId(catalog, cup, 5)).toBe('mario-kart-stadium')
    expect(defaultTrackId(catalog, cup, 0)).toBe('mario-kart-stadium')
  })
  it('honours a hand-picked map for that race', () => {
    const r: RaceState = { ...cup, trackOverrides: [null, 'toad-harbor', null, 'shy-guy-falls'] }
    expect([1, 2, 3, 4].map((n) => defaultTrackId(catalog, r, n))).toEqual(['mario-kart-stadium', 'toad-harbor', 'sweet-sweet-canyon', 'shy-guy-falls'])
    expect(defaultTrackId(catalog, r, 6)).toBe('toad-harbor')
  })
  it('single-track mode uses the chosen track; an unknown cup falls back to it', () => {
    expect(defaultTrackId(catalog, { ...cup, mode: 'track', trackId: 'toad-harbor', trackOverrides: ['water-park', null, null, null] }, 1)).toBe('toad-harbor')
    expect(defaultTrackId(catalog, { ...cup, cupId: 'nope', trackId: 'water-park' }, 2)).toBe('water-park')
  })
})
