<script lang="ts">
  import type { SceneView, ViewModel } from '../../../../shared/types'
  import { pop } from '../motion'
  import { qrLayout } from '../qr-layout'
  import QrCode from '../QrCode.svelte'
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
    <div class="panel {p.kind}" data-panel={pi} style:left="{p.box.x}px" style:top="{p.box.y}px" style:width="{p.box.w}px" style:height="{p.box.h}px"
      style:font-family={view.fonts.labels} style:--qr="{p.qr}px" style:--fs="{p.text}px" in:pop|global={{ duration: enter, delay: pi * 80 }}>
      {#snippet code(i: number)}
        <figure>
          <QrCode value={scene.items[i]?.url ?? ''} size={p.qr} />
          <figcaption>{scene.items[i]?.label ?? ''}</figcaption>
        </figure>
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
  {/each}
</div>

<style>
  .qr-scene { position: absolute; inset: 0; z-index: 0; }
  .title-box { position: absolute; }
  .panel {
    position: absolute; box-sizing: border-box; padding: 40px 56px; overflow: hidden; display: flex; align-items: center; justify-content: center; gap: 56px;
    background: rgba(20, 33, 61, .82); border: 8px solid #fff; border-radius: 36px; box-shadow: 0 14px 0 rgba(0, 0, 0, .28); color: #fff;
  }
  .panel.duo, .panel.col { flex-direction: column; gap: 32px; }
  .codes { display: flex; gap: 120px; justify-content: center; }
  figure { margin: 0; display: flex; flex-direction: column; align-items: center; gap: calc(var(--qr) * .06); flex: none; }
  figcaption { font-size: calc(var(--fs) * 1.1); font-weight: 900; line-height: 1; letter-spacing: .02em; }
  .txt { margin: 0; font-size: var(--fs); font-weight: 700; line-height: 1.25; white-space: pre-line; overflow-wrap: anywhere; text-align: center; flex: 0 1 auto; }
  .panel.row .txt { text-align: left; }
  .panel.trio .txt { max-width: 1400px; }
</style>
