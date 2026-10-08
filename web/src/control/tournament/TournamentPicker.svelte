<script lang="ts">
  import type { ShowState } from '../../../../shared/types'
  import { send } from '../store'

  let { show, connected }: { show: ShowState; connected: boolean } = $props()

  let newName = $state('')
  let template = $state<'bracket' | 'empty'>('bracket')
  let renamingId = $state<string | null>(null)
  let renameTo = $state('')

  function create() {
    const name = newName.trim()
    if (!name) return
    send({ type: 'createTournament', name, template })
    newName = ''
  }
  function commitRename() {
    const name = renameTo.trim()
    if (renamingId && name) send({ type: 'renameTournament', id: renamingId, name })
    renamingId = null
  }
  function remove(id: string, name: string) {
    if (confirm(`Delete tournament "${name}"? Its matches and results are lost.`)) send({ type: 'deleteTournament', id })
  }
</script>

<section class="card flush" aria-label="Tournaments">
  <div class="ch">
    <h2>Tournaments</h2>
    {#if show.activeTournamentId}
      <div class="r"><button type="button" data-close-tournament disabled={!connected} onclick={() => send({ type: 'loadTournament', id: null })}>Close tournament</button></div>
    {/if}
  </div>
  {#each show.tournaments as t (t.id)}
    <div class="trow" class:active={show.activeTournamentId === t.id} data-tournament={t.id}>
      {#if renamingId === t.id}
        <input type="text" name="renameTournament" bind:value={renameTo} maxlength="100" aria-label="Tournament name"
          onblur={commitRename} onkeydown={(e) => { if (e.key === 'Enter') commitRename(); else if (e.key === 'Escape') renamingId = null }} />
      {:else}
        <b class="tn">{t.name}</b>
        <span class="dim">{t.matches.length} {t.matches.length === 1 ? 'match' : 'matches'}</span>
        {#if show.activeTournamentId === t.id}<span class="tag">LOADED</span>{/if}
        <span class="r">
          {#if show.activeTournamentId !== t.id}
            <button type="button" data-load disabled={!connected} onclick={() => send({ type: 'loadTournament', id: t.id })}>Load</button>
          {/if}
          <button type="button" data-duplicate disabled={!connected} onclick={() => send({ type: 'duplicateTournament', id: t.id })}>Duplicate</button>
          <button type="button" data-duplicate-clear disabled={!connected} onclick={() => send({ type: 'duplicateTournament', id: t.id, resetScores: true })}>Duplicate (clear scores)</button>
          <button type="button" data-rename disabled={!connected} onclick={() => { renameTo = t.name; renamingId = t.id }}>Rename</button>
          <button type="button" class="danger" data-delete disabled={!connected} onclick={() => remove(t.id, t.name)}>Delete</button>
        </span>
      {/if}
    </div>
  {/each}
  <form class="trow new" onsubmit={(e) => { e.preventDefault(); create() }}>
    <input type="text" name="tournamentName" placeholder="New tournament name" bind:value={newName} maxlength="100" disabled={!connected} />
    <select name="tournamentTemplate" bind:value={template} aria-label="Template" disabled={!connected}>
      <option value="bracket">4 semis + final</option>
      <option value="empty">One empty match</option>
    </select>
    <button type="submit" class="primary" disabled={!connected || !newName.trim()}>Create tournament</button>
  </form>
</section>

<style>
  .trow { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid var(--ui-line); }
  .trow.active { background: #172554; }
  .trow.new { border-bottom: 0; }
  .trow.new input { flex: 1; }
  .tn { color: #fff; }
  .r { margin-left: auto; display: flex; gap: 6px; }
  .tag { font-size: 11px; font-weight: 700; letter-spacing: .06em; color: var(--ui-preview, #4ade80); }
  input[name=renameTournament] { flex: 1; }
</style>
