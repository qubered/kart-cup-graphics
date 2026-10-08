<script lang="ts">
  import { LOGO_PATH, LOGO_VIEWBOX } from './logo'
  /** The logo roundel, drawn in `currentColor` (set `color` on a parent or via the prop). */
  let { size = 96, color = '' }: { size?: number; color?: string } = $props()
</script>

<svg class="logo" viewBox={LOGO_VIEWBOX} width={size} height={size} style:color={color || undefined} aria-hidden="true">
  <path d={LOGO_PATH} fill="currentColor" transform="translate(0 -0.2)" />
</svg>

<style>
  .logo { display: block; }
</style>
