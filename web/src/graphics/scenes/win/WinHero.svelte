<script lang="ts">
  // Winner hero: medallion, WINNER heading, name, character + points pill, meta. Designed at heroDesign() size.
  import type { CupWinView, RaceWinView, ViewModel } from '../../../../../shared/types'
  import { fitText } from '../../../lib/fit-text'
  import { STAGGER_MS, pop, slideIn } from '../../motion'
  import Heading from '../../Heading.svelte'
  import Medallion from '../../Medallion.svelte'
  import Swap from '../../Swap.svelte'
  import WinMeta from './WinMeta.svelte'
  import { heroDesign } from './layout'

  let { scene, view, enter = 0, horizontal }: {
    scene: RaceWinView | CupWinView; view: ViewModel; enter?: number; horizontal: boolean
  } = $props()

  const d = $derived(heroDesign(horizontal))
  const K = $derived(horizontal
    ? { med: 480, head: 210, nm: 140, nmw: 1060, ch: 46, chs: 10, pts: 58, ppad: '14px 36px', meta: 100 }
    : { med: 340, head: 170, nm: 110, nmw: 860, ch: 38, chs: 8, pts: 50, ppad: '12px 30px', meta: 90 })
  const st = $derived(enter ? STAGGER_MS : 0)
  const pill = $derived.by(() => {
    if (scene.kind === 'cupWin') return `${scene.total} PTS`
    return scene.config.blocks.racePoints && !scene.empty ? `+${scene.racePoints} PTS` : ''
  })
  const rayX = $derived(horizontal ? K.med / 2 : d.dw / 2)
  const rayY = $derived(K.med / 2)
  const hasMeta = $derived(scene.config.blocks.cupEmblem || scene.config.blocks.trackName)
</script>

<div class="hero" class:h={horizontal} class:empty={scene.empty} style:width="{d.dw}px" style:height="{d.dh}px" data-win-hero>
  <div class="rays" style:left="{rayX}px" style:top="{rayY}px"></div>
  <div class="medal" style:width="{K.med}px" style:height="{K.med}px" in:pop|global={{ duration: enter }}>
    <div class="bob"><Medallion image={scene.winner.icon} size={K.med} stars dur={enter} /></div>
  </div>
  <div class="txt" style:width={horizontal ? `${K.nmw}px` : `${d.dw}px`}>
    <div class="wh" in:slideIn|global={{ duration: enter, dx: 200, delay: st }}>
      <Swap key="{view.headingLook}|{view.fonts.headings}|{view.headingUpright}" dur={enter}>
        <Heading text="WINNER" look={view.headingLook} font={view.fonts.headings} upright={view.headingUpright} size={K.head} />
      </Swap>
    </div>
    <div in:slideIn|global={{ duration: enter, dx: 200, delay: 2 * st }}>
      <Swap key={scene.winner.name} dur={enter} block>
        <div class="name" style:display="block" style:font-size="{K.nm}px" style:font-family={view.fonts.names} style:width="{K.nmw}px"
          use:fitText={{ max: K.nmw, text: scene.winner.name }}><span>{scene.winner.name}</span></div>
      </Swap>
    </div>
    <div class="sub" in:slideIn|global={{ duration: enter, dx: 200, delay: 3 * st }}>
      <Swap key={scene.winner.character} dur={enter}>
        <span class="char" style:font-size="{K.ch}px" style:letter-spacing="{K.chs}px" style:font-family={view.fonts.labels}>{scene.winner.character}</span>
      </Swap>
      {#if pill}
        <Swap key={pill} dur={enter}>
          <span class="pts" style:font-size="{K.pts}px" style:padding={K.ppad} style:font-family={view.fonts.names}>{pill}</span>
        </Swap>
      {/if}
    </div>
    {#if hasMeta}
      <div class="mt" in:slideIn|global={{ duration: enter, dx: 200, delay: 4 * st }}>
        <WinMeta {scene} {view} {enter} size={K.meta} align={horizontal ? 'start' : 'center'} />
      </div>
    {/if}
  </div>
</div>

<style>
  .hero { position: relative; display: flex; align-items: center; justify-content: center; }
  .hero:not(.h) { flex-direction: column; justify-content: flex-start; gap: 6px; }
  .hero.h { gap: 60px; justify-content: flex-start; }
  .hero.empty .name, .hero.empty .medal { opacity: 0.55; }
  .rays {
    position: absolute; width: 2600px; height: 2600px; margin: -1300px 0 0 -1300px; pointer-events: none;
    background: repeating-conic-gradient(rgba(255, 255, 255, 0.14) 0 6deg, transparent 6deg 18deg);
    -webkit-mask-image: radial-gradient(circle, #000 12%, transparent 55%); mask-image: radial-gradient(circle, #000 12%, transparent 55%);
    animation: spin 40s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .medal { position: relative; z-index: 2; flex: none; }
  .medal :global(.medallion) { border-width: 6px; }
  .bob { width: 100%; height: 100%; position: relative; animation: bob 2.4s ease-in-out infinite alternate; }
  @keyframes bob { to { transform: translateY(-12px); } }
  .txt { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; }
  .h .txt { align-items: flex-start; }
  .wh { display: flex; }
  .name { font-weight: 900; font-style: italic; line-height: 1.05; color: #fff; margin-top: 10px; white-space: nowrap; overflow: hidden; text-shadow: 0 8px 0 var(--mk-navy); text-align: center; }
  .h .name { text-align: left; }
  .name > span { display: inline-block; white-space: nowrap; }
  .sub { margin-top: 22px; display: flex; gap: 28px; align-items: center; justify-content: center; }
  .h .sub { justify-content: flex-start; }
  .char { font-weight: 800; line-height: 1; color: #fff; text-transform: uppercase; }
  .pts {
    display: inline-block; background: var(--mk-yellow); color: var(--mk-navy); font-weight: 900; font-style: italic; line-height: 1;
    border-radius: 12px; transform: skewX(-12deg); box-shadow: 0 8px 0 var(--mk-pill-shadow);
  }
  .mt { margin-top: 34px; }
</style>
