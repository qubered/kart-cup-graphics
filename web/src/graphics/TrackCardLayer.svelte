<script lang="ts">
  import { fade } from 'svelte/transition'
  import { cubicIn } from 'svelte/easing'
  import type { TrackCardView, ViewModel } from '../../../shared/types'
  import { slideIn } from './motion'
  import { trackCardSlots } from './layouts'
  import TrackCard from './TrackCard.svelte'

  let { card, view, enter, exit }: { card: TrackCardView; view: ViewModel; enter: number; exit: number } = $props()
  const slots = $derived(trackCardSlots(view.format, view.safeArea))
</script>

<div class="fill">
  {#each slots as s, i (i)}
    <div class="pos" style:left="{s.x}px" style:top="{s.y}px" style:transform="scale({view.graphicsScale})">
      <div in:slideIn|global={{ duration: enter, dx: -70 }} out:fade|global={{ duration: exit, easing: cubicIn }}>
        <TrackCard {card} fonts={view.fonts} upright={view.headingUpright} dur={enter} />
      </div>
    </div>
  {/each}
</div>

<style>
  .fill { position: absolute; inset: 0; pointer-events: none; }
  .pos { position: absolute; transform-origin: 0 0; width: 540px; height: 120px; }
</style>
