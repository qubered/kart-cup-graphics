import { describe, expect, it } from 'vitest'
import { indexCatalog } from '../../shared/catalog'
import { createDefaultState } from '../../shared/defaults'
import { reduce } from '../../shared/reducer'
import { activeTournament } from '../../shared/tournament'
import type { Command, RaceResult, ShowState } from '../../shared/types'
import {
  blankRow, boardRows, changedPlayers, clearRaceCommands, isCompleteRow, leaderNote, liveRaceNo, mapPlan, matchComplete, overrideCount, placedCount,
  raceTiles, racesDone, rowIssues, rowView, stepPlan, tapPlace, trackOfRace, winnerInfo,
} from '../../web/src/control/race/logic'
import { fixtureCatalog } from '../fixtures/catalog'

const catalog = indexCatalog(fixtureCatalog)
const ctx = { catalog, now: 1000, random: () => 0 }
const run = (s: ShowState, ...cmds: Command[]) => cmds.reduce((a, c) => reduce(a, c, ctx), s)
const base = createDefaultState(catalog, 0) // mushroom cup: mario-kart-stadium, water-park, sweet-sweet-canyon, thwomp-ruins
const res = (raceNo: number, positions: number[], trackId = base.draft.race.cupId + raceNo): RaceResult => ({ raceNo, trackId, positions })

describe('place pad', () => {
  it('gives a place to a player', () => {
    expect(tapPlace(blankRow(), 2, 1)).toEqual([0, 0, 1, 0])
  })
  it('moves a taken place: the other player loses it, a place is never held twice', () => {
    const row = [1, 2, 0, 0]
    expect(tapPlace(row, 1, 1)).toEqual([0, 1, 0, 0])
    expect(tapPlace(row, 2, 2)).toEqual([1, 0, 2, 0])
    expect(row).toEqual([1, 2, 0, 0]) // input untouched
  })
  it('re-tapping the player\'s own place clears it', () => {
    expect(tapPlace([1, 2, 3, 4], 2, 3)).toEqual([1, 2, 0, 4])
  })
  it('never produces a duplicate, whatever the taps', () => {
    let row = blankRow()
    for (const [slot, place] of [[0, 1], [1, 1], [2, 1], [3, 2], [0, 2], [1, 3], [3, 3], [2, 4], [0, 4]]) {
      row = tapPlace(row, slot, place)
      const placed = row.filter(Boolean)
      expect(new Set(placed).size).toBe(placed.length)
    }
  })
  it('repairs a row that was saved elsewhere with a duplicate', () => {
    expect(tapPlace([1, 1, 3, 0], 2, 1)).toEqual([0, 0, 1, 0])
    expect(tapPlace([1, 1, 3, 0], 3, 2)).toEqual([1, 1, 3, 2])
  })
  it('counts placed players and knows a complete row', () => {
    expect(placedCount([0, 3, 0, 1])).toBe(2)
    expect(isCompleteRow([2, 1, 4, 3])).toBe(true)
    expect(isCompleteRow([2, 1, 4, 0])).toBe(false)
    expect(isCompleteRow([1, 1, 3, 4])).toBe(false)
    expect(isCompleteRow([1, 2, 3, 5])).toBe(false)
    expect(isCompleteRow(undefined)).toBe(false)
  })
  it('reports the duplicate-position message for a row saved with one', () => {
    expect(rowIssues([1, 1, 3, 0])).toEqual(['Duplicate position: 1'])
    expect(rowIssues([2, 2, 3, 3])).toEqual(['Duplicate position: 2', 'Duplicate position: 3'])
    expect(rowIssues([1, 2, 0, 0])).toEqual([])
  })
  it('a row view prefers the unsaved entry and says when it differs from what is saved', () => {
    expect(rowView(undefined, undefined)).toMatchObject({ row: [0, 0, 0, 0], staged: false, complete: false, placed: 0 })
    expect(rowView([2, 1, 4, 3], undefined)).toMatchObject({ staged: false, complete: true, placed: 4 })
    expect(rowView([2, 1, 4, 3], [2, 1, 0, 3])).toMatchObject({ row: [2, 1, 0, 3], staged: true, complete: false, placed: 3 })
    expect(rowView([2, 1, 4, 3], [2, 1, 4, 3]).staged).toBe(false)
  })
})

