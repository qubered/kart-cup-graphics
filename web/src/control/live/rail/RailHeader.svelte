<script lang="ts">
  // Rail header: the rundown switcher (inline menu, not a popover), the standby position, and the Run | Edit lock.
  import type { CueStack } from '../../../../../shared/types'
  import { twoTap } from '../../ui/twotap.svelte'
  import { editRundown, stackPick } from '../../ui'
  import { deleteRundown, newRundown, renameRundown } from './actions'
  import { nextRundownName, railPosition } from './model'

  interface Props { stack: CueStack | undefined; stacks: CueStack[] }
  let { stack, stacks }: Props = $props()

  let menuOpen = $state(false)
  let renaming = $state(false)
  let renameText = $state('')
  const del = twoTap()
  const position = $derived(stack ? railPosition(stack) : null)

  function toggleMenu() {
    menuOpen = !menuOpen
    renaming = false
    del.reset()
  }
  function setMode(edit: boolean) {
    editRundown.set(edit)
    menuOpen = false
    renaming = false
    del.reset()
  }
  function pick(id: string) {
    stackPick.set(id)
    menuOpen = false
    renaming = false
    del.reset()
  }
  function startRename() {
    if (!stack) return
    renameText = stack.name
    renaming = true
    del.reset()
  }
  function commitRename() {
    if (stack) renameRundown(stack, renameText)
    renaming = false
  }
  function create() {
    menuOpen = false
    renaming = false
    del.reset()
    void newRundown(nextRundownName(stacks))
  }
  function remove() {
    const s = stack
    if (!s || stacks.length < 2) return
    del.tap(`delete:${s.id}`, () => { menuOpen = false; deleteRundown(s, stacks) })
  }
</script>

<div class="u-ph head">
  <button type="button" class="u-btn switch" data-rundown-menu aria-expanded={menuOpen} aria-haspopup="true" aria-label="Rundown: {stack?.name ?? 'none'}. Switch rundown" onclick={toggleMenu}>
    <span class="rdn">{stack?.name ?? 'No rundown'}</span><span class="u-dim">{menuOpen ? '▴' : '▾'}</span>
  </button>
  {#if position}<span class="u-dim pos" data-position>{position.pos}/{position.total}</span>{/if}
  <div class="u-seg modeseg" role="group" aria-label="Rundown mode">
    <button type="button" data-edit-toggle="run" class:sel={!$editRundown} aria-pressed={!$editRundown} onclick={() => setMode(false)}>Run</button>
    <button type="button" data-edit-toggle="edit" class:sel={$editRundown} class:e={$editRundown} aria-pressed={$editRundown} onclick={() => setMode(true)}>Edit</button>
  </div>
</div>

{#if menuOpen}
  <div class="menu" data-rundown-list>
    {#each stacks as k (k.id)}
      <button type="button" class="rdi" class:on={k.id === stack?.id} data-stack-tab={k.id} aria-current={k.id === stack?.id ? 'true' : undefined} onclick={() => pick(k.id)}>
        <span class="rdname">{k.name}</span><span class="u-dim">{k.cues.length} cue{k.cues.length === 1 ? '' : 's'}</span>
      </button>
    {/each}
    <div class="acts">
      <button type="button" class="u-btn" data-rundown-new onclick={create}>＋ New</button>
      {#if renaming}
        <input type="text" class="u-input" name="rundownName" aria-label="Rundown name" maxlength="100" bind:value={renameText}
          onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitRename() } else if (e.key === 'Escape') { e.stopPropagation(); renaming = false } }} />
        <button type="button" class="u-btn acc" data-rundown-rename-save disabled={!renameText.trim()} onclick={commitRename}>Save</button>
      {:else}
        <button type="button" class="u-btn" data-rundown-rename disabled={!stack} onclick={startRename}>Rename</button>
      {/if}
      <button type="button" class="u-btn danger" class:confirm={del.armed !== null} data-rundown-delete disabled={stacks.length < 2} onclick={remove}>{del.armed !== null ? 'Tap again' : 'Delete'}</button>
    </div>
  </div>
{/if}

<style>
  .u-ph.head { height: 56px; }
  .switch { padding: 0 10px; max-width: 150px; min-width: 0; justify-content: space-between; }
  .rdn { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
  .pos { font-size: 12px; white-space: nowrap; }
  .modeseg { margin-left: auto; width: 112px; flex: none; }
  .modeseg > button { height: 44px; padding: 0; }
  .modeseg > button.sel { background: #2a303c; color: #fff; }
  .modeseg > button.sel.e { background: #78350f; color: #fde68a; }

  .menu { padding: 8px 12px 10px; border-bottom: 1px solid var(--ui-line); background: #101319; display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; flex: none; max-height: 50%; overflow: auto; }
  .rdi { display: flex; justify-content: space-between; align-items: center; gap: 8px; height: 44px; padding: 0 12px; border: 1px solid var(--ui-field); border-radius: 8px; font-weight: 600; font-size: 13px; background: transparent; color: #e5e7eb; text-align: left; }
  .rdi.on { background: #1d2430; border-color: #3a4455; color: #fff; }
  .rdname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
  .acts { display: flex; gap: 6px; flex-wrap: wrap; }
  .acts .u-btn { padding: 0 10px; }
  .acts .u-input { flex: 1; min-width: 100px; }
</style>
