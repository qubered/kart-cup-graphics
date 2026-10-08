<script lang="ts">
  import { fade } from 'svelte/transition'
  import { cubicIn } from 'svelte/easing'
  import type { PlayerView, ViewModel } from '../../../shared/types'
  import { STAGGER_MS, slideIn } from './motion'
  import { lowerThirdSlots } from './layouts'
  import LowerThird from './LowerThird.svelte'

  let { players, view, enter, exit }: { players: PlayerView[]; view: ViewModel; enter: number; exit: number } = $props()
  const slots = $derived(lowerThirdSlots(view.format, players.map((p) => p.slot), view.safeArea, view.graphicsScale))
  const st = $derived(enter ? STAGGER_MS : 0)
</script>

<div class="fill">
  {#each players as p, i (p.slot)}
    {@const s = slots[i]}
    {#if s}
      <div class="pos" style:left="{s.x}px" style:top="{s.y}px" style:transform="scale({s.scale})">
        <div in:slideIn|global={{ duration: enter, delay: i * st, dx: -70 }} out:fade|global={{ duration: exit, easing: cubicIn }}>
          <LowerThird player={p} fonts={view.fonts} dur={enter} />
        </div>
      </div>
    {/if}
  {/each}
</div>

<style>
  .fill { position: absolute; inset: 0; pointer-events: none; }
  .pos { position: absolute; transform-origin: 0 0; width: 430px; height: 160px; }
</style>
