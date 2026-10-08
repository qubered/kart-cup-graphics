<script lang="ts">
  import type { TitleView, ViewModel } from '../../../../shared/types'
  import { STAGGER_MS, pop } from '../motion'
  import TitleLockup from '../TitleLockup.svelte'

  let { title, view, enter = 0 }: { title: TitleView; view: ViewModel; enter?: number } = $props()

  const chars = $derived(Math.max(4, title.title.length + title.accent.length * 1.12 + 1.5))
  const fitSize = (avail: number, max: number) => Math.round(Math.min(max, avail / (chars * 0.86)))
  const halves = $derived(view.format === 'twin')
  const size = $derived(view.format === 'wide' ? fitSize(3300, 330) : view.format === 'twin' ? fitSize(820, 120) : fitSize(1640, 170))
  const st = $derived(enter ? STAGGER_MS : 0)
</script>

<div class="title-scene">
  {#if halves}
    {#each [0, 1] as h (h)}
      <div class="half" style:left="{h * 960}px" in:pop|global={{ duration: enter, delay: h * st }}>
        <TitleLockup {title} style={view.eventTitleStyle} font={view.fonts.eventTitle} {size} />
      </div>
    {/each}
  {:else}
    <div class="center" in:pop|global={{ duration: enter }}>
      <TitleLockup {title} style={view.eventTitleStyle} font={view.fonts.eventTitle} {size} />
    </div>
  {/if}
</div>

<style>
  .title-scene { position: absolute; inset: 0; }
  .center { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
  .half { position: absolute; top: 0; width: 960px; bottom: 0; display: flex; align-items: center; justify-content: center; }
</style>
