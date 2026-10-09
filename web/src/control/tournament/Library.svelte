<script lang="ts">
  // All tournaments: load, close, rename, duplicate (with or without scores), delete, and create from a template.
  import type { ShowState } from '../../../../shared/types'
  import { send } from '../store'
  import { act, toast } from '../ui'
  import { twoTap } from '../ui/twotap.svelte'
  import { roundNumbers } from '../tournament'
  import { closeNewForm, openRound, setNewTemplate, tourNav, type Template } from './nav'

  let { show }: { show: ShowState } = $props()

  const tt = twoTap()
  let newName = $state('')
  let renamingId = $state<string | null>(null)
  let renameTo = $state('')
  let nameInput: HTMLInputElement | undefined = $state()

  const TEMPLATES: { id: Template; label: string }[] = [{ id: 'bracket', label: '4 semis + final' }, { id: 'empty', label: 'One empty match' }]
  const template = $derived($tourNav.newTemplate ?? 'bracket')
  const none = $derived(show.tournaments.length === 0)
  const formOpen = $derived($tourNav.newTemplate !== null || none)

  // Focus the name when the form is opened from a button (not when the page simply opens on an empty list).
  let wasOpen = false
  $effect(() => {
    const open = $tourNav.newTemplate !== null
    if (open && !wasOpen) nameInput?.focus()
    wasOpen = open
  })

  function create() {
    const name = newName.trim()
    if (!name) return
    send({ type: 'createTournament', name, template })
    toast(`Created “${name}”, now set up its matches`)
    newName = ''
    closeNewForm()
    openRound(0, null)
  }
  function load(id: string, name: string) {
    act('Load tournament', [{ type: 'loadTournament', id }], [{ type: 'loadTournament', id: show.activeTournamentId }], `Loaded “${name}”`)
  }
  function close() {
    const id = show.activeTournamentId
    if (id) act('Close tournament', [{ type: 'loadTournament', id: null }], [{ type: 'loadTournament', id }], 'Tournament closed, back to free play')
  }
  function startRename(id: string, name: string) { renamingId = id; renameTo = name }
  function commitRename() {
    const id = renamingId
    const was = show.tournaments.find((x) => x.id === id)?.name
    const name = renameTo.trim()
    renamingId = null
    if (!id || was === undefined || !name || name === was) return
    act('Rename tournament', [{ type: 'renameTournament', id, name }], [{ type: 'renameTournament', id, name: was }], `Renamed to “${name}”`)
  }
  function duplicate(id: string, name: string, resetScores: boolean) {
    send({ type: 'duplicateTournament', id, ...(resetScores ? { resetScores: true } : {}) })
    toast(`Duplicated “${name}”${resetScores ? ' with scores cleared' : ''}, the copy is now loaded`)
  }
  function remove(id: string, name: string) {
    send({ type: 'deleteTournament', id })
    toast(`Deleted “${name}”`)
  }
</script>

<div class="u-ph">
  <span class="u-lab">All tournaments</span>
  <button type="button" class="u-btn acc add" data-new-tournament onclick={() => (formOpen && !none ? closeNewForm() : setNewTemplate(template))}>＋ New tournament</button>
