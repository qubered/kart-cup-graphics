// Pure tournament helpers shared by the reducer and the view model. No dependency on view.ts / reducer.ts.
import { standings } from './scoring'
import type {
  BracketConfig, Match, MatchRef, MatchSet, MatchesSceneConfig, ShowData, ShowState, Tournament, WinScreenConfig,
} from './types'

export const DEFAULT_WIN_SCREEN: WinScreenConfig = {
  layout: 'heroLeft',
  blocks: { hero: true, board: true, cupEmblem: true, trackName: true, racePoints: true },
}
export const DEFAULT_MATCHES_SCENE: MatchesSceneConfig = {
  layout: 'grid', detail: { wide: 'full', twin: 'compact', hd: 'compact' }, pendingScores: 'zeros', liveMarker: true,
}
export const DEFAULT_BRACKET: BracketConfig = { showScores: true, showStatus: true }

export function activeTournament(state: Pick<ShowState, 'tournaments' | 'activeTournamentId'>): Tournament | null {
  return state.tournaments.find((t) => t.id === state.activeTournamentId) ?? null
}

/** True once a match has any saved race or a non-zero adjustment. */
export function hasResults(data: ShowData): boolean {
  return data.scores.races.length > 0 || data.scores.adjustments.some((a) => a !== 0)
}

/** Winning slot of a match: the hand-picked override, else the top of standings() (ties: last race position), else null while there are no results. */
export function matchWinnerSlot(winnerOverride: number | null, data: ShowData): number | null {
  if (winnerOverride !== null && winnerOverride >= 0 && winnerOverride < data.players.length) return winnerOverride
  return hasResults(data) ? standings(data.scores, data.players.length)[0].playerIndex : null
}

/** The tournament's matches with the active one's data taken from the live draft (players, race, scores; event text and typography are show-wide). */
export function liveMatches(t: Tournament, draft: ShowData): Match[] {
  return t.matches.map((m) => (m.id === t.activeMatchId ? { ...m, data: { ...m.data, players: draft.players, race: draft.race, scores: draft.scores } } : m))
}

export function resolveMatchRef(t: Tournament, ref: MatchRef | undefined): Match | null {
  const r = ref ?? 'active'
  if (typeof r === 'object') return t.matches.find((m) => m.id === r.matchId) ?? null
  const at = t.matches.findIndex((m) => m.id === t.activeMatchId)
  if (r === 'previous') return t.matches[at - 1] ?? t.matches[at] ?? null
  return t.matches[at] ?? null
}

export function resolveMatchSet(matches: Match[], set: MatchSet | undefined): Match[] {
  let out = matches
  if (set?.rounds?.length) out = out.filter((m) => set.rounds!.includes(m.round))
  if (set?.ids?.length) out = out.filter((m) => set.ids!.includes(m.id))
  if (set?.range) out = out.slice(Math.min(...set.range), Math.max(...set.range) + 1)
  return out
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/** Recompute everything derived: copy the live draft into the active match, auto-fill slots from winners, and set statuses.
 *  Returns the same objects when nothing changed. */
export function recalcTournament(t: Tournament, draft: ShowData): { tournament: Tournament; draft: ShowData } {
  let draftOut = draft
  let matches = t.matches.map((m) => ({ ...m, data: { ...m.data } }))
  const act = matches.find((m) => m.id === t.activeMatchId)
  if (act) {
    act.data.players = draft.players; act.data.race = draft.race; act.data.scores = draft.scores
  }
  // rounds ascending so chains (semi -> final -> ...) settle in one pass
  for (const m of [...matches].sort((a, b) => a.round - b.round)) {
    m.slotSources?.forEach((src, slot) => {
      if (!src?.auto) return
      const from = matches.find((x) => x.id === src.matchId)
      if (!from) return
      const w = matchWinnerSlot(from.winnerOverride, from.data)
      const p = w === null ? undefined : from.data.players[w]
      if (!p || same(m.data.players[slot], p)) return
      m.data.players = m.data.players.map((x, i) => (i === slot ? { ...p } : x))
      if (m.id === t.activeMatchId) draftOut = { ...draftOut, players: m.data.players }
    })
  }
  matches = matches.map((m) => {
    const status: Match['status'] = m.id === t.activeMatchId ? 'live'
      : hasResults(m.data) && (m.status === 'done' || m.data.scores.races.length >= m.data.race.raceTotal || m.winnerOverride !== null) ? 'done' : 'pending'
    return { ...m, status }
  })
  const next: Tournament = { ...t, matches }
  // keep object identity when nothing changed, so reducer callers can detect no-ops cheaply
  const merged = t.matches.map((old, i) => (same(old, matches[i]) ? old : matches[i]))
  const unchanged = merged.every((m, i) => m === t.matches[i])
  return { tournament: unchanged ? t : { ...next, matches: merged }, draft: draftOut }
}
