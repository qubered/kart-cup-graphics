// Client for the Kart Cup server's remote-control API (GET /api/presets, POST /api/command) and the commands the module sends.
export type TakeMode = 'cut' | 'auto'
export interface StackInfo {
  id: string; name: string; current: string | null; selected: string | null
  cues: { id: string; presetId: string; take: TakeMode | null }[]
}
export interface ServerState {
  presets: { id: string; name: string }[]
  lastPreset: string | null
  stacks: StackInfo[]
  armed: string[]
  outputs: { id: string; name: string }[]
  hold: boolean
  ftb: boolean
  /** Active tournament, summarised. Absent when none is active (or the server does not expose it). */
  tournament?: TournamentInfo | null
}

// ---- tournaments ----
export interface MatchInfo { id: string; label: string; round: number; status: string; winner: string }
export interface TournamentInfo { id: string; name: string; activeMatchId: string; matches: MatchInfo[] }
/** Minimal shape of the server's Tournament (only what the module reads). */
export interface RawTournament {
  id: string; name: string; activeMatchId: string
  matches: { id: string; label: string; round: number; status: string; winnerOverride: number | null
    data: { players: { name: string }[]; scores: { races: { positions: number[] }[]; adjustments: number[] } } }[]
}

const POINTS = [15, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
const pts = (pos: number): number => (Number.isInteger(pos) && pos >= 1 && pos <= POINTS.length ? POINTS[pos - 1] : 0)

/** Mirrors shared matchWinnerSlot: override, else top of standings (tie: better last-race position), null while there are no results. */
export function winnerSlot(m: RawTournament['matches'][number]): number | null {
  const { players, scores } = m.data
  const n = players.length
  if (m.winnerOverride !== null && m.winnerOverride >= 0 && m.winnerOverride < n) return m.winnerOverride
  if (!scores.races.length && !scores.adjustments.some((a) => a !== 0)) return null
  const tot = Array.from({ length: n }, (_, i) => scores.races.reduce((s, r) => s + pts(r.positions[i] ?? 0), 0) + (scores.adjustments[i] ?? 0))
  const last = scores.races[scores.races.length - 1]
  const rank = (i: number) => { const p = last?.positions[i] ?? 0; return p >= 1 ? p : Number.MAX_SAFE_INTEGER }
  return Array.from({ length: n }, (_, i) => i).sort((a, b) => tot[b] - tot[a] || rank(a) - rank(b) || a - b)[0] ?? null
}

export function summarizeTournament(t: RawTournament | null | undefined): TournamentInfo | null {
  if (!t) return null
  return {
    id: t.id, name: t.name, activeMatchId: t.activeMatchId,
    matches: t.matches.map((m) => {
      const w = winnerSlot(m)
      return { id: m.id, label: m.label, round: m.round, status: m.status, winner: w === null ? '' : m.data.players[w]?.name ?? '' }
    }),
  }
}
export type OnOffToggle = 'on' | 'off' | 'toggle'

export class KartCupApi {
  constructor(private base: () => string, private doFetch: typeof fetch = fetch) {}

  async state(): Promise<ServerState> {
    const r = await this.doFetch(`${this.base()}/api/presets`, { signal: AbortSignal.timeout(3000) })
    if (!r.ok) throw new Error(`Server replied ${r.status}`)
    return (await r.json()) as ServerState
  }

  /** Tournament data from /api/export (older servers do not put it in /api/presets). Picks the first tournament. */
  async exportedTournament(): Promise<TournamentInfo | null> {
    const r = await this.doFetch(`${this.base()}/api/export`, { signal: AbortSignal.timeout(3000) })
    if (!r.ok) return null
    const f = (await r.json()) as { tournaments?: RawTournament[] }
    return summarizeTournament(f.tournaments?.[0])
  }

  async command(cmd: Record<string, unknown>): Promise<void> {
    const r = await this.doFetch(`${this.base()}/api/command`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cmd), signal: AbortSignal.timeout(3000),
    })
    if (!r.ok) {
      const body = (await r.json().catch(() => ({}))) as { error?: string }
      throw new Error(body.error ?? `Server replied ${r.status}`)
    }
  }
}

export function baseUrl(host: unknown, port: unknown): string {
  const h = String(host ?? '').trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '') || '127.0.0.1'
  const p = Number(port)
  return `http://${h}${h.includes(':') || !Number.isInteger(p) || p <= 0 ? '' : `:${p}`}`
}

/** "none" (or anything else) means no take. */
export function takeOf(v: unknown): TakeMode | undefined {
  return v === 'cut' || v === 'auto' ? v : undefined
}

export function recallCommand(id: string, take: unknown): Record<string, unknown> {
  const t = takeOf(take)
  return t ? { type: 'recallPreset', id, take: t } : { type: 'recallPreset', id }
}

/** Move the standby (Preview) cue within a stack. */
export function stepSelectionCommand(stackId: string, direction: unknown): Record<string, unknown> {
  return { type: 'stepSelection', stackId, delta: direction === 'prev' ? -1 : 1 }
}

