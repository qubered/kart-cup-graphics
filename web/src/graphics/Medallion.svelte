<script lang="ts">
  import { flipIn, flipOut } from './flip'

  let { image, size, stars = false, dur = 0 }: { image: string; size: number; stars?: boolean; dur?: number } = $props()
  let failedFor = $state('')
  const showImg = $derived(!!image && failedFor !== image)
</script>

<div class="medallion" style:width="{size}px" style:height="{size}px" style:--rim="{Math.max(2, size * 0.035)}px">
  <div class="disc"></div>
  <div class="inner">
    {#key image}
      {#if showImg}
        <img src={image} alt="" draggable="false" onerror={() => (failedFor = image)} in:flipIn={{ duration: dur }} out:flipOut={{ duration: dur }} />
      {/if}
    {/key}
    <div class="gloss"></div>
  </div>
  {#if stars}
    <div class="stars" style:font-size="{size * 0.2}px">★★★</div>
  {/if}
</div>

<style>
  .medallion { position: relative; flex: none; }
  .disc {
    position: absolute; inset: 0; border-radius: 50%;
    background: linear-gradient(145deg, #fff4ad 0%, #ffd21f 36%, #e5a400 68%, #b97c00 100%);
    box-shadow: 0 0 0 var(--rim) #3b2600, 0 6px 0 var(--rim) rgba(20, 10, 0, 0.35), inset 0 0 0 calc(var(--rim) * 0.6) rgba(255, 255, 255, 0.55);
  }
  .inner {
    position: absolute; inset: 9%; border-radius: 50%; overflow: hidden;
    background: radial-gradient(circle at 50% 35%, #2a6192 0%, #1d4870 45%, #0e2a46 100%);
    box-shadow: 0 0 0 var(--rim) #0b1f36, inset 0 0 0 1px rgba(0, 0, 0, 0.4);
  }
  img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; backface-visibility: hidden; }
  .gloss {
    position: absolute; inset: 0; border-radius: 50%; pointer-events: none;
    background: linear-gradient(155deg, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0) 42%);
  }
  .stars {
    position: absolute; left: 0; right: 0; top: 88%; text-align: center; line-height: 1; letter-spacing: 0.08em;
    color: #ffd21f; text-shadow: 0 0.06em 0 #7a4f00, 0 0 0.12em rgba(0, 0, 0, 0.6);
  }
</style>
