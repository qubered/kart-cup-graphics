<script lang="ts">
  // Centre column of the Live page: output tabs, Preview and Program side by side, then the Looks library.
  import LooksLibrary from './centre/LooksLibrary.svelte'
  import Monitors from './centre/Monitors.svelte'
  import OutputTabs from './centre/OutputTabs.svelte'
</script>

<section class="centre" aria-label="Monitors and Looks">
  <OutputTabs />
  <Monitors />
  <LooksLibrary />
</section>

<style>
  .centre { display: flex; flex-direction: column; gap: 12px; min-width: 0; min-height: 0; }
</style>
