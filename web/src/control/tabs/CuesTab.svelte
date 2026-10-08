<script lang="ts">
  import { control, send } from '../store'
  import type { PresetScope, TakeMode } from '../../../../shared/types'

  const SCOPES: { key: keyof PresetScope; label: string }[] = [
    { key: 'layers', label: 'Layers' }, { key: 'armed', label: 'Arming' }, { key: 'show', label: 'Show data' },
    { key: 'scores', label: 'Scores' }, { key: 'transition', label: 'Speed' }, { key: 'mattify', label: 'Mattify' },
  ]
  /** Click cycles: inherit the preset's setting, force on, force off. */
  function cycleScope(stackId: string, cueId: string, key: keyof PresetScope, own: boolean | undefined) {
    send({ type: 'updateCue', stackId, cueId, scope: { [key]: own === undefined ? true : own ? false : null } })
  }
  const st = $derived($control.payload?.state)
  const presets = $derived(st?.presets ?? [])
  const stacks = $derived(st?.stacks ?? [])
  let pickedId = $state('')
  const stack = $derived(stacks.find((k) => k.id === pickedId) ?? stacks[0])
  let newName = $state('')
  let addPreset = $state('')
  let addTake = $state<'cut' | 'auto' | 'none'>('cut')
  let renaming = $state(false)
  let renameTo = $state('')

  const presetOf = (id: string) => presets.find((p) => p.id === id)
  const nameOf = (id: string) => presets.find((p) => p.id === id)?.name ?? '?'
  const takeVal = (t: TakeMode | null) => t ?? 'none'
  const takeArg = (v: string): TakeMode | null => (v === 'cut' || v === 'auto' ? v : null)
  const currentIdx = $derived(stack ? stack.cues.findIndex((c) => c.id === stack.current) : -1)
  // Standby = selected cue, else the one after the one on air (what GO would fire).
  const standbyIdx = $derived.by(() => {
    if (!stack) return -1
    const sel = stack.cues.findIndex((c) => c.id === stack.selected)
    return sel !== -1 ? sel : currentIdx + 1
  })
  const standby = $derived(stack ? stack.cues[standbyIdx] : undefined)

  function createStack() {
    const n = newName.trim()
    if (!n) return
    send({ type: 'createStack', name: n })
    newName = ''
  }
  function add() {
    const presetId = addPreset || presets[0]?.id
    if (stack && presetId) send({ type: 'addCue', stackId: stack.id, presetId, take: takeArg(addTake) })
  }
  function commitRename() {
    const n = renameTo.trim()
    if (stack && n) send({ type: 'renameStack', id: stack.id, name: n })
    renaming = false
  }
  function removeStack() {
    if (stack && confirm(`Delete cue stack "${stack.name}"?`)) send({ type: 'deleteStack', id: stack.id })
  }
</script>

