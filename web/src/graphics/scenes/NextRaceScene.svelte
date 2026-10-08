<script lang="ts">
  import type { SceneView, ViewModel } from '../../../../shared/types'
  import { STAGGER_MS, pop, slideIn } from '../motion'
  import Heading from '../Heading.svelte'
  import Medallion from '../Medallion.svelte'
  import Swap from '../Swap.svelte'

  type S = Extract<SceneView, { kind: 'nextRace' }>
  let { scene, view, enter = 0 }: { scene: S; view: ViewModel; enter?: number } = $props()

  /* Laid out in wide (3840×1152) pixels; HD scales the stage (same parts and proportions) and stacks nothing new. */
  const wide = $derived(view.format === 'wide')
  const sc = $derived(wide ? 1 : 0.62)
  const tf = $derived(wide ? undefined : `translate(${-32}px, 120px) scale(${sc})`)
  const textW = $derived(wide ? 1900 : 1300)
  const headSize = $derived(wide ? 150 : 140)
  const st = $derived(enter ? STAGGER_MS : 0)

  let imgFailed = $state('')
  const showImg = $derived(!!scene.trackImage && imgFailed !== scene.trackImage)
  const hasTrack = $derived(!!scene.trackName)
  const single = $derived(scene.single)
  const imgKey = $derived(!hasTrack ? `g:${scene.cupTracks.map((t) => t.name).join('|')}` : showImg ? `i:${scene.trackImage}` : 'f')
  const curIdx = $derived(scene.cupTracks.findIndex((t) => t.current))
</script>

<div class="next" class:wide class:hd={!wide}>
  <div class="stage" style:transform={tf}>
    <div class="nr-image" in:pop|global={{ duration: enter }}>
      <Swap key={imgKey} dur={enter} block>
        {#if hasTrack}
          {#if showImg}
            <img src={scene.trackImage} alt="" onerror={() => (imgFailed = scene.trackImage)} />
          {:else}
            <div class="fallback"><Medallion image={scene.cupEmblem} size={420} emblem dur={enter} /></div>
          {/if}
        {:else}
          <div class="grid">
            {#each scene.cupTracks as t (t.name)}
              <div class="gtile"><img src={t.thumb} alt="" /><span style:font-family={view.fonts.labels}>{t.name}</span></div>
            {/each}
          </div>
        {/if}
      </Swap>
    </div>
    {#if !single}<div class="nr-cup" in:pop|global={{ duration: enter, delay: 2 * st }}><Medallion image={scene.cupEmblem} size={360} emblem dur={enter} /></div>{/if}

    <div class="nr-text" style:width="{textW}px">
      <div in:slideIn|global={{ duration: enter, dx: 120, delay: st }}>
        <span class="nr-next" style:font-family={view.fonts.names}>NEXT RACE</span><Swap key={scene.raceLabel} dur={enter} class="race-swap"><span class="nr-race" style:font-family={view.fonts.names}>{scene.raceLabel}</span></Swap>
      </div>
      {#if hasTrack}
        <div class="nr-track" in:slideIn|global={{ duration: enter, dx: 160, delay: 2 * st }}>
          <Heading text={scene.trackName.toUpperCase()} look={view.headingLook} font={view.fonts.headings} upright={view.headingUpright} size={headSize} dur={enter} />
        </div>
      {/if}
      {#if !single}
        <div in:slideIn|global={{ duration: enter, dx: 160, delay: 3 * st }}>
          <Swap key={scene.cupName} dur={enter} block><div class="nr-cupname" style:font-family={view.fonts.labels}>{scene.cupName}</div></Swap>
        </div>
      {/if}
      {#if hasTrack && !single}
        <div class="nr-strip" in:slideIn|global={{ duration: enter, dx: 160, delay: 4 * st }}>
          {#each scene.cupTracks as t, i (i)}
            <Swap key={`${t.name}|${t.thumb}`} dur={enter}>
              <div class="tile" class:done={curIdx > i} style:--d="{enter}ms">
                <div class="tin"><img src={t.thumb} alt="" /><span style:font-family={view.fonts.labels}>{t.name}</span></div>
                <i class="fr"></i><i class="fr hl" class:on={t.current}></i>
              </div>
            </Swap>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .next { position: absolute; inset: 0; overflow: hidden; }
  .stage { position: absolute; left: 0; top: 0; width: 0; height: 0; transform-origin: 0 0; }
  .nr-image {
    position: absolute; left: 330px; top: 220px; width: 1300px; height: 732px; border: 12px solid var(--mk-yellow); border-radius: 34px;
    overflow: hidden; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5); background: #000; box-sizing: border-box;
  }
  .nr-image :global(.swap) { width: 100%; height: 100%; grid-template: 100% / 100%; }
  .nr-image :global(.swap-item) { width: 100%; height: 100%; }
  .nr-image img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .fallback { width: 100%; height: 100%; position: relative; display: flex; align-items: center; justify-content: center; }
  .fallback :global(.medallion) { position: relative; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 12px; width: 100%; height: 100%; padding: 12px; box-sizing: border-box; }
  .gtile { position: relative; border-radius: 16px; overflow: hidden; }
  .gtile img { width: 100%; height: 100%; object-fit: cover; }
  .gtile span {
    position: absolute; left: 0; right: 0; bottom: 0; padding: 8px 14px; background: rgba(9, 28, 52, 0.85); color: #fff;
    font-weight: 800; font-size: 28px; letter-spacing: 0.06em; text-transform: uppercase; white-space: nowrap; overflow: hidden;
  }
  .nr-cup { position: absolute; left: 160px; top: 110px; width: 360px; height: 360px; z-index: 3; }
  .nr-text { position: absolute; left: 1780px; top: 200px; }
  .nr-next {
    display: inline-block; background: var(--mk-yellow); color: var(--mk-navy); font: italic 900 64px/1 var(--font-name); padding: 16px 44px;
    border-radius: 12px; transform: skewX(-12deg); box-shadow: 0 8px 0 var(--mk-pill-shadow);
  }
  .nr-race { display: inline-block; margin-left: 30px; font: italic 900 64px/1 var(--font-name); color: #fff; vertical-align: middle; }
  .nr-track { margin-top: 50px; }
  .nr-text :global(.race-swap) { vertical-align: middle; }
  .nr-track :global(.hswap) { display: grid; }
  .nr-track :global(.heading) { display: block; white-space: normal; line-height: 1.15; }
  .nr-track :global(.heading .f), .nr-track :global(.heading .m), .nr-track :global(.heading .a) { display: inline; }
  .nr-cupname { font-size: 54px; font-weight: 800; line-height: 1; color: #bfeaff; letter-spacing: 14px; text-transform: uppercase; margin-top: 36px; }
  .nr-strip { display: flex; gap: 20px; margin-top: 34px; }
  .tile { position: relative; width: 300px; padding: 6px; border-radius: 14px; overflow: hidden; background: #0b1530; box-sizing: border-box; transition: opacity var(--d, 0ms); }
  .tin { border-radius: 8px; overflow: hidden; }
  .tile img { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; }
  .tile span { display: block; padding: 8px 12px; font-size: 22px; font-weight: 800; line-height: 1.1; color: #fff; white-space: nowrap; overflow: hidden; }
  .fr { position: absolute; inset: 0; border: 6px solid rgba(255, 255, 255, 0.25); border-radius: 14px; box-sizing: border-box; pointer-events: none; }
  .fr.hl { border-color: var(--mk-yellow); opacity: 0; transition: opacity var(--d, 0ms); }
  .fr.hl.on { opacity: 1; }
  .tile.done { opacity: 0.45; }
</style>
