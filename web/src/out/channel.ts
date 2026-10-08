import { tick } from 'svelte'
import { connect } from '../lib/socket'
import { whenReady } from '../lib/ready'
import type { OutputPayload, Subscription } from '../../../shared/protocol'
import { MATTIFY_IMAGE } from '../../../shared/mattify'
import { createOutState, type OutState } from './state'

/** Every image URL referenced anywhere in the payload (view, hold). */
function imageUrls(p: OutputPayload): string[] {
  const urls = new Set<string>()
  const walk = (v: unknown): void => {
    if (typeof v === 'string') { if (/^\/(assets|uploads)\/.+\.(png|jpe?g|webp|svg|gif)$/i.test(v)) urls.add(v) }
    else if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === 'object') Object.values(v).forEach(walk)
  }
  walk(p.view); walk(p.hold)
  if (p.mattify) urls.add(MATTIFY_IMAGE)   // decode before the first frame so it never pops in
  return [...urls]
}

/**
 * One output subscription feeding one reactive state. Payloads are applied strictly in order, after their
 * images are decoded; the first render is a CUT. `onReady` fires once the first frame has painted.
 */
export function openChannel(sub: Subscription, onReady: () => void): OutState {
  const state = createOutState()
  let chain: Promise<void> = Promise.resolve()
  let first = true

  function apply(p: OutputPayload): Promise<void> {
    const isFirst = first
    first = false
    return whenReady(imageUrls(p), isFirst ? 3000 : 1500).catch(() => undefined).then(async () => {
      state.firstPaint = isFirst
      state.payload = p
      await tick()
      if (isFirst) {
        // Let the CUT frame paint, then allow transitions for later updates.
        await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())))
        state.firstPaint = false
        onReady()
      }
    })
  }

  connect(sub, {
    onMessage(msg) { if (msg.type === 'output') chain = chain.then(() => apply(msg)) },
    onStatus(up) { state.connected = up },
  })
  return state
}
