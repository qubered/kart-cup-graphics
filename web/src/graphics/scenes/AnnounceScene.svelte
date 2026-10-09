<script lang="ts">
  // Player announcement: the winner hero (medallion, heading, name, character) on a player-coloured field framed by checkered flag bands.
  // Self-contained (draws its own background), so it needs no background layer. Reference: docs/mockups/scenes/player-announce.html.
  import type { SceneView, ViewModel } from '../../../../shared/types'
  import { mixHex } from '../../../../shared/palette'
  import { fitText } from '../../lib/fit-text'
  import { STAGGER_MS, pop, slideIn } from '../motion'
  import Heading from '../Heading.svelte'
  import Medallion from '../Medallion.svelte'
  import Swap from '../Swap.svelte'
  import { announceLayout, flagSquare } from './announce/layout'

  type S = Extract<SceneView, { kind: 'announce' }>
  let { scene, view, enter = 0, lowfx = false }: { scene: S; view: ViewModel; enter?: number; lowfx?: boolean } = $props()

  const p = $derived(scene.player)
  const W = $derived(view.canvas.w)
  const H = $derived(view.canvas.h)
  const lay = $derived(announceLayout(view.format))
  const st = $derived(enter ? STAGGER_MS : 0)
  // Field colours derived from the player's colour (--pc light centre, --pc-d dark edge).
  const vars = $derived(`--pc:${p.colour};--pc-d:${mixHex(p.colour, '#000000', 0.55)};--pc-l:${mixHex(p.colour, '#ffffff', 0.38)};--sq:${flagSquare(H)}px;--trim:${H * 0.012}px;--h:${H}px;--w:${W}px`)

  // Deterministic sparkles (don't jump on re-render); a fifth as many with lowfx.
  function rng(seed: number) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296 } }
  const sparkles = $derived.by(() => {
    const r = rng(11)
    const n = Math.round(90 * (W * H) / (3840 * 1152) / (lowfx ? 5 : 1))
    return Array.from({ length: n }, () => ({ x: r() * W, y: r() * H, size: 4 + r() * 8, delay: r() * 4, dur: 2.4 + r() * 2.6, big: r() < 0.18 }))
  })
</script>

