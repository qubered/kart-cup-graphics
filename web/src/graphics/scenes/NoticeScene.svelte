<script lang="ts">
  import type { SceneView, ViewModel } from '../../../../shared/types'
  import { fontStack } from '../../../../shared/fonts'
  import { pop } from '../motion'
  import Swap from '../Swap.svelte'
  import QrFigure from '../QrFigure.svelte'

  type S = Extract<SceneView, { kind: 'notice' }>
  let { scene, view, enter = 0 }: { scene: S; view: ViewModel; enter?: number } = $props()

  /* Run sizes are px on a 1080-tall canvas; the board is sized per format and kept clear of the lower-third band. */
  const wide = $derived(view.format === 'wide')
  const k = $derived(view.canvas.h / 1080)
  const box = $derived(wide ? { x: 640, y: 150, w: 2560, h: 760 } : { x: 160, y: 90, w: 1600, h: 720 })
  /* With QR codes: wide puts them in a row on the right, hd puts them in a row under the text. */
  const qrSize = $derived(wide ? 290 : 210)
</script>

<div class="notice">
  <div class="board kart-box" class:with-qr={!!scene.qr} class:wide style:left="{box.x}px" style:top="{box.y}px" style:width="{box.w}px" style:height="{box.h}px"
    style:font-family={view.fonts.labels} style:--fs="{wide ? 36 : 28}px" in:pop|global={{ duration: enter }}>
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
    {#if scene.qr}
      <div class="codes">
        {#each scene.qr as q, i (i)}<QrFigure value={q.url} label={q.label} size={qrSize} tilt={i} />{/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .notice { position: absolute; inset: 0; z-index: 0; }
  .board {
    position: absolute; padding: 48px 64px 70px; display: flex; align-items: center; justify-content: center; gap: 56px;
    font-size: 48px; line-height: 1.2;
  }
  .board.with-qr { flex-direction: column; gap: 32px; }
  .board.with-qr.wide { flex-direction: row; gap: 72px; }
  .text { flex: 1 1 auto; min-width: 0; width: 100%; }
  .board.with-qr .text { text-shadow: 0 .06em 0 rgba(0, 0, 0, .3); }
  .codes { display: flex; flex: none; gap: 56px; justify-content: center; }
  p { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
</style>
