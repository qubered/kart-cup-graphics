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
    <div class="anchor" style:left="{p.box.x + p.box.w / 2}px" style:top="{p.box.y + p.box.h / 2}px" style:max-width="{p.box.w}px">
    <div class="panel {p.kind}" data-panel={pi} style:font-family={view.fonts.labels} style:--qr="{p.qr}px" style:--fs="{p.text}px" in:pop|global={{ duration: enter, delay: pi * 80 }}>
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
    </div>
  {/each}
</div>

<style>
  .qr-scene { position: absolute; inset: 0; z-index: 0; }
  .title-box { position: absolute; }
  .anchor { position: absolute; transform: translate(-50%, -50%); width: max-content; }
  .panel {
    position: relative; overflow: hidden; box-sizing: border-box; padding: 32px 44px 54px; display: flex; align-items: center; justify-content: center; gap: 44px;
    background: var(--mk-bar); border: 6px solid var(--mk-yellow); border-radius: 30px; color: #fff;
    box-shadow: 0 0 0 5px var(--mk-navy), 0 14px 0 5px rgba(0, 0, 0, .3);
  }
  /* chequered-flag strip along the bottom edge */
  .panel::after {
    content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 22px;
    background: conic-gradient(#fff 25%, #0a0f1c 0 50%, #fff 0 75%, #0a0f1c 0) 0 0 / 22px 22px;
  }
  .panel.duo, .panel.col { flex-direction: column; gap: 24px; }
  .codes { display: flex; gap: 90px; justify-content: center; }
  figure { margin: 0; display: flex; flex-direction: column; align-items: center; gap: calc(var(--qr) * .09); flex: none; }
  figure :global(svg) { border-radius: calc(var(--qr) * .07); filter: drop-shadow(0 calc(var(--qr) * .03) 0 rgba(0, 0, 0, .4)); transform: rotate(-2.5deg); }
  figure:nth-of-type(even) :global(svg) { transform: rotate(2.5deg); }
  /* label pill, same look as the title's pre-title pill */
  figcaption {
    background: var(--mk-pill); color: var(--mk-navy); font-size: calc(var(--fs) * 1); font-weight: 900; font-style: italic; line-height: 1; letter-spacing: .04em;
    padding: .3em 1em; border-radius: .25em; transform: skewX(-14deg); box-shadow: 0 .18em 0 var(--mk-pill-shadow);
  }
  .txt { margin: 0; font-size: var(--fs); font-weight: 800; line-height: 1.25; white-space: pre-line; overflow-wrap: anywhere; text-align: center; text-shadow: 0 .08em 0 rgba(0, 0, 0, .35); }
  .panel.row .txt { text-align: left; max-width: 520px; }
  .panel.trio .txt { max-width: 1000px; }
  .panel.col .txt { max-width: 640px; }
  .panel.duo .txt { max-width: 1100px; }
</style>