describe('live race and tiles', () => {
  const race = base.draft.race
  it('numbers the live race from the cup slot, or from the counter in single-track mode', () => {
    expect(liveRaceNo({ ...race, raceIndex: 2 })).toBe(3)
    expect(liveRaceNo({ ...race, mode: 'track', raceNo: 5, raceIndex: 1 })).toBe(5)
  })
  it('finds the track of a race: cup order, hand-picked map, or only the live one in single-track mode', () => {
    const o = { ...race, trackOverrides: [null, 'toad-harbor', null, null] }
    expect([1, 2, 3, 4].map((n) => trackOfRace(catalog, o, n))).toEqual(['mario-kart-stadium', 'toad-harbor', 'sweet-sweet-canyon', 'thwomp-ruins'])
    const t = { ...race, mode: 'track' as const, raceNo: 2, trackId: 'toad-harbor' }
    expect(trackOfRace(catalog, t, 2)).toBe('toad-harbor')
    expect(trackOfRace(catalog, t, 1)).toBe('')
  })
  it('cup mode: four tiles with the effective maps, live and done marked, hand-picked maps flagged', () => {
    const r = { ...race, raceIndex: 2 as const, trackOverrides: [null, 'toad-harbor', null, null] }
    const tiles = raceTiles(catalog, r, [res(1, [1, 2, 3, 4]), res(2, [1, 2, 0, 0])], [4])
    expect(tiles.map((t) => [t.raceNo, t.trackId, t.live, t.state, t.custom])).toEqual([
      [1, 'mario-kart-stadium', false, 'done', false],
      [2, 'toad-harbor', false, 'partial', true],
      [3, 'sweet-sweet-canyon', true, 'upcoming', false],
      [4, 'thwomp-ruins', false, 'partial', false],
    ])
    expect(tiles.map((t) => t.index)).toEqual([0, 1, 2, 3])
  })
  it('single-track mode: one tile per race with the track it was saved on', () => {
    const r = { ...race, mode: 'track' as const, raceNo: 3, raceTotal: 4, trackId: 'water-park' }
    const tiles = raceTiles(catalog, r, [res(1, [1, 2, 3, 4], 'toad-harbor')])
    expect(tiles.map((t) => [t.raceNo, t.trackId, t.live, t.state])).toEqual([
      [1, 'toad-harbor', false, 'done'], [2, '', false, 'upcoming'], [3, 'water-park', true, 'upcoming'], [4, '', false, 'upcoming'],
    ])
  })
  it('single-track mode grows to the live race and stays bounded', () => {
    expect(raceTiles(catalog, { ...race, mode: 'track', raceNo: 6, raceTotal: 4, trackId: 'water-park' }, []).length).toBe(6)
    expect(raceTiles(catalog, { ...race, mode: 'track', raceNo: 99, raceTotal: 99, trackId: 'water-park' }, []).length).toBe(12)
  })
  it('counts hand-picked maps in cup mode only', () => {
    expect(overrideCount({ ...race, trackOverrides: [null, 'toad-harbor', null, 'shy-guy-falls'] })).toBe(2)
    expect(overrideCount({ ...race, mode: 'track', trackOverrides: [null, 'toad-harbor', null, null] })).toBe(0)
    expect(overrideCount(race)).toBe(0)
  })
})

