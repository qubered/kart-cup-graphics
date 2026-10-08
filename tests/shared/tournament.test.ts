import { describe, expect, it } from 'vitest'
import { indexCatalog } from '../../shared/catalog'
import { createDefaultState } from '../../shared/defaults'
import { reduce } from '../../shared/reducer'
import { commandSchema, showFileSchema, showStateSchema } from '../../shared/schema'
import { activeTournament } from '../../shared/tournament'
import type { Command, ShowState } from '../../shared/types'
import { deriveView, isSceneSupported } from '../../shared/view'
import { fixtureCatalog } from '../fixtures/catalog'

const idx = indexCatalog(fixtureCatalog)
const ctx = { catalog: idx, now: 1000, random: () => 0 }
const run = (s: ShowState, ...cmds: Command[]) => cmds.reduce((a, c) => reduce(a, c, ctx), s)
const base = createDefaultState(idx, 0)
const T = (s: ShowState) => activeTournament(s)!
const wide = base.outputs.find((o) => o.id === 'wide')!
const twin = base.outputs.find((o) => o.id === 'twins')!
const L = { background: 'none' as const, scene: 'none' as const, trackCard: false, lowerThirds: { on: false, players: [0, 1, 2, 3] } }
/** positions: slot 0 wins every race by default */
const race = (raceNo: number, positions = [1, 2, 3, 4]) => ({ raceNo, trackId: 'rainbow-road', positions })

describe('duplicateTournament', () => {
  const played = () => {
    let s = run(base, { type: 'createTournament', name: 'Cup' }, { type: 'setPlayer', index: 0, patch: { name: 'ALPHA' } },
      { type: 'setMatchResults', matchId: 'match-1', races: [race(1)] })
    s = run(s, { type: 'setActiveMatch', matchId: 'match-2' }, { type: 'setWinnerOverride', matchId: 'match-1', slot: 2 })
    return s
  }
  it('is accepted by the command schema', () => {
    expect(commandSchema.safeParse({ type: 'duplicateTournament', id: 't', name: 'X', resetScores: true }).success).toBe(true)
    expect(commandSchema.safeParse({ type: 'duplicateTournament' }).success).toBe(false)
  })
  it('copies with fresh ids, remapped sources and active match, and becomes active', () => {
    const s0 = played()
    const s = run(s0, { type: 'duplicateTournament', id: 'tournament-1' })
    expect(s.tournaments).toHaveLength(2)
    const [a, b] = s.tournaments
    expect(s.activeTournamentId).toBe(b.id)
    expect(b.id).not.toBe(a.id)
    expect(b.name).toBe('Cup (copy)')
    const oldIds = new Set(a.matches.map((m) => m.id))
    expect(b.matches.every((m) => !oldIds.has(m.id))).toBe(true)
    expect(b.matches.map((m) => m.label)).toEqual(a.matches.map((m) => m.label))
    expect(b.activeMatchId).toBe(b.matches[1].id)
    const fin = b.matches[4]
    expect(fin.slotSources?.map((x) => x?.matchId)).toEqual(b.matches.slice(0, 4).map((m) => m.id))
    expect(b.matches[0].winnerOverride).toBe(2)
    expect(b.matches[0].data.players[0].name).toBe('ALPHA')
    expect(b.matches[0].data.scores.races).toHaveLength(1)
    expect(run(s0, { type: 'duplicateTournament', id: 'tournament-1', name: 'Mine' }).tournaments[1].name).toBe('Mine')
  })
  it('remaps scene references that pointed into the source', () => {
    let s = played()
    s = run(s, { type: 'setLayers', outputId: 'wide', patch: { scene: 'cupWin', matchRef: { matchId: 'match-3' } } })
    s = run(s, { type: 'duplicateTournament', id: 'tournament-1' })
    expect(s.layers.wide.matchRef).toEqual({ matchId: T(s).matches[2].id })
  })
  it('is a deep copy: editing the copy never changes the original', () => {
    let s = run(played(), { type: 'duplicateTournament', id: 'tournament-1' })
    const before = JSON.stringify(s.tournaments[0])
    s = run(s, { type: 'setPlayer', index: 0, patch: { name: 'COPYONLY' } }, { type: 'setMatchResults', matchId: T(s).matches[0].id, races: [race(1), race(2)] },
      { type: 'updateMatch', matchId: T(s).matches[0].id, patch: { label: 'Changed' } },
      { type: 'setWinnerOverride', matchId: T(s).matches[0].id, slot: 3 }, { type: 'renameTournament', id: T(s).id, name: 'Other' })
    expect(JSON.stringify(s.tournaments[0])).toBe(before)
    // and the other way round: loading the original and editing leaves the copy alone
    const copyBefore = JSON.stringify(s.tournaments[1])
    s = run(s, { type: 'loadTournament', id: 'tournament-1' }, { type: 'setPlayer', index: 1, patch: { name: 'ORIG' } })
    expect(JSON.stringify(s.tournaments[1])).toBe(copyBefore)
  })
  it('resetScores clears results, statuses and overrides but keeps players, cups and labels', () => {
    const s0 = played()
    const s = run(s0, { type: 'duplicateTournament', id: 'tournament-1', resetScores: true })
    const b = T(s)
    expect(b.matches.every((m) => m.data.scores.races.length === 0 && m.data.scores.adjustments.every((x) => x === 0))).toBe(true)
    expect(b.matches.every((m) => m.winnerOverride === null)).toBe(true)
    expect(b.matches.map((m) => m.status)).toEqual(['live', 'pending', 'pending', 'pending', 'pending'])
    expect(b.activeMatchId).toBe(b.matches[0].id)
    expect(s.draft.scores.races).toEqual([])
    expect(b.matches[0].data.players[0].name).toBe('ALPHA')
    expect(b.matches.map((m) => m.label)).toEqual(['Semi 1', 'Semi 2', 'Semi 3', 'Semi 4', 'Final'])
    // original untouched
    expect(s.tournaments[0].matches[0].data.scores.races).toHaveLength(1)
    expect(s.tournaments[0].matches[0].winnerOverride).toBe(2)
  })
  it('rejects an unknown tournament', () => {
    expect(() => run(base, { type: 'duplicateTournament', id: 'nope' })).toThrow()
  })
})

