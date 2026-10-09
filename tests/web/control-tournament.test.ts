import { describe, expect, it } from 'vitest'
import {
  adjustmentForTotal, autoSource, choiceToRef, defaultTrackId, fillFromPreviousCommands, isPlaceholderName, matchesOfRound, matchStatusOf, newMatchLabel, nextMatchOf, nextRaceNo,
  previousRound, raceDots, rangeSet, refToChoice, removeRace, removeRoundCommands, roundNumbers, setPosition, slotSourceChoices, slotSourceGroups, splitAcrossOutputs,
  summariseRounds, toggleRound, trackOverridesWith, validateTournament,
} from '../../web/src/control/tournament'
import { indexCatalog } from '../../shared/catalog'
import { createDefaultState } from '../../shared/defaults'
import { reduce } from '../../shared/reducer'
import { activeTournament, liveMatches } from '../../shared/tournament'
import type { Command, Layers, Match, OutputConfig, RaceState, ShowState } from '../../shared/types'
import { fixtureCatalog } from '../fixtures/catalog'

const out =(id: string, format: OutputConfig['format']): OutputConfig => ({ id, name: id, format, safeArea: { top: 0, right: 0, bottom: 0, left: 0 }, graphicsScale: 1 })
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

// ---- the Tournament workspace helpers, run against the real reducer ----
const rctx = { catalog: indexCatalog(fixtureCatalog), now: 1000, random: () => 0 }
const run = (s: ShowState, ...cmds: Command[]) => cmds.reduce((a, c) => reduce(a, c, rctx), s)
const fresh = (template?: 'bracket' | 'empty') => run(createDefaultState(rctx.catalog, 0), { type: 'createTournament', name: 'T', ...(template ? { template } : {}) })
const matchesOf = (s: ShowState): Match[] => liveMatches(activeTournament(s)!, s.draft)
const nameAll = (s: ShowState, ids = ['match-1', 'match-2', 'match-3', 'match-4']) =>
  run(s, ...ids.map((matchId): Command => ({ type: 'updateMatch', matchId, patch: { players: [{ name: 'ANN' }, { name: 'BOB' }, { name: 'CAL' }, { name: 'DEE' }] } })))

describe('rounds', () => {
  const ms = [{ round: 0 }, { round: 0 }, { round: 3 }, { round: 1 }]
  it('lists the rounds in use, ascending, gaps allowed', () => {
    expect(roundNumbers(ms)).toEqual([0, 1, 3])
    expect(roundNumbers([])).toEqual([])
  })
  it('finds the previous round with matches and a round\'s matches', () => {
    expect(previousRound(ms, 0)).toBeNull()
    expect(previousRound(ms, 1)).toBe(0)
    expect(previousRound(ms, 3)).toBe(1)
    expect(previousRound(ms, 2)).toBeNull()
    expect(matchesOfRound(ms, 0)).toHaveLength(2)
  })
})

describe('placeholder names', () => {
  it('flags empty and default names only', () => {
    for (const n of ['', '   ', 'Player 1', 'player 4', 'PLAYER4', 'Player  2']) expect(isPlaceholderName(n), n).toBe(true)
    for (const n of ['ALEX', 'Player', 'Player One', 'Player 123', 'P1']) expect(isPlaceholderName(n), n).toBe(false)
  })
})

