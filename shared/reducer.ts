import type { CatalogIndex } from './catalog'
import { createDefaultShowData, createDefaultState, DEFAULT_PRESET_SCOPE, emptyLayers, emptyProgram, LAYOUT_ONLY_PRESET_SCOPE } from './defaults'
import { activeTournament, DEFAULT_BRACKET, DEFAULT_MATCHES_SCENE, DEFAULT_WIN_SCREEN, liveMatches, recalcTournament } from './tournament'
import { FORMAT_CANVAS, deriveView, isSceneSupported } from './view'
import type { Command, CueScopePatch, CueStack, Layers, Match, OutputConfig, Preset, PresetScope, PresetSource, ProgramFrame, RaceState, ShowData, ShowState, Tournament, Typography } from './types'

export class CommandError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CommandError'
  }
}

export interface ReduceContext { catalog: CatalogIndex; now: number; random: () => number }

const SLUG = /^[a-z0-9-]+$/

function requireOutput(state: ShowState, id: string): OutputConfig {
  const o = state.outputs.find((x) => x.id === id)
  if (!o) throw new CommandError(`Unknown output: ${id}`)
  return o
}

function pick<T>(list: T[], random: () => number): T {
  const i = Math.min(list.length - 1, Math.max(0, Math.floor(random() * list.length)))
  return list[i]
}

function programFor(state: ShowState, id: string, layers: Layers, mode: ProgramFrame['mode'], ctx: ReduceContext): ProgramFrame {
  return {
    view: deriveView(state.draft, layers, requireOutput(state, id), ctx.catalog, activeTournament(state)), mode, speed: state.transition, takenAt: ctx.now,
    layers: structuredClone(layers), draft: structuredClone(state.draft),
  }
}

function withDraft(state: ShowState, draft: Partial<ShowState['draft']>): ShowState {
  return { ...state, draft: { ...state.draft, ...draft } }
}

/** Layers that re-derive an on-air scene of the same content. Tournament scenes are pinned to the match ids resolved at take time, so
 *  switching the active match never changes what is on air until the next Take. */
function layersForView(scene: NonNullable<ProgramFrame['view']['scene']>): Layers | null {
  const base = emptyLayers()
  switch (scene.kind) {
    case 'standings': case 'winner': return { ...base, scene: scene.kind }
    case 'raceWin': case 'cupWin': return { ...base, scene: scene.kind, part: scene.part, matchRef: { matchId: scene.matchId } }
    case 'matches': return { ...base, scene: 'matches', matchSet: { ids: scene.matchIds } }
    case 'bracket': return { ...base, scene: 'bracket' }
    default: return null
  }
}

/** Scores are live: refresh any on-air standings/winner/tournament scene in place (no Take, no re-transition). */
function liveScores(state: ShowState, ctx: ReduceContext): ShowState {
  let program = state.program
  const t = activeTournament(state)
  for (const o of state.outputs) {
    const frame = program[o.id]
    const scene = frame?.view.scene
    const layers = scene ? layersForView(scene) : null
    if (!layers) continue
    // a pinned match that no longer exists (deleted) keeps its last view
    if ((layers.matchRef && typeof layers.matchRef === 'object' && t && !t.matches.some((m) => m.id === (layers.matchRef as { matchId: string }).matchId) && layers.matchRef.matchId !== '')) continue
    const fresh = deriveView(state.draft, layers, o, ctx.catalog, t)
    program = { ...program, [o.id]: { ...frame, view: { ...frame.view, scene: fresh.scene } } }
  }
  return program === state.program ? state : { ...state, program }
}

function racePatch(cur: RaceState, patch: Partial<RaceState>, ctx: ReduceContext): RaceState {
  let race: RaceState = { ...cur, ...patch }
  if (race.mode === 'cup' && !('trackId' in patch)) {
    const t = ctx.catalog.cup(race.cupId)?.tracks[race.raceIndex]
    if (t) race = { ...race, trackId: t }
    if (!('raceNo' in patch) && !('raceTotal' in patch)) {
      race = { ...race, raceNo: race.raceIndex + 1, raceTotal: ctx.catalog.cup(race.cupId)?.tracks.length ?? race.raceTotal }
    }
  }
  return race
}

function applyRace(state: ShowState, patch: Partial<RaceState>, ctx: ReduceContext): ShowState {
  return withDraft(state, { race: racePatch(state.draft.race, patch, ctx) })
}

function requirePreset(state: ShowState, id: string): Preset {
  const p = state.presets.find((x) => x.id === id)
  if (!p) throw new CommandError(`Unknown preset: ${id}`)
  return p
}

function requireStack(state: ShowState, id: string): CueStack {
  const k = state.stacks.find((x) => x.id === id)
  if (!k) throw new CommandError(`Unknown cue stack: ${id}`)
  return k
}

/** Next numeric id with the given prefix, unique across the whole show (so deleted ids are not reused while others remain). */
function nextId(prefix: string, ids: string[]): string {
  const re = new RegExp(`^${prefix}-(\\d+)$`)
  return `${prefix}-${ids.reduce((m, id) => Math.max(m, Number(re.exec(id)?.[1] ?? 0)), 0) + 1}`
}

function withStack(state: ShowState, id: string, fn: (k: CueStack) => CueStack): ShowState {
  requireStack(state, id)
  return { ...state, stacks: state.stacks.map((k) => (k.id === id ? fn(k) : k)) }
}