describe('tournament reducer', () => {
  const start = () => run(base, { type: 'createTournament', name: 'Cup' })

  it('creates a 4-semi + final bracket; first match adopts the draft; finals auto-source semis', () => {
    const s = start()
    expect(s.activeTournamentId).toBe('tournament-1')
    expect(T(s).matches.map((m) => m.label)).toEqual(['Semi 1', 'Semi 2', 'Semi 3', 'Semi 4', 'Final'])
    expect(T(s).activeMatchId).toBe('match-1')
    expect(T(s).matches[4].slotSources?.every((x) => x?.auto)).toBe(true)
    expect(T(s).matches[0].status).toBe('live')
    expect(run(base, { type: 'createTournament', name: 'x', template: 'empty' }).tournaments[0].matches).toHaveLength(1)
  })

  it('switching match round-trips draft data without losing either match', () => {
    let s = run(start(), { type: 'setPlayer', index: 0, patch: { name: 'ALICE' } }, { type: 'saveResults', raceNo: 1, trackId: 'rainbow-road', positions: [1, 2, 3, 4] })
    s = run(s, { type: 'setActiveMatch', matchId: 'match-2' })
    expect(s.draft.players[0].name).toBe('Player 1'); expect(s.draft.scores.races).toEqual([])
    s = run(s, { type: 'setPlayer', index: 0, patch: { name: 'BOB' } }, { type: 'setEventText', patch: { title: 'SHOW' } })
    s = run(s, { type: 'setActiveMatch', matchId: 'match-1' })
    expect(s.draft.players[0].name).toBe('ALICE'); expect(s.draft.scores.races).toHaveLength(1)
    expect(s.draft.event.title).toBe('SHOW') // event text is show-wide
    expect(T(s).matches[1].data.players[0].name).toBe('BOB')
    expect(T(s).matches[0].status).toBe('live'); expect(T(s).matches[1].status).toBe('pending')
  })

  it('winner comes from standings() with last-race tiebreak, and can be overridden', () => {
    let s = start()
    // slots 0 and 1 tie on points (15+12 each); slot 1 won the last race
    s = run(s, { type: 'setMatchResults', matchId: 'match-1', races: [race(1, [1, 2, 3, 4]), race(2, [2, 1, 3, 4])] })
    const v = (st: ShowState) => deriveView(st.draft, { ...L, scene: 'cupWin' }, wide, idx, activeTournament(st)).scene
    let w = v(s)
    expect(w?.kind === 'cupWin' && w.winner.slot).toBe(1)
    s = run(s, { type: 'setWinnerOverride', matchId: 'match-1', slot: 3 })
    w = v(s)
    expect(w?.kind === 'cupWin' && [w.winner.slot, w.overridden]).toEqual([3, true])
    s = run(s, { type: 'setWinnerOverride', matchId: 'match-1', slot: null })
    expect(v(s)?.kind === 'cupWin' && (v(s) as { overridden: boolean }).overridden).toBe(false)
  })

  it('final slots fill from semi winners, follow edits to any match, and can be overridden by hand', () => {
    let s = start()
    s = run(s, { type: 'updateMatch', matchId: 'match-2', patch: { players: [{ name: 'TWO-A' }, { name: 'TWO-B' }] } })
    // semi 2 is not active: edit its results directly
    s = run(s, { type: 'setMatchResults', matchId: 'match-2', races: [race(1, [2, 1, 3, 4])] })
    expect(T(s).matches[4].data.players[1].name).toBe('TWO-B')
    // editing the results of a finished match recalculates the final
    s = run(s, { type: 'setMatchResults', matchId: 'match-2', races: [race(1, [1, 2, 3, 4])] })
    expect(T(s).matches[4].data.players[1].name).toBe('TWO-A')
    // winner override of a non-active match
    s = run(s, { type: 'setWinnerOverride', matchId: 'match-2', slot: 2 })
    expect(T(s).matches[4].data.players[1].name).toBe('Player 3')
    // manual edit of the final turns auto off and sticks
    s = run(s, { type: 'updateMatch', matchId: 'match-5', patch: { players: [null, { name: 'MANUAL' }] } })
    expect(T(s).matches[4].slotSources?.[1]).toEqual({ matchId: 'match-2', auto: false })
    s = run(s, { type: 'setWinnerOverride', matchId: 'match-2', slot: 0 })
    expect(T(s).matches[4].data.players[1].name).toBe('MANUAL')
    // re-enable auto
    s = run(s, { type: 'setSlotSource', matchId: 'match-5', slot: 1, source: { matchId: 'match-2', auto: true } })
    expect(T(s).matches[4].data.players[1].name).toBe('TWO-A')
  })

  it('active final: auto-fill updates the draft and a hand edit of the draft turns auto off', () => {
    let s = run(start(), { type: 'setMatchResults', matchId: 'match-3', races: [race(1)] }, { type: 'updateMatch', matchId: 'match-3', patch: { players: [{ name: 'THREE' }] } }, { type: 'setActiveMatch', matchId: 'match-5' })
    expect(s.draft.players[2].name).toBe('THREE')
    s = run(s, { type: 'setPlayer', index: 2, patch: { name: 'HAND' } })
    expect(T(s).matches[4].slotSources?.[2]?.auto).toBe(false)
    s = run(s, { type: 'setWinnerOverride', matchId: 'match-3', slot: 1 })
    expect(s.draft.players[2].name).toBe('HAND')
  })

  it('status: live / pending / done; nextMatch marks the old match done and stops at the last', () => {
    let s = run(start(), { type: 'saveResults', raceNo: 1, trackId: 'rainbow-road', positions: [1, 2, 3, 4] }, { type: 'nextMatch' })
    expect(T(s).activeMatchId).toBe('match-2'); expect(T(s).matches.map((m) => m.status)).toEqual(['done', 'live', 'pending', 'pending', 'pending'])
    s = run(s, { type: 'setActiveMatch', matchId: 'match-5' })
    expect(run(s, { type: 'nextMatch' })).toBe(s)
  })

  it('removeMatch / addMatch / rename / delete / load', () => {
    let s = run(start(), { type: 'addMatch', label: 'Extra', round: 0 })
    expect(T(s).matches).toHaveLength(6)
    s = run(s, { type: 'removeMatch', matchId: 'match-1' })
    expect(T(s).activeMatchId).toBe('match-2'); expect(T(s).matches[3].slotSources?.[0]).toBeNull()
    s = run(s, { type: 'createTournament', name: 'Two', template: 'empty' })
    expect(s.activeTournamentId).toBe('tournament-2')
    s = run(s, { type: 'loadTournament', id: 'tournament-1' }, { type: 'renameTournament', id: 'tournament-1', name: 'Renamed' })
    expect(T(s).name).toBe('Renamed')
    expect(run(s, { type: 'loadTournament', id: null }).activeTournamentId).toBeNull()
    expect(run(s, { type: 'deleteTournament', id: 'tournament-1' }).activeTournamentId).toBeNull()
    expect(() => run(base, { type: 'nextMatch' })).toThrow()
  })

  it('updateMatch edits a non-active race', () => {
    const s = run(start(), { type: 'updateMatch', matchId: 'match-2', patch: { label: 'S2', race: { cupId: 'flower', raceIndex: 1 } } })
    expect(T(s).matches[1]).toMatchObject({ label: 'S2' }); expect(T(s).matches[1].data.race).toMatchObject({ cupId: 'flower', raceIndex: 1 })
  })
})