describe('validateTournament', () => {
  it('a new bracket needs every hand-set player named; the final fills itself so it is not flagged', () => {
    const r = validateTournament(matchesOf(fresh()))
    expect(r.ok).toBe(false)
    expect(r.issues).toHaveLength(16)
    expect(r.issues.every((i) => i.kind === 'name' && i.round === 0)).toBe(true)
    expect(r.issues[0]).toMatchObject({ matchId: 'match-1', slot: 0, text: 'Semi 1: P1 is still “Player 1”' })
    expect(r.players).toEqual({ ok: false, warn: 16 })
    expect(r.matches).toEqual({ ok: true, warn: 0 })
    expect(r.warn).toBe(16)
  })
  it('is ready once the semis are named', () => {
    const r = validateTournament(matchesOf(nameAll(fresh())))
    expect(r).toMatchObject({ ok: true, warn: 0, issues: [] })
  })
  it('reads the live match from the draft, so a name typed there counts at once', () => {
    const s = run(fresh('empty'), { type: 'setPlayer', index: 0, patch: { name: 'ANN' } }, { type: 'setPlayer', index: 1, patch: { name: 'BOB' } })
    expect(validateTournament(matchesOf(s)).issues.map((i) => i.slot)).toEqual([2, 3])
    expect(validateTournament(matchesOf(s)).issues[0].text).toBe('Match 1: P3 is still “Player 3”')
  })
  it('a later-round slot that is hand-set and still unnamed also says to pick a winner source', () => {
    const s = run(nameAll(fresh()), { type: 'setSlotSource', matchId: 'match-5', slot: 2, source: null })
    const r = validateTournament(matchesOf(s))
    expect(r.issues).toHaveLength(1)
    expect(r.issues[0]).toMatchObject({ kind: 'name', round: 1, matchId: 'match-5', slot: 2 })
    expect(r.issues[0].text).toContain('pick a winner source')
    // typing a name instead is fine
    expect(validateTournament(matchesOf(run(s, { type: 'updateMatch', matchId: 'match-5', patch: { players: [null, null, { name: 'EVE' }] } }))).ok).toBe(true)
  })
  it('flags a match with no label, and uses a neutral name in its other messages', () => {
    const s = run(fresh('empty'), { type: 'updateMatch', matchId: 'match-1', patch: { label: '  ' } })
    const r = validateTournament(matchesOf(s))
    expect(r.issues[0]).toMatchObject({ kind: 'label', matchId: 'match-1', text: 'A match has no label' })
    expect(r.issues[1].text).toBe('A match: P1 is still “Player 1”')
    expect(r.matches).toEqual({ ok: false, warn: 1 })
  })
  it('flags a single-track match without a known track (only with a catalog)', () => {
    const s = run(fresh('empty'), { type: 'updateMatch', matchId: 'match-1', patch: { players: [{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }], race: { mode: 'track', trackId: 'nowhere' } } })
    expect(validateTournament(matchesOf(s)).ok).toBe(true)
    const r = validateTournament(matchesOf(s), rctx.catalog)
    expect(r.issues).toEqual([{ kind: 'map', round: 0, matchId: 'match-1', text: 'Match 1: no map chosen' }])
    expect(r.matches).toEqual({ ok: false, warn: 1 })
  })
})

describe('round summaries', () => {
  it('counts matches, progress, the live round and issues per round', () => {
    const s = fresh()
    const r = summariseRounds(matchesOf(s), 'match-1', validateTournament(matchesOf(s)).issues)
    expect(r).toEqual([
      { round: 0, matchIds: ['match-1', 'match-2', 'match-3', 'match-4'], statuses: ['live', 'pending', 'pending', 'pending'], done: 0, total: 4, live: true, warn: 16 },
      { round: 1, matchIds: ['match-5'], statuses: ['pending'], done: 0, total: 1, live: false, warn: 0 },
    ])
  })
  it('a played match that is no longer live is done', () => {
    const s = run(nameAll(fresh()), { type: 'setMatchResults', matchId: 'match-1', races: [{ raceNo: 1, trackId: 'water-park', positions: [1, 2, 3, 4] }] }, { type: 'nextMatch' })
    const r = summariseRounds(matchesOf(s), activeTournament(s)!.activeMatchId, [])
    expect(r[0].statuses).toEqual(['done', 'live', 'pending', 'pending'])
    expect(r[0]).toMatchObject({ done: 1, live: true, warn: 0 })
    expect(matchStatusOf({ id: 'x', status: 'live' }, 'y')).toBe('pending')
    expect(matchStatusOf({ id: 'x', status: 'done' }, 'y')).toBe('done')
    expect(matchStatusOf({ id: 'x', status: 'done' }, 'x')).toBe('live')
  })
  it('tracks race progress: complete, partly entered, not started', () => {
    const s = run(fresh(), { type: 'setMatchResults', matchId: 'match-1', races: [{ raceNo: 1, trackId: 'a', positions: [1, 2, 3, 4] }, { raceNo: 2, trackId: 'b', positions: [1, 2, 0, 0] }] })
    expect(raceDots(matchesOf(s)[0])).toEqual(['done', 'part', 'empty', 'empty'])
    expect(raceDots(matchesOf(s)[1])).toEqual(['empty', 'empty', 'empty', 'empty'])
  })
})

