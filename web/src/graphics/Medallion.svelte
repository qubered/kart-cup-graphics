<script lang="ts">
  import { fade } from 'svelte/transition'
  import { cubicIn } from 'svelte/easing'
  import { bounceIn } from './motion'

  let { image, size, stars = false, emblem = false, dur = 0 }: { image: string; size: number; stars?: boolean; emblem?: boolean; dur?: number } = $props()
  let failedFor = $state('')
  const showImg = $derived(!!image && failedFor !== image)
</script>

<div class="medallion" class:emblem style:--s="{size}px">
  <div class="in">
    {#key image}
      {#if showImg}
        <!-- Headshots bounce in when the character changes; emblems (cups) simply crossfade. -->
        {#if emblem}
          <div class="flip" in:fade={{ duration: dur }} out:fade={{ duration: Math.round(dur * 0.6), easing: cubicIn }}>
            <img src={image} alt="" draggable="false" onerror={() => (failedFor = image)} />
          </div>
        {:else}
          <div class="flip" in:bounceIn={{ duration: Math.round(dur * 1.5) }} out:fade={{ duration: Math.round(dur * 0.6), easing: cubicIn }}>
            <img src={image} alt="" draggable="false" onerror={() => (failedFor = image)} />
          </div>
        {/if}
      {/if}
    {/key}
    {#if stars}<div class="stars">★★★</div>{/if}
  </div>
</div>

<style>
  .medallion {
    position: relative; flex: none; box-sizing: border-box; width: var(--s); height: var(--s); border-radius: 50%;
    border: calc(var(--s) * 0.026) solid var(--medal-rim);
    background: var(--medal-gold); box-shadow: 0 6px 14px rgba(0, 0, 0, 0.4);
  }
  .in {
    position: absolute; box-sizing: border-box; inset: calc(var(--s) * 0.064); border-radius: 50%; overflow: hidden;
    border: 3px solid var(--medal-inner-rim); background: var(--medal-inner);
  }
  .flip { position: absolute; inset: 0; backface-visibility: hidden; }
  img { position: absolute; left: 50%; top: 4%; width: 75%; transform: translateX(-50%); backface-visibility: hidden; }
  .emblem img { top: 50%; width: 92%; transform: translate(-50%, -50%); }
  .stars {
    position: absolute; left: 0; right: 0; bottom: 5%; text-align: center; color: var(--medal-star);
    font-size: calc(var(--s) * 0.096); letter-spacing: 0.15em; line-height: 1;
  }
</style>
