<script lang="ts">
  // Centre column of the Live page: output tabs, Preview and Program, a draggable divider, then the Looks library.
  import { onMount } from 'svelte'
  import LooksLibrary from './centre/LooksLibrary.svelte'
  import Monitors from './centre/Monitors.svelte'
  import OutputTabs from './centre/OutputTabs.svelte'
  import Splitter from './centre/Splitter.svelte'
  import { MIN_LOOKS, clampHeight, monitorsHeight, monitorsStacked } from './centre/layout'

  let centre: HTMLElement
  let centreH = $state(0)
  let top = $state(0)
  /** Tallest pane the column can spare while the Looks library keeps its minimum. */
  const room = $derived(Math.max(0, centreH - top - MIN_LOOKS - 12 - 14))
  /** Tallest useful pane (reported by the monitors: the biggest they can be at the full column width). */
  let limit = $state(0)
  const pane = () => centre?.querySelector<HTMLElement>('[data-monitors-pane]') ?? null
  const max = () => (limit > 0 ? limit : room)
  const natural = () => pane()?.getBoundingClientRect().height ?? 200
  function set(v: number | null) { monitorsHeight.set(v === null ? null : clampHeight(v, max())) }
  function measure() {
    const p = pane()
    if (!centre || !p) return
    top = p.offsetTop
    centreH = centre.clientHeight
  }
  onMount(() => {
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(centre)
    return () => ro.disconnect()
  })
</script>

<section class="centre" aria-label="Monitors and Looks" bind:this={centre}>
  <OutputTabs />
  <Monitors height={$monitorsHeight} stacked={$monitorsStacked} {room} onlimit={(n) => (limit = n)} />
  <Splitter value={$monitorsHeight} {max} {natural} onchange={set} />
  <LooksLibrary />
</section>

<style>
  .centre { display: flex; flex-direction: column; gap: 12px; min-width: 0; min-height: 0; position: relative; }
</style>
