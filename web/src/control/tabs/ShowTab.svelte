<script lang="ts">
  import { control } from '../store'
  import PlayersCard from '../show/PlayersCard.svelte'
  import RaceCard from '../show/RaceCard.svelte'
  import ResultsCard from '../show/ResultsCard.svelte'
</script>

{#if $control.payload && $control.catalog}
  <div class="show">
    <PlayersCard show={$control.payload.state} catalog={$control.catalog} pending={$control.payload.pending} connected={$control.connected} />
    <RaceCard show={$control.payload.state} catalog={$control.catalog} connected={$control.connected} />
    <ResultsCard show={$control.payload.state} catalog={$control.catalog} connected={$control.connected} />
  </div>
{:else}
  <div class="loading">Loading…</div>
{/if}

<style>
  .show { display: flex; flex-direction: column; gap: 12px; }
  .loading { opacity: .6; padding: 12px; }
</style>
