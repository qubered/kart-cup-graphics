<script lang="ts">
  import { TILE_BG, TILE_H, TILE_W, tileDataUri } from './icons'
  let { w, h }: { w: number; h: number } = $props()
  const tile = tileDataUri()
</script>

<div class="bg" style="width:{w}px;height:{h}px;background:{TILE_BG}">
  <!-- Oversized by one tile in each direction; translating exactly one tile diagonally loops seamlessly (38 s). -->
  <div class="drift" style="width:{w + TILE_W}px;height:{h + TILE_H}px;background-image:{tile};background-size:{TILE_W}px {TILE_H}px;--dx:-{TILE_W}px;--dy:-{TILE_H}px"></div>
  <div class="vignette"></div>
</div>

<style>
  .bg { position: absolute; left: 0; top: 0; overflow: hidden; }
  .drift { position: absolute; left: 0; top: 0; will-change: transform; animation: drift 38s linear infinite; }
  .vignette { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 50%, rgba(0, 0, 0, 0) 55%, rgba(0, 20, 60, .35) 100%); }
  @keyframes drift {
    from { transform: translate(0, 0); }
    to { transform: translate(var(--dx), var(--dy)); }
  }
</style>
