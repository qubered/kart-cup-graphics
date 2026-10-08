<script lang="ts">
  import { tick } from 'svelte'
  import type { TitleView } from '../../../../shared/types'
  import { fitText } from '../../lib/fit-text'
  import { ICON_SYMBOLS, VEHICLE_SYMBOLS } from './icons'
  import { fitStickerText, paradeVehicles, stickerTile, tileCopies, tileUses, TILE_W } from './stickers'

  let { watermark, title, titleFont, labelFont, w, h, lowfx }: {
    watermark: string; title: TitleView; titleFont: string; labelFont: string; w: number; h: number; lowfx: boolean
  } = $props()

  const wm = $derived(watermark || 'MARIO KART')
  const tile = $derived(stickerTile(wm))
  const uses = $derived(tileUses(w))
  const sheetW = $derived((tileCopies(w) + 1) * TILE_W)
  const vehicles = $derived(paradeVehicles(w))
  // Logo plate: padding is 80px each side; keep the lockup inside the canvas.
  const plateMax = $derived(Math.max(200, Math.round(w * 0.8) - 160))

  let sheet: SVGSVGElement | undefined = $state()
  const fit = () => { if (sheet) fitStickerText(sheet) }
  $effect(() => {
    void tile; void titleFont
    void tick().then(fit)
    void document.fonts?.ready.then(fit)
  })
</script>

<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>{@html ICON_SYMBOLS}{@html VEHICLE_SYMBOLS}</defs></svg>
<div class="bg-stickers" class:lowfx style:width="{w}px" style:height="{h}px">
  <svg class="sheet" bind:this={sheet} width={sheetW} height={h} style:font-family={titleFont} aria-hidden="true">
    {@html tile}{@html uses}
  </svg>
  <div class="parade" style:width="{w * 2}px">
    {#each vehicles as v (v.id)}
      <svg width={v.w} height={v.h} viewBox="0 0 240 150" style:left="{v.left}px" style:animation-delay="{v.delay}s" aria-hidden="true"><use href={v.href} /></svg>
    {/each}
  </div>
  <div class="road"></div>
  <div class="logo" style:font-family={titleFont}>
    <div class="logo-t" use:fitText={{ max: plateMax, text: title.title + title.accent }}><span>{title.title}{#if title.accent}&#32;<span class="acc">{title.accent}</span>{/if}</span></div>
    {#if title.preTitle}<small style:font-family={labelFont}><span use:fitText={{ max: plateMax, text: title.preTitle }}><span>{title.preTitle}</span></span></small>{/if}
  </div>
</div>

<style>
  .bg-stickers { position: absolute; left: 0; top: 0; background: var(--sticker-bg); overflow: hidden; }
  .sheet { position: absolute; left: 0; top: 0; overflow: visible; font-weight: 900; will-change: transform; animation: sticker-drift 80s linear infinite; }  /* tile 1280×1152 */
  @keyframes sticker-drift { to { transform: translateX(-1280px); } }
  /* The tile is repeated with SVG <use>: these classes must stay unscoped (ancestor selectors don't match inside <use> copies). */
  :global(.st-o) { fill: none; stroke: var(--sticker-line); stroke-width: 6; }
  :global(.st-f) { fill: var(--sticker-fill); }
  :global(.st-t) { fill: var(--sticker-text); }
  :global(.st-k) { fill: var(--sticker-knock); }
  .parade { position: absolute; left: 0; bottom: 46px; height: 170px; will-change: transform; animation: parade 55s linear infinite; z-index: 3; }
  @keyframes parade { from { transform: translateX(-50%); } to { transform: translateX(0); } }
  .parade svg { position: absolute; bottom: 0; animation: kart-bob .5s ease-in-out infinite alternate; }
  @keyframes kart-bob { to { transform: translateY(-5px); } }
  .road { position: absolute; left: 0; right: 0; bottom: 44px; height: 6px; background: var(--sticker-ink); z-index: 3; }
  .logo { position: absolute; left: 50%; bottom: 20px; transform: translateX(-50%); z-index: 4; background: var(--sticker-bg);
    padding: 22px 80px 18px; text-align: center; white-space: nowrap; font-size: 120px; font-weight: 400; line-height: 1; letter-spacing: 4px; color: var(--sticker-ink); }
  .acc { color: var(--sticker-accent); }
  .logo small { display: block; font-size: 34px; font-style: italic; font-weight: 800; line-height: 1; letter-spacing: 10px; color: #666; margin-top: 10px; }
  .lowfx .parade svg { animation: none; }
</style>
