// Wire types. Builders (buildOutputPayload/buildControlPayload/clientMessageSchema) are added by the shared-core agent below the types.
import type { Command, FontStacks, ShowState, TakeMode, TitleView, TransitionSpeed, ViewModel } from './types'
export type Subscription = { role: 'control' } | { role: 'multiview' } | { role: 'output'; outputId: string; view: 'program' | 'preview'; part?: 'left' | 'right' }
export type ClientMessage = { type: 'subscribe'; sub: Subscription } | { type: 'command'; command: Command } | { type: 'ping' }
export interface HoldView { message: string; title: TitleView; fonts: FontStacks; titleStyle: 'chrome' | 'classic'; watermark?: string }
export interface OutputPayload {
  type: 'output'; outputId: string; view: ViewModel | null
  frame: { mode: TakeMode; speed: TransitionSpeed; takenAt: number }
  hold: HoldView | null; ftb: boolean
}
/** left/right count the clients that render only that half of the output (a subset of program/preview). */
export type Presence = Record<string, { program: number; preview: number; left: number; right: number }>
export interface ControlPayload { type: 'state'; state: ShowState; presence: Presence; pending: Record<string, number> }
export type ServerMessage = OutputPayload | ControlPayload | { type: 'pong' } | { type: 'error'; message: string }

// ---- builders and runtime validation ----
import { z } from 'zod'
import type { CatalogIndex } from './catalog'
import { countPendingChanges } from './diff'
import { fontStack } from './fonts'
import { commandSchema } from './schema'
import { deriveView } from './view'
import { emptyLayers } from './defaults'

const subscriptionSchema: z.ZodType<Subscription> = z.union([
  z.object({ role: z.literal('control') }),
  z.object({ role: z.literal('multiview') }),
  z.object({ role: z.literal('output'), outputId: z.string().max(200), view: z.enum(['program', 'preview']), part: z.enum(['left', 'right']).optional() }),
])

export const clientMessageSchema = z.union([
  z.object({ type: z.literal('subscribe'), sub: subscriptionSchema }),
  z.object({ type: z.literal('command'), command: commandSchema }),
  z.object({ type: z.literal('ping') }),
]) as unknown as z.ZodType<ClientMessage>

function holdView(state: ShowState): HoldView | null {
  if (!state.overlay.hold.on) return null
  const ty = state.draft.typography
  const ev = state.draft.event
  return {
    message: state.overlay.hold.message,
    title: { preTitle: ev.preTitle, title: ev.title, accent: ev.titleAccent },
    fonts: {
      eventTitle: fontStack(ty.eventTitle.font), headings: fontStack(ty.headings.font),
      names: fontStack(ty.names.font), labels: fontStack(ty.labels.font),
    },
    titleStyle: ty.eventTitle.style,
    watermark: ev.watermark,
  }
}

export function buildOutputPayload(state: ShowState, outputId: string, view: 'program' | 'preview', catalog: CatalogIndex): OutputPayload {
  const output = state.outputs.find((o) => o.id === outputId)
  const base = { type: 'output' as const, outputId, hold: holdView(state), ftb: state.overlay.ftb }
  if (!output) return { ...base, view: null, frame: { mode: 'cut', speed: state.transition, takenAt: 0 } }
  if (view === 'program') {
    const f = state.program[outputId]
    if (!f) return { ...base, view: null, frame: { mode: 'cut', speed: state.transition, takenAt: 0 } }
    return { ...base, view: f.view, frame: { mode: f.mode, speed: f.speed, takenAt: f.takenAt } }
  }
  return {
    ...base,
    view: deriveView(state.draft, state.layers[outputId] ?? emptyLayers(), output, catalog),
    frame: { mode: 'cut', speed: state.transition, takenAt: 0 },
  }
}

export function buildControlPayload(state: ShowState, presence: Presence, catalog: CatalogIndex): ControlPayload {
  const pending: Record<string, number> = {}
  for (const o of state.outputs) {
    const draft = deriveView(state.draft, state.layers[o.id] ?? emptyLayers(), o, catalog)
    pending[o.id] = countPendingChanges(draft, state.program[o.id]?.view)
  }
  return { type: 'state', state, presence, pending }
}
