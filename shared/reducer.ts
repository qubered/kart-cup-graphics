import type { CatalogIndex } from './catalog'
import { createDefaultState, DEFAULT_PRESET_SCOPE, emptyLayers, emptyProgram } from './defaults'
import { FORMAT_CANVAS, SUPPORTED_SCENES, deriveView } from './view'
import type { Command, CueScopePatch, CueStack, Layers, OutputConfig, Preset, PresetScope, PresetSource, ProgramFrame, RaceState, ShowState, Typography } from './types'

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
    view: deriveView(state.draft, layers, requireOutput(state, id), ctx.catalog), mode, speed: state.transition, takenAt: ctx.now,
    layers: structuredClone(layers), draft: structuredClone(state.draft),
  }
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
  return selectAt(after, stackId, index + 1, ctx)
}

type Snapshot = Pick<Preset, 'layers' | 'armed' | 'draft' | 'transition' | 'mattify'>
/** Snapshot the show. PVW = the draft as it is now. PGM = what is on air: each output's taken layers, the show data of the latest take
 *  (scores are live, so they come from the current draft), its transition speed and the current arming / Mattify. */
function snapshot(state: ShowState, from: PresetSource = 'pvw'): Snapshot {
  const pvw: Snapshot = {
    layers: structuredClone(state.layers), armed: [...state.armed], draft: structuredClone(state.draft),
    transition: state.transition, mattify: state.settings.mattify,
  }
  if (from === 'pvw') return pvw
  const frames = state.outputs.map((o) => state.program[o.id]).filter((f): f is ProgramFrame => !!f)
  const latest = frames.reduce<ProgramFrame | null>((a, f) => (!a || f.takenAt >= a.takenAt ? f : a), null)
  const layers = structuredClone(state.layers)
  for (const o of state.outputs) { const l = state.program[o.id]?.layers; if (l) layers[o.id] = structuredClone(l) }
  return {
    ...pvw, layers,
    draft: { ...structuredClone(latest?.draft ?? state.draft), scores: structuredClone(state.draft.scores) },
    transition: latest?.speed ?? state.transition,
  }
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
  // A fresh recall replaces Preview, so no stack's standby cue is "loaded" any more (selectAt re-marks the one it loads).
  let next: ShowState = { ...state, lastPreset: preset.id, stacks: state.stacks.map((k) => (k.selected ? { ...k, selected: null } : k)) }
  if (sc.layers) {
    const layers = { ...state.layers }
    for (const o of state.outputs) if (preset.layers[o.id]) layers[o.id] = structuredClone(preset.layers[o.id])
    next = { ...next, layers }
  }
  if (sc.armed) next = { ...next, armed: preset.armed.filter((id) => state.outputs.some((o) => o.id === id)) }
  if (sc.show) {
    const { event, typography, race, notice, qr } = structuredClone(preset.draft)
    next = withDraft(next, { event, typography, race, notice, qr })
  }
  if (sc.players) next = withDraft(next, { players: structuredClone(preset.draft.players) })
  if (sc.scores) next = liveScores(withDraft(next, { scores: structuredClone(preset.draft.scores) }), ctx)
  if (sc.transition) next = { ...next, transition: preset.transition }
  if (sc.mattify) next = { ...next, settings: { ...next.settings, mattify: preset.mattify } }
  return take ? reduce(next, { type: 'take', mode: take }, ctx) : next
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
    case 'setQr':
      return withDraft(state, { qr: { text: cmd.patch.text ?? state.draft.qr.text, items: cmd.patch.items ?? state.draft.qr.items } })
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
      const preset: Preset = { id: nextId('preset', state.presets.map((p) => p.id)), name: cmd.name, scope: mergeScope(DEFAULT_PRESET_SCOPE, cmd.scope), ...snapshot(state, cmd.from) }
      return { ...state, presets: [...state.presets, preset], lastPreset: preset.id }
    }
    case 'updatePreset': {
      requirePreset(state, cmd.id)
      const presets = state.presets.map((p) => (p.id === cmd.id ? { ...p, ...(cmd.name ? { name: cmd.name } : {}), ...(cmd.scope ? { scope: mergeScope(p.scope, cmd.scope) } : {}), ...(cmd.from ? snapshot(state, cmd.from) : {}) } : p))
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
      const cue = { id: nextId('cue', state.stacks.flatMap((k) => k.cues.map((c) => c.id))), presetId: cmd.presetId, take: cmd.take, ...(scope ? { scope } : {}) }
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
          return { id: c.id, presetId: cmd.presetId ?? c.presetId, take: cmd.take !== undefined ? cmd.take : c.take, ...(scope ? { scope } : {}) }
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
        draft: f.draft, outputs: f.outputs, layers: f.layers, transition: f.transition, presets: f.presets, stacks: structuredClone(f.stacks), lastPreset: null,
        program: emptyProgram(f.draft, f.outputs, ctx.catalog, ctx.now, f.transition),
        overlay: { hold: { on: false, message: f.draft.event.holdMessage }, ftb: false },
        armed: [], clocks: { onAirSince: null },
      }
    }
    case 'resetScores':
      return liveScores(withDraft(state, { scores: { races: [], adjustments: [0, 0, 0, 0] } }), ctx)
    case 'resetShow': {
      const fresh = createDefaultState(ctx.catalog, ctx.now)
      return { ...fresh, uploadedFonts: state.uploadedFonts, settings: state.settings, presets: state.presets, stacks: state.stacks }
    }
    case 'resetOnAirClock':
      return { ...state, clocks: { onAirSince: state.clocks.onAirSince === null ? null : ctx.now } }
    case 'setMattify':
      return state.settings.mattify === cmd.on ? state : { ...state, settings: { ...state.settings, mattify: cmd.on } }
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
