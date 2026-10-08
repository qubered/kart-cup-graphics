<script lang="ts">
  import { LOGO_PATH, LOGO_VIEWBOX } from './logo'
  /** The logo: the uploaded image (`src`, already normalised to a square) or, without one, the built-in roundel drawn in `currentColor`. */
  let { size = 96, color = '', src = null }: { size?: number; color?: string; src?: string | null } = $props()
</script>

{#if src}
  <img class="logo" {src} width={size} height={size} alt="" />
{:else}
  <svg class="logo" viewBox={LOGO_VIEWBOX} width={size} height={size} style:color={color || undefined} aria-hidden="true">
    <path d={LOGO_PATH} fill="currentColor" transform="translate(0 -0.2)" />
  </svg>
{/if}

<style>
  .logo { display: block; }
  img.logo { object-fit: contain; }
</style>