describe('scoreboard', () => {
  const four = (adjustments = [0, 0, 0, 0]) => run(base,
    { type: 'saveResults', raceNo: 1, trackId: 'mario-kart-stadium', positions: [1, 2, 3, 4], adjustments },
    { type: 'saveResults', raceNo: 2, trackId: 'water-park', positions: [2, 1, 4, 3] },
  ).draft
  it('ranks by total with per-race points and the adjustment, leader marked once a race is saved', () => {
    const rows = boardRows(four([0, 0, 0, 2]))
    // P2 and P1 level on 27 (P2 won the last race), P4 21 with the adjustment, P3 19
    expect(rows.map((r) => [r.slot, r.total, r.leader])).toEqual([[1, 27, true], [0, 27, false], [3, 21, false], [2, 19, false]])
    expect(rows.find((r) => r.slot === 3)!.adjustment).toBe(2)
  })
  it('lists points per race column with blanks for races without a result', () => {
    const rows = boardRows(four(), 4)
    const p1 = rows.find((r) => r.slot === 0)!
    expect(p1.points).toEqual([15, 12, null, null])
    expect(rows.every((r) => r.points.length === 4)).toBe(true)
  })
  it('no row leads before a race is saved', () => {
    expect(boardRows(base.draft).some((r) => r.leader)).toBe(false)
  })
  const finished = () => run(base,
    { type: 'saveResults', raceNo: 1, trackId: 'mario-kart-stadium', positions: [1, 2, 3, 4] }, { type: 'saveResults', raceNo: 2, trackId: 'water-park', positions: [2, 1, 4, 3] },
    { type: 'saveResults', raceNo: 3, trackId: 'sweet-sweet-canyon', positions: [1, 2, 3, 4] }, { type: 'saveResults', raceNo: 4, trackId: 'thwomp-ruins', positions: [2, 1, 3, 4] },
  ).draft
  it('knows when a match is complete', () => {
    expect(racesDone(four())).toBe(2)
    expect(matchComplete(four())).toBe(false)
    expect(matchComplete(finished())).toBe(true)
    // a partly entered race does not finish the match
    expect(matchComplete(run(base, { type: 'saveResults', raceNo: 1, trackId: 'a', positions: [1, 2, 0, 0] }).draft)).toBe(false)
  })
  it('names the winner: level totals go to the last race, a hand-picked winner wins over both', () => {
    // P1 and P2 are level on 54 after four races; P2 won the last one
    expect(winnerInfo(finished(), null)).toMatchObject({ slot: 1, total: 54, byHand: false, tieBroken: true })
    expect(winnerInfo(finished(), 3)).toMatchObject({ slot: 3, total: 37, byHand: true, tieBroken: false })
    const clear = run({ ...base, draft: finished() }, { type: 'saveResults', raceNo: 4, trackId: 'thwomp-ruins', positions: [1, 2, 3, 4] }).draft
    expect(winnerInfo(clear, null)).toMatchObject({ slot: 0, total: 57, byHand: false, tieBroken: false })
  })
  it('has no winner before any result', () => {
    expect(winnerInfo(base.draft, null)).toBeNull()
  })
  it('writes the leader note', () => {
    const names = ['NINA', 'OMAR', 'ZOE', 'FELIX']
    const d = run(base, { type: 'saveResults', raceNo: 1, trackId: 'a', positions: [1, 2, 3, 4] }).draft
    expect(leaderNote(boardRows(d), names, 1, 4)).toBe('NINA leads by 3 pts after 1 of 4 races.')
    expect(leaderNote(boardRows(base.draft), names, 0, 4)).toBe('No race recorded yet.')
    const level = run(base, { type: 'saveResults', raceNo: 1, trackId: 'a', positions: [1, 2, 3, 4] }, { type: 'setAdjustment', index: 1, value: 3 }).draft
    expect(leaderNote(boardRows(level), names, 1, 4)).toBe('NINA and OMAR are level on 15 after 1 of 4 races. The last race breaks the tie.')
    const one = run(base, { type: 'saveResults', raceNo: 1, trackId: 'a', positions: [1, 0, 0, 0] }).draft
    expect(leaderNote(boardRows(one), names, 0, 1)).toBe('No race recorded yet.')
    expect(leaderNote(boardRows(finished()), names, 4, 4)).toContain('level on 54 after 4 of 4 races')
  })
})

