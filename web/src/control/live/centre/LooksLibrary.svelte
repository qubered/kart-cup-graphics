<script lang="ts">
  // The Looks library: saved presets as a tile grid under the monitors. Tap a tile = load it into Preview (never to air).
  // The header shows what Preview is based on (MODIFIED / SAVED) with Update (two-tap) and Save as new…; the ⋯ on a tile opens the manage bar.
  import { control } from '../../store'
  import { activeStack, editRundown } from '../../ui'
  import { dragSource } from '../../ui/drag'
  import { twoTap } from '../../ui/twotap.svelte'
  import { activeTournament } from '../../../../../shared/tournament'
  import { addCueFromLook } from '../rail/actions'
  import { deleteLook, duplicateLook, loadLook, renameLook, setLookScope, updateLook } from './actions'
  import { cueCounts, cueWord, scopeSummary } from './looks'
  import RecallOptions from './RecallOptions.svelte'
  import { saveOpen } from './saveForm'
  import { onAirLookId, previewLook } from './status'
  import Thumb from './Thumb.svelte'
  import { presetView } from './thumbs'

  const st = $derived($control.payload?.state)
  const presets = $derived(st?.presets ?? [])
  const tour = $derived(st ? activeTournament(st) : null)
  const counts = $derived(cueCounts(st?.stacks ?? []))
  const loaded = $derived($previewLook.preset)
  // primitives: the guard below must not disarm just because a new state message re-created the preset object
  const loadedId = $derived($previewLook.preset?.id ?? null)
  const modified = $derived($previewLook.modified)
  const used = $derived(loaded ? (counts.get(loaded.id) ?? 0) : 0)
  const stack = $derived($activeStack)

  let filter = $state('')
  const shown = $derived.by(() => {
    const f = filter.trim().toLowerCase()
    return f ? presets.filter((p) => p.name.toLowerCase().includes(f)) : presets
  })

  // ---- two-tap guards: overwrite (Update) and delete ----
  const guard = twoTap()
  // Anything that changes what the armed button would do disarms it.
  $effect(() => { void [loadedId, modified, managing]; guard.reset() })

  // ---- manage bar ----
  let managing = $state<string | null>(null)
  let recalls = $state(false)
  let renaming = $state(false)
  let renameText = $state('')
  const managed = $derived(managing ? (presets.find((p) => p.id === managing) ?? null) : null)
  $effect(() => { if (managing && !managed) closeManage() })
  function openManage(id: string) { managing = id; recalls = false; renaming = false }
  function closeManage() { managing = null; recalls = false; renaming = false }
  function startRename() { if (!managed) return; renameText = managed.name; renaming = true }
  function commitRename() {
    if (managed && renaming) renameLook(managed.id, renameText)
    renaming = false
  }

  const trunc = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s)
  /** Add a Look to the end of the rundown on show (the rail's own undoable add; Take: auto). */
  function appendCue(id: string) {
    if (stack) void addCueFromLook(stack.id, id, stack.cues.length)
  }
</script>