describe('fill from the previous round', () => {
  it('slot N of every match takes the winner of the Nth match of the previous round, one command per slot', () => {
    const s = run(fresh(), { type: 'setSlotSource', matchId: 'match-5', slot: 1, source: null }, { type: 'setSlotSource', matchId: 'match-5', slot: 3, source: { matchId: 'match-1', auto: false } })
    const cmds = fillFromPreviousCommands(matchesOf(s), 1)
    expect(cmds).toEqual([0, 1, 2, 3].map((slot) => ({ type: 'setSlotSource', matchId: 'match-5', slot, source: { matchId: `match-${slot + 1}`, auto: true } })))
    const filled = run(s, ...cmds)
    expect(activeTournament(filled)!.matches[4].slotSources).toEqual([1, 2, 3, 4].map((n) => ({ matchId: `match-${n}`, auto: true })))
  })
  it('leaves slots alone when the previous round has fewer matches, and does nothing for the first round', () => {
    const s = run(fresh(), { type: 'addMatch', round: 2, label: 'Grand final' })
    expect(fillFromPreviousCommands(matchesOf(s), 2)).toEqual([{ type: 'setSlotSource', matchId: 'match-6', slot: 0, source: { matchId: 'match-5', auto: true } }])
    expect(fillFromPreviousCommands(matchesOf(s), 0)).toEqual([])
  })
  it('applies to every match of the round', () => {
    const s = run(fresh(), { type: 'addMatch', round: 1, label: 'Final B' })
    const cmds = fillFromPreviousCommands(matchesOf(s), 1)
    expect(cmds).toHaveLength(8)
    expect(new Set(cmds.map((c) => (c as { matchId: string }).matchId))).toEqual(new Set(['match-5', 'match-6']))
  })
})

describe('remove a round', () => {
  it('is not offered for the only round', () => {
    expect(removeRoundCommands(activeTournament(fresh('empty'))!, 0)).toBeNull()
  })
  it('removes every match of the round and its name; matches that took their players from them become hand-set', () => {
    const s = run(fresh(), { type: 'setRoundName', round: 1, name: 'Grand final' }, { type: 'addMatch', round: 1, label: 'Final B' })
    const t = activeTournament(s)!
    const cmds = removeRoundCommands(t, 1)!
    expect(cmds).toEqual([{ type: 'removeMatch', matchId: 'match-5' }, { type: 'removeMatch', matchId: 'match-6' }, { type: 'setRoundName', round: 1, name: null }])
    const after = activeTournament(run(s, ...cmds))!
    expect(after.matches.map((m) => m.id)).toEqual(['match-1', 'match-2', 'match-3', 'match-4'])
    expect(after.roundNames).toBeUndefined()
  })
  it('removing the live match\'s round hands the live match to a remaining one', () => {
    const s = fresh()
    const cmds = removeRoundCommands(activeTournament(s)!, 0)!
    expect(cmds).toHaveLength(4)
    const after = activeTournament(run(s, ...cmds))!
    expect(after.matches.map((m) => m.id)).toEqual(['match-5'])
    expect(after.activeMatchId).toBe('match-5')
    expect(after.matches[0].slotSources).toEqual([null, null, null, null])
  })
})

