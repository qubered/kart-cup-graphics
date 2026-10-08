import { mount } from 'svelte'
import '../lib/fonts.css'
import '../graphics/tokens.css'
import Output from '../graphics/Output.svelte'
import Superwide from '../graphics/Superwide.svelte'
import { openChannel } from './channel'

const params = new URLSearchParams(location.search)
const m = location.pathname.match(/\/out\/([^/]+)(?:\/(left|right))?\/?$/)
const outputId = m ? decodeURIComponent(m[1]) : ''
const part = m?.[2] === 'left' || m?.[2] === 'right' ? m[2] : undefined
const lowfx = params.get('lowfx') === '1'
const debug = params.get('debug') === '1'
const viewKind = params.get('view') === 'preview' ? 'preview' : 'program'
const target = document.getElementById('app')!

if (outputId === 'superwide') {
  // Composite 5760x1152: left half of the twin output | wide output | right half of the twin output.
  // Output ids default to `wide` and `twins`; override with ?wide=<id>&twins=<id>.
  const wideId = params.get('wide') || 'wide'
  const twinsId = params.get('twins') || 'twins'
  let ready = 0
  const onReady = () => { if (++ready === 3) document.body.setAttribute('data-ready', '') }
  const left = openChannel({ role: 'output', outputId: twinsId, view: viewKind, part: 'left' }, onReady)
  const wide = openChannel({ role: 'output', outputId: wideId, view: viewKind }, onReady)
  const right = openChannel({ role: 'output', outputId: twinsId, view: viewKind, part: 'right' }, onReady)
  mount(Superwide, { target, props: { left, wide, right, lowfx, debug } })
} else {
  const state = openChannel(
    { role: 'output', outputId, view: viewKind, ...(part ? { part } : {}) },
    () => document.body.setAttribute('data-ready', ''),
  )
  mount(Output, {
    target,
    props: {
      get payload() { return state.payload },
      get firstPaint() { return state.firstPaint },
      get connected() { return state.connected },
      part, lowfx, debug,
    },
  })
}