<section class="u-panel libp" aria-label="Looks library" data-library>
  {#if managed}
    {@const n = counts.get(managed.id) ?? 0}
    <div class="u-ph libh manage" data-manage-bar>
      <b class="mname">
        {#if renaming}
          <input class="u-input sm" name="renameLook" aria-label="Look name" maxlength="100" autocomplete="off" bind:value={renameText}
            onkeydown={(e) => { if (e.key === 'Enter') commitRename(); else if (e.key === 'Escape') renaming = false }} />
        {:else}{managed.name}{/if}
      </b>
      <span class="u-dim u-sm">{n ? `in ${cueWord(n)}` : 'not in a rundown'}</span>
      <span class="mact">
        <button type="button" class="u-btn" class:sel={recalls} data-recalls aria-expanded={recalls} onclick={() => (recalls = !recalls)}>Recalls…</button>
        <button type="button" class="u-btn" data-rename onclick={() => (renaming ? commitRename() : startRename())}>{renaming ? 'Save name' : 'Rename'}</button>
        <button type="button" class="u-btn" data-duplicate onclick={() => void duplicateLook(managed.id)}>Duplicate</button>
        <button type="button" class="u-btn" data-add-cue disabled={!stack} title={stack ? `Add as a cue to “${stack.name}”` : 'There is no rundown'} onclick={() => appendCue(managed.id)}>＋ Cue</button>
        <button type="button" class="u-btn" class:confirm={guard.armed === `del:${managed.id}`} class:danger={guard.armed !== `del:${managed.id}`} data-delete
          onclick={() => guard.tap(`del:${managed.id}`, () => { deleteLook(managed.id); closeManage() })}>
          {guard.armed === `del:${managed.id}` ? `Tap again${n ? ` · removes ${cueWord(n)}` : ' to delete'}` : 'Delete'}
        </button>
        <button type="button" class="u-btn acc" data-manage-done onclick={closeManage}>Done</button>
      </span>
    </div>
    {#if recalls}
      <div class="recallbar" data-recall-editor>
        <div class="rbtop">
          <b>When “{trunc(managed.name, 28)}” is recalled it restores</b>
          <span class="u-dim u-sm">{scopeSummary(managed.scope)} · applies to every cue using it unless the cue overrides it</span>
        </div>
        <RecallOptions scope={managed.scope} layout="row" tournament={tour !== null} onchange={(patch) => setLookScope(managed.id, patch)} />
      </div>
    {/if}
  {:else}
    <div class="u-ph libh">
      <span class="u-lab">Looks</span><span class="cnt" data-look-count>{presets.length}</span>
      <input class="u-input libf" type="text" name="lookFilter" placeholder="Filter…" aria-label="Filter looks" autocomplete="off" bind:value={filter} />
      <span class="libst" data-look-status>
        Preview: <b>{loaded?.name ?? 'unsaved'}</b>
        {#if loaded}
          {#if modified}<span class="u-tag mod" data-modified>● MODIFIED</span>{:else}<span class="u-tag pvw" data-saved>SAVED</span>{/if}
        {/if}
      </span>
      {#if loaded && guard.armed === `upd:${loaded.id}`}
        <button type="button" class="u-btn confirm updb" data-update-look onclick={() => guard.tap(`upd:${loaded.id}`, () => updateLook(loaded.id))}>
          <span>Tap again to overwrite<small>affects {cueWord(used)}</small></span>
        </button>
      {:else}
        <button type="button" class="u-btn updb" data-update-look disabled={!loaded || !modified}
          onclick={() => loaded && guard.tap(`upd:${loaded.id}`, () => updateLook(loaded.id))}>Update “{trunc(loaded?.name ?? '', 12)}”</button>
      {/if}
      <button type="button" class="u-btn acc" data-save-open onclick={() => saveOpen.set(true)}>Save as new…</button>
    </div>
  {/if}

  <div class="u-grow libgrid" data-look-grid>
    {#each shown as p (p.id)}
      {@const pvw = loaded?.id === p.id}
      {@const air = $onAirLookId === p.id}
      {@const n = counts.get(p.id) ?? 0}
      <!-- data-look on the tile: the rundown's drag test (and any hook) finds the grip inside it -->
      <div class="ltile" class:inpvw={pvw} class:air class:managing={managing === p.id} data-look={p.id} data-look-tile={p.id}>
        <button type="button" class="ltb" data-look-load={p.id} aria-label="Load {p.name} into Preview" onclick={() => loadLook(p.id)}>
          <span class="thw">
            <Thumb view={presetView(p, st!, $control.catalog, tour)} />
            {#if air || pvw}
              <span class="tags">
                {#if air}<span class="u-tag pgm" data-tag="on-air">ON AIR</span>{/if}
                {#if pvw}<span class="u-tag pvw" data-tag="in-preview">IN PREVIEW</span>{/if}
                {#if pvw && modified}<span class="u-tag mod" data-tag="modified">MODIFIED</span>{/if}
              </span>
            {/if}
          </span>
          <span class="ltn">{p.name}</span>
          <span class="lsub">{n ? cueWord(n) : 'no cue'}</span>
        </button>
        <span class="u-grip gripc" role="button" tabindex="-1" aria-label="Drag {p.name} onto the rundown" use:dragSource={{ kind: 'look', id: p.id, label: p.name }}><i></i></span>
        <button type="button" class="lmore" data-manage={p.id} aria-label="Manage {p.name}" aria-expanded={managing === p.id} onclick={() => (managing === p.id ? closeManage() : openManage(p.id))}>⋯</button>
        {#if $editRundown && stack}
          <button type="button" class="ladd" data-add-as-cue={p.id} aria-label="Add {p.name} as a cue" onclick={() => appendCue(p.id)}>＋</button>
        {/if}
      </div>
    {:else}
      <div class="u-empty wide" data-looks-empty>
        {#if presets.length}
          <b>No looks match “{filter}”</b><span>Clear the filter to see all {presets.length}.</span>
        {:else}
          <b>No looks yet</b><span>Set up Preview with the scene editor, then tap “Save as new…”.</span>
        {/if}
      </div>
    {/each}
  </div>
</section>

<style>
  .libp { flex: 1; min-height: 0; }
  .libh { height: auto; min-height: 60px; flex-wrap: wrap; padding-top: 8px; padding-bottom: 8px; row-gap: 8px; }
  .cnt { background: #232834; border-radius: 8px; padding: 1px 7px; color: #cbd5e1; font-size: 11px; }
  .libf { width: 190px; flex: 0 1 190px; }
  .libst { margin-left: auto; display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--ui-muted); white-space: nowrap; min-width: 0; }
  .libst b { color: #fff; max-width: 160px; overflow: hidden; text-overflow: ellipsis; display: inline-block; vertical-align: bottom; }
  .updb { min-width: 150px; line-height: 1.15; }
  .updb span { text-align: center; }
  .updb small { display: block; font-size: 10.5px; font-weight: 400; margin-top: 1px; }
  .manage { gap: 10px; }
  .mname { color: #fff; font-size: 15px; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .mname .u-input { width: 200px; }
  .mact { margin-left: auto; display: flex; flex-wrap: wrap; gap: 6px; }
  .mact .u-btn { padding: 0 12px; }
  .recallbar { padding: 10px 12px 12px; border-bottom: 1px solid var(--ui-line); background: #101319; display: grid; gap: 8px; flex: none; }
  .rbtop { display: flex; flex-direction: column; gap: 2px; }
  .rbtop b { color: #fff; font-size: 13px; }

  .libgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; padding: 12px; align-content: start; }
  .ltile { position: relative; border: 1px solid var(--ui-line); border-radius: 10px; background: var(--ui-panel-2); }
  .ltile.inpvw { border-color: var(--ui-preview); box-shadow: 0 0 0 2px var(--ui-preview); background: #0f2418; }
  .ltile.air { border-color: var(--ui-program); box-shadow: 0 0 0 2px var(--ui-program); background: #2a1010; }
  .ltile.air.inpvw { box-shadow: 0 0 0 2px var(--ui-program), 0 0 0 4px var(--ui-preview); }
  .ltile.managing { border-color: var(--ui-accent); box-shadow: 0 0 0 2px var(--ui-accent); }
  .ltb { display: block; width: 100%; padding: 5px 5px 4px; text-align: left; border: 0; background: transparent; border-radius: 10px; cursor: pointer; white-space: normal; }
  .ltb:hover:not(:disabled) { background: rgba(255, 255, 255, .04); }
  .thw { display: block; position: relative; }
  .tags { position: absolute; left: 6px; bottom: 6px; display: flex; gap: 4px; }
  .ltn { display: block; padding: 6px 3px 0; color: #fff; font-weight: 600; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .lsub { display: block; padding: 0 3px 3px; color: var(--ui-muted); font-size: 11px; }
  /* The grip, ⋯ and ＋ sit in the corners of the picture; each has a 44px hit area. */
  .gripc { position: absolute; left: 5px; top: 5px; z-index: 6; }
  .gripc::before, .lmore::before { content: ''; position: absolute; inset: 7px; border-radius: 8px; background: rgba(0, 0, 0, .65); z-index: -1; }
  .gripc { isolation: isolate; }
  .lmore { position: absolute; right: 5px; top: 5px; z-index: 6; width: 44px; height: 44px; padding: 0; border: 0; background: transparent; color: #e5e7eb; font-size: 18px; font-weight: 700; line-height: 1; isolation: isolate; border-radius: 8px; }
  .lmore:hover:not(:disabled) { background: transparent; }
  .ladd { position: absolute; right: 7px; bottom: 44px; z-index: 6; width: 44px; height: 44px; padding: 0; border-radius: 10px; border: 0; background: var(--ui-accent); color: #fff; font-size: 24px; font-weight: 700; box-shadow: 0 2px 6px rgba(0, 0, 0, .5); }
  .ladd:hover:not(:disabled) { background: #2f6fdb; }
  .wide { grid-column: 1 / -1; }
</style>
