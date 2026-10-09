// Pure helpers for the Race page (no Svelte, no store) so the rules can be unit tested:
// the finishing-place pad, which races count as done, the scoreboard rows, the winner and the map / next-race commands.
import type { CatalogIndex } from '../../../../shared/catalog'
import { colourHex } from '../../../../shared/palette'
import { pointsFor, standings } from '../../../../shared/scoring'
import { effectiveTrackId, matchWinnerSlot } from '../../../../shared/tournament'
import type { Command, RaceResult, RaceState, ShowData, ShowState } from '../../../../shared/types'
import { duplicatePositions } from '../catalog'
import { removeRace } from '../tournament'

export const SLOTS = [0, 1, 2, 3] as const
export type Slot = (typeof SLOTS)[number]
/** The four finishing places the pad offers. */
export const PLACES = [1, 2, 3, 4] as const
/** One race's positions by player slot. 0 = not placed yet. */
export type Row = number[]
export const blankRow = (): Row => [0, 0, 0, 0]
/** Most race tiles the single-track list shows (the stepper still goes further). */
export const MAX_TILES = 12

/** The number the live race is saved under: the cup's slot in cup mode, the counter in single-track mode. */
export function liveRaceNo(race: RaceState): number {
  return race.mode === 'cup' ? race.raceIndex + 1 : Math.max(1, race.raceNo)
}

/** Track of race `raceNo`: cup mode follows the cup order or the hand-picked map; single-track mode only knows the live race's track. '' when unknown. */
export function trackOfRace(catalog: CatalogIndex, race: RaceState, raceNo: number): string {
  if (race.mode === 'cup') return effectiveTrackId(catalog, race, raceNo - 1)
  return raceNo === liveRaceNo(race) ? race.trackId : ''
}

// ---- the finishing-place pad ----

/** Give `slot` the place `place`. A place that is already taken MOVES: the other player loses it, so a place is never held twice.
 *  Tapping the place a player already has clears it. */
export function tapPlace(row: Row, slot: number, place: number): Row {
  if (row[slot] === place) return row.map((p, i) => (i === slot ? 0 : p))
  return row.map((p, i) => (i === slot ? place : p === place ? 0 : p))
}

export const placedCount = (row: Row): number => row.filter((p) => p > 0).length

/** Every player has a different place from 1st to 4th: the only entry that is saved. */
export function isCompleteRow(row: Row | undefined): boolean {
  return !!row && row.length === 4 && row.every((p) => Number.isInteger(p) && p >= 1 && p <= 4) && new Set(row).size === 4
}

/** "Duplicate position: 1" lines for a row that was saved elsewhere with the same place twice (the pad itself cannot make one). */
export function rowIssues(row: Row | undefined): string[] {
  return row ? duplicatePositions(row).map((d) => `Duplicate position: ${d}`) : []
}

export function sameRow(a: Row | undefined, b: Row | undefined): boolean {
  return !!a && !!b && a.length === b.length && a.every((p, i) => p === b[i])
}

/** What the pad shows and what is saved. `staged` is a row that has not been saved yet (it differs from `saved`). */
export interface RowView { row: Row; staged: boolean; complete: boolean; placed: number; issues: string[] }
export function rowView(saved: Row | undefined, staged: Row | undefined): RowView {
  const row = staged ?? saved ?? blankRow()
  return { row, staged: !!staged && !sameRow(staged, saved), complete: isCompleteRow(row), placed: placedCount(row), issues: rowIssues(row) }
}

/** Points a player scores for a race row (0 while not placed). */
export const rowPoints = (row: Row, slot: number): number => pointsFor(row[slot] ?? 0)

// ---- race tiles ----

export type TileState = 'upcoming' | 'partial' | 'done'
export interface RaceTile { index: number; raceNo: number; trackId: string; live: boolean; state: TileState; /** Cup mode: the map is hand-picked, not the cup's own. */ custom: boolean }

/** The match's races for the left panel. Cup mode: the cup's four maps. Single-track mode: race 1..N, each with the track it was saved on.
 *  `stagedNos` = races with an unsaved edit. A race is done once it has a saved, complete result. */
