<script lang="ts">
  import type { SceneView, ViewModel } from '../../../../shared/types'
  import { STAGGER_MS, pop, slideIn } from '../motion'
  import Heading from '../Heading.svelte'
  import Medallion from '../Medallion.svelte'

  type S = Extract<SceneView, { kind: 'nextRace' }>
  let { scene, view, enter = 0 }: { scene: S; view: ViewModel; enter?: number } = $props()

  const wide = $derived(view.format === 'wide')
  const K = $derived(wide
    ? { fx: 230, fy: 190, fw: 1400, bord: 14, tx: 1800, tw: 1780, chip: 44, head: 170, cup: 52, badge: 230, tile: 300, tgap: 20 }
    : { fx: 60, fy: 170, fw: 900, bord: 10, tx: 1030, tw: 840, chip: 32, head: 96, cup: 36, badge: 170, tile: 200, tgap: 14 })
  const fh = $derived(Math.round((K.fw * 9) / 16))
  const nameSize = $derived(Math.round(Math.min(K.head, (K.tw * 0.98) / (Math.max(6, scene.trackName.length) * 0.62))))
  let imgFailed = $state('')
  const showImg = $derived(!!scene.trackImage && imgFailed !== scene.trackImage)
  const hasTrack = $derived(!!scene.trackName)
  const st = $derived(enter ? STAGGER_MS : 0)
</script>

<div class="next" class:wide class:hd={!wide}>
  <div class="frame" style:left="{K.fx}px" style:top="{K.fy}px" style:width="{K.fw}px" style:height="{fh}px" style:border-width="{K.bord}px"
    in:pop|global={{ duration: enter }}>
    {#if hasTrack}
      {#if showImg}
        <img src={scene.trackImage} alt="" onerror={() => (imgFailed = scene.trackImage)} />
      {:else}
        <div class="fallback"><Medallion image={scene.cupEmblem} size={fh * 0.5} dur={enter} /></div>
      {/if}
    {:else}
      <div class="grid">
        {#each scene.cupTracks as t (t.name)}
          <div class="gtile"><img src={t.thumb} alt="" /><span style:font-family={view.fonts.labels}>{t.name}</span></div>
        {/each}
      </div>
    {/if}
  </div>
  <div class="badge" style:left="{K.fx + K.fw - K.badge * 0.7}px" style:top="{K.fy + fh - K.badge * 0.6}px" in:pop|global={{ duration: enter, delay: 2 * st }}>
    <Medallion image={scene.cupEmblem} size={K.badge} dur={enter} />
  </div>

  <div class="info" style:left="{K.tx}px" style:top="{K.fy}px" style:width="{K.tw}px">
    <div class="chips" in:slideIn|global={{ duration: enter, dx: 120, delay: st }}>
      <span class="chip a" style:font-family={view.fonts.labels} style:font-size="{K.chip}px"><span>NEXT RACE</span></span>
      <span class="chip b" style:font-family={view.fonts.labels} style:font-size="{K.chip}px"><span>{scene.raceLabel}</span></span>
    </div>
    {#if hasTrack}
      <div class="tn" in:slideIn|global={{ duration: enter, dx: 160, delay: 2 * st }}>
        <Heading text={scene.trackName} look={view.headingLook} font={view.fonts.headings} upright={view.headingUpright} size={nameSize} />
      </div>
    {/if}
    <div class="cupname" style:font-family={view.fonts.labels} style:font-size="{K.cup}px" in:slideIn|global={{ duration: enter, dx: 160, delay: 3 * st }}>{scene.cupName}</div>
    {#if hasTrack}
      <div class="strip" style:gap="{K.tgap}px" in:slideIn|global={{ duration: enter, dx: 160, delay: 4 * st }}>
        {#each scene.cupTracks as t (t.name)}
          <div class="tile" class:current={t.current} style:width="{(K.tw - K.tgap * 3) / 4}px">
            <img src={t.thumb} alt="" />
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .next { position: absolute; inset: 0; }
  .frame {
    position: absolute; box-sizing: content-box; border-style: solid; border-color: #ffd21f; border-radius: 34px; overflow: hidden;
    background: #0e2a46; box-shadow: 0 14px 0 rgba(0, 0, 0, 0.3);
  }
  .frame img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .fallback { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 12px; width: 100%; height: 100%; padding: 12px; box-sizing: border-box; }
  .gtile { position: relative; border-radius: 16px; overflow: hidden; }
  .gtile img { width: 100%; height: 100%; object-fit: cover; }
  .gtile span {
    position: absolute; left: 0; right: 0; bottom: 0; padding: 8px 14px; background: rgba(9, 28, 52, 0.85); color: #fff;
    font-weight: 800; font-size: 28px; letter-spacing: 0.06em; text-transform: uppercase; white-space: nowrap; overflow: hidden;
  }
  .badge { position: absolute; }
  .info { position: absolute; display: flex; flex-direction: column; align-items: flex-start; gap: 22px; }
  .chips { display: flex; gap: 18px; }
  .chip { display: inline-block; padding: 0.15em 0.8em; transform: skewX(-12deg); font-weight: 800; letter-spacing: 0.08em; box-shadow: 0 5px 0 rgba(0, 0, 0, 0.3); }
  .chip span { display: block; transform: skewX(12deg); }
  .chip.a { background: #e60012; color: #fff; }
  .chip.b { background: #ffd21f; color: #14213d; }
  .cupname { font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: #fff; text-shadow: 0 4px 0 rgba(0, 0, 0, 0.35); }
  .strip { display: flex; margin-top: 18px; }
  .tile { aspect-ratio: 16 / 9; border-radius: 12px; overflow: hidden; opacity: 0.55; border: 5px solid transparent; box-sizing: border-box; background: #0e2a46; }
  .tile img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .tile.current { opacity: 1; border-color: #ffd21f; box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.3); }
</style>
