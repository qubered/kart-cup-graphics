// Pure helpers for the Tournament tab (no Svelte, no store) so they can be unit tested.
import type { CatalogIndex } from '../../../shared/catalog'
import { isSceneSupported } from '../../../shared/view'
import { totals } from '../../../shared/scoring'
import type { Command, Layers, MatchRef, MatchSet, OutputConfig, RaceResult, RaceState, SceneId, ScenePart } from '../../../shared/types'

/** Cup mode: the Nth race of the cup; single-track mode: the chosen track. */
export function defaultTrackId(catalog: CatalogIndex, race: RaceState, raceNo: number): string {
  if (race.mode === 'track') return race.trackId
  const tracks = catalog.tracksOfCup(race.cupId)
  return tracks[Math.max(0, raceNo - 1) % Math.max(1, tracks.length)]?.id ?? race.trackId
}

/** Replace (or append) one race's finishing positions. Result is sorted by race number. */
export function withRacePositions(races: RaceResult[], raceNo: number, trackId: string, positions: number[]): RaceResult[] {
  const rest = races.filter((r) => r.raceNo !== raceNo)
  return [...rest, { raceNo, trackId, positions: [...positions] }].sort((a, b) => a.raceNo - b.raceNo)
}

/** Change one player's position in one race (0 = not set). A missing race is created with blanks. */
export function setPosition(races: RaceResult[], raceNo: number, trackId: string, slot: number, position: number): RaceResult[] {
  const cur = races.find((r) => r.raceNo === raceNo)?.positions ?? [0, 0, 0, 0]
  return withRacePositions(races, raceNo, trackId, cur.map((p, i) => (i === slot ? position : p)))
}

/** Remove a race. Later races keep their numbers. */
export function removeRace(races: RaceResult[], raceNo: number): RaceResult[] {
  return races.filter((r) => r.raceNo !== raceNo)
}

/** The next unused race number (1-based). */
export function nextRaceNo(races: RaceResult[]): number {
  return races.reduce((m, r) => Math.max(m, r.raceNo), 0) + 1
}

/** The adjustment that makes a player's total equal `desired`, given the saved races. */
export function adjustmentForTotal(races: RaceResult[], slot: number, desired: number): number {
  return desired - totals({ races, adjustments: [0, 0, 0, 0] })[slot]
}

export interface SlotSourceChoice { matchId: string; label: string }
/** Matches a slot can take its player from: every other match, earlier rounds first. */
export function slotSourceChoices(matches: { id: string; label: string; round: number }[], matchId: string): SlotSourceChoice[] {
  const me = matches.find((m) => m.id === matchId)
  const earlier = (m: { round: number }) => (me && m.round < me.round ? 0 : 1)
  return matches
    .filter((m) => m.id !== matchId)
    .sort((a, b) => earlier(a) - earlier(b))
    .map((m) => ({ matchId: m.id, label: m.label }))
}

export type RefChoice = 'active' | 'previous' | string
export function refToChoice(ref: MatchRef | undefined): RefChoice {
  return ref === undefined ? 'active' : typeof ref === 'object' ? ref.matchId : ref
}
export function choiceToRef(choice: RefChoice): MatchRef {
  return choice === 'active' || choice === 'previous' ? choice : { matchId: choice }
}

/** A matchSet from a "from..to" pair of 1-based match numbers; both null = no range. Keeps rounds/ids. */
export function rangeSet(set: MatchSet | undefined, from: number | null, to: number | null, total: number): MatchSet {
  const next: MatchSet = { ...(set?.rounds?.length ? { rounds: set.rounds } : {}), ...(set?.ids?.length ? { ids: set.ids } : {}) }
  if (from === null && to === null) return next
  const a = Math.max(1, Math.min(total, from ?? 1))
  const b = Math.max(1, Math.min(total, to ?? total))
  return { ...next, range: [Math.min(a, b) - 1, Math.max(a, b) - 1] }
}

export function toggleRound(set: MatchSet | undefined, round: number): MatchSet {
  const cur = set?.rounds ?? []
  const rounds = cur.includes(round) ? cur.filter((r) => r !== round) : [...cur, round].sort((a, b) => a - b)
  const rest: MatchSet = { ...(set ?? {}) }
  delete rest.rounds
  return rounds.length ? { ...rest, rounds } : rest
}

/** Commands for "Split across outputs": the selected output keeps the hero, another output that can show the board gets it.
 *  Null when the scene is not a win screen or there is no second output that supports it. */
export function splitAcrossOutputs(outputs: OutputConfig[], selectedId: string, layers: Record<string, Layers>): Command[] | null {
  const sel = layers[selectedId]
  if (!sel || (sel.scene !== 'raceWin' && sel.scene !== 'cupWin')) return null
  const scene: SceneId = sel.scene
  const can = (o: OutputConfig, part: ScenePart) => isSceneSupported(o.format, scene, part)
  const self = outputs.find((o) => o.id === selectedId)
  if (!self || !can(self, 'hero')) return null
  // prefer an output that cannot show the full screen itself (a twin), else the next one in the list
  const others = outputs.filter((o) => o.id !== selectedId && can(o, 'board'))
  const other = others.find((o) => !can(o, 'full')) ?? others[0]
  if (!other) return null
  const shared = sel.matchRef !== undefined ? { matchRef: sel.matchRef } : {}
  return [
    { type: 'setLayers', outputId: selectedId, patch: { scene, part: 'hero', ...shared } },
    { type: 'setLayers', outputId: other.id, patch: { scene, part: 'board', ...shared } },
  ]
}
