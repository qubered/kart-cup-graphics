<script lang="ts">
  interface Props { watermark: string; font: string; lowfx: boolean; w: number; h: number }
  let { watermark, font, lowfx, w, h }: Props = $props()

  // Deterministic pseudo-random so sparkles don't jump on re-render.
  function rng(seed: number) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296 } }
  const sparkles = $derived.by(() => {
    const r = rng(7)
    return Array.from({ length: lowfx ? 30 : 150 }, () => ({
      x: r() * 100, y: r() * 100, size: 4 + r() * 12, delay: r() * 5, dur: 2.2 + r() * 3,
    }))
  })

  const text = $derived((watermark || 'MARIO KART').toUpperCase())
  // Fit the watermark line within the canvas width, capped by height.
  const fs = $derived(Math.round(Math.min(h * 0.42, (w * 1.05) / (Math.max(text.length, 1) * 0.85))))
  const crests = [
    { x: 8, y: 14, s: 1.0, dur: 46, delay: 0 },
    { x: 38, y: 62, s: 1.5, dur: 62, delay: -20 },
    { x: 66, y: 8, s: 0.8, dur: 52, delay: -10 },
    { x: 86, y: 54, s: 1.2, dur: 70, delay: -35 },
  ]
</script>

<div class="sky" style="width:{w}px;height:{h}px;--w:{w}px">
  <div class="checker"></div>

  {#each crests as c (c.x)}
    <svg class="crest" style="left:{c.x}%;top:{c.y}%;width:{h * 0.34 * c.s}px;height:{h * 0.34 * c.s}px;animation-duration:{c.dur}s;animation-delay:{c.delay}s" viewBox="-50 -50 100 100" aria-hidden="true">
      <path d="M-38 -44H38V6C38 28 18 42 0 50C-18 42 -38 28 -38 6Z" fill="none" stroke="#fff" stroke-width="3" />
      <path d="M-24 -30H24V4C24 18 12 28 0 34C-12 28 -24 18 -24 4Z" fill="none" stroke="#fff" stroke-width="2" />
    </svg>
  {/each}

  <div class="watermark" style="font-family:{font};font-size:{fs}px;line-height:{fs * 0.86}px;left:{w * 0.03}px;top:{h * 0.08}px">
    <div>{text}</div>
    <div class="second">{text}</div>
  </div>

  <div class="sweep"></div>

  {#each sparkles as s, i (i)}
    <i class="sparkle" style="left:{s.x}%;top:{s.y}%;width:{s.size}px;height:{s.size}px;animation-delay:{s.delay}s;animation-duration:{s.dur}s"></i>
  {/each}
</div>

<style>
  .sky {
    position: absolute; left: 0; top: 0; overflow: hidden;
    background: linear-gradient(135deg, #25c8f6 0%, #0e9ce6 38%, #0b72d8 70%, #2b4ec6 100%);
  }
  .checker {
    position: absolute; right: 0; top: 0; width: 55%; height: 100%; opacity: .09;
    background: repeating-conic-gradient(#fff 0% 25%, transparent 0% 50%) 0 0 / 120px 120px;
    -webkit-mask-image: linear-gradient(to right, transparent, #000 70%);
    mask-image: linear-gradient(to right, transparent, #000 70%);
  }
  .crest { position: absolute; opacity: .16; will-change: transform; animation: crest linear infinite; }
  @keyframes crest {
    0% { transform: translate(0, 0) rotate(-8deg); }
    50% { transform: translate(60px, -40px) rotate(8deg); }
    100% { transform: translate(0, 0) rotate(-8deg); }
  }
  .watermark {
    position: absolute; color: #fff; opacity: .13; white-space: nowrap; font-weight: 900; letter-spacing: .02em;
    user-select: none;
  }
  .watermark .second { margin-left: 8%; opacity: .75; }
  .sweep {
    position: absolute; left: 0; top: -20%; width: 22%; height: 140%; opacity: 0; will-change: transform, opacity;
    background: linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, .28), rgba(255, 255, 255, 0));
    transform: translateX(-100%) skewX(-18deg);
    animation: sweep 9s ease-in-out infinite;
  }
  @keyframes sweep {
    0% { transform: translateX(-100%) skewX(-18deg); opacity: 0; }
    5% { opacity: 1; }
    30% { transform: translateX(var(--w)) skewX(-18deg); opacity: 1; }
    32%, 100% { transform: translateX(var(--w)) skewX(-18deg); opacity: 0; }
  }
  .sparkle {
    position: absolute; opacity: 0; background: #fff; will-change: transform, opacity;
    clip-path: polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%);
    animation: twinkle ease-in-out infinite;
  }
  @keyframes twinkle {
    0%, 100% { opacity: 0; transform: scale(.3) rotate(0deg); }
    50% { opacity: .9; transform: scale(1) rotate(45deg); }
  }
</style>