<div class="card">
  <h2>Cue stacks</h2>
  <p class="dim" style="margin:0 0 8px">A running order of presets: reuse a preset as often as you like and choose Cut, Auto or recall-only per cue. The selected cue sits in Preview; GO sends it to Program and selects the next one.</p>
  <div class="row">
    {#each stacks as k (k.id)}
      <button type="button" data-stack-tab={k.id} class:on={stack?.id === k.id} aria-pressed={stack?.id === k.id} onclick={() => (pickedId = k.id)}>{k.name}</button>
    {/each}
    <form class="row" onsubmit={(e) => { e.preventDefault(); createStack() }}>
      <input type="text" name="stackName" placeholder="New stack name" bind:value={newName} maxlength="100" />
      <button type="submit" disabled={!newName.trim()}>Create stack</button>
    </form>
  </div>
</div>

{#if stack}
  <div class="card" data-stack={stack.id}>
    <div class="row" style="margin-bottom:8px">
      {#if renaming}
        <input type="text" bind:value={renameTo} maxlength="100" onblur={commitRename}
          onkeydown={(e) => { if (e.key === 'Enter') commitRename(); else if (e.key === 'Escape') renaming = false }} />
      {:else}
        <h2 style="margin:0">{stack.name}</h2>
        <button type="button" onclick={() => { renameTo = stack.name; renaming = true }}>Rename</button>
        <button type="button" class="danger" onclick={removeStack}>Delete</button>
      {/if}
      <span class="row" style="margin-left:auto">
        <span class="dim">Preview: <b>{standby ? nameOf(standby.presetId) : '—'}</b></span>
        <button type="button" data-select-prev onclick={() => send({ type: 'stepSelection', stackId: stack.id, delta: -1 })} disabled={standbyIdx < 1}>◀ Select</button>
        <button type="button" data-select-next onclick={() => send({ type: 'stepSelection', stackId: stack.id, delta: 1 })} disabled={standbyIdx < 0 || standbyIdx >= stack.cues.length - 1}>Select ▶</button>
        <button type="button" data-stack-go onclick={() => send({ type: 'goStack', stackId: stack.id })} disabled={!standby}>GO ▶</button>
        <button type="button" data-stack-rewind onclick={() => send({ type: 'resetStack', id: stack.id })} disabled={currentIdx === -1 && !stack.selected}>Rewind</button>
      </span>
    </div>

    {#if !stack.cues.length}<span class="dim">Empty. Add cues below.</span>{/if}
    {#each stack.cues as c, i (c.id)}
      <div class="row cue" data-cue={c.id} class:current={stack.current === c.id} class:standby={stack.selected === c.id} style="padding:6px 0; border-top:1px solid var(--ui-line)">
        <span class="dim" style="width:22px">{i + 1}</span>
        <span class="tag" style="width:64px">{stack.current === c.id ? 'ON AIR' : stack.selected === c.id ? 'PREVIEW' : ''}</span>
        <select name="cuePreset" value={c.presetId} onchange={(e) => send({ type: 'updateCue', stackId: stack.id, cueId: c.id, presetId: e.currentTarget.value })}>
          {#each presets as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
        </select>
        <select name="cueTake" value={takeVal(c.take)} onchange={(e) => send({ type: 'updateCue', stackId: stack.id, cueId: c.id, take: takeArg(e.currentTarget.value) })}>
          <option value="cut">Cut</option><option value="auto">Auto</option><option value="none">Recall only</option>
        </select>
        <span class="row" style="margin-left:auto">
          <button type="button" data-select onclick={() => send({ type: 'selectCue', stackId: stack.id, cueId: c.id })}>Select</button>
          <button type="button" data-fire onclick={() => send({ type: 'fireCue', stackId: stack.id, cueId: c.id })}>Fire</button>
          <button type="button" data-save-to-preset title="Overwrite this cue's preset with everything as it is now (affects every cue using it)"
            onclick={() => confirm(`Overwrite preset "${nameOf(c.presetId)}" with the current state?`) && send({ type: 'updatePreset', id: c.presetId, capture: true })}>Save to preset</button>
          <button type="button" aria-label="Move up" onclick={() => send({ type: 'moveCue', stackId: stack.id, cueId: c.id, delta: -1 })} disabled={i === 0}>↑</button>
          <button type="button" aria-label="Move down" onclick={() => send({ type: 'moveCue', stackId: stack.id, cueId: c.id, delta: 1 })} disabled={i === stack.cues.length - 1}>↓</button>
          <button type="button" class="danger" aria-label="Remove cue" onclick={() => send({ type: 'removeCue', stackId: stack.id, cueId: c.id })}>✕</button>
        </span>
      </div>
      <div class="row scoperow" data-cue-scope={c.id}>
        <span class="dim" style="width:22px"></span><span class="dim" style="font-size:11px">Recall:</span>
        {#each SCOPES as sc (sc.key)}
          {@const own = c.scope?.[sc.key]}
          {@const eff = own ?? presetOf(c.presetId)?.scope[sc.key] ?? false}
          <button type="button" class="chip" class:on={eff} class:forced={own !== undefined} data-scope={sc.key}
            title={own === undefined ? `Inherits the preset (${eff ? 'on' : 'off'}). Click to force on.` : `Forced ${own ? 'on' : 'off'} for this cue. Click to cycle.`}
            onclick={() => cycleScope(stack.id, c.id, sc.key, own)}>{sc.label}{own === undefined ? '' : own ? ' ✓' : ' ✕'}</button>
        {/each}
      </div>
    {/each}

    <div class="row" style="padding-top:10px; border-top:1px solid var(--ui-line)">
      <select name="addPreset" bind:value={addPreset} disabled={!presets.length}>
        {#each presets as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
      </select>
      <select name="addTake" bind:value={addTake}>
        <option value="cut">Cut</option><option value="auto">Auto</option><option value="none">Recall only</option>
      </select>
      <button type="button" data-add-cue onclick={add} disabled={!presets.length}>Add cue</button>
      {#if !presets.length}<span class="dim">Save a preset first.</span>{/if}
    </div>
  </div>
{/if}

<style>
  .scoperow { gap: 4px; padding: 0 0 6px; }
  .chip { font-size: 11px; padding: 2px 6px; opacity: .45; }
  .chip.on { opacity: .9; }
  .chip.forced { opacity: 1; outline: 1px solid var(--ui-preview, #4ade80); }
  .cue .tag { font-size: 11px; font-weight: 700; letter-spacing: .06em; }
  .cue.current .tag { color: var(--ui-program, #f87171); }
  .cue.standby .tag { color: var(--ui-preview, #4ade80); }
</style>
