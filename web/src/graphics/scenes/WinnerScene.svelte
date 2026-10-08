<script lang="ts">
  import type { SceneView, ViewModel } from '../../../../shared/types'
  import { fitText } from '../../lib/fit-text'
  import { STAGGER_MS, pop, slideIn } from '../motion'
  import Heading from '../Heading.svelte'
  import Medallion from '../Medallion.svelte'

  type S = Extract<SceneView, { kind: 'winner' }>
  let { scene, view, enter = 0, lowfx = false }: { scene: S; view: ViewModel; enter?: number; lowfx?: boolean } = $props()

  const wide = $derived(view.format === 'wide')
  const W = $derived(view.canvas.w)
  const H = $derived(view.canvas.h)
  const K = $derived(wide
    ? { med: 600, mx: 1000, my: 330, tx: 1560, ty: 150, tw: 1900, head: 210, nm: 150, ch: 50, pts: 80 }
    : { med: 380, mx: 960, my: 300, tx: 960, ty: 0, tw: 1500, head: 140, nm: 100, ch: 36, pts: 60 })
  const rays = $derived(Math.hypot(W, H) * 2)
  const colours = ['#e60012', '#1e6cff', '#22b14c', '#ffc400', '#ff5fa2', '#ff8a00', '#8b5cf6', '#06b6d4']
  const confetti = $derived(
    Array.from({ length: lowfx ? 20 : 90 }, (_, i) => {
      const r = (n: number) => { const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x) }
      return { x: r(1) * W, w: 14 + r(2) * 18, h: 24 + r(3) * 26, c: colours[i % colours.length], d: 5 + r(4) * 5, delay: -r(5) * 10, rot: r(6) * 360 }
    }),
  )
  const st = $derived(enter ? STAGGER_MS : 0)
</script>

<div class="winner" class:wide class:hd={!wide} style:--h="{H}px">
  <div class="rays" style:width="{rays}px" style:height="{rays}px" style:left="{(wide ? K.mx : W / 2) - rays / 2}px" style:top="{(wide ? K.my + K.med / 2 : K.my + K.med / 2) - rays / 2}px"></div>
  {#each confetti as c, i (i)}
    <div class="conf" style:left="{c.x}px" style:animation-duration="{c.d}s" style:animation-delay="{c.delay}s">
      <div style:width="{c.w}px" style:height="{c.h}px" style:background={c.c} style:transform="rotate({c.rot}deg)"></div>
    </div>
  {/each}

  {#if wide}
    <div class="medpos" style:left="{K.mx - K.med / 2}px" style:top="{K.my}px" in:pop|global={{ duration: enter }}>
      <div class="bob"><Medallion image={scene.player.art || scene.player.icon} size={K.med} stars dur={enter} /></div>
    </div>
    <div class="text left" style:left="{K.tx}px" style:top="{K.ty}px" style:width="{K.tw}px">
      <div in:slideIn|global={{ duration: enter, dx: 200, delay: st }}>
        <Heading text="WINNER" look={view.headingLook} font={view.fonts.headings} upright={view.headingUpright} size={K.head} />
      </div>
      <div class="info" style:--c={scene.player.colour} in:slideIn|global={{ duration: enter, dx: 200, delay: 2 * st }}>
        <span class="name" style:font-family={view.fonts.names} style:font-size="{K.nm}px" style:max-width="{K.tw}px"
          use:fitText={{ max: K.tw, text: scene.player.name + K.nm }}>{scene.player.name}</span>
        <span class="char" style:font-family={view.fonts.labels} style:font-size="{K.ch}px">{scene.player.character}</span>
        <span class="pts" style:font-family={view.fonts.names} style:font-size="{K.pts}px"><span>{scene.total} PTS</span></span>
      </div>
    </div>
  {:else}
    <div class="col">
      <div class="headrow" in:pop|global={{ duration: enter }}>
        <Heading text="WINNER" look={view.headingLook} font={view.fonts.headings} upright={view.headingUpright} size={K.head} />
      </div>
      <div class="medcol" in:pop|global={{ duration: enter, delay: st }}>
        <div class="bob"><Medallion image={scene.player.art || scene.player.icon} size={K.med} stars dur={enter} /></div>
      </div>
      <div class="info c" style:--c={scene.player.colour} in:slideIn|global={{ duration: enter, dx: 120, delay: 2 * st }}>
        <span class="name" style:font-family={view.fonts.names} style:font-size="{K.nm}px" style:max-width="{K.tw}px"
          use:fitText={{ max: K.tw, text: scene.player.name + K.nm }}>{scene.player.name}</span>
        <span class="char" style:font-family={view.fonts.labels} style:font-size="{K.ch}px">{scene.player.character}</span>
        <span class="pts" style:font-family={view.fonts.names} style:font-size="{K.pts}px"><span>{scene.total} PTS</span></span>
      </div>
    </div>
  {/if}
</div>

<style>
  .winner { position: absolute; inset: 0; overflow: hidden; }
  .rays {
    position: absolute; opacity: 0.32; animation: spin 40s linear infinite;
    background: repeating-conic-gradient(rgba(255, 255, 255, 0.9) 0deg 7deg, transparent 7deg 24deg);
    -webkit-mask-image: radial-gradient(circle, #000 0%, transparent 55%); mask-image: radial-gradient(circle, #000 0%, transparent 55%);
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .conf { position: absolute; top: -80px; animation-name: fall; animation-timing-function: linear; animation-iteration-count: infinite; }
  @keyframes fall { from { transform: translateY(0); } to { transform: translateY(calc(var(--h) + 160px)); } }
  .medpos { position: absolute; }
  .bob { animation: bob 3.2s ease-in-out infinite; }
  @keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-22px); } }
  .text { position: absolute; display: flex; flex-direction: column; justify-content: center; height: 1152px; align-items: flex-start; gap: 10px; }
  .info { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
  .info.c { align-items: center; }
  .name { display: block; white-space: nowrap; overflow: hidden; padding-right: 0.1em; line-height: 1.15; font-weight: 900; font-style: italic; color: #fff; text-shadow: 0 6px 0 rgba(0, 0, 0, 0.4); }
  .char { font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: #aee9ff; text-shadow: 0 3px 0 rgba(0, 0, 0, 0.35); }
  .pts { display: inline-block; margin-top: 18px; padding: 0.08em 0.6em; background: #ffd21f; color: #14213d; font-weight: 900; font-style: italic; transform: skewX(-12deg); box-shadow: 0 6px 0 rgba(0, 0, 0, 0.3), 0 0 0 4px #fff; }
  .pts span { display: block; transform: skewX(12deg); }
  .col { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; padding-top: 30px; }
  .medcol { margin-top: 40px; margin-bottom: 40px; }
</style>
