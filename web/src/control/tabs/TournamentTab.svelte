<script lang="ts">
  import { control } from '../store'
  import { activeTournament, liveMatches } from '../../../../shared/tournament'
  import TournamentPicker from '../tournament/TournamentPicker.svelte'
  import MatchList from '../tournament/MatchList.svelte'
  import MatchSetup from '../tournament/MatchSetup.svelte'
  import MatchResults from '../tournament/MatchResults.svelte'
  import ConfigPanels from '../tournament/ConfigPanels.svelte'

  const show = $derived($control.payload?.state)
  const catalog = $derived($control.catalog)
  const connected = $derived($control.connected)
  const t = $derived(show ? activeTournament(show) : null)
  const matches = $derived(t && show ? liveMatches(t, show.draft) : [])

  // The match being edited; follows the active match until the operator picks another.
  let picked = $state<string | null>(null)
  let lastActive = ''
  $effect(() => {
    if (t && t.activeMatchId !== lastActive) {
      lastActive = t.activeMatchId
      picked = null
    }
  })
  const selected = $derived(matches.find((m) => m.id === picked) ?? matches.find((m) => m.id === t?.activeMatchId) ?? matches[0])
</script>

{#if show && catalog}
  <div class="tour">
    {#if !show.tournaments.length}
      <section class="card empty" aria-label="No tournament" data-empty>
        <h2>No tournament yet</h2>
        <p class="dim">Run several matches (for example 4 semis then a final) from one page. Each match keeps its own cup, players and scores, and the live graphics follow the active match. Until you create one, the rest of the app works exactly as before.</p>
      </section>
    {/if}
    <TournamentPicker {show} {connected} />
    {#if t && selected}
      <MatchList tournament={t} {matches} {catalog} {connected} selectedId={selected.id} onselect={(id) => (picked = id)} />
      {#key selected.id}
        <MatchSetup tournament={t} match={selected} {matches} {catalog} {connected} />
        <MatchResults match={selected} {catalog} {connected} />
      {/key}
      <ConfigPanels tournament={t} {connected} />
    {:else if show.tournaments.length}
      <p class="dim">No tournament is loaded. Load one above to edit its matches.</p>
    {/if}
  </div>
{:else}
  <div class="loading">Loading…</div>
{/if}

<style>
  .tour { display: flex; flex-direction: column; gap: 12px; }
  .loading { color: var(--ui-muted); padding: 12px; }
  .empty { margin: 0; }
  .empty p { margin: 0; }
</style>