/** Cue dropdown values encode both ids: "<stackId>|<cueId>". */
export const cueKey = (stackId: string, cueId: string): string => `${stackId}|${cueId}`
export function splitCueKey(v: unknown): { stackId: string; cueId: string } | null {
  const [stackId, cueId] = String(v ?? '').split('|')
  return stackId && cueId ? { stackId, cueId } : null
}

export function cueActionCommand(type: 'selectCue' | 'fireCue', key: unknown): Record<string, unknown> | null {
  const k = splitCueKey(key)
  return k ? { type, ...k } : null
}

export type CueState = 'pgm' | 'pvw' | ''
export function cueState(stacks: StackInfo[], key: unknown): CueState {
  const k = splitCueKey(key)
  const stack = k && stacks.find((x) => x.id === k.stackId)
  if (!stack || !k) return ''
  return stack.current === k.cueId ? 'pgm' : stack.selected === k.cueId ? 'pvw' : ''
}

export function takeCommand(mode: unknown): Record<string, unknown> {
  return { type: 'take', mode: mode === 'auto' ? 'auto' : 'cut' }
}

export function resolveOnOff(mode: unknown, current: boolean): boolean {
  return mode === 'on' ? true : mode === 'off' ? false : !current
}

export function armCommand(armed: string[], outputId: string, mode: unknown): Record<string, unknown> {
  const on = resolveOnOff(mode, armed.includes(outputId))
  const rest = armed.filter((id) => id !== outputId)
  return { type: 'arm', outputIds: on ? [...rest, outputId] : rest }
}

const sourceOf = (v: unknown): 'pvw' | 'pgm' => (v === 'pgm' ? 'pgm' : 'pvw')

export function savePresetCommand(name: unknown, source: unknown): Record<string, unknown> {
  return { type: 'savePreset', name: String(name ?? '').trim() || 'New preset', from: sourceOf(source) }
}

export function overwritePresetCommand(id: string, source: unknown): Record<string, unknown> {
  return { type: 'updatePreset', id, from: sourceOf(source) }
}

// ---- tournament commands ----
export const setActiveMatchCommand = (matchId: unknown): Record<string, unknown> | null => (matchId ? { type: 'setActiveMatch', matchId: String(matchId) } : null)

export type TournamentScene = 'raceWin' | 'cupWin' | 'bracket' | 'matches'

/** 'active' | 'previous' | a match id. */
export function matchRefOf(v: unknown): 'active' | 'previous' | { matchId: string } {
  return v === 'previous' ? 'previous' : !v || v === 'active' ? 'active' : { matchId: String(v) }
}

/** Matches selection: 'all' or 'round:<n>', plus an optional 1-based "from-to" range (e.g. "1-2"). */
export function matchSetOf(v: unknown, range?: unknown): { rounds?: number[]; range?: [number, number] } {
  const r = /^\s*(\d+)\s*-\s*(\d+)\s*$/.exec(String(range ?? ''))
  const sel = String(v ?? 'all')
  const out: { rounds?: number[]; range?: [number, number] } = {}
  if (sel.startsWith('round:') && Number.isInteger(Number(sel.slice(6)))) out.rounds = [Number(sel.slice(6))]
  if (r) out.range = [Math.max(0, Number(r[1]) - 1), Math.max(0, Number(r[2]) - 1)]
  return out
}

export interface ShowSceneOpts { part?: unknown; matchRef?: unknown; matches?: unknown; range?: unknown }

/** setLayers for a tournament scene on one output, with the right part / matchRef / matchSet for that scene. */
export function showSceneCommand(outputId: string, scene: TournamentScene, o: ShowSceneOpts = {}): Record<string, unknown> {
  const patch: Record<string, unknown> = { scene }
  if (scene === 'raceWin' || scene === 'cupWin') {
    patch.part = o.part === 'hero' || o.part === 'board' ? o.part : 'full'
    patch.matchRef = matchRefOf(o.matchRef)
  } else if (scene === 'matches') patch.matchSet = matchSetOf(o.matches, o.range)
  return { type: 'setLayers', outputId, patch }
}

/** Hero on one output, scoreboard on another. */
export function splitWinCommands(scene: 'raceWin' | 'cupWin', heroOutput: string, boardOutput: string, matchRef: unknown): Record<string, unknown>[] {
  return [
    showSceneCommand(heroOutput, scene, { part: 'hero', matchRef }),
    showSceneCommand(boardOutput, scene, { part: 'board', matchRef }),
  ]
}

/** Run a cue action on its own (what a cue does after it fires). */
export function cueActionStandalone(action: unknown, stackId: unknown): Record<string, unknown> | null {
  if (action === 'nextRace') return { type: 'stepRace', delta: 1 }
  if (action === 'nextMatch') return { type: 'nextMatch' }
  if (action === 'resetStack' && stackId) return { type: 'resetStack', id: String(stackId) }
  return null
}

export function tournamentVars(t: TournamentInfo | null | undefined): Record<string, string> {
  const m = t?.matches.find((x) => x.id === t.activeMatchId)
  return { tournament_name: t?.name ?? '', active_match_label: m?.label ?? '', active_match_status: m?.status ?? '', active_match_winner: m?.winner ?? '' }
}
