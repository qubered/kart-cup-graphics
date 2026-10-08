<script lang="ts">
  import { control, send } from '../store'

  const st = $derived($control.payload?.state)
  const presets = $derived(st?.presets ?? [])
  let name = $state('')
  let editing = $state<string | null>(null)
  let editName = $state('')

  function save() {
    const n = name.trim()
    if (!n) return
    send({ type: 'savePreset', name: n })
    name = ''
  }
  function startRename(id: string, current: string) {
    editing = id
    editName = current
  }
  function commitRename(id: string) {
    const n = editName.trim()
    if (n) send({ type: 'updatePreset', id, name: n })
    editing = null
  }
  function outputNames(ids: string[]): string {
    const all = st?.outputs ?? []
    return ids.map((id) => all.find((o) => o.id === id)?.name ?? id).join(', ') || 'none armed'
  }
  function remove(id: string, label: string) {
    if (confirm(`Delete preset "${label}"?`)) send({ type: 'deletePreset', id })
  }
</script>

<div class="card">
  <h2>Save current design</h2>
  <p class="dim" style="margin:0 0 8px">Saves every output's background, scene and overlays, plus which outputs are armed.</p>
  <form class="row" onsubmit={(e) => { e.preventDefault(); save() }}>
    <input type="text" name="presetName" placeholder="Preset name" bind:value={name} maxlength="100" />
    <button type="submit" disabled={!name.trim()}>Save preset</button>
  </form>
</div>

<div class="card">
  <h2>Presets</h2>
  {#if !presets.length}
    <span class="dim">No presets yet. Set up the layers and arming, then save. Build running orders on the Cues tab.</span>
  {/if}
  {#each presets as p, i (p.id)}
    <div class="row preset" data-preset={p.id} class:current={st?.lastPreset === p.id} style="padding:6px 0; border-top:1px solid var(--ui-line)">
      <span class="dim" style="width:22px">{i + 1}</span>
      {#if editing === p.id}
        <input type="text" bind:value={editName} maxlength="100" onblur={() => commitRename(p.id)}
          onkeydown={(e) => { if (e.key === 'Enter') commitRename(p.id); else if (e.key === 'Escape') editing = null }} />
      {:else}
        <b style="min-width:140px">{st?.lastPreset === p.id ? '● ' : ''}{p.name}</b>
        <span class="dim">{outputNames(p.armed)}</span>
      {/if}
      <span class="row" style="margin-left:auto">
        <button type="button" data-recall onclick={() => send({ type: 'recallPreset', id: p.id })}>Recall</button>
        <button type="button" data-recall-cut onclick={() => send({ type: 'recallPreset', id: p.id, take: 'cut' })}>Cut</button>
        <button type="button" data-recall-auto onclick={() => send({ type: 'recallPreset', id: p.id, take: 'auto' })}>Auto</button>
        <button type="button" title="Overwrite with the current layers and arming"
          onclick={() => confirm(`Overwrite "${p.name}" with the current design?`) && send({ type: 'updatePreset', id: p.id, capture: true })}>Update</button>
        <button type="button" onclick={() => startRename(p.id, p.name)}>Rename</button>
        <button type="button" class="danger" onclick={() => remove(p.id, p.name)}>Delete</button>
      </span>
    </div>
  {/each}
</div>

<style>
  .preset.current b { color: var(--ui-program, #f87171); }
</style>
