<script lang="ts">
  import { DEFAULT_LOGO } from './logo'
  /** The logo: the uploaded image (`src`, already normalised to a square) or, without one, the bundled Her Ascent Career Guidance mark. */
  import Swap from './Swap.svelte'
  /** `dur` = AUTO enter ms: swapping the uploaded image / default mark crossfades over it (0 = instant). */
  let { size = 96, src = null, dur = 0 }: { size?: number; src?: string | null; dur?: number } = $props()
</script>

<Swap key={src ?? ''} {dur} block>
{#if src}
  <img class="logo" {src} width={size} height={size} alt="" />
{:else}
  <img class="logo" src={DEFAULT_LOGO} width={size} height={size} alt="Her Ascent Career Guidance" />
{/if}
</Swap>

<style>
  .logo { display: block; }
  img.logo { object-fit: contain; }
</style>