/** Standby index: the selected cue, else the one after the current, else the first. May equal cues.length (nothing left). */
function standbyIndex(k: CueStack): number {
  const sel = k.cues.findIndex((c) => c.id === k.selected)
  if (sel !== -1) return sel
  return k.cues.findIndex((c) => c.id === k.current) + 1
}

/** Make a cue the standby: its design is loaded into the draft (Preview) without going to air. */
function selectAt(state: ShowState, stackId: string, index: number, ctx: ReduceContext): ShowState {
  const cue = requireStack(state, stackId).cues[index]
  if (!cue) return state
  const next = recall(state, requirePreset(state, cue.presetId), undefined, ctx, cue.scope)
  return withStack(next, stackId, (k) => ({ ...k, selected: cue.id }))
}

/** Fire a cue, mark it current, then stand by on the cue after it.
 *  If the cue is already loaded in Preview (selected), it goes to air exactly as Preview is now, so edits made there are kept.
 *  Otherwise its preset is recalled first. */
function fireAt(state: ShowState, stackId: string, index: number, ctx: ReduceContext): ShowState {
  const stack = requireStack(state, stackId)
  const cue = stack.cues[index]
  if (!cue) return state
  const fired = stack.selected === cue.id
    ? (cue.take ? reduce(state, { type: 'take', mode: cue.take }, ctx) : state)
    : recall(state, requirePreset(state, cue.presetId), cue.take ?? undefined, ctx, cue.scope)
  const after = withStack(fired, stackId, (k) => ({ ...k, current: cue.id, selected: null }))
  switch (cue.action) {
    case 'nextRace': return selectAt(reduce(after, { type: 'stepRace', delta: 1 }, ctx), stackId, index + 1, ctx)
    case 'resetStack': return selectAt(withStack(after, stackId, (k) => ({ ...k, current: null, selected: null })), stackId, 0, ctx)
    case 'nextMatch': {
      const t = activeTournament(after)
      const moved = t ? reduce(after, { type: 'nextMatch' }, ctx) : after
      // nextMatch resets the stacks and stands by on their first cue; at the last match nothing moves, so carry on down the stack
      return activeTournament(moved)?.activeMatchId !== t?.activeMatchId ? moved : selectAt(after, stackId, index + 1, ctx)
    }
    default: return selectAt(after, stackId, index + 1, ctx)
  }
}

type Snapshot = Pick<Preset, 'layers' | 'armed' | 'draft' | 'transition' | 'mattify'>
/** Snapshot the show. PVW = the draft as it is now. PGM = what is on air: each output's taken layers, the show data of the latest take
 *  (scores are live, so they come from the current draft), its transition speed and the current arming / Mattify.
 *  During a tournament, match data (race, players, scores) is only stored for the parts the scope keeps; the rest is blank defaults. */
function snapshot(state: ShowState, from: PresetSource, scope: PresetScope, ctx: ReduceContext): Snapshot {
  const pvw: Snapshot = {
    layers: structuredClone(state.layers), armed: [...state.armed], draft: structuredClone(state.draft),
    transition: state.transition, mattify: state.settings.mattify,
  }
  let snap = pvw
  if (from === 'pgm') {
    const frames = state.outputs.map((o) => state.program[o.id]).filter((f): f is ProgramFrame => !!f)
    const latest = frames.reduce<ProgramFrame | null>((a, f) => (!a || f.takenAt >= a.takenAt ? f : a), null)
    const layers = structuredClone(state.layers)
    for (const o of state.outputs) { const l = state.program[o.id]?.layers; if (l) layers[o.id] = structuredClone(l) }
    snap = {
      ...pvw, layers,
      draft: { ...structuredClone(latest?.draft ?? state.draft), scores: structuredClone(state.draft.scores) },
      transition: latest?.speed ?? state.transition,
    }
  }
  if (activeTournament(state)) {
    const blank = createDefaultShowData(ctx.catalog)
    snap = { ...snap, draft: { ...snap.draft, race: scope.match ? snap.draft.race : blank.race, players: scope.players ? snap.draft.players : blank.players, scores: scope.scores ? snap.draft.scores : blank.scores } }
  }
  return snap
}

/** Apply a cue scope patch: booleans set, null removes the override (inherit). Returns undefined when nothing is overridden. */
function patchCueScope(cur: Partial<PresetScope> | undefined, patch: CueScopePatch | undefined): Partial<PresetScope> | undefined {
  const out: Partial<PresetScope> = { ...cur }
  for (const [k, v] of Object.entries(patch ?? {})) {
    if (v === null) delete out[k as keyof PresetScope]
    else if (v !== undefined) out[k as keyof PresetScope] = v
  }
  return Object.keys(out).length ? out : undefined
}
const mergeScope = (base: PresetScope, patch: Partial<PresetScope> | undefined): PresetScope => ({ ...base, ...patch })

/** Apply the in-scope parts of a preset to the draft (Preview). Outputs that no longer exist are skipped; outputs added since keep their layers.
 *  Optionally take to air afterwards, using the preset's transition speed. */