describe('recall and cues during a tournament', () => {
  const setup = () => {
    let s = run(base, { type: 'setPlayer', index: 0, patch: { name: 'SAM' } }, { type: 'setLayers', outputId: 'wide', patch: { scene: 'lineup', background: 'B' } })
    s = run(s, { type: 'savePreset', name: 'Full', scope: { scores: true } }) // outside tournament: stores match data
    s = run(s, { type: 'createTournament', name: 'T' }, { type: 'setActiveMatch', matchId: 'match-2' }, { type: 'setPlayer', index: 0, patch: { name: 'LIVE' } },
      { type: 'saveResults', raceNo: 1, trackId: 'rainbow-road', positions: [2, 1, 3, 4] })
    return s
  }
  it('recall never touches players, race or scores, even with every scope on', () => {
    let s = setup()
    s = run(s, { type: 'updatePreset', id: 'preset-1', scope: { match: true, players: true, scores: true, style: true } })
    const before = structuredClone(s.draft)
    const r = run(s, { type: 'recallPreset', id: 'preset-1' })
    expect(r.draft.players).toEqual(before.players); expect(r.draft.race).toEqual(before.race); expect(r.draft.scores).toEqual(before.scores)
    expect(r.layers.wide.scene).toBe('lineup') // layout still applies
    expect(T(r).matches[1].data.players[0].name).toBe('LIVE')
  })
  it('cue scope overrides cannot force match data on either', () => {
    let s = setup()
    s = run(s, { type: 'createStack', name: 'S' }, { type: 'addCue', stackId: 'stack-1', presetId: 'preset-1', take: null, scope: { match: true, players: true, scores: true } })
    const r = run(s, { type: 'fireCue', stackId: 'stack-1', cueId: 'cue-1' })
    expect(r.draft.players[0].name).toBe('LIVE'); expect(r.draft.scores.races).toHaveLength(1)
  })
  it('new presets in a tournament default to layout-only and store no match data', () => {
    const s = run(setup(), { type: 'savePreset', name: 'Look' })
    const p = s.presets[1]
    expect(p.scope).toMatchObject({ layers: true, style: true, match: false, players: false, scores: false })
    expect(p.draft.players[0].name).not.toBe('LIVE'); expect(p.draft.scores.races).toEqual([])
  })
  it('nextMatch resets the active stacks to the first cue', () => {
    let s = setup()
    s = run(s, { type: 'savePreset', name: 'Look' }, { type: 'createStack', name: 'S' },
      { type: 'addCue', stackId: 'stack-1', presetId: 'preset-2', take: 'cut' }, { type: 'addCue', stackId: 'stack-1', presetId: 'preset-2', take: 'cut' })
    s = run(s, { type: 'goStack', stackId: 'stack-1' }, { type: 'goStack', stackId: 'stack-1' })
    expect(s.stacks[0].current).toBe('cue-2')
    s = run(s, { type: 'nextMatch' })
    expect(s.stacks[0]).toMatchObject({ current: null, selected: 'cue-1' })
    expect(T(s).activeMatchId).toBe('match-3')
  })
  it('cue actions: nextMatch, nextRace and resetStack', () => {
    let s = setup()
    s = run(s, { type: 'savePreset', name: 'Look' }, { type: 'createStack', name: 'S' },
      { type: 'addCue', stackId: 'stack-1', presetId: 'preset-2', take: null, action: 'nextRace' },
      { type: 'addCue', stackId: 'stack-1', presetId: 'preset-2', take: null, action: 'nextMatch' })
    const ri = s.draft.race.raceIndex
    s = run(s, { type: 'fireCue', stackId: 'stack-1', cueId: 'cue-1' })
    expect(s.draft.race.raceIndex).toBe(ri + 1)
    s = run(s, { type: 'fireCue', stackId: 'stack-1', cueId: 'cue-2' })
    expect(T(s).activeMatchId).toBe('match-3'); expect(s.stacks[0].current).toBeNull(); expect(s.stacks[0].selected).toBe('cue-1')
    s = run(s, { type: 'updateCue', stackId: 'stack-1', cueId: 'cue-1', action: 'resetStack' }, { type: 'fireCue', stackId: 'stack-1', cueId: 'cue-1' })
    expect(s.stacks[0].current).toBeNull()
    expect(s.stacks[0].cues[0].action).toBe('resetStack')
    s = run(s, { type: 'updateCue', stackId: 'stack-1', cueId: 'cue-1', action: null })
    expect(s.stacks[0].cues[0].action).toBeUndefined()
  })
  it('without a tournament recall behaves as before (match data restored)', () => {
    let s = run(base, { type: 'setPlayer', index: 0, patch: { name: 'SAM' } }, { type: 'savePreset', name: 'P' }, { type: 'setPlayer', index: 0, patch: { name: 'X' } })
    s = run(s, { type: 'recallPreset', id: 'preset-1' })
    expect(s.draft.players[0].name).toBe('SAM')
  })
})

