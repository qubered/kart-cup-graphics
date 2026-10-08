<script lang="ts">
  import type { SceneView, ViewModel } from '../../../../shared/types'
  import { fontStack } from '../../../../shared/fonts'
  import { pop } from '../motion'
  import Swap from '../Swap.svelte'

  type S = Extract<SceneView, { kind: 'notice' }>
  let { scene, view, enter = 0 }: { scene: S; view: ViewModel; enter?: number } = $props()

  /* Run sizes are px on a 1080-tall canvas; the board is sized per format and kept clear of the lower-third band. */
  const wide = $derived(view.format === 'wide')
  const k = $derived(view.canvas.h / 1080)
  const box = $derived(wide ? { x: 640, y: 150, w: 2560, h: 760 } : { x: 160, y: 90, w: 1600, h: 720 })
</script>

<div class="notice">
  <div class="board" style:left="{box.x}px" style:top="{box.y}px" style:width="{box.w}px" style:height="{box.h}px"
    style:font-family={view.fonts.labels} in:pop|global={{ duration: enter }}>
    <Swap key={JSON.stringify(scene.doc)} dur={enter} block>
      <div class="text">
        {#each scene.doc.blocks as b, i (i)}
          <p style:text-align={b.align}>{#each b.runs as r, j (j)}<span
            style:font-weight={r.bold ? 900 : undefined} style:font-style={r.italic ? 'italic' : undefined}
            style:text-decoration={r.underline ? 'underline' : undefined} style:color={r.color}
            style:font-family={r.font ? fontStack(r.font) : undefined} style:font-size={r.size ? `${r.size * k}px` : undefined}>{r.text}</span>{/each}{#if b.runs.length === 0}<br />{/if}</p>
        {/each}
      </div>
    </Swap>
  </div>
</div>

<style>
  .notice { position: absolute; inset: 0; z-index: 0; }
  .board {
    position: absolute; box-sizing: border-box; padding: 48px 64px; overflow: hidden; display: flex; align-items: center; justify-content: center;
    background: rgba(20, 33, 61, .82); border: 8px solid #fff; border-radius: 36px; box-shadow: 0 14px 0 rgba(0, 0, 0, .28);
    color: #fff; font-size: 48px; line-height: 1.2;
  }
  .text { width: 100%; }
  p { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
</style>
