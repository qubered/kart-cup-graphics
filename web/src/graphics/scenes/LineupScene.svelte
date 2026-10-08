<script lang="ts">
  import type { SceneView, ViewModel } from '../../../../shared/types'
  import { fitText } from '../../lib/fit-text'
  import { STAGGER_MS, pop } from '../motion'
  import Heading from '../Heading.svelte'
  import Medallion from '../Medallion.svelte'

  type S = Extract<SceneView, { kind: 'lineup' }>
  let { scene, view, enter = 0 }: { scene: S; view: ViewModel; enter?: number } = $props()

  const wide = $derived(view.format === 'wide')
  const K = $derived(wide
    ? { cw: 760, ch: 600, med: 330, gap: 64, head: 170, nm: 84, chip: 44, ch2: 34, top: 70 }
    : { cw: 410, ch: 500, med: 230, gap: 26, head: 108, nm: 52, chip: 30, ch2: 22, top: 56 })
  const st = $derived(enter ? STAGGER_MS : 0)
</script>

<div class="lineup" class:wide class:hd={!wide}>
  <div class="head" style:top="{K.top}px" in:pop|global={{ duration: enter }}>
    <Heading text="THE RACERS" look={view.headingLook} font={view.fonts.headings} upright={view.headingUpright} size={K.head} />
  </div>
  <div class="row" style:gap="{K.gap}px" style:padding-top="{K.top + K.head * 1.2}px">
    {#each scene.players as p, i (p.slot)}
      <div class="lineup-card" style:width="{K.cw}px" style:height="{K.ch}px" style:margin-top="{K.med / 2}px" style:--c={p.colour} style:--tc={p.textColour}
        in:pop|global={{ duration: enter, delay: (i + 1) * st }}>
        <div class="panel"><div class="stripe"></div></div>
        <div class="med" style:top="{-K.med / 2}px"><Medallion image={p.art || p.icon} size={K.med} stars dur={enter} /></div>
        <div class="body" style:padding-top="{K.med / 2 + K.med * 0.22}px">
          <span class="chip" style:font-family={view.fonts.labels} style:font-size="{K.chip}px"><span>P{p.slot + 1}</span></span>
          <span class="name" style:font-family={view.fonts.names} style:font-size="{K.nm}px" style:max-width="{K.cw - 70}px"
            use:fitText={{ max: K.cw - 70, text: p.name + K.nm }}>{p.name}</span>
          <span class="char" style:font-family={view.fonts.labels} style:font-size="{K.ch2}px" style:max-width="{K.cw - 70}px"
            use:fitText={{ max: K.cw - 70, text: p.character + K.ch2 }}>{p.character}</span>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .lineup { position: absolute; inset: 0; }
  .head { position: absolute; left: 0; right: 0; text-align: center; }
  .row { position: absolute; inset: 0; display: flex; justify-content: center; align-items: flex-start; box-sizing: border-box; }
  .lineup-card { position: relative; flex: none; }
  .panel {
    position: absolute; inset: 0; overflow: hidden; border-radius: 28px 28px 70px 28px;
    background: linear-gradient(180deg, #1d4870, #0e2a46); box-shadow: 0 10px 0 rgba(0, 0, 0, 0.28);
  }
  .stripe { position: absolute; left: 0; right: 0; top: 0; height: 14px; background: var(--c); }
  .panel::after {
    content: ''; position: absolute; right: 0; bottom: 0; width: 60%; height: 45%;
    background-image: conic-gradient(rgba(255, 255, 255, 0.08) 25%, transparent 0 50%, rgba(255, 255, 255, 0.08) 0 75%, transparent 0);
    background-size: 28px 28px;
    -webkit-mask-image: linear-gradient(to top left, #000, transparent);
    mask-image: linear-gradient(to top left, #000, transparent);
  }
  .med { position: absolute; left: 0; right: 0; display: flex; justify-content: center; }
  .body { position: relative; display: flex; flex-direction: column; align-items: center; box-sizing: border-box; height: 100%; }
  .chip {
    display: inline-block; padding: 0.1em 0.8em; background: var(--c); color: var(--tc); transform: skewX(-12deg);
    font-weight: 800; letter-spacing: 0.05em; box-shadow: 0 4px 0 rgba(0, 0, 0, 0.3), 0 0 0 3px rgba(255, 255, 255, 0.85);
  }
  .chip span { display: block; transform: skewX(12deg); }
  .name {
    display: block; margin-top: 18px; white-space: nowrap; overflow: hidden; padding-right: 0.1em; line-height: 1.15;
    font-weight: 900; font-style: italic; color: #fff; text-shadow: 0 4px 0 rgba(0, 0, 0, 0.35);
  }
  .char { display: block; margin-top: 4px; white-space: nowrap; overflow: hidden; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #aee9ff; }
</style>
