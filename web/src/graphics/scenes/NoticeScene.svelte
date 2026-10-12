<script lang="ts">
  import type { SceneView, ViewModel } from '../../../../shared/types'
  import { fontStack } from '../../../../shared/fonts'
  import { pop } from '../motion'
  import Swap from '../Swap.svelte'
  import QrFigure from '../QrFigure.svelte'
  import Logo from '../Logo.svelte'

  type S = Extract<SceneView, { kind: 'notice' }>
  let { scene, view, enter = 0, logoSrc = null }: { scene: S; view: ViewModel; enter?: number; logoSrc?: string | null } = $props()

  /* Run sizes are px on a 1080-tall canvas; the board is sized per format and kept clear of the lower-third band. */
  const wide = $derived(view.format === 'wide')
  const k = $derived(view.canvas.h / 1080)
  const box = $derived(wide ? { x: 320, y: 90, w: 3200, h: 820 } : { x: 90, y: 60, w: 1740, h: 780 })
  /* With QR codes: wide puts them in a row on the right, hd puts them in a row under the text. */
  const logoSize = $derived(wide ? 560 : scene.qr ? 200 : 360)
  const qrSize = $derived(wide ? 290 : 210)
</script>

<div class="notice">
  <div class="board kart-box" class:with-qr={!!scene.qr} class:wide style:left="{box.x}px" style:top="{box.y}px" style:width="{box.w}px" style:height="{box.h}px"
    style:font-family={view.fonts.labels} style:--fs="{wide ? 36 : 28}px" in:pop|global={{ duration: enter }}>
    <div class="textwrap"><Swap key={JSON.stringify(scene.doc)} dur={enter} block>
      <div class="text">
        <div class="logo-badge" style:width="{logoSize}px" style:height="{logoSize}px"><Logo size={logoSize} src={logoSrc} dur={enter} /></div>
        {#each scene.doc.blocks as b, i (i)}
          <p style:text-align={b.align}>{#each b.runs as r, j (j)}<span
            style:font-weight={r.bold ? 900 : undefined} style:font-style={r.italic ? 'italic' : undefined}
            style:text-decoration={r.underline ? 'underline' : undefined} style:color={r.color}
            style:font-family={r.font ? fontStack(r.font) : undefined} style:font-size={r.size ? `${r.size * k}px` : undefined}>{r.text}</span>{/each}{#if b.runs.length === 0}<br />{/if}</p>
        {/each}
      </div>
    </Swap></div>
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
  .textwrap { flex: 1 1 auto; min-width: 0; align-self: stretch; display: flex; align-items: center; }
  .textwrap > :global(.swap) { flex: 1 1 auto; min-width: 0; }
  .text { flex: 1 1 auto; min-width: 0; width: 100%; display: flow-root; }
  .board.with-qr .text { text-shadow: 0 .06em 0 rgba(0, 0, 0, .3); }
  .logo-badge { float: left; margin: 0 56px 12px 0; shape-outside: polygon(50% 0, 62% 38%, 100% 38%, 69% 62%, 81% 100%, 50% 76%, 19% 100%, 31% 62%, 0 38%, 38% 38%); shape-margin: 24px; filter: drop-shadow(0 4px 0 rgba(0, 0, 0, .25)); }
  .codes { display: flex; flex: none; gap: 56px; justify-content: center; }
  p { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
</style>
