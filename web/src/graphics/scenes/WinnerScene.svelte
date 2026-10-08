<script lang="ts">
  import type { SceneView, ViewModel } from '../../../../shared/types'
  import { fitText } from '../../lib/fit-text'
  import { STAGGER_MS, pop, slideIn } from '../motion'
  import Heading from '../Heading.svelte'
  import Medallion from '../Medallion.svelte'

  type S = Extract<SceneView, { kind: 'winner' }>
  let { scene, view, enter = 0, lowfx = false }: { scene: S; view: ViewModel; enter?: number; lowfx?: boolean } = $props()

  /* Wide: medallion left, text right (mockup). HD: same parts stacked and centred, kept clear of the lower-third band (y >= 850). */
  const wide = $derived(view.format === 'wide')
  const W = $derived(view.canvas.w)
  const K = $derived(wide
    ? { med: 600, mx: 940, my: 276, head: 250, nm: 170, nmw: 1900, ch: 54, chs: 12, pts: 60, ppad: '16px 40px' }
    : { med: 330, mx: 795, my: 225, head: 150, nm: 100, nmw: 1700, ch: 34, chs: 8, pts: 40, ppad: '12px 28px' })
  const rayC = $derived({ x: K.mx + K.med / 2, y: K.my + K.med / 2 })
  const cols = ['#e60012', '#ffd21f', '#1e6cff', '#22b14c', '#ff3df2', '#ffffff']
  const confetti = $derived(
    Array.from({ length: lowfx ? 20 : 90 }, (_, i) => {
      const r = (n: number) => { const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x) }
      return { x: r(1) * W, c: cols[i % cols.length], d: 4 + r(2) * 4, delay: -r(3) * 8 }
    }),
  )
  const st = $derived(enter ? STAGGER_MS : 0)
</script>

<div class="winner" class:wide class:hd={!wide}>
  <div class="rays" style:left="{rayC.x}px" style:top="{rayC.y}px" style:--rs="{wide ? 3000 : 2400}px"></div>

  <div class="winner-medal" style:left="{K.mx}px" style:top="{K.my}px" style:width="{K.med}px" style:height="{K.med}px" in:pop|global={{ duration: enter }}>
    <div class="bob"><Medallion image={scene.player.art || scene.player.icon} size={K.med} stars dur={enter} /></div>
  </div>

  <div class="winner-text" style:left={wide ? '1800px' : '0'} style:right={wide ? undefined : '0'} style:top={wide ? '200px' : '36px'}
    style:width={wide ? '1900px' : undefined} style:text-align={wide ? 'left' : 'center'}>
    <div class="wh" style:--hs="{K.head}px" in:slideIn|global={{ duration: enter, dx: 200, delay: st }}>
      <Heading text="WINNER" look={view.headingLook} font={view.fonts.headings} upright={view.headingUpright} size={K.head} />
    </div>
    <div class="wname" style:top={wide ? undefined : `${K.my + K.med + 20 - 36}px`}>
      <div class="name" style:display="block" style:font-size="{K.nm}px" style:font-family={view.fonts.names} style:width="{K.nmw}px"
        style:margin-left={wide ? undefined : 'auto'} style:margin-right={wide ? undefined : 'auto'}
        in:slideIn|global={{ duration: enter, dx: 200, delay: 2 * st }}
        use:fitText={{ max: K.nmw, text: scene.player.name }}><span>{scene.player.name}</span></div>
      <div class="sub" style:justify-content={wide ? 'flex-start' : 'center'} in:slideIn|global={{ duration: enter, dx: 200, delay: 3 * st }}>
        <span class="char" style:font-size="{K.ch}px" style:letter-spacing="{K.chs}px" style:font-family={view.fonts.labels}>{scene.player.character}</span>
        <span class="pts" style:font-size="{K.pts}px" style:padding={K.ppad} style:font-family={view.fonts.names}>{scene.total} PTS</span>
      </div>
    </div>
  </div>

  <div class="confetti">
    {#each confetti as c, i (i)}
      <i style:left="{c.x}px" style:background={c.c} style:animation-duration="{c.d}s" style:animation-delay="{c.delay}s"></i>
    {/each}
  </div>
</div>

<style>
  .winner { position: absolute; inset: 0; overflow: hidden; }
  .rays {
    position: absolute; width: var(--rs); height: var(--rs); margin: calc(var(--rs) / -2) 0 0 calc(var(--rs) / -2);
    background: repeating-conic-gradient(rgba(255, 255, 255, 0.16) 0 6deg, transparent 6deg 18deg);
    -webkit-mask-image: radial-gradient(circle, #000 15%, transparent 60%); mask-image: radial-gradient(circle, #000 15%, transparent 60%);
    animation: spin 40s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .winner-medal { position: absolute; z-index: 3; }
  .winner-medal :global(.medallion) { border-width: 6px; }
  .bob { width: 100%; height: 100%; position: relative; animation: bob 2.4s ease-in-out infinite alternate; }
  @keyframes bob { to { transform: translateY(-18px); } }
  .winner-text { position: absolute; z-index: 3; }
  .wh { display: flex; }
  .hd .wh { justify-content: center; }
  .hd .wname { position: absolute; left: 0; right: 0; }
  .name { font-weight: 900; font-style: italic; line-height: 1; color: #fff; margin-top: 30px; white-space: nowrap; overflow: hidden; text-shadow: 0 10px 0 var(--mk-navy); }
  .hd .name { margin-top: 0; text-shadow: 0 6px 0 var(--mk-navy); }
  .name > span { display: inline-block; white-space: nowrap; }
  .sub { margin-top: 34px; display: flex; gap: 30px; align-items: center; }
  .hd .sub { margin-top: 22px; gap: 24px; }
  .char { font-weight: 800; line-height: 1; color: #fff; text-transform: uppercase; }
  .pts {
    display: inline-block; background: var(--mk-yellow); color: var(--mk-navy); font-weight: 900; font-style: italic; line-height: 1;
    border-radius: 12px; transform: skewX(-12deg); box-shadow: 0 8px 0 var(--mk-pill-shadow);
  }
  .confetti { position: absolute; inset: 0; pointer-events: none; z-index: 4; }
  .confetti i { position: absolute; top: -60px; width: 26px; height: 44px; border-radius: 4px; animation: fall linear infinite; }
  @keyframes fall { to { transform: translateY(1300px) rotate(720deg); } }
</style>