function recall(state: ShowState, preset: Preset, take: ProgramFrame['mode'] | undefined, ctx: ReduceContext, override?: Partial<PresetScope>): ShowState {
  const sc = { ...preset.scope, ...override }
  // Match data always comes from the active match while a tournament is running, whatever the preset or cue scope says.
  if (activeTournament(state)) { sc.match = false; sc.players = false; sc.scores = false }
  // A fresh recall replaces Preview, so no stack's standby cue is "loaded" any more (selectAt re-marks the one it loads).
  let next: ShowState = { ...state, lastPreset: preset.id, stacks: state.stacks.map((k) => (k.selected ? { ...k, selected: null } : k)) }
  if (sc.layers) {
    const layers = { ...state.layers }
    for (const o of state.outputs) if (preset.layers[o.id]) layers[o.id] = structuredClone(preset.layers[o.id])
    next = { ...next, layers }
  }
  if (sc.armed) next = { ...next, armed: preset.armed.filter((id) => state.outputs.some((o) => o.id === id)) }
  if (sc.style) {
    const { event, typography, notice } = structuredClone(preset.draft)
    next = withDraft(next, { event, typography, notice })
  }
  if (sc.match) next = withDraft(next, { race: structuredClone(preset.draft.race) })
  if (sc.players) next = withDraft(next, { players: structuredClone(preset.draft.players) })
  if (sc.scores) next = liveScores(withDraft(next, { scores: structuredClone(preset.draft.scores) }), ctx)
  if (sc.transition) next = { ...next, transition: preset.transition }
  if (sc.mattify) next = { ...next, settings: { ...next.settings, mattify: preset.mattify } }
  return take ? reduce(next, { type: 'take', mode: take }, ctx) : next
}

/** Fingerprint of everything a scoreboard-style scene shows, across all matches. */
function scoreSig(state: ShowState): string {
  const t = activeTournament(state)
  return JSON.stringify([state.draft.scores, t ? liveMatches(t, state.draft).map((m) => [m.id, m.data.scores, m.winnerOverride, m.status, m.data.players]) : null])
}

export function reduce(state: ShowState, cmd: Command, ctx: ReduceContext): ShowState {
  const next = reduceCore(state, cmd, ctx)
  const t = activeTournament(next)
  if (!t) return next
  // Keep the active Match in step with the draft, auto-fill slots from winners, and refresh on-air scores. Same object back when nothing changed.
  const r = recalcTournament(t, next.draft)
  const out = r.tournament === t && r.draft === next.draft ? next : { ...next, draft: r.draft, tournaments: next.tournaments.map((x) => (x === t ? r.tournament : x)) }
  return scoreSig(state) === scoreSig(out) ? out : liveScores(out, ctx)
}

const blankScores = (): ShowData['scores'] => ({ races: [], adjustments: [0, 0, 0, 0] })

function requireTournament(state: ShowState): Tournament {
  const t = activeTournament(state)
  if (!t) throw new CommandError('No active tournament')
  return t
}
function requireMatch(t: Tournament, id: string): Match {
  const m = t.matches.find((x) => x.id === id)
  if (!m) throw new CommandError(`Unknown match: ${id}`)
  return m
}
function withTournament(state: ShowState, t: Tournament): ShowState {
  return { ...state, tournaments: state.tournaments.map((x) => (x.id === t.id ? t : x)) }
}
function withMatch(t: Tournament, id: string, fn: (m: Match) => Match): Tournament {
  return { ...t, matches: t.matches.map((m) => (m.id === id ? fn(m) : m)) }
}
/** Edit a match's data. The active match lives in the draft; any other in Match.data. */
function editMatchData(state: ShowState, matchId: string, fn: (d: ShowData) => ShowData): ShowState {
  const t = requireTournament(state)
  requireMatch(t, matchId)
  if (matchId === t.activeMatchId) return { ...state, draft: fn(state.draft) }
  return withTournament(state, withMatch(t, matchId, (m) => ({ ...m, data: fn(m.data) })))
}
/** A fresh match: the show's current players and race, no scores. */
function newMatchData(draft: ShowData, ctx: ReduceContext): ShowData {
  const d = structuredClone(draft)
  return { ...d, race: racePatch(d.race, { raceIndex: 0 }, ctx), scores: blankScores() }
}
/** Make `matchId` the active match: sync the draft into the old one (recalc does this), then load the new match's players, race and scores. */
function switchMatch(state: ShowState, matchId: string, markDone: boolean): ShowState {
  const t0 = requireTournament(state)
  requireMatch(t0, matchId)
  const synced = recalcTournament(t0, state.draft)
  let t = synced.tournament
  if (markDone) t = withMatch(t, t.activeMatchId, (m) => (m.data.scores.races.length ? { ...m, status: 'done' } : m))
  t = { ...t, activeMatchId: matchId }
  const d = structuredClone(t.matches.find((m) => m.id === matchId)!.data)
  return withTournament({ ...state, draft: { ...synced.draft, players: d.players, race: d.race, scores: d.scores } }, t)
}
/** Stacks that are in use go back to their first cue (standing by, Preview loaded with its layout). */
function resetActiveStacks(state: ShowState, ctx: ReduceContext): ShowState {
  const ids = state.stacks.filter((k) => k.current || k.selected).map((k) => k.id)
  let next = { ...state, stacks: state.stacks.map((k) => (ids.includes(k.id) ? { ...k, current: null, selected: null } : k)) }
  for (const id of ids) next = selectAt(next, id, 0, ctx)
  return next
}
function bracketMatches(draft: ShowData, ctx: ReduceContext): { matches: Match[] } {
  const mk = (id: string, label: string, round: number, data: ShowData, slotSources?: Match['slotSources']): Match =>
    ({ id, label, round, data, status: 'pending', winnerOverride: null, ...(slotSources ? { slotSources } : {}) })
  const semis = [1, 2, 3, 4].map((n) => mk(`match-${n}`, `Semi ${n}`, 0, newMatchData(draft, ctx)))
  semis[0] = { ...semis[0], data: structuredClone(draft) }
  const fin = mk('match-5', 'Final', 1, newMatchData(draft, ctx), semis.map((m) => ({ matchId: m.id, auto: true })))
  return { matches: [...semis, fin] }
}

