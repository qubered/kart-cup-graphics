import type { CatalogIndex } from './catalog'
import { createDefaultState, emptyLayers, emptyProgram } from './defaults'
import { FORMAT_CANVAS, SUPPORTED_SCENES, deriveView } from './view'
import type { Command, Layers, OutputConfig, ProgramFrame, RaceState, ShowState, Typography } from './types'

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
  return { view: deriveView(state.draft, layers, requireOutput(state, id), ctx.catalog), mode, speed: state.transition, takenAt: ctx.now }
}

function withDraft(state: ShowState, draft: Partial<ShowState['draft']>): ShowState {
  return { ...state, draft: { ...state.draft, ...draft } }
}

/** Scores are live: refresh any on-air standings/winner scene in place (no Take, no re-transition). */
function liveScores(state: ShowState, ctx: ReduceContext): ShowState {
  let program = state.program
  for (const o of state.outputs) {
    const frame = program[o.id]
    const kind = frame?.view.scene?.kind
    if (kind !== 'standings' && kind !== 'winner') continue
    const fresh = deriveView(state.draft, { ...emptyLayers(), scene: kind }, o, ctx.catalog)
    program = { ...program, [o.id]: { ...frame, view: { ...frame.view, scene: fresh.scene } } }
  }
  return program === state.program ? state : { ...state, program }
}

function applyRace(state: ShowState, patch: Partial<RaceState>, ctx: ReduceContext): ShowState {
  let race: RaceState = { ...state.draft.race, ...patch }
  if (race.mode === 'cup' && !('trackId' in patch)) {
    const t = ctx.catalog.cup(race.cupId)?.tracks[race.raceIndex]
    if (t) race = { ...race, trackId: t }
    if (!('raceNo' in patch) && !('raceTotal' in patch)) {
      race = { ...race, raceNo: race.raceIndex + 1, raceTotal: ctx.catalog.cup(race.cupId)?.tracks.length ?? race.raceTotal }
    }
  }
  return withDraft(state, { race })
}

export function reduce(state: ShowState, cmd: Command, ctx: ReduceContext): ShowState {
  switch (cmd.type) {
    case 'setPlayer': {
      const players = state.draft.players.map((p, i) => (i === cmd.index ? { ...p, ...cmd.patch } : p))
      return withDraft(state, { players })
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
      return liveScores(withDraft(state, { scores: { ...state.draft.scores, races } }), ctx)
    }
    case 'setAdjustment': {
      const adjustments = state.draft.scores.adjustments.map((v, i) => (i === cmd.index ? cmd.value : v))
      return liveScores(withDraft(state, { scores: { ...state.draft.scores, adjustments } }), ctx)
    }
    case 'setEventText':
      return withDraft(state, { event: { ...state.draft.event, ...cmd.patch } })
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
        const scene = v.scene && !SUPPORTED_SCENES[updated.format].includes(v.scene.kind) ? null : v.scene
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
        draft: f.draft, outputs: f.outputs, layers: f.layers, transition: f.transition,
        program: emptyProgram(f.draft, f.outputs, ctx.catalog, ctx.now, f.transition),
        overlay: { hold: { on: false, message: f.draft.event.holdMessage }, ftb: false },
        armed: [], clocks: { onAirSince: null },
      }
    }
    case 'resetScores':
      return liveScores(withDraft(state, { scores: { races: [], adjustments: [0, 0, 0, 0] } }), ctx)
    case 'resetShow': {
      const fresh = createDefaultState(ctx.catalog, ctx.now)
      return { ...fresh, uploadedFonts: state.uploadedFonts, settings: state.settings }
    }
    case 'resetOnAirClock':
      return { ...state, clocks: { onAirSince: state.clocks.onAirSince === null ? null : ctx.now } }
    case 'setMattify':
      return state.settings.mattify === cmd.on ? state : { ...state, settings: { ...state.settings, mattify: cmd.on } }
    case 'registerFont': {
      if (state.uploadedFonts.some((f) => f.family === cmd.family)) return state
      return { ...state, uploadedFonts: [...state.uploadedFonts, { family: cmd.family, file: cmd.file }] }
    }
  }
}
