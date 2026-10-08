<script lang="ts">
  import { ICON_SYMBOLS } from './icons'
  interface Props { watermark: string; font: string; lowfx: boolean; w: number; h: number }
  let { watermark, font, lowfx, w, h }: Props = $props()

  // Deterministic pseudo-random so sparkles don't jump on re-render.
  function rng(seed: number) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296 } }
  // 150 on wide (count scales with area), a fifth of that with lowfx. Dots 4-12px + 18% four-point stars (44px).
  const sparkles = $derived.by(() => {
    const r = rng(7)
    const n = Math.round(150 * (w * h) / (3840 * 1152) / (lowfx ? 5 : 1))
    return Array.from({ length: n }, () => {
      const big = r() < 0.18
      const x = r() * w, y = r() * h, size = 4 + r() * 8, delay = r() * 4, dur = 2.4 + r() * 2.6
      return { big, x, y, size, delay, dur }
    })
  })
  const text = $derived(watermark || 'MARIO KART')
</script>

<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>{@html ICON_SYMBOLS}</defs></svg>
<div class="bg-sky" style:width="{w}px" style:height="{h}px" style:--h="{h}px" style:font-family={font}>
  <div class="checker"></div>
  <div class="wm w1">{text}</div><div class="wm w2">{text}</div>
  <svg class="crest c1" viewBox="0 0 400 400" aria-hidden="true"><use href="#i-crest" /></svg>
  <svg class="crest c2" viewBox="0 0 400 400" aria-hidden="true"><use href="#i-crest" /></svg>
  <div class="sweep-track"><div class="sweep"></div></div>
  <div class="sparkles">
    {#each sparkles as s, i (i)}
      {#if s.big}
        <b style="left:{s.x}px;top:{s.y}px;animation-delay:{s.delay}s;animation-duration:{s.dur}s"></b>
      {:else}
        <i style="left:{s.x}px;top:{s.y}px;width:{s.size}px;height:{s.size}px;animation-delay:{s.delay}s;animation-duration:{s.dur}s"></i>
      {/if}
    {/each}
  </div>
</div>

<style>
  .bg-sky { position: absolute; left: 0; top: 0; background: var(--sky); overflow: hidden; }
  .checker { position: absolute; right: 0; top: 0; width: 39.06%; height: 100%;            /* 1500px of 3840 */
    background-image: conic-gradient(var(--sky-checker) 25%, transparent 0 50%, var(--sky-checker) 0 75%, transparent 0);
    background-size: 150px 150px; -webkit-mask-image: linear-gradient(to left, #000 0%, transparent 85%); }
  .wm { position: absolute; font-size: calc(var(--h) * .26); font-weight: 400; line-height: 1; color: var(--sky-watermark);   /* 300px @1152 */
    transform: rotate(-12deg); white-space: nowrap; letter-spacing: -4px; }
  .wm.w1 { left: -5.2%; top: 3.5%; }          /* (-200, 40) on wide */
  .wm.w2 { left: 49.5%; top: 66%; }           /* (1900, 760) on wide */
  .crest { position: absolute; color: var(--sky-crest); will-change: transform; animation: crest-drift 18s ease-in-out infinite alternate; }
  .crest.c1 { left: 3.1%; top: 45%; width: calc(var(--h) * .66); height: calc(var(--h) * .66); }               /* 760px */
  .crest.c2 { left: 76.8%; top: -15.6%; width: calc(var(--h) * .78); height: calc(var(--h) * .78); animation-duration: 24s; } /* 900px */
  @keyframes crest-drift { from { transform: rotate(-14deg) translateY(0); } to { transform: rotate(-8deg) translateY(-50px); } }
  .sweep-track { position: absolute; inset: 0; will-change: transform; animation: sweep 9s ease-in-out infinite; }
  .sweep { position: absolute; top: -200px; left: 0; width: 700px; height: calc(var(--h) + 400px); transform: skewX(-22deg);
    background: linear-gradient(90deg, transparent, rgba(255,255,255,.22), transparent); }
  @keyframes sweep { 0% { transform: translateX(-30%); } 60%, 100% { transform: translateX(130%); } }
  .sparkles i { position: absolute; display: block; border-radius: 50%; background: #fff; box-shadow: 0 0 14px 4px rgba(255,255,255,.65); opacity: 0; animation: twinkle 3.2s ease-in-out infinite; }
  .sparkles b { position: absolute; display: block; width: 44px; height: 44px; opacity: 0; animation: twinkle 4s ease-in-out infinite;
    background: radial-gradient(circle, #fff 0 3px, transparent 4px), linear-gradient(#fff, #fff) center/4px 100% no-repeat, linear-gradient(#fff, #fff) center/100% 4px no-repeat;
    filter: drop-shadow(0 0 6px #fff); }
  @keyframes twinkle { 0%, 100% { opacity: 0; transform: scale(.4); } 50% { opacity: 1; transform: scale(1); } }
</style>