describe('tournament views', () => {
  const played = () => {
    let s = run(base, { type: 'createTournament', name: 'T' })
    s = run(s, { type: 'saveResults', raceNo: 1, trackId: 'rainbow-road', positions: [1, 2, 3, 4] }, { type: 'saveResults', raceNo: 2, trackId: 'rainbow-road', positions: [2, 1, 3, 4] })
    return run(s, { type: 'setMatchResults', matchId: 'match-2', races: [race(1, [3, 1, 2, 4])] })
  }
  const view = (s: ShowState, layers: Record<string, unknown>, out = wide) => deriveView(s.draft, { ...L, ...layers } as never, out, idx, activeTournament(s)).scene

  it('raceWin shows the latest race winner with running totals, and resolves relative refs', () => {
    const s = played()
    const v = view(s, { scene: 'raceWin' })
    if (v?.kind !== 'raceWin') throw new Error('kind')
    expect(v).toMatchObject({ matchId: 'match-1', raceNo: 2, empty: false, part: 'full', racePoints: 15 })
    expect(v.winner.slot).toBe(1)
    expect(v.rows.map((r) => [r.player.slot, r.total, r.racePoints])).toEqual([[1, 27, [12, 15]], [0, 27, [15, 12]], [2, 20, [10, 10]], [3, 18, [9, 9]]])
    const other = view(s, { scene: 'raceWin', matchRef: { matchId: 'match-2' }, part: 'hero' })
    expect(other).toMatchObject({ matchId: 'match-2', part: 'hero' })
    const prev = view(run(s, { type: 'setActiveMatch', matchId: 'match-2' }), { scene: 'raceWin', matchRef: 'previous' })
    expect(prev).toMatchObject({ matchId: 'match-1' })
  })
  it('win screens work without a tournament and are empty before results', () => {
    const v = deriveView(base.draft, { ...L, scene: 'cupWin' }, wide, idx).scene
    expect(v).toMatchObject({ kind: 'cupWin', empty: true, overridden: false })
    expect(deriveView(base.draft, { ...L, scene: 'bracket' }, wide, idx).scene).toBeNull()
    expect(deriveView(base.draft, { ...L, scene: 'matches' }, wide, idx).scene).toBeNull()
  })
  it('matches scene: cards per match, live marker, subsets and ranges, per-format detail', () => {
    const s = played()
    const v = view(s, { scene: 'matches' })
    if (v?.kind !== 'matches') throw new Error('kind')
    expect(v.cards.map((c) => c.id)).toEqual(['match-1', 'match-2', 'match-3', 'match-4', 'match-5'])
    expect(v).toMatchObject({ layout: 'grid', detail: 'full', focusId: 'match-1' })
    expect(v.cards[0]).toMatchObject({ live: true, hasResults: true, status: 'live' }); expect(v.cards[0].winner?.slot).toBe(1)
    expect(v.cards[1]).toMatchObject({ live: false, hasResults: true }); expect(v.cards[1].winner?.slot).toBe(1)
    expect(v.cards[2]).toMatchObject({ hasResults: false, winner: null })
    expect((view(s, { scene: 'matches', matchSet: { rounds: [0], range: [2, 3] } }) as { matchIds: string[] }).matchIds).toEqual(['match-3', 'match-4'])
    expect((view(s, { scene: 'matches', matchSet: { ids: ['match-5'] } }) as { matchIds: string[] }).matchIds).toEqual(['match-5'])
    expect((view(s, { scene: 'matches' }, twin) as { detail: string }).detail).toBe('compact')
    const cfg = run(s, { type: 'setMatchesSceneConfig', patch: { layout: 'row', detail: { wide: 'winner' } } })
    expect(view(cfg, { scene: 'matches' })).toMatchObject({ layout: 'row', detail: 'winner' })
  })
  it('bracket nodes: semis feed the final; overridden winners look the same', () => {
    let s = played()
    const b = () => view(s, { scene: 'bracket' }) as import('../../shared/types').BracketView
    expect(b().rounds.map((r) => r.nodes.length)).toEqual([4, 1])
    const fin = b().rounds[1].nodes[0]
    expect(fin.slots.map((x) => x.fromMatchId)).toEqual(['match-1', 'match-2', 'match-3', 'match-4'])
    expect(fin.slots[0].player.name).toBe('Player 2') // semi 1 winner, slot 1
    s = run(s, { type: 'setWinnerOverride', matchId: 'match-1', slot: 3 })
    expect(b().rounds[0].nodes[0]).toMatchObject({ overridden: true, winner: { slot: 3 } })
    expect(b().rounds[1].nodes[0].slots[0].player.name).toBe('Player 4')
  })
  it('parts and twin support', () => {
    expect(isSceneSupported('twin', 'raceWin', 'full')).toBe(false)
    expect(isSceneSupported('twin', 'raceWin', 'hero')).toBe(true)
    expect(isSceneSupported('twin', 'standings')).toBe(false)
    const s = played()
    expect(view(s, { scene: 'cupWin' }, twin)).toBeNull()
    expect(view(s, { scene: 'cupWin', part: 'board' }, twin)).toMatchObject({ kind: 'cupWin', part: 'board' })
    expect(view(s, { scene: 'bracket' }, twin)?.kind).toBe('bracket')
  })
  it('on-air tournament scenes refresh on score edits and stay pinned to their match', () => {
    let s = played()
    s = run(s, { type: 'setLayers', outputId: 'wide', patch: { scene: 'matches' } }, { type: 'arm', outputIds: ['wide'] }, { type: 'take', mode: 'cut' })
    s = run(s, { type: 'setLayers', outputId: 'wide', patch: { scene: 'cupWin' } }, { type: 'arm', outputIds: ['twins'] }) // preview only
    const at = s.program.wide.takenAt
    s = run(s, { type: 'setMatchResults', matchId: 'match-3', races: [race(1)] })
    const sc = s.program.wide.view.scene
    expect(sc?.kind === 'matches' && sc.cards[2].hasResults).toBe(true); expect(s.program.wide.takenAt).toBe(at)
  })
})

