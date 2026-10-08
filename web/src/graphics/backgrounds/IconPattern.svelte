<script lang="ts">
  import { ICON_SYMBOLS, PATTERN_DEF, PATTERN_H, PATTERN_TILE, PATTERN_W } from './icons'
  let { w, h }: { w: number; h: number } = $props()
</script>

<!-- Oversized by one tile; translating exactly one tile diagonally loops seamlessly (38 s). -->
<div class="bg-pattern" style:width="{w}px" style:height="{h}px">
  <svg class="pat" width={w + PATTERN_W} height={h + PATTERN_H} aria-hidden="true">
    <defs>{@html ICON_SYMBOLS}{@html PATTERN_TILE}{@html PATTERN_DEF}</defs>
    <rect width="100%" height="100%" fill="url(#pat-b)" />
  </svg>
  <div class="vignette"></div>
</div>

<style>
  .bg-pattern { position: absolute; left: 0; top: 0; background: var(--pattern-bg); overflow: hidden; }
  .pat { position: absolute; left: -1250px; top: -280px; will-change: transform; animation: pattern-move 38s linear infinite; }
  @keyframes pattern-move { to { transform: translate(1250px, 280px); } }
  .vignette { position: absolute; inset: 0; background: var(--pattern-vignette); }
</style>