export function raceTiles(catalog: CatalogIndex, race: RaceState, results: RaceResult[], stagedNos: number[] = []): RaceTile[] {
  const live = liveRaceNo(race)
  const saved = (no: number) => results.find((r) => r.raceNo === no)
  const state = (no: number): TileState => {
    const r = saved(no)
    if (stagedNos.includes(no)) return 'partial'
    if (!r) return 'upcoming'
    return isCompleteRow(r.positions) ? 'done' : 'partial'
  }
  if (race.mode === 'cup') {
    const count = Math.max(1, catalog.cup(race.cupId)?.tracks.length ?? 4)
    return Array.from({ length: count }, (_, i) => ({
      index: i, raceNo: i + 1, trackId: effectiveTrackId(catalog, race, i), live: i + 1 === live, state: state(i + 1), custom: !!race.trackOverrides?.[i],
    }))
  }
  const top = results.reduce((m, r) => Math.max(m, r.raceNo), 0)
  const count = Math.min(MAX_TILES, Math.max(1, race.raceTotal, live, top))
  return Array.from({ length: count }, (_, i) => ({
    index: i, raceNo: i + 1, trackId: saved(i + 1)?.trackId ?? (i + 1 === live ? race.trackId : ''), live: i + 1 === live, state: state(i + 1), custom: false,
  }))
}

// ---- scoreboard ----

export interface BoardRow {
  slot: number; /** Shared on equal totals. */ position: number
  /** Points per race column (race 1..N), null where the race has no result for this player. */
  points: (number | null)[]
  adjustment: number; total: number; leader: boolean
}
/** Columns the scoreboard shows: the races of the match (at least the saved ones). */
export function boardColumns(data: ShowData): number {
  const top = data.scores.races.reduce((m, r) => Math.max(m, r.raceNo), 0)
  return Math.min(MAX_TILES, Math.max(1, data.race.raceTotal, top))
}
/** Ranked rows, best first (ties broken by the last saved race, as the graphics do). The leader is only marked once a race is saved. */
export function boardRows(data: ShowData, columns = boardColumns(data)): BoardRow[] {
  const { races, adjustments } = data.scores
  return standings(data.scores, 4).map((s, k) => ({
    slot: s.playerIndex,
    position: s.position,
    points: Array.from({ length: columns }, (_, c) => {
      const r = races.find((x) => x.raceNo === c + 1)
      const p = r?.positions[s.playerIndex] ?? 0
      return r && p > 0 ? pointsFor(p) : null
    }),
    adjustment: adjustments[s.playerIndex] ?? 0,
    total: s.total,
    leader: k === 0 && races.length > 0,
  }))
}

/** Races with a saved, complete result (what finishes a match). */
export function racesDone(data: ShowData): number {
  return data.scores.races.filter((r) => isCompleteRow(r.positions)).length
}
export function matchComplete(data: ShowData): boolean {
  return racesDone(data) >= Math.max(1, data.race.raceTotal)
}

export interface WinnerInfo { slot: number; total: number; /** Winner was set by hand on the Tournament page. */ byHand: boolean; /** The top two were level, the last race decided. */ tieBroken: boolean }
export function winnerInfo(data: ShowData, winnerOverride: number | null): WinnerInfo | null {
  const slot = matchWinnerSlot(winnerOverride, data)
  if (slot === null) return null
  const rows = standings(data.scores, 4)
  const byHand = winnerOverride !== null && winnerOverride >= 0 && winnerOverride < 4
  return { slot, total: rows.find((r) => r.playerIndex === slot)?.total ?? 0, byHand, tieBroken: !byHand && rows.length > 1 && rows[0].total === rows[1].total }
}

/** One line under the table: who leads and by how much. */
export function leaderNote(rows: BoardRow[], names: string[], done: number, total: number): string {
  if (!done) return 'No race recorded yet.'
  const lead = rows[0], next = rows[1]
  const after = `after ${done} of ${total} race${total === 1 ? '' : 's'}`
  if (!next || lead.total === next.total) return `${names[lead.slot]} and ${names[next?.slot ?? lead.slot]} are level on ${lead.total} ${after}. The last race breaks the tie.`
  const gap = lead.total - next.total
  return `${names[lead.slot]} leads by ${gap} pt${gap === 1 ? '' : 's'} ${after}.`
}

// ---- commands ----

/** The live match's saved results are edited with the match's own command inside a tournament. Without one there is no remove command:
 *  free play wipes the scores and replays the other races (adjustments ride on the last save). */
