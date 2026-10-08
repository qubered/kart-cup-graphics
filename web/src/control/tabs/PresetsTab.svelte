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
  <div class="row" style="margin-bottom:8px">
    <h2 style="margin:0">Cue stack</h2>
    <span class="dim">list order is cue order</span>
    <span style="margin-left:auto" class="row">
      <button type="button" data-cue-prev onclick={() => send({ type: 'stepCue', delta: -1 })} disabled={!presets.length}>◀ Prev</button>
      <button type="button" data-cue-next onclick={() => send({ type: 'stepCue', delta: 1 })} disabled={!presets.length}>Next ▶</button>
      <button type="button" data-cue-go-cut onclick={() => send({ type: 'stepCue', delta: 1, take: 'cut' })} disabled={!presets.length}>GO · cut</button>
      <button type="button" data-cue-go-auto onclick={() => send({ type: 'stepCue', delta: 1, take: 'auto' })} disabled={!presets.length}>GO · auto</button>
    </span>
  </div>
  {#if !presets.length}
    <span class="dim">No presets yet. Set up the layers and arming, then save.</span>
  {/if}
  {#each presets as p, i (p.id)}
    <div class="row preset" data-preset={p.id} class:current={st?.cue === p.id} style="padding:6px 0; border-top:1px solid var(--ui-line)">
      <span class="dim" style="width:22px">{i + 1}</span>
      {#if editing === p.id}
        <input type="text" bind:value={editName} maxlength="100" onblur={() => commitRename(p.id)}
          onkeydown={(e) => { if (e.key === 'Enter') commitRename(p.id); else if (e.key === 'Escape') editing = null }} />
      {:else}
        <b style="min-width:140px">{st?.cue === p.id ? '● ' : ''}{p.name}</b>
        <span class="dim">{outputNames(p.armed)}</span>
      {/if}
      <span class="row" style="margin-left:auto">
        <button type="button" data-recall onclick={() => send({ type: 'recallPreset', id: p.id })}>Recall</button>
        <button type="button" data-recall-cut onclick={() => send({ type: 'recallPreset', id: p.id, take: 'cut' })}>Cut</button>
        <button type="button" data-recall-auto onclick={() => send({ type: 'recallPreset', id: p.id, take: 'auto' })}>Auto</button>
        <button type="button" title="Overwrite with the current layers and arming"
          onclick={() => confirm(`Overwrite "${p.name}" with the current design?`) && send({ type: 'updatePreset', id: p.id, capture: true })}>Update</button>
        <button type="button" onclick={() => startRename(p.id, p.name)}>Rename</button>
        <button type="button" aria-label="Move up" onclick={() => send({ type: 'movePreset', id: p.id, delta: -1 })} disabled={i === 0}>↑</button>
        <button type="button" aria-label="Move down" onclick={() => send({ type: 'movePreset', id: p.id, delta: 1 })} disabled={i === presets.length - 1}>↓</button>
        <button type="button" class="danger" onclick={() => remove(p.id, p.name)}>Delete</button>
      </span>
    </div>
  {/each}
</div>

<style>
  .preset.current b { color: var(--ui-program, #f87171); }
</style>
