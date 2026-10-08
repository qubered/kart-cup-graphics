<script lang="ts">
  import type { SceneView, ViewModel } from '../../../../shared/types'
  import { pop } from '../motion'
  import { qrLayout } from '../qr-layout'
  import QrFigure from '../QrFigure.svelte'
  import { fitPanel } from '../../lib/fit-panel'
  import TitleLockup from '../TitleLockup.svelte'

  type S = Extract<SceneView, { kind: 'qr' }>
  let { scene, view, enter = 0 }: { scene: S; view: ViewModel; enter?: number } = $props()

  const lay = $derived(qrLayout(view.format, scene.style))
</script>

<div class="qr-scene">
  {#if lay.title}
    <div class="title-box" style:left="{lay.title.box.x}px" style:top="{lay.title.box.y}px" style:width="{lay.title.box.w}px" style:height="{lay.title.box.h}px">
      <TitleLockup title={scene.title} style={view.eventTitleStyle} format={view.format} font={view.fonts.eventTitle} labelFont={view.fonts.labels}
        top={lay.title.top} layout={lay.title.layout} dur={enter} />
    </div>
  {/if}
  {#each lay.panels as p, pi (pi)}
    <div class="anchor" style:left="{p.box.x + p.box.w / 2}px" style:top="{p.box.y + p.box.h / 2}px" style:max-width="{p.box.w}px">
    <div class="panel kart-box {p.kind}" data-panel={pi} style:font-family={view.fonts.labels} style:--qr="{p.qr}px" use:fitPanel={{ size: p.text, maxH: p.box.h, text: scene.text }} in:pop|global={{ duration: enter, delay: pi * 80 }}>
      {#snippet code(i: number)}
        <QrFigure value={scene.items[i]?.url ?? ''} label={scene.items[i]?.label ?? ''} size={p.qr} tilt={i} />
      {/snippet}
      {#snippet text()}<p class="txt">{scene.text}</p>{/snippet}
      {#if p.kind === 'trio'}
        {@render code(p.items[0])}{@render text()}{@render code(p.items[1])}
      {:else if p.kind === 'duo'}
        <div class="codes">{#each p.items as i (i)}{@render code(i)}{/each}</div>{@render text()}
      {:else}
        {@render code(p.items[0])}{@render text()}
      {/if}
    </div>
    </div>
  {/each}
</div>

<style>
  .qr-scene { position: absolute; inset: 0; z-index: 0; }
  .title-box { position: absolute; }
  .anchor { position: absolute; transform: translate(-50%, -50%); width: max-content; }
  .panel { padding: 32px 44px 54px; display: flex; align-items: center; justify-content: center; gap: 44px; }
  .panel.duo, .panel.col { flex-direction: column; gap: 24px; }
  .codes { display: flex; gap: 90px; justify-content: center; }
  .txt { margin: 0; font-size: var(--fs); font-weight: 800; line-height: 1.25; white-space: pre-line; overflow-wrap: anywhere; text-align: center; text-shadow: 0 .08em 0 rgba(0, 0, 0, .35); }
  .panel.row .txt { text-align: left; max-width: 520px; }
  .panel.trio .txt { max-width: 1000px; }
  .panel.col .txt { max-width: 640px; }
  .panel.duo .txt { max-width: 1100px; }
</style>
