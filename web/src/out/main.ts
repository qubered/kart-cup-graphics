import { mount, tick } from 'svelte'
import '../lib/fonts.css'
import '../graphics/tokens.css'
import Output from '../graphics/Output.svelte'
import { connect } from '../lib/socket'
import { whenReady } from '../lib/ready'
import type { OutputPayload } from '../../../shared/protocol'
import { out } from './state'

const params = new URLSearchParams(location.search)
const m = location.pathname.match(/\/out\/([^/]+)/)
const outputId = m ? decodeURIComponent(m[1]) : ''
const lowfx = params.get('lowfx') === '1'
const debug = params.get('debug') === '1'
const viewKind = params.get('view') === 'preview' ? 'preview' : 'program'

/** Every image URL referenced anywhere in the payload (view, hold). */
function imageUrls(p: OutputPayload): string[] {
  const urls = new Set<string>()
  const walk = (v: unknown): void => {
    if (typeof v === 'string') { if (/^\/(assets|uploads)\/.+\.(png|jpe?g|webp|svg|gif)$/i.test(v)) urls.add(v) }
    else if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === 'object') Object.values(v).forEach(walk)
  }
  walk(p.view); walk(p.hold)
  return [...urls]
}

mount(Output, {
  target: document.getElementById('app')!,
  props: {
    get payload() { return out.payload },
    get firstPaint() { return out.firstPaint },
    get connected() { return out.connected },
    lowfx, debug,
  },
})

// Payloads are applied strictly in order, after their images are decoded.
let chain: Promise<void> = Promise.resolve()
let first = true

function apply(p: OutputPayload): Promise<void> {
  const isFirst = first
  first = false
  return whenReady(imageUrls(p), isFirst ? 3000 : 1500).catch(() => undefined).then(async () => {
    out.firstPaint = isFirst
    out.payload = p
    await tick()
    if (isFirst) {
      // Let the CUT frame paint, then allow transitions for later updates.
      await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())))
      out.firstPaint = false
      document.body.setAttribute('data-ready', '')
    }
  })
}

connect({ role: 'output', outputId, view: viewKind }, {
  onMessage(msg) { if (msg.type === 'output') chain = chain.then(() => apply(msg)) },
  onStatus(up) { out.connected = up },
})
