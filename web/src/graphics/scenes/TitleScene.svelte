<script lang="ts">
  import type { TitleView, ViewModel } from '../../../../shared/types'
  import { STAGGER_MS, pop } from '../motion'
  import TitleLockup from '../TitleLockup.svelte'

  let { title, view, enter = 0 }: { title: TitleView; view: ViewModel; enter?: number } = $props()

  const halves = $derived(view.format === 'twin')
  const st = $derived(enter ? STAGGER_MS : 0)
</script>

<div class="title-scene">
  {#if halves}
    {#each [0, 1] as h (h)}
      <div class="half" style:left="{h * 960}px" in:pop|global={{ duration: enter, delay: h * st }}>
        <TitleLockup {title} style={view.eventTitleStyle} format={view.format} font={view.fonts.eventTitle} labelFont={view.fonts.labels} dur={enter} />
      </div>
    {/each}
  {:else}
    <div class="center" in:pop|global={{ duration: enter }}>
      <TitleLockup {title} style={view.eventTitleStyle} format={view.format} font={view.fonts.eventTitle} labelFont={view.fonts.labels} dur={enter} />
    </div>
  {/if}
</div>

<style>
  .title-scene { position: absolute; inset: 0; z-index: 0; /* own stacking context so the lockup never paints over later layers (HOLD, FTB) */ }
  .center { position: absolute; inset: 0; }
  .half { position: absolute; top: 0; width: 960px; height: 100%; overflow: hidden; }
</style>