describe('schema compatibility', () => {
  it('old state files without tournaments load; old scopes migrate', () => {
    const old = JSON.parse(JSON.stringify(base)) as Record<string, unknown>
    delete old.tournaments; delete old.activeTournamentId
    old.presets = [{ id: 'preset-1', name: 'Old', scope: { layers: true, armed: false, show: false, scores: false, transition: true, mattify: true }, layers: {}, armed: [], draft: base.draft, transition: 'normal', mattify: false }]
    old.stacks = [{ id: 'stack-1', name: 'S', current: null, cues: [{ id: 'cue-1', presetId: 'preset-1', take: null, scope: { show: true } }] }]
    const r = showStateSchema.parse(old)
    expect(r.tournaments).toEqual([]); expect(r.activeTournamentId).toBeNull()
    expect(r.presets[0].scope).toEqual({ layers: true, armed: false, style: false, match: false, players: false, scores: false, transition: true, mattify: true })
    expect(r.stacks[0].cues[0].scope).toEqual({ style: true, match: true, players: true })
  })
  it('show files carry tournaments (and old ones still load)', () => {
    const s = run(base, { type: 'createTournament', name: 'T' })
    const file = { draft: s.draft, outputs: s.outputs, layers: s.layers, transition: s.transition, presets: [], stacks: [], tournaments: s.tournaments }
    const parsed = showFileSchema.parse(JSON.parse(JSON.stringify(file)))
    expect(parsed.tournaments).toHaveLength(1)
    const imp = run(base, { type: 'importShow', file: parsed })
    expect(imp.tournaments).toHaveLength(1); expect(imp.activeTournamentId).toBeNull()
    const { tournaments: _t, ...legacy } = file
    expect(showFileSchema.parse(legacy).tournaments).toEqual([])
    // a whole state round-trips through JSON
    expect(showStateSchema.safeParse(JSON.parse(JSON.stringify(s))).success).toBe(true)
  })
  it('commands validate', () => {
    expect(commandSchema.safeParse({ type: 'setActiveMatch', matchId: 'match-1' }).success).toBe(true)
    expect(commandSchema.safeParse({ type: 'setLayers', outputId: 'wide', patch: { scene: 'raceWin', part: 'hero', matchRef: { matchId: 'a' } } }).success).toBe(true)
    expect(commandSchema.safeParse({ type: 'setLayers', outputId: 'wide', patch: { part: 'nope' } }).success).toBe(false)
    expect(commandSchema.safeParse({ type: 'addCue', stackId: 's', presetId: 'p', take: null, scope: { show: true }, action: 'nextMatch' }).success).toBe(true)
    expect(commandSchema.safeParse({ type: 'setWinnerOverride', matchId: 'm', slot: 5 }).success).toBe(false)
  })
})