function reduceCore(state: ShowState, cmd: Command, ctx: ReduceContext): ShowState {
  switch (cmd.type) {
    case 'setPlayer': {
      const players = state.draft.players.map((p, i) => (i === cmd.index ? { ...p, ...cmd.patch } : p))
      const t = activeTournament(state)
      const src = t?.matches.find((m) => m.id === t.activeMatchId)?.slotSources?.[cmd.index]
      const edited = Object.entries(cmd.patch).some(([k, v]) => state.draft.players[cmd.index]?.[k as 'name'] !== v)
      const next = withDraft(state, { players })
      // Hand-editing an auto-filled slot turns auto-fill off for it.
      return t && src?.auto && edited ? withTournament(next, withMatch(t, t.activeMatchId, (m) => ({ ...m, slotSources: m.slotSources!.map((x, i) => (i === cmd.index && x ? { ...x, auto: false } : x)) }))) : next
    }
    case 'setRace':
      return applyRace(state, cmd.patch, ctx)
    case 'stepRace': {
      const raceIndex = Math.max(0, Math.min(3, state.draft.race.raceIndex + cmd.delta)) as 0 | 1 | 2 | 3
      return applyRace(state, { raceIndex }, ctx)
    }
    case 'randomRace': {
      const played = new Set(state.draft.scores.races.map((r) => r.trackId))
      const { catalog } = ctx
      if (state.draft.race.mode === 'cup') {
        let cands = catalog.cups.filter((c) => c.tracks.every((t) => !played.has(t)))
        if (!cands.length) cands = catalog.cups
        if (!cands.length) return state
        const cup = pick(cands, ctx.random)
        return applyRace(state, { cupId: cup.id, raceIndex: 0, trackId: cup.tracks[0] }, ctx)
      }
      let cands = catalog.tracks.filter((t) => !played.has(t.id))
      if (!cands.length) cands = catalog.tracks
      if (!cands.length) return state
      const t = pick(cands, ctx.random)
      return applyRace(state, { cupId: t.cupId, trackId: t.id }, ctx)
    }
    case 'saveResults': {
      const entry = { raceNo: cmd.raceNo, trackId: cmd.trackId, positions: [...cmd.positions] }
      const races = [...state.draft.scores.races.filter((r) => r.raceNo !== cmd.raceNo), entry].sort((a, b) => a.raceNo - b.raceNo)
      const adjustments = cmd.adjustments ? [...cmd.adjustments] : state.draft.scores.adjustments
      return liveScores(withDraft(state, { scores: { races, adjustments } }), ctx)
    }
    case 'setAdjustment': {
      const adjustments = state.draft.scores.adjustments.map((v, i) => (i === cmd.index ? cmd.value : v))
      return liveScores(withDraft(state, { scores: { ...state.draft.scores, adjustments } }), ctx)
    }
    case 'setEventText':
      return withDraft(state, { event: { ...state.draft.event, ...cmd.patch } })
    case 'setNotice':
      return withDraft(state, { notice: cmd.doc })
    case 'setTypography': {
      const ty = state.draft.typography
      const { font, style, look } = cmd.patch
      let next: Typography
      switch (cmd.role) {
        case 'eventTitle': next = { ...ty, eventTitle: { font: font ?? ty.eventTitle.font, style: style ?? ty.eventTitle.style } }; break
        case 'headings': next = { ...ty, headings: { font: font ?? ty.headings.font, look: look ?? ty.headings.look } }; break
        case 'names': next = { ...ty, names: { font: font ?? ty.names.font } }; break
        default: next = { ...ty, labels: { font: font ?? ty.labels.font } }
      }
      return withDraft(state, { typography: next })
    }
    case 'setLayers': {
      requireOutput(state, cmd.outputId)
      const cur = state.layers[cmd.outputId] ?? emptyLayers()
      const patch: Partial<Layers> = {}
      for (const [k, v] of Object.entries(cmd.patch)) if (v !== undefined) (patch as Record<string, unknown>)[k] = v
      return { ...state, layers: { ...state.layers, [cmd.outputId]: { ...cur, ...patch } } }
    }
    case 'savePreset': {
      // During a tournament new presets default to layout-only (no match data), so one stack serves every match.
      const scope = mergeScope(activeTournament(state) ? LAYOUT_ONLY_PRESET_SCOPE : DEFAULT_PRESET_SCOPE, cmd.scope)
      const preset: Preset = { id: nextId('preset', state.presets.map((p) => p.id)), name: cmd.name, scope, ...snapshot(state, cmd.from ?? 'pvw', scope, ctx) }
      return { ...state, presets: [...state.presets, preset], lastPreset: preset.id }
    }
    case 'updatePreset': {
      requirePreset(state, cmd.id)
      const presets = state.presets.map((p) => {
        if (p.id !== cmd.id) return p
        const scope = cmd.scope ? mergeScope(p.scope, cmd.scope) : p.scope
        return { ...p, ...(cmd.name ? { name: cmd.name } : {}), scope, ...(cmd.from ? snapshot(state, cmd.from, scope, ctx) : {}) }
      })
      return { ...state, presets }
    }
    case 'deletePreset': {
      requirePreset(state, cmd.id)
      // Cues that pointed at it go with it; a stack whose current cue is removed falls back to the cue before it.
      const stacks = state.stacks.map((k) => {
        if (!k.cues.some((c) => c.presetId === cmd.id)) return k
        const cues = k.cues.filter((c) => c.presetId !== cmd.id)
        let current = k.current
        if (current && !cues.some((c) => c.id === current)) {
          const at = k.cues.findIndex((c) => c.id === current)
          current = k.cues.slice(0, at).reverse().find((c) => cues.includes(c))?.id ?? null
        }
        return { ...k, cues, current, selected: cues.some((c) => c.id === k.selected) ? k.selected : null }
      })
      return { ...state, presets: state.presets.filter((p) => p.id !== cmd.id), lastPreset: state.lastPreset === cmd.id ? null : state.lastPreset, stacks }
    }
    case 'recallPreset':
      return recall(state, requirePreset(state, cmd.id), cmd.take, ctx)
    case 'createStack': {
      const stack: CueStack = { id: nextId('stack', state.stacks.map((k) => k.id)), name: cmd.name, cues: [], current: null, selected: null }
      return { ...state, stacks: [...state.stacks, stack] }
    }
    case 'renameStack':
      return withStack(state, cmd.id, (k) => ({ ...k, name: cmd.name }))
    case 'deleteStack':
      requireStack(state, cmd.id)
      return { ...state, stacks: state.stacks.filter((k) => k.id !== cmd.id) }
    case 'resetStack':
      return withStack(state, cmd.id, (k) => ({ ...k, current: null, selected: null }))
    case 'addCue': {
      requirePreset(state, cmd.presetId)
      const scope = patchCueScope(undefined, cmd.scope)
      const cue = { id: nextId('cue', state.stacks.flatMap((k) => k.cues.map((c) => c.id))), presetId: cmd.presetId, take: cmd.take, ...(scope ? { scope } : {}), ...(cmd.action ? { action: cmd.action } : {}) }
      return withStack(state, cmd.stackId, (k) => {
        const at = Math.min(cmd.index ?? k.cues.length, k.cues.length)
        return { ...k, cues: [...k.cues.slice(0, at), cue, ...k.cues.slice(at)] }
      })
    }
    case 'updateCue': {
      if (cmd.presetId !== undefined) requirePreset(state, cmd.presetId)
      const stack = requireStack(state, cmd.stackId)
      const at = stack.cues.findIndex((c) => c.id === cmd.cueId)
      if (at === -1) throw new CommandError(`Unknown cue: ${cmd.cueId}`)
      const next = withStack(state, cmd.stackId, (k) => ({
        ...k,
        cues: k.cues.map((c) => {
          if (c.id !== cmd.cueId) return c
          const scope = cmd.scope ? patchCueScope(c.scope, cmd.scope) : c.scope
          const action = cmd.action === undefined ? c.action : cmd.action ?? undefined
          return { id: c.id, presetId: cmd.presetId ?? c.presetId, take: cmd.take !== undefined ? cmd.take : c.take, ...(scope ? { scope } : {}), ...(action ? { action } : {}) }
        }),
      }))
      // Editing the standby cue's preset reloads Preview.
      return stack.selected === cmd.cueId && (cmd.presetId !== undefined || cmd.scope !== undefined) ? selectAt(next, cmd.stackId, at, ctx) : next
    }
    case 'removeCue': {
      const at = requireStack(state, cmd.stackId).cues.findIndex((c) => c.id === cmd.cueId)
      if (at === -1) throw new CommandError(`Unknown cue: ${cmd.cueId}`)
      return withStack(state, cmd.stackId, (k) => ({
        ...k, cues: k.cues.filter((c) => c.id !== cmd.cueId),
        current: k.current === cmd.cueId ? (k.cues[at - 1]?.id ?? null) : k.current,
        selected: k.selected === cmd.cueId ? null : k.selected,
      }))
    }
    case 'moveCue': {
      const stack = requireStack(state, cmd.stackId)
      const i = stack.cues.findIndex((c) => c.id === cmd.cueId)
      if (i === -1) throw new CommandError(`Unknown cue: ${cmd.cueId}`)
      const j = i + cmd.delta
      if (j < 0 || j >= stack.cues.length) return state
      return withStack(state, cmd.stackId, (k) => {
        const cues = [...k.cues]
        ;[cues[i], cues[j]] = [cues[j], cues[i]]
        return { ...k, cues }
      })
    }
    case 'selectCue': {
      const i = requireStack(state, cmd.stackId).cues.findIndex((c) => c.id === cmd.cueId)
      if (i === -1) throw new CommandError(`Unknown cue: ${cmd.cueId}`)
      return selectAt(state, cmd.stackId, i, ctx)
    }
    case 'stepSelection': {
      const stack = requireStack(state, cmd.stackId)
      const i = standbyIndex(stack) + cmd.delta
      return i < 0 || i >= stack.cues.length ? state : selectAt(state, cmd.stackId, i, ctx)
    }
    case 'goStack':
      return fireAt(state, cmd.stackId, standbyIndex(requireStack(state, cmd.stackId)), ctx)
    case 'fireCue': {
      const i = requireStack(state, cmd.stackId).cues.findIndex((c) => c.id === cmd.cueId)
      if (i === -1) throw new CommandError(`Unknown cue: ${cmd.cueId}`)
      return fireAt(state, cmd.stackId, i, ctx)
    }
    case 'arm': {
      for (const id of cmd.outputIds) requireOutput(state, id)
      return { ...state, armed: [...new Set(cmd.outputIds)] }
    }
    case 'take': {
      const targets = cmd.outputIds ?? state.armed
      for (const id of targets) requireOutput(state, id)
      if (!targets.length) return state
      const program = { ...state.program }
      for (const id of targets) program[id] = programFor(state, id, state.layers[id] ?? emptyLayers(), cmd.mode, ctx)
      return { ...state, program, clocks: { onAirSince: state.clocks.onAirSince ?? ctx.now } }
    }
    case 'setTransition':
      return { ...state, transition: cmd.speed }
    case 'hold':
      return {
        ...state,
        overlay: { ...state.overlay, hold: cmd.on ? { on: true, message: cmd.message ?? state.draft.event.holdMessage } : { ...state.overlay.hold, on: false } },
      }
    case 'ftb':
      return { ...state, overlay: { ...state.overlay, ftb: cmd.on } }
    case 'clear': {
      const layers: Record<string, Layers> = {}
      for (const o of state.outputs) {
        const cur = state.layers[o.id] ?? emptyLayers()
        layers[o.id] = { ...cur, scene: 'none', trackCard: false, lowerThirds: { ...cur.lowerThirds, on: false } }
      }
      const program: Record<string, ProgramFrame> = {}
      for (const o of state.outputs) program[o.id] = programFor({ ...state, layers }, o.id, layers[o.id], 'cut', ctx)
      return { ...state, layers, program }
    }
    case 'addOutput': {
      if (!SLUG.test(cmd.output.id)) throw new CommandError(`Invalid output id: ${cmd.output.id}`)
      if (state.outputs.some((o) => o.id === cmd.output.id)) throw new CommandError(`Output already exists: ${cmd.output.id}`)
      const output: OutputConfig = { ...cmd.output, safeArea: { ...cmd.output.safeArea } }
      const outputs = [...state.outputs, output]
      const layers = { ...state.layers, [output.id]: emptyLayers() }
      const next = { ...state, outputs, layers }
      return { ...next, program: { ...state.program, [output.id]: programFor(next, output.id, layers[output.id], 'cut', ctx) } }
    }
    case 'updateOutput': {
      const cur = requireOutput(state, cmd.id)
      const updated: OutputConfig = { ...cur, ...cmd.patch }
      const outputs = state.outputs.map((o) => (o.id === cmd.id ? updated : o))
      const frame = state.program[cmd.id]
      let program = state.program
      if (frame) {
        const v = frame.view
        const scene = v.scene && !isSceneSupported(updated.format, v.scene.kind, 'part' in v.scene ? v.scene.part : 'full') ? null : v.scene
        program = {
          ...state.program,
          [cmd.id]: {
            ...frame,
            view: { ...v, format: updated.format, canvas: { ...FORMAT_CANVAS[updated.format] }, safeArea: { ...updated.safeArea }, graphicsScale: updated.graphicsScale, scene },
          },
        }
      }
      return { ...state, outputs, program }
    }
    case 'removeOutput': {
      requireOutput(state, cmd.id)
      const layers = { ...state.layers }; delete layers[cmd.id]
      const program = { ...state.program }; delete program[cmd.id]
      return { ...state, outputs: state.outputs.filter((o) => o.id !== cmd.id), layers, program, armed: state.armed.filter((a) => a !== cmd.id) }
    }
    case 'importShow': {
      const f = structuredClone(cmd.file)
      return {
        ...state,
        draft: f.draft, outputs: f.outputs, layers: f.layers, transition: f.transition, presets: f.presets, stacks: structuredClone(f.stacks), tournaments: structuredClone(f.tournaments), activeTournamentId: null, lastPreset: null,
        program: emptyProgram(f.draft, f.outputs, ctx.catalog, ctx.now, f.transition),
        overlay: { hold: { on: false, message: f.draft.event.holdMessage }, ftb: false },
        armed: [], clocks: { onAirSince: null },
      }
    }
    case 'resetScores':
      return liveScores(withDraft(state, { scores: { races: [], adjustments: [0, 0, 0, 0] } }), ctx)
    case 'resetShow': {
      const fresh = createDefaultState(ctx.catalog, ctx.now)
      return { ...fresh, uploadedFonts: state.uploadedFonts, settings: state.settings, presets: state.presets, stacks: state.stacks, tournaments: state.tournaments }
    }
    case 'resetOnAirClock':
      return { ...state, clocks: { onAirSince: state.clocks.onAirSince === null ? null : ctx.now } }
    case 'setMattify':
      return state.settings.mattify === cmd.on ? state : { ...state, settings: { ...state.settings, mattify: cmd.on } }
    case 'createTournament': {
      const id = nextId('tournament', state.tournaments.map((t) => t.id))
      const matches = cmd.template === 'empty'
        ? [{ id: 'match-1', label: 'Match 1', round: 0, data: structuredClone(state.draft), status: 'pending' as const, winnerOverride: null }]
        : bracketMatches(state.draft, ctx).matches
      const t: Tournament = {
        id, name: cmd.name, matches, activeMatchId: matches[0].id,
        winScreen: structuredClone(DEFAULT_WIN_SCREEN), matchesScene: structuredClone(DEFAULT_MATCHES_SCENE), bracket: { ...DEFAULT_BRACKET },
      }
      // The first match adopts the current draft; making it active needs no data swap.
      return { ...state, tournaments: [...state.tournaments, t], activeTournamentId: id }
    }
    case 'loadTournament': {
      if (cmd.id === null) return { ...state, activeTournamentId: null }
      const t = state.tournaments.find((x) => x.id === cmd.id)
      if (!t) throw new CommandError(`Unknown tournament: ${cmd.id}`)
      // The outgoing tournament is already in step with the draft (every command syncs it).
      const d = t.matches.find((m) => m.id === t.activeMatchId)?.data ?? state.draft
      return { ...state, activeTournamentId: t.id, draft: { ...state.draft, players: structuredClone(d.players), race: structuredClone(d.race), scores: structuredClone(d.scores) } }
    }
    case 'renameTournament': {
      if (!state.tournaments.some((t) => t.id === cmd.id)) throw new CommandError(`Unknown tournament: ${cmd.id}`)
      return { ...state, tournaments: state.tournaments.map((t) => (t.id === cmd.id ? { ...t, name: cmd.name } : t)) }
    }
    case 'deleteTournament': {
      if (!state.tournaments.some((t) => t.id === cmd.id)) throw new CommandError(`Unknown tournament: ${cmd.id}`)
      return { ...state, tournaments: state.tournaments.filter((t) => t.id !== cmd.id), activeTournamentId: state.activeTournamentId === cmd.id ? null : state.activeTournamentId }
    }
    case 'duplicateTournament': {
      const src = state.tournaments.find((t) => t.id === cmd.id)
      if (!src) throw new CommandError(`Unknown tournament: ${cmd.id}`)
      const wasActive = state.activeTournamentId === src.id
      const id = nextId('tournament', state.tournaments.map((t) => t.id))
      // Fresh match ids that are unused by any tournament, so a ref can never point into the wrong one.
      const used = state.tournaments.flatMap((t) => t.matches.map((m) => m.id))
      const idMap = new Map<string, string>()
      for (const m of src.matches) { const nid = nextId('match', [...used, ...idMap.values()]); idMap.set(m.id, nid) }
      const remap = (mid: string) => idMap.get(mid) ?? mid
      const reset = cmd.resetScores === true
      // The active tournament's live match lives in the draft; liveMatches folds it in.
      const from = structuredClone(wasActive ? liveMatches(src, state.draft) : src.matches)
      const matches: Match[] = from.map((m, i) => ({
        ...m, id: remap(m.id),
        ...(m.slotSources ? { slotSources: m.slotSources.map((x) => (x ? { ...x, matchId: remap(x.matchId) } : x)) } : {}),
        data: reset ? { ...m.data, race: racePatch(m.data.race, { raceIndex: 0 }, ctx), scores: blankScores() } : m.data,
        status: reset ? (i === 0 ? 'live' : 'pending') : m.status,
        winnerOverride: reset ? null : m.winnerOverride,
      }))
      const activeMatchId = reset ? matches[0].id : remap(src.activeMatchId)
      const copy: Tournament = {
        ...structuredClone(src), id, name: cmd.name ?? `${src.name} (copy)`, matches, activeMatchId,
      }
      // Scene references that pointed into the source follow the copy.
      let layers = state.layers
      if (wasActive) {
        const fix = (l: Layers): Layers => {
          const out = { ...l }
          if (l.matchRef && typeof l.matchRef === 'object') out.matchRef = { matchId: remap(l.matchRef.matchId) }
          if (l.matchSet?.ids) out.matchSet = { ...l.matchSet, ids: l.matchSet.ids.map(remap) }
          return out
        }
        layers = Object.fromEntries(Object.entries(state.layers).map(([k, l]) => [k, fix(l)]))
      }
      const d = copy.matches.find((m) => m.id === activeMatchId)!.data
      return {
        ...state, layers, tournaments: [...state.tournaments, copy], activeTournamentId: id,
        draft: { ...state.draft, players: structuredClone(d.players), race: structuredClone(d.race), scores: structuredClone(d.scores) },
      }
    }
    case 'addMatch': {
      const t = requireTournament(state)
      const round = cmd.round ?? t.matches.reduce((m, x) => Math.max(m, x.round), 0)
      const id = nextId('match', t.matches.map((m) => m.id))
      const label = cmd.label ?? `Match ${t.matches.length + 1}`
      const m: Match = { id, label, round, data: newMatchData(state.draft, ctx), status: 'pending', winnerOverride: null }
      return withTournament(state, { ...t, matches: [...t.matches, m] })
    }
    case 'updateMatch': {
      const t = requireTournament(state)
      const m = requireMatch(t, cmd.matchId)
      let next = state
      const { label, round, players, race } = cmd.patch
      if (label !== undefined || round !== undefined) next = withTournament(next, withMatch(requireTournament(next), m.id, (x) => ({ ...x, ...(label !== undefined ? { label } : {}), ...(round !== undefined ? { round } : {}) })))
      if (players) {
        next = editMatchData(next, m.id, (d) => ({ ...d, players: d.players.map((p, i) => (players[i] ? { ...p, ...players[i] } : p)) }))
        // Hand-editing a slot that auto-fills turns auto-fill off for it.
        const sources = m.slotSources
        if (sources) {
          const edited = players.map((pp, i) => !!pp && Object.entries(pp).some(([k, v]) => m.id === t.activeMatchId ? state.draft.players[i]?.[k as 'name'] !== v : m.data.players[i]?.[k as 'name'] !== v))
          next = withTournament(next, withMatch(requireTournament(next), m.id, (x) => ({ ...x, slotSources: sources.map((src, i) => (src?.auto && edited[i] ? { ...src, auto: false } : src)) })))
        }
      }
      if (race) next = editMatchData(next, m.id, (d) => ({ ...d, race: racePatch(d.race, race, ctx) }))
      return next
    }
    case 'removeMatch': {
      const t = requireTournament(state)
      const at = t.matches.findIndex((m) => m.id === cmd.matchId)
      if (at === -1) throw new CommandError(`Unknown match: ${cmd.matchId}`)
      if (t.matches.length === 1) throw new CommandError('A tournament needs at least one match')
      const matches = t.matches.filter((m) => m.id !== cmd.matchId).map((m) => (m.slotSources ? { ...m, slotSources: m.slotSources.map((s) => (s?.matchId === cmd.matchId ? null : s)) } : m))
      if (cmd.matchId !== t.activeMatchId) return withTournament(state, { ...t, matches })
      const fallback = (t.matches[at + 1] ?? t.matches[at - 1]).id
      const d = t.matches.find((m) => m.id === fallback)!.data
      return withTournament({ ...state, draft: { ...state.draft, players: structuredClone(d.players), race: structuredClone(d.race), scores: structuredClone(d.scores) } }, { ...t, matches, activeMatchId: fallback })
    }
    case 'setActiveMatch':
      return switchMatch(state, cmd.matchId, false)
    case 'nextMatch': {
      const t = requireTournament(state)
      const next = t.matches[t.matches.findIndex((m) => m.id === t.activeMatchId) + 1]
      if (!next) return state
      return resetActiveStacks(switchMatch(state, next.id, true), ctx)
    }
    case 'setMatchResults':
      return editMatchData(state, cmd.matchId, (d) => ({
        ...d,
        scores: {
          races: cmd.races ? [...cmd.races].sort((a, b) => a.raceNo - b.raceNo).map((r) => ({ ...r, positions: [...r.positions] })) : d.scores.races,
          adjustments: cmd.adjustments ? [...cmd.adjustments] : d.scores.adjustments,
        },
      }))
    case 'setWinnerOverride': {
      const t = requireTournament(state)
      requireMatch(t, cmd.matchId)
      return withTournament(state, withMatch(t, cmd.matchId, (m) => ({ ...m, winnerOverride: cmd.slot })))
    }
    case 'setSlotSource': {
      const t = requireTournament(state)
      requireMatch(t, cmd.matchId)
      if (cmd.source) {
        if (cmd.source.matchId === cmd.matchId) throw new CommandError('A match cannot take a player from itself')
        requireMatch(t, cmd.source.matchId)
      }
      return withTournament(state, withMatch(t, cmd.matchId, (m) => {
        const slotSources = Array.from({ length: 4 }, (_, i) => m.slotSources?.[i] ?? null)
        slotSources[cmd.slot] = cmd.source ? { ...cmd.source } : null
        return { ...m, slotSources }
      }))
    }
    case 'setWinScreenConfig': {
      const t = requireTournament(state)
      return withTournament(state, { ...t, winScreen: { ...t.winScreen, ...(cmd.patch.layout ? { layout: cmd.patch.layout } : {}), blocks: { ...t.winScreen.blocks, ...cmd.patch.blocks } } })
    }
    case 'setMatchesSceneConfig': {
      const t = requireTournament(state)
      const { detail, ...rest } = cmd.patch
      return withTournament(state, { ...t, matchesScene: { ...t.matchesScene, ...rest, detail: { ...t.matchesScene.detail, ...detail } } })
    }
    case 'setBracketConfig': {
      const t = requireTournament(state)
      return withTournament(state, { ...t, bracket: { ...t.bracket, ...cmd.patch } })
    }
    case 'setLogo': {
      const settings = { mattify: state.settings.mattify, ...(cmd.url ? { logo: cmd.url } : {}) }
      return { ...state, settings }
    }
    case 'registerFont': {
      if (state.uploadedFonts.some((f) => f.family === cmd.family)) return state
      return { ...state, uploadedFonts: [...state.uploadedFonts, { family: cmd.family, file: cmd.file }] }
    }
  }
}