export function clearRaceCommands(matchId: string | null, scores: ShowData['scores'], raceNo: number): Command[] {
  const races = removeRace(scores.races, raceNo)
  if (matchId) return [{ type: 'setMatchResults', matchId, races }]
  const adj = scores.adjustments
  const cmds: Command[] = [{ type: 'resetScores' }]
  races.forEach((r, i) => cmds.push({ type: 'saveResults', raceNo: r.raceNo, trackId: r.trackId, positions: [...r.positions], ...(i === races.length - 1 ? { adjustments: [...adj] } : {}) }))
  if (!races.length) adj.forEach((value, index) => { if (value) cmds.push({ type: 'setAdjustment', index: index as Slot, value }) })
  return cmds
}

export interface Plan { commands: Command[]; undo: Command[]; message: string }

/** Change the map of the live race (cup mode: a hand-picked map for that race, null = back to the cup's order; single-track mode: the track).
 *  A race that is already saved keeps its result and moves to the new map. Null when nothing changes. */
export function mapPlan(catalog: CatalogIndex, race: RaceState, results: RaceResult[], trackId: string | null): Plan | null {
  const no = liveRaceNo(race)
  const before = trackOfRace(catalog, race, no) || race.trackId
  const after = trackId ?? (race.mode === 'cup' ? (catalog.cup(race.cupId)?.tracks[race.raceIndex] ?? '') : race.trackId)
  if (!after || after === before) return null
  const name = catalog.track(after)?.name ?? after
  const saved = results.find((r) => r.raceNo === no)
  const resave = (track: string): Command[] => (saved ? [{ type: 'saveResults', raceNo: no, trackId: track, positions: [...saved.positions] }] : [])
  if (race.mode === 'cup') {
    const index = race.raceIndex
    return {
      commands: [{ type: 'setRaceTrack', raceIndex: index, trackId }, ...resave(after)],
      undo: [{ type: 'setRaceTrack', raceIndex: index, trackId: race.trackOverrides?.[index] ?? null }, ...resave(before)],
      message: trackId === null ? `Race ${no} is back on ${name}` : `Race ${no} is now on ${name}`,
    }
  }
  return {
    commands: [{ type: 'setRace', patch: { trackId: after } }, ...resave(after)],
    undo: [{ type: 'setRace', patch: { trackId: before } }, ...resave(before)],
    message: `Race ${no} is now on ${name}`,
  }
}

/** Move the live race by one. Cup mode steps through the cup's maps (stops at the ends); single-track mode counts on and grows the total when it passes it.
 *  Null at the ends. */
export function stepPlan(catalog: CatalogIndex, race: RaceState, delta: 1 | -1): Plan | null {
  if (race.mode === 'cup') {
    const last = Math.max(1, catalog.cup(race.cupId)?.tracks.length ?? 4) - 1
    const to = race.raceIndex + delta
    if (to < 0 || to > last) return null
    const name = catalog.track(effectiveTrackId(catalog, race, to))?.name ?? ''
    return { commands: [{ type: 'stepRace', delta }], undo: [{ type: 'stepRace', delta: delta === 1 ? -1 : 1 }], message: `Race ${to + 1} of ${race.raceTotal}${name ? ` · ${name}` : ''}` }
  }
  const to = race.raceNo + delta
  if (to < 1 || to > 99) return null
  const grow = to > race.raceTotal
  return {
    commands: [{ type: 'setRace', patch: { raceNo: to, ...(grow ? { raceTotal: to } : {}) } }],
    undo: [{ type: 'setRace', patch: { raceNo: race.raceNo, raceTotal: race.raceTotal } }],
    message: `Race ${to} of ${grow ? to : race.raceTotal}`,
  }
}

/** Hand-picked maps in the live match (cup mode). */
export const overrideCount = (race: RaceState): number => (race.mode === 'cup' ? (race.trackOverrides ?? []).filter(Boolean).length : 0)

/** Players whose name, character or colour in Preview differs from what an output with a pending change shows on air.
 *  (Preview edits never reach Program on their own; this says which ones are still waiting for a Take.) */
export function changedPlayers(show: Pick<ShowState, 'draft' | 'outputs' | 'program'>, catalog: CatalogIndex, pending: Record<string, number>): number[] {
  const out: number[] = []
  show.draft.players.forEach((p, i) => {
    for (const o of show.outputs) {
      if (!pending[o.id]) continue
      const lt = show.program[o.id]?.view.lowerThirds.find((x) => x.slot === i)
      if (!lt) continue
      if (lt.name !== p.name || lt.colour !== colourHex(p.colour) || lt.character !== (catalog.character(p.characterId)?.name ?? '?')) { out.push(i); break }
    }
  })
  return out
}
