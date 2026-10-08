<script lang="ts">
  import type { Snippet } from 'svelte'
  import { fade } from 'svelte/transition'
  import { cubicIn } from 'svelte/easing'

  /**
   * Crossfades its content whenever `key` changes while on air. Old and new content share one grid cell,
   * so there is no layout shift. `dur` is the AUTO enter duration (0 on CUT = instant); the old content
   * fades out in 60% of that. Wrap the element that carries the value (e.g. `.name` with its fitText).
   */
  interface Props { key: string | number; dur?: number; block?: boolean; class?: string; children: Snippet }
  let { key, dur = 0, block = false, class: cls = '', children }: Props = $props()
</script>

<span class="swap {cls}" class:block data-swap>
  {#key key}
    <span class="swap-item" in:fade={{ duration: dur }} out:fade={{ duration: Math.round(dur * 0.6), easing: cubicIn }}>{@render children()}</span>
  {/key}
</span>

<style>
  .swap { display: inline-grid; }
  .swap.block { display: grid; }
  .swap > :global(.swap-item) { grid-area: 1 / 1; min-width: 0; }
</style>
