<script lang="ts">
  // Centre column of the Live page: output tabs, Preview and Program, a draggable divider, then the Looks library.
  import { onMount } from 'svelte'
  import LooksLibrary from './centre/LooksLibrary.svelte'
  import Monitors from './centre/Monitors.svelte'
  import OutputTabs from './centre/OutputTabs.svelte'
  import Splitter from './centre/Splitter.svelte'
  import { MIN_LOOKS, clampHeight, monitorsHeight } from './centre/layout'

  let centre: HTMLElement
  const pane = () => centre?.querySelector<HTMLElement>('[data-monitors-pane]') ?? null
  /** Tallest monitors pane that still leaves the Looks library its minimum height. */
  function max(): number {
    const p = pane()
    if (!centre || !p) return 600
    const top = p.getBoundingClientRect().top - centre.getBoundingClientRect().top
    return centre.clientHeight - top - MIN_LOOKS - 12 - 14
  }
  const natural = () => pane()?.getBoundingClientRect().height ?? 200
  function set(v: number | null) { monitorsHeight.set(v === null ? null : clampHeight(v, max())) }

  // A smaller window must not leave the Looks library squeezed: pull a too-tall pane back in.
  onMount(() => {
    const ro = new ResizeObserver(() => { if ($monitorsHeight !== null) set($monitorsHeight) })
    ro.observe(centre)
    return () => ro.disconnect()
  })
</script>

<section class="centre" aria-label="Monitors and Looks" bind:this={centre}>
  <OutputTabs />
  <Monitors height={$monitorsHeight} />
  <Splitter value={$monitorsHeight} {max} {natural} onchange={set} />
  <LooksLibrary />
</section>

<style>
  .centre { display: flex; flex-direction: column; gap: 12px; min-width: 0; min-height: 0; position: relative; }
</style>