<div class="announce" data-announce={p.slot} style={vars}>
  <div class="field"></div>
  <div class="rays"></div>
  <div class="stripes"><i></i><i></i><i></i><i></i></div>
  <div class="slot s1" style:font-family={view.fonts.eventTitle}>P{p.slot + 1}</div><div class="slot s2" style:font-family={view.fonts.eventTitle}>P{p.slot + 1}</div>
  <div class="fade top"></div><div class="fade bottom"></div>
  <div class="flag top"><div class="track"></div></div><div class="trim top"></div>
  <div class="flag bottom"><div class="track"></div></div><div class="trim bottom"></div>
  <div class="sparkles">
    {#each sparkles as s, i (i)}
      {#if s.big}<b style="left:{s.x}px;top:{s.y}px;animation-delay:{s.delay}s;animation-duration:{s.dur}s"></b>
      {:else}<i style="left:{s.x}px;top:{s.y}px;width:{s.size}px;height:{s.size}px;animation-delay:{s.delay}s;animation-duration:{s.dur}s"></i>{/if}
    {/each}
  </div>
  <div class="vig"></div>

  {#each lay.heroes as h, i (i)}
    {@const K = h.design}
    <div class="hero" class:h={h.horizontal} data-announce-hero style:left="{h.left}px" style:top="{h.top}px" style:width="{K.dw}px" style:height="{K.dh}px"
      style:transform="scale({h.scale})" style:--gap="{K.gap}px">
      <div class="hrays" style:left="{h.horizontal ? K.med / 2 : K.dw / 2}px" style:top="{K.med / 2}px"></div>
      <div class="medal" style:width="{K.med}px" style:height="{K.med}px" in:pop|global={{ duration: enter }}>
        <div class="bob"><Medallion image={p.icon} size={K.med} stars dur={enter} /></div>
      </div>
      <div class="txt" style:width="{h.horizontal ? K.nmw : K.dw}px">
        <div class="wh" in:slideIn|global={{ duration: enter, dx: 200, delay: st }}>
          <Swap key="{view.headingLook}|{view.fonts.headings}|{view.headingUpright}" dur={enter}>
            <Heading text="PLAYER {p.slot + 1}" look={view.headingLook} font={view.fonts.headings} upright={view.headingUpright} size={K.head} />
          </Swap>
        </div>
        <div in:slideIn|global={{ duration: enter, dx: 200, delay: 2 * st }}>
          <Swap key={p.name} dur={enter} block>
            <div class="name" style:display="block" style:font-size="{K.nm}px" style:font-family={view.fonts.names} style:width="{K.nmw}px"
              use:fitText={{ max: K.nmw, text: p.name }}><span>{p.name}</span></div>
          </Swap>
        </div>
        {#if p.subtitle}
          <div in:slideIn|global={{ duration: enter, dx: 200, delay: 3 * st }}>
            <Swap key={p.subtitle} dur={enter} block>
              <div class="job" data-announce-subtitle style:display="block" style:font-size="{K.sub}px" style:font-family={view.fonts.labels} style:width="{K.nmw}px"
                use:fitText={{ max: K.nmw, text: p.subtitle }}><span>{p.subtitle}</span></div>
            </Swap>
          </div>
        {/if}
        <div class="sub" in:slideIn|global={{ duration: enter, dx: 200, delay: 4 * st }}>
          <Swap key={p.character} dur={enter}>
            <span class="char" style:font-size="{K.ch}px" style:letter-spacing="{K.chs}px" style:font-family={view.fonts.labels}>{p.character}</span>
          </Swap>
        </div>
      </div>
    </div>
  {/each}
</div>

<style>
  .announce { position: absolute; inset: 0; overflow: hidden; }
  .field { position: absolute; inset: 0; background: radial-gradient(ellipse 62% 85% at 50% 52%, var(--pc-l) 0%, var(--pc) 42%, var(--pc-d) 100%); }
  .rays {
    position: absolute; left: 50%; top: 52%; width: calc(var(--w) * 1.6); height: calc(var(--w) * 1.6); margin: calc(var(--w) * -0.8) 0 0 calc(var(--w) * -0.8);
    background: repeating-conic-gradient(rgba(255, 255, 255, 0.11) 0 5deg, transparent 5deg 15deg);
    -webkit-mask-image: radial-gradient(circle, #000 0%, transparent 38%); mask-image: radial-gradient(circle, #000 0%, transparent 38%);
    animation: spin 120s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .stripes i { position: absolute; top: -10%; height: 120%; transform: skewX(-22deg); background: linear-gradient(90deg, var(--pc-d), transparent); opacity: 0.5; }
  .stripes i:nth-child(1) { left: 2%; width: 5%; }
  .stripes i:nth-child(2) { left: 9%; width: 2%; }
  .stripes i:nth-child(3) { right: 9%; width: 5%; background: linear-gradient(270deg, var(--pc-d), transparent); }
  .stripes i:nth-child(4) { right: 2%; width: 2%; background: linear-gradient(270deg, var(--pc-d), transparent); }
  .slot { position: absolute; font-size: calc(var(--h) * 0.5); font-weight: 400; line-height: 1; color: rgba(255, 255, 255, 0.07); transform: rotate(-8deg); white-space: nowrap; letter-spacing: -0.02em; }
  .slot.s1 { left: 1%; bottom: 1%; }
  .slot.s2 { right: 1%; top: 1%; }

  /* flag bands: scroll in opposite directions (transform only) */
  .flag { position: absolute; left: 0; right: 0; height: calc(var(--sq) * 2); overflow: hidden; z-index: 3; }
  .flag.top { top: 0; } .flag.bottom { bottom: 0; }
  .track {
    position: absolute; top: 0; left: calc(var(--sq) * -2); width: calc(100% + var(--sq) * 4); height: 100%; will-change: transform;
    background: conic-gradient(var(--mk-ink) 25%, #fff 0 50%, var(--mk-ink) 0 75%, #fff 0); background-size: calc(var(--sq) * 2) calc(var(--sq) * 2);
    animation: flag-l 5s linear infinite;
  }
  .flag.bottom .track { animation-name: flag-r; }
  @keyframes flag-l { to { transform: translateX(calc(var(--sq) * 2)); } }
  @keyframes flag-r { from { transform: translateX(calc(var(--sq) * 2)); } to { transform: translateX(0); } }
  .trim { position: absolute; left: 0; right: 0; height: calc(var(--trim) * 2); z-index: 3; background: linear-gradient(#fff 0 50%, var(--mk-ink) 50%); box-shadow: 0 0 calc(var(--h) * 0.03) rgba(0, 0, 0, 0.45); }
  .trim.top { top: calc(var(--sq) * 2); }
  .trim.bottom { bottom: calc(var(--sq) * 2); transform: scaleY(-1); }
  /* checker that dissolves out of each band into the colour field */
  .fade { position: absolute; left: 0; right: 0; height: calc(var(--sq) * 4); z-index: 2; opacity: 0.16;
    background: conic-gradient(#fff 25%, transparent 0 50%, #fff 0 75%, transparent 0); background-size: calc(var(--sq) * 2) calc(var(--sq) * 2); }
  .fade.top { top: calc(var(--sq) * 2); -webkit-mask-image: linear-gradient(#000, transparent); mask-image: linear-gradient(#000, transparent); }
  .fade.bottom { bottom: calc(var(--sq) * 2); -webkit-mask-image: linear-gradient(transparent, #000); mask-image: linear-gradient(transparent, #000); }
  .vig { position: absolute; inset: 0; background: radial-gradient(ellipse at center, transparent 58%, rgba(0, 0, 0, 0.38)); z-index: 2; pointer-events: none; }

  .sparkles { position: absolute; inset: 0; z-index: 2; pointer-events: none; }
  .sparkles i { position: absolute; display: block; border-radius: 50%; background: #fff; box-shadow: 0 0 14px 4px rgba(255, 255, 255, 0.65); opacity: 0; animation: twinkle 3.2s ease-in-out infinite; }
  .sparkles b { position: absolute; display: block; width: 44px; height: 44px; opacity: 0; animation: twinkle 4s ease-in-out infinite;
    background: radial-gradient(circle, #fff 0 3px, transparent 4px), linear-gradient(#fff, #fff) center/4px 100% no-repeat, linear-gradient(#fff, #fff) center/100% 4px no-repeat; filter: drop-shadow(0 0 6px #fff); }
  @keyframes twinkle { 0%, 100% { opacity: 0; transform: scale(0.4); } 50% { opacity: 1; transform: scale(1); } }

  /* hero: same structure as win/WinHero.svelte */
  .hero { position: absolute; z-index: 5; transform-origin: 0 0; display: flex; align-items: center; flex-direction: column; justify-content: flex-start; gap: var(--gap); }
  .hero.h { flex-direction: row; }
  .hrays {
    position: absolute; width: 2600px; height: 2600px; margin: -1300px 0 0 -1300px; pointer-events: none;
    background: repeating-conic-gradient(rgba(255, 255, 255, 0.14) 0 6deg, transparent 6deg 18deg);
    -webkit-mask-image: radial-gradient(circle, #000 12%, transparent 55%); mask-image: radial-gradient(circle, #000 12%, transparent 55%);
    animation: spin 40s linear infinite;
  }
  .medal { position: relative; z-index: 2; flex: none; }
  .medal :global(.medallion) { border-width: 6px; }
  .bob { width: 100%; height: 100%; position: relative; animation: bob 2.4s ease-in-out infinite alternate; }
  @keyframes bob { to { transform: translateY(-12px); } }
  .txt { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; }
  .h .txt { align-items: flex-start; }
  .wh { display: flex; }
  .name { font-weight: 900; font-style: italic; line-height: 1.05; color: #fff; margin-top: 10px; white-space: nowrap; overflow: hidden; text-shadow: 0 8px 0 var(--mk-navy); text-align: center; }
  .h .name { text-align: left; }
  .name > span, .job > span { display: inline-block; white-space: nowrap; }
  .job { font-weight: 800; font-style: italic; line-height: 1.2; color: #fff; margin-top: 6px; white-space: nowrap; overflow: hidden; text-shadow: 0 4px 0 var(--pc-d); letter-spacing: 0.02em; text-align: center; }
  .h .job { text-align: left; }
  .sub { margin-top: 22px; display: flex; gap: 28px; align-items: center; justify-content: center; }
  .h .sub { justify-content: flex-start; }
  .char { font-weight: 800; line-height: 1; color: #fff; text-transform: uppercase; }
</style>