describe('commands', () => {
  const full = (s: ShowState) => run(s,
    { type: 'saveResults', raceNo: 1, trackId: 'mario-kart-stadium', positions: [1, 2, 3, 4] },
    { type: 'saveResults', raceNo: 2, trackId: 'water-park', positions: [2, 1, 4, 3] },
    { type: 'setAdjustment', index: 2, value: 5 },
  )
  it('clears a race in free play by replaying the others, adjustments kept', () => {
    const s = full(base)
    const cmds = clearRaceCommands(null, s.draft.scores, 1)
    expect(cmds[0]).toEqual({ type: 'resetScores' })
    const after = run(s, ...cmds)
    expect(after.draft.scores.races).toEqual([{ raceNo: 2, trackId: 'water-park', positions: [2, 1, 4, 3] }])
    expect(after.draft.scores.adjustments).toEqual([0, 0, 5, 0])
  })
  it('clearing the only race keeps the adjustments too', () => {
    const s = run(base, { type: 'saveResults', raceNo: 1, trackId: 'mario-kart-stadium', positions: [1, 2, 3, 4] }, { type: 'setAdjustment', index: 1, value: -2 })
    const after = run(s, ...clearRaceCommands(null, s.draft.scores, 1))
    expect(after.draft.scores).toEqual({ races: [], adjustments: [0, -2, 0, 0] })
  })
  it('clears a race inside a tournament with one setMatchResults on the active match', () => {
    const s = full(run(base, { type: 'createTournament', name: 'Finals', template: 'bracket' }))
    const t = activeTournament(s)!
    const cmds = clearRaceCommands(t.activeMatchId, s.draft.scores, 2)
    expect(cmds).toEqual([{ type: 'setMatchResults', matchId: t.activeMatchId, races: [{ raceNo: 1, trackId: 'mario-kart-stadium', positions: [1, 2, 3, 4] }] }])
    const after = run(s, ...cmds)
    expect(after.draft.scores.races.map((r) => r.raceNo)).toEqual([1])
    expect(after.draft.scores.adjustments).toEqual([0, 0, 5, 0])
  })
  it('the undo of a clear (saving the race again) restores it', () => {
    const s = full(base)
    const cleared = run(s, ...clearRaceCommands(null, s.draft.scores, 2))
    const back = run(cleared, { type: 'saveResults', raceNo: 2, trackId: 'water-park', positions: [2, 1, 4, 3] })
    expect(back.draft.scores).toEqual(s.draft.scores)
  })

  it('picks another map for the live race and goes back to the cup order', () => {
    const s0 = base
    const plan = mapPlan(catalog, s0.draft.race, s0.draft.scores.races, 'toad-harbor')!
    expect(plan.message).toBe('Race 1 is now on Toad Harbor')
    const s1 = run(s0, ...plan.commands)
    expect(s1.draft.race).toMatchObject({ trackId: 'toad-harbor', trackOverrides: ['toad-harbor', null, null, null] })
    const reset = mapPlan(catalog, s1.draft.race, s1.draft.scores.races, null)!
    expect(reset.message).toBe('Race 1 is back on Mario Kart Stadium')
    expect(run(s1, ...reset.commands).draft.race).toEqual(s0.draft.race)
    expect(run(s1, ...plan.undo).draft.race).toEqual(s0.draft.race)
  })
  it('a saved race follows its map and the undo puts both back', () => {
    const s0 = run(base, { type: 'saveResults', raceNo: 1, trackId: 'mario-kart-stadium', positions: [1, 2, 3, 4] })
    const plan = mapPlan(catalog, s0.draft.race, s0.draft.scores.races, 'toad-harbor')!
    const s1 = run(s0, ...plan.commands)
    expect(s1.draft.scores.races).toEqual([{ raceNo: 1, trackId: 'toad-harbor', positions: [1, 2, 3, 4] }])
    expect(run(s1, ...plan.undo).draft.scores.races).toEqual(s0.draft.scores.races)
    expect(run(s1, ...plan.undo).draft.race).toEqual(s0.draft.race)
  })
  it('no plan when the map does not change', () => {
    expect(mapPlan(catalog, base.draft.race, [], 'mario-kart-stadium')).toBeNull()
    expect(mapPlan(catalog, base.draft.race, [], null)).toBeNull()
  })
  it('single-track mode sets the track instead', () => {
    const s0 = run(base, { type: 'setRace', patch: { mode: 'track', trackId: 'water-park', raceNo: 2 } })
    const plan = mapPlan(catalog, s0.draft.race, [], 'toad-harbor')!
    expect(plan.commands).toEqual([{ type: 'setRace', patch: { trackId: 'toad-harbor' } }])
    expect(run(s0, ...plan.commands).draft.race.trackId).toBe('toad-harbor')
    expect(run(run(s0, ...plan.commands), ...plan.undo).draft.race.trackId).toBe('water-park')
    expect(mapPlan(catalog, s0.draft.race, [], null)).toBeNull()
  })

  it('steps through the cup and stops at both ends', () => {
    const s = run(base, { type: 'setRaceTrack', raceIndex: 1, trackId: 'toad-harbor' })
    expect(stepPlan(catalog, s.draft.race, -1)).toBeNull()
    const fwd = stepPlan(catalog, s.draft.race, 1)!
    expect(fwd.message).toBe('Race 2 of 4 · Toad Harbor')
    const s2 = run(s, ...fwd.commands)
    expect(s2.draft.race).toMatchObject({ raceIndex: 1, trackId: 'toad-harbor', raceNo: 2 })
    expect(run(s2, ...fwd.undo).draft.race.raceIndex).toBe(0)
    expect(stepPlan(catalog, { ...s.draft.race, raceIndex: 3 }, 1)).toBeNull()
  })
  it('single-track mode counts on and grows the total when it passes it', () => {
    const s0 = run(base, { type: 'setRace', patch: { mode: 'track', trackId: 'water-park', raceNo: 4, raceTotal: 4 } })
    const fwd = stepPlan(catalog, s0.draft.race, 1)!
    expect(fwd.message).toBe('Race 5 of 5')
    const s1 = run(s0, ...fwd.commands)
    expect(s1.draft.race).toMatchObject({ raceNo: 5, raceTotal: 5 })
    expect(run(s1, ...fwd.undo).draft.race).toMatchObject({ raceNo: 4, raceTotal: 4 })
    const back = stepPlan(catalog, s0.draft.race, -1)!
    expect(run(s0, ...back.commands).draft.race).toMatchObject({ raceNo: 3, raceTotal: 4 })
    expect(stepPlan(catalog, { ...s0.draft.race, raceNo: 1 }, -1)).toBeNull()
  })
})

describe('edited, not on air yet', () => {
  it('names the players whose Preview differs from an output with a pending change', () => {
    const s = run(base, { type: 'setPlayer', index: 1, patch: { name: 'OMAR' } })
    const lt = { slot: 1, name: 'Player 2', colour: '#1e6cff', character: 'Luigi' }
    const show = { ...s, program: { ...s.program, wide: { ...s.program.wide, view: { ...s.program.wide.view, lowerThirds: [lt as never] } } } }
    expect(changedPlayers(show, catalog, { wide: 1 })).toEqual([1])
    expect(changedPlayers(show, catalog, { wide: 0 })).toEqual([])
    expect(changedPlayers(base, catalog, { wide: 1 })).toEqual([])
  })
})