describe('per-race map overrides', () => {
  it('sets one race and keeps the others, always four entries', () => {
    expect(trackOverridesWith(undefined, 1, 'toad-harbor')).toEqual([null, 'toad-harbor', null, null])
    expect(trackOverridesWith([null, 'toad-harbor', null, null], 3, 'shy-guy-falls')).toEqual([null, 'toad-harbor', null, 'shy-guy-falls'])
    expect(trackOverridesWith([null, 'toad-harbor', null, null], 1, null)).toEqual([null, null, null, null])
    expect(trackOverridesWith(['a', 'b', 'c', 'd'], 0, '')).toEqual([null, 'b', 'c', 'd'])
  })
  it('round-trips through updateMatch on a match that is not live, and resets to the cup order', () => {
    let s = run(fresh(), { type: 'updateMatch', matchId: 'match-2', patch: { race: { trackOverrides: trackOverridesWith(undefined, 1, 'toad-harbor') } } })
    expect(activeTournament(s)!.matches[1].data.race.trackOverrides).toEqual([null, 'toad-harbor', null, null])
    s = run(s, { type: 'updateMatch', matchId: 'match-2', patch: { race: { trackOverrides: trackOverridesWith([null, 'toad-harbor', null, null], 1, null) } } })
    expect(activeTournament(s)!.matches[1].data.race.trackOverrides).toBeUndefined()
  })
  it('a map equal to the cup\'s own is the same as the cup order', () => {
    const s = run(fresh(), { type: 'updateMatch', matchId: 'match-2', patch: { race: { trackOverrides: trackOverridesWith(undefined, 1, 'water-park') } } })
    expect(activeTournament(s)!.matches[1].data.race.trackOverrides).toBeUndefined()
  })
  it('changing the live match\'s maps leaves its race counter alone', () => {
    const s = run(fresh(), { type: 'updateMatch', matchId: 'match-1', patch: { race: { trackOverrides: trackOverridesWith(undefined, 2, 'twisted-mansion') } } })
    expect(s.draft.race).toMatchObject({ raceNo: 1, raceIndex: 0, trackOverrides: [null, null, 'twisted-mansion', null] })
  })
})

describe('slot sources, labels and order', () => {
  const ms = [
    { id: 'a', label: 'A', round: 0 }, { id: 'b', label: 'B', round: 0 }, { id: 'f', label: 'F', round: 1 }, { id: 'z', label: 'Z', round: 2 },
  ]
  it('splits the choices into earlier rounds and other matches', () => {
    expect(slotSourceGroups(ms, 'f')).toEqual({ earlier: [{ matchId: 'a', label: 'A' }, { matchId: 'b', label: 'B' }], other: [{ matchId: 'z', label: 'Z' }] })
    expect(slotSourceGroups(ms, 'a')).toEqual({ earlier: [], other: [{ matchId: 'b', label: 'B' }, { matchId: 'f', label: 'F' }, { matchId: 'z', label: 'Z' }] })
    expect(slotSourceGroups(ms, 'nope').earlier).toEqual([])
  })
  it('a hand-set slot has no auto source; auto off counts as hand-set', () => {
    expect(autoSource({ slotSources: [{ matchId: 'a', auto: true }, { matchId: 'b', auto: false }, null] }, 0)).toBe('a')
    expect(autoSource({ slotSources: [{ matchId: 'a', auto: true }, { matchId: 'b', auto: false }, null] }, 1)).toBeNull()
    expect(autoSource({ slotSources: [{ matchId: 'a', auto: true }, { matchId: 'b', auto: false }, null] }, 2)).toBeNull()
    expect(autoSource({}, 0)).toBeNull()
  })
  it('names a new match like the demo: running number in the first round, per round after', () => {
    expect(newMatchLabel(ms, 0)).toBe('Match 5')
    expect(newMatchLabel(ms, 1)).toBe('R2 Match 2')
    expect(newMatchLabel(ms, 3)).toBe('R4 Match 1')
  })
  it('Next match is the one after the live match in tournament order', () => {
    expect(nextMatchOf(ms, 'b')?.id).toBe('f')
    expect(nextMatchOf(ms, 'z')).toBeNull()
  })
})