</div>
<div class="u-grow lib">
  {#if formOpen}
    <form class="newt" data-new-form onsubmit={(e) => { e.preventDefault(); create() }}>
      <div class="u-lab">New tournament</div>
      <div class="nrow">
        <input bind:this={nameInput} class="u-input" type="text" name="tournamentName" placeholder="Name, e.g. Kart Cup 2027" bind:value={newName} maxlength="100" aria-label="Tournament name" />
        <div class="u-seg blue tpl" role="group" aria-label="Template">
          {#each TEMPLATES as tp (tp.id)}
            <button type="button" class:sel={template === tp.id} data-template={tp.id} aria-pressed={template === tp.id} onclick={() => setNewTemplate(tp.id)}>{tp.label}</button>
          {/each}
        </div>
        {#if !none}<button type="button" class="u-btn" onclick={closeNewForm}>Cancel</button>{/if}
        <button type="submit" class="u-btn acc" data-create disabled={!newName.trim()}>Create</button>
      </div>
    </form>
  {/if}
  {#if none}
    <div class="u-empty" data-empty>
      <b>No tournament yet</b>
      <span>Run several matches (for example 4 semis then a final) from one place. Each match keeps its own cup, players and scores, and the graphics follow the live match. Until you create one, the app works as free play.</span>
    </div>
  {/if}
  {#each show.tournaments as tn (tn.id)}
    {@const loaded = show.activeTournamentId === tn.id}
    {@const rounds = roundNumbers(tn.matches).length}
    {@const done = tn.matches.filter((m) => m.status === 'done').length}
    <div class="trow" class:on={loaded} data-tournament={tn.id}>
      <div class="tinfo">
        {#if renamingId === tn.id}
          <input class="u-input" type="text" name="renameTournament" bind:value={renameTo} maxlength="100" aria-label="Tournament name"
            onkeydown={(e) => { if (e.key === 'Enter') commitRename(); else if (e.key === 'Escape') renamingId = null }} />
        {:else}
          <b>{tn.name}</b>
        {/if}
        <small>{rounds} round{rounds === 1 ? '' : 's'} · {tn.matches.length} match{tn.matches.length === 1 ? '' : 'es'} · {done} done{loaded ? ' · ' : ''}{#if loaded}<span class="loaded" data-loaded>LOADED</span>{/if}</small>
      </div>
      <div class="tacts">
        {#if loaded}
          <button type="button" class="u-btn" data-close-tournament onclick={close}>Close</button>
        {:else}
          <button type="button" class="u-btn acc" data-load onclick={() => load(tn.id, tn.name)}>Load</button>
        {/if}
        {#if renamingId === tn.id}
          <button type="button" class="u-btn acc" data-rename-save onclick={commitRename}>Save name</button>
        {:else}
          <button type="button" class="u-btn" data-rename onclick={() => startRename(tn.id, tn.name)}>Rename</button>
        {/if}
        <button type="button" class="u-btn" data-duplicate onclick={() => duplicate(tn.id, tn.name, false)}>Duplicate</button>
        <button type="button" class="u-btn" data-duplicate-clear onclick={() => duplicate(tn.id, tn.name, true)}>Duplicate, clear scores</button>
        <button type="button" class="u-btn danger" class:confirm={tt.armed === `del:${tn.id}`} data-delete onclick={() => tt.tap(`del:${tn.id}`, () => remove(tn.id, tn.name))}>
          {tt.armed === `del:${tn.id}` ? (loaded ? 'Tap again: it is loaded' : 'Tap again to delete') : 'Delete'}
        </button>
      </div>
    </div>
  {/each}
</div>
<div class="hint">Several can be saved; one is loaded. The Race page always runs the live match of the loaded tournament. With none loaded the app is in free play.</div>

<style>
  .add { margin-left: auto; }
  .lib { display: grid; align-content: start; }
  .newt { display: grid; gap: 8px; margin: 12px 14px; padding: 12px; border: 1px solid #2f56b8; border-radius: 10px; background: #0f1a36; }
  .nrow { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .nrow .u-input { flex: 1 1 260px; width: auto; }
  .tpl { flex: none; }
  .tpl > :global(button) { height: 44px; }
  .trow { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 12px 14px; border-bottom: 1px solid var(--ui-line); border-left: 3px solid transparent; }
  .trow.on { background: #0f1a36; border-left-color: var(--ui-accent); }
  .tinfo { display: grid; gap: 3px; flex: 1 1 260px; min-width: 0; }
  .tinfo b { color: #fff; font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tinfo small { color: var(--ui-muted); font-size: 12px; }
  .loaded { color: #4ade80; font-weight: 700; letter-spacing: .06em; }
  .tacts { display: flex; gap: 8px; flex-wrap: wrap; }
  .hint { flex: none; padding: 10px 14px; border-top: 1px solid var(--ui-line); font-size: 12px; color: var(--ui-muted); }
</style>
