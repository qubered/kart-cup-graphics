// Pure helpers for the Tournament workspace (no Svelte, no store) so they can be unit tested.
import type { CatalogIndex } from '../../../shared/catalog'
import { effectiveTrackId, matchWinnerSlot } from '../../../shared/tournament'
import { isSceneSupported } from '../../../shared/view'
import { totals } from '../../../shared/scoring'
import type { Command, Layers, Match, MatchRef, MatchSet, MatchStatus, OutputConfig, RaceResult, RaceState, SceneId, ScenePart } from '../../../shared/types'

/** Cup mode: the Nth race of the cup (a hand-picked map for that race wins); single-track mode: the chosen track. */
export function defaultTrackId(catalog: CatalogIndex, race: RaceState, raceNo: number): string {
  if (race.mode === 'track') return race.trackId
  const count = Math.max(1, catalog.tracksOfCup(race.cupId).length)
  return effectiveTrackId(catalog, race, Math.max(0, raceNo - 1) % count) || race.trackId
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

// ---- Tournament workspace: rounds, readiness, fill-from-previous, map overrides ----

/** The round numbers in use, ascending. A round exists because it has matches; numbers are stable ids (scenes refer to them), so a gap is allowed. */
export function roundNumbers(matches: readonly { round: number }[]): number[] {
  return [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b)
}

/** The matches of one round, in tournament order. */
export function matchesOfRound<T extends { round: number }>(matches: readonly T[], round: number): T[] {
  return matches.filter((m) => m.round === round)
}

/** The round before `round` that has matches, or null for the first round. */
export function previousRound(matches: readonly { round: number }[], round: number): number | null {
  const rs = roundNumbers(matches)
  const at = rs.indexOf(round)
  return at > 0 ? rs[at - 1] : null
}

/** The status shown for a match: only the active match is live, the others are done or pending as the server computed. */
export function matchStatusOf(m: Pick<Match, 'id' | 'status'>, activeMatchId: string): MatchStatus {
  return m.id === activeMatchId ? 'live' : m.status === 'done' ? 'done' : 'pending'
}

/** True for a name nobody has filled in: empty, or the default "Player 1" ... "Player 4". */
export function isPlaceholderName(name: string): boolean {
  const n = name.trim()
  return n === '' || /^player\s*\d{1,2}$/i.test(n)
}

/** The match a slot takes its winner from, or null for a hand-set slot (a source with auto off counts as hand-set). */
export function autoSource(m: Pick<Match, 'slotSources'>, slot: number): string | null {
  const s = m.slotSources?.[slot]
  return s?.auto ? s.matchId : null
}

export type IssueKind = 'label' | 'name' | 'map'
export interface TournamentIssue { kind: IssueKind; round: number; matchId: string; slot?: number; text: string }
export interface Readiness {
  issues: TournamentIssue[]
  /** Rounds and matches: labels and maps. */
  matches: { ok: boolean; warn: number }
  /** Player slots that are neither named nor filled from a winner. */
  players: { ok: boolean; warn: number }
  warn: number
  ok: boolean
}

/** What still needs doing before the tournament can run: a match without a label, a hand-set player still called "Player n" (or empty; in a later
 *  round the text also says to pick a winner source), and a single-track match without a known track.
 *  Pass `liveMatches(t, draft)` so the live match is read from the draft. `catalog` is optional (the track check is skipped without it). */
export function validateTournament(matches: readonly Match[], catalog?: { track(id: string): unknown }): Readiness {
  const issues: TournamentIssue[] = []
  const first = matches.length ? Math.min(...matches.map((m) => m.round)) : 0
  for (const m of matches) {
    const label = m.label.trim() || 'A match'
    if (!m.label.trim()) issues.push({ kind: 'label', round: m.round, matchId: m.id, text: 'A match has no label' })
    m.data.players.forEach((p, slot) => {
      if (autoSource(m, slot) !== null || !isPlaceholderName(p.name)) return
      const what = p.name.trim() ? `is still “${p.name.trim()}”` : 'has no name'
      issues.push({ kind: 'name', round: m.round, matchId: m.id, slot, text: `${label}: P${slot + 1} ${what}${m.round > first ? ', pick a winner source or type a name' : ''}` })
    })
    if (catalog && m.data.race.mode === 'track' && !catalog.track(m.data.race.trackId)) issues.push({ kind: 'map', round: m.round, matchId: m.id, text: `${label}: no map chosen` })
  }
  const count = (kinds: IssueKind[]) => issues.filter((i) => kinds.includes(i.kind)).length
  const mw = count(['label', 'map'])
  const pw = count(['name'])
  return { issues, matches: { ok: mw === 0, warn: mw }, players: { ok: pw === 0, warn: pw }, warn: issues.length, ok: issues.length === 0 }
}

export interface RoundSummary { round: number; matchIds: string[]; statuses: MatchStatus[]; done: number; total: number; live: boolean; warn: number }

/** One entry per round for the outline: progress per match, how many are done, whether the live match is in it and how many issues it has. */
export function summariseRounds(matches: readonly Pick<Match, 'id' | 'round' | 'status'>[], activeMatchId: string, issues: readonly TournamentIssue[]): RoundSummary[] {
  return roundNumbers(matches).map((round) => {
    const ms = matchesOfRound(matches, round)
    const statuses = ms.map((m) => matchStatusOf(m, activeMatchId))
    return {
      round, matchIds: ms.map((m) => m.id), statuses, done: statuses.filter((s) => s === 'done').length, total: ms.length,
      live: statuses.includes('live'), warn: issues.filter((i) => i.round === round).length,
    }
  })
}

/** Progress of a match's races: complete (every player placed), partly entered, or not started. One entry per race of the match (at most 12). */
export function raceDots(m: Pick<Match, 'data'>): ('done' | 'part' | 'empty')[] {
  const { races } = m.data.scores
  const n = Math.max(1, Math.min(12, m.data.race.raceTotal))
  return Array.from({ length: n }, (_, i) => {
    const placed = races.find((r) => r.raceNo === i + 1)?.positions.filter((p) => p > 0).length ?? 0
    return placed >= m.data.players.length ? 'done' : placed > 0 ? 'part' : 'empty'
  })
}

/** The winning slot so far (hand-picked, else the leader), or null while the match has no results. */
export function winnerSlotOf(m: Pick<Match, 'winnerOverride' | 'data'>): number | null {
  return matchWinnerSlot(m.winnerOverride, m.data)
}

/** "Fill players from the previous round": slot N of every match in `round` takes the winner of the Nth match of the previous round
 *  (one setSlotSource per slot). Slots with no matching earlier match are left as they are. */
export function fillFromPreviousCommands(matches: readonly Match[], round: number): Command[] {
  const prev = previousRound(matches, round)
  if (prev === null) return []
  const from = matchesOfRound(matches, prev)
  const out: Command[] = []
  for (const m of matchesOfRound(matches, round)) {
    for (const slot of [0, 1, 2, 3] as const) {
      const src = from[slot]
      if (src) out.push({ type: 'setSlotSource', matchId: m.id, slot, source: { matchId: src.id, auto: true } })
    }
  }
  return out
}

/** Commands that remove a whole round: every match in it, then its name. Null when it is the only round (a tournament keeps at least one match).
 *  Matches that took a player from a removed match fall back to hand-set (the reducer clears those sources). */
export function removeRoundCommands(t: { matches: readonly Match[]; roundNames?: Record<string, string> }, round: number): Command[] | null {
  const ms = matchesOfRound(t.matches, round)
  if (!ms.length || ms.length >= t.matches.length) return null
  const cmds: Command[] = ms.map((m) => ({ type: 'removeMatch', matchId: m.id }))
  if (t.roundNames?.[String(round)] !== undefined) cmds.push({ type: 'setRoundName', round, name: null })
  return cmds
}

/** The match "Next match" moves to: the one after the active match in tournament order (what the nextMatch command does). */
export function nextMatchOf<T extends { id: string }>(matches: readonly T[], activeMatchId: string): T | null {
  return matches[matches.findIndex((m) => m.id === activeMatchId) + 1] ?? null
}

/** The four hand-picked maps with race `raceIndex` set to `trackId` (null = back to the cup's own order). */
export function trackOverridesWith(overrides: RaceState['trackOverrides'], raceIndex: number, trackId: string | null): (string | null)[] {
  return Array.from({ length: 4 }, (_, i) => (i === raceIndex ? trackId || null : overrides?.[i] ?? null))
}

/** Matches a slot can take its winner from, split into earlier rounds (the usual case) and every other match. */
export function slotSourceGroups(matches: readonly { id: string; label: string; round: number }[], matchId: string): { earlier: SlotSourceChoice[]; other: SlotSourceChoice[] } {
  const me = matches.find((m) => m.id === matchId)
  const rest = matches.filter((m) => m.id !== matchId)
  const pick = (list: typeof rest): SlotSourceChoice[] => list.map((m) => ({ matchId: m.id, label: m.label }))
  return me ? { earlier: pick(rest.filter((m) => m.round < me.round)), other: pick(rest.filter((m) => m.round >= me.round)) } : { earlier: [], other: pick(rest) }
}

/** Default label for a match added to `round`: the first round numbers matches across the tournament, later rounds count within the round. */
export function newMatchLabel(matches: readonly { round: number }[], round: number): string {
  const first = matches.length ? Math.min(...matches.map((m) => m.round)) : 0
  return round === first ? `Match ${matches.length + 1}` : `R${round + 1} Match ${matchesOfRound(matches, round).length + 1}`
}
