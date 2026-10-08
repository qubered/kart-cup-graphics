import { SvelteMap } from 'svelte/reactivity'
import type { OutputPayload } from '../../../shared/protocol'

// Reactive state bridging socket callbacks (channel.ts) and Output props. SvelteMap keeps this a plain .ts file (no runes needed).
export interface OutState { payload: OutputPayload | null; firstPaint: boolean; connected: boolean }
type Shape = OutState

export function createOutState(): OutState {
  const m = new SvelteMap<keyof Shape, Shape[keyof Shape]>([['payload', null], ['firstPaint', true], ['connected', false]])
  return {
    get payload() { return m.get('payload') as Shape['payload'] },
    set payload(v: Shape['payload']) { m.set('payload', v) },
    get firstPaint() { return m.get('firstPaint') as boolean },
    set firstPaint(v: boolean) { m.set('firstPaint', v) },
    get connected() { return m.get('connected') as boolean },
    set connected(v: boolean) { m.set('connected', v) },
  }
}
