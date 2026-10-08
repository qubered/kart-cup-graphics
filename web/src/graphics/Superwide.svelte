<script lang="ts">
  import Output from './Output.svelte'
  import type { OutState } from '../out/state'

  // Superwide 5760x1152: [left twin half 960] [wide 3840] [right twin half 960], one page, one URL.
  interface Props { left: OutState; wide: OutState; right: OutState; lowfx: boolean; debug: boolean }
  let { left, wide, right, lowfx, debug }: Props = $props()

  const W = 5760, H = 1152, TWIN = 960
</script>

<div id="superwide" style="width:{W}px;height:{H}px">
  <div class="box" data-box="left" style="left:0;width:{TWIN}px">
    <Output part="left" embedded stage={{ w: W, x: 0 }} payload={left.payload} firstPaint={left.firstPaint} connected={left.connected} {lowfx} debug={false} />
  </div>
  <div class="box" data-box="wide" style="left:{TWIN}px;width:3840px">
    <Output embedded stage={{ w: W, x: TWIN }} payload={wide.payload} firstPaint={wide.firstPaint} connected={wide.connected} {lowfx} debug={false} />
  </div>
  <div class="box" data-box="right" style="left:{W - TWIN}px;width:{TWIN}px">
    <Output part="right" embedded stage={{ w: W, x: W - TWIN - 960 }} payload={right.payload} firstPaint={right.firstPaint} connected={right.connected} {lowfx} debug={false} />
  </div>
</div>

{#if debug}
  <div data-debug>
    superwide {W}x{H}
    left={left.connected ? 'connected' : 'DISCONNECTED'} wide={wide.connected ? 'connected' : 'DISCONNECTED'} right={right.connected ? 'connected' : 'DISCONNECTED'}
  </div>
{/if}

<style>
  #superwide { position: relative; overflow: hidden; background: transparent; }
  .box { position: absolute; top: 0; height: 100%; overflow: hidden; }
  [data-debug] {
    position: fixed; left: 8px; bottom: 8px; z-index: 99999; padding: 4px 8px;
    font: 12px/1.3 monospace; color: #fff; background: rgba(0, 0, 0, .75); pointer-events: none; white-space: pre-wrap;
  }
</style>
