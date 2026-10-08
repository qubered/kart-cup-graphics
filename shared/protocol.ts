// Wire types. Builders (buildOutputPayload/buildControlPayload/clientMessageSchema) are added by the shared-core agent below the types.
import type { Command, FontStacks, ShowState, TakeMode, TitleView, TransitionSpeed, ViewModel } from './types'
export type Subscription = { role: 'control' } | { role: 'multiview' } | { role: 'output'; outputId: string; view: 'program' | 'preview' }
export type ClientMessage = { type: 'subscribe'; sub: Subscription } | { type: 'command'; command: Command } | { type: 'ping' }
export interface HoldView { message: string; title: TitleView; fonts: FontStacks; titleStyle: 'chrome' | 'classic' }
export interface OutputPayload {
  type: 'output'; outputId: string; view: ViewModel | null
  frame: { mode: TakeMode; speed: TransitionSpeed; takenAt: number }
  hold: HoldView | null; ftb: boolean
}
export type Presence = Record<string, { program: number; preview: number }>
export interface ControlPayload { type: 'state'; state: ShowState; presence: Presence; pending: Record<string, number> }
export type ServerMessage = OutputPayload | ControlPayload | { type: 'pong' } | { type: 'error'; message: string }
