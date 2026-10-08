<script lang="ts">
  import { control, send } from '../store'
  import type { PresetScope } from '../../../../shared/types'

  const SCOPES: { key: keyof PresetScope; label: string; hint: string }[] = [
    { key: 'layers', label: 'Layers', hint: 'Background, scene, overlays per output' },
    { key: 'armed', label: 'Arming', hint: 'Which outputs are armed' },
    { key: 'show', label: 'Show data', hint: 'Event text, fonts, race' },
    { key: 'players', label: 'Players', hint: 'Names, characters and colours' },
    { key: 'scores', label: 'Scores', hint: 'Results and adjustments. Recalling overwrites the current scores' },
    { key: 'transition', label: 'Transition speed', hint: 'Fast / normal / slow' },
    { key: 'mattify', label: 'Mattify', hint: 'The matte icon background switch' },
  ]
  const DEFAULT_SCOPE: PresetScope = { layers: true, armed: true, show: true, players: true, scores: false, transition: true, mattify: true }
  let scope = $state<PresetScope>({ ...DEFAULT_SCOPE })

  const st = $derived($control.payload?.state)
  const presets = $derived(st?.presets ?? [])
  let name = $state('')
  let editing = $state<string | null>(null)
  let editName = $state('')

  function save(from: 'pvw' | 'pgm') {
    const n = name.trim()
    if (!n) return
    send({ type: 'savePreset', name: n, from, scope: { ...scope } })
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
  <p class="dim" style="margin:0 0 8px">Captures everything. Tick what a recall should restore (you can change this later per preset).</p>
  <div class="row" style="margin-bottom:8px">
    {#each SCOPES as sc (sc.key)}
      <label class="pchk" title={sc.hint}><input type="checkbox" name="scope-{sc.key}" bind:checked={scope[sc.key]} />{sc.label}</label>
    {/each}
  </div>
  <form class="row" onsubmit={(e) => { e.preventDefault(); save('pvw') }}>
    <input type="text" name="presetName" placeholder="Preset name" bind:value={name} maxlength="100" />
    <button type="submit" disabled={!name.trim()} title="Save what is in Preview">Save from PVW</button>
    <button type="button" data-save-pgm disabled={!name.trim()} onclick={() => save('pgm')} title="Save what is on air">Save from PGM</button>
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
      <span class="row" style="gap:4px">
        {#each SCOPES as sc (sc.key)}
          <button type="button" class="chip" class:on={p.scope[sc.key]} aria-pressed={p.scope[sc.key]} title="{sc.hint}. Click to toggle." data-scope={sc.key}
            onclick={() => send({ type: 'updatePreset', id: p.id, scope: { [sc.key]: !p.scope[sc.key] } })}>{sc.label}</button>
        {/each}
      </span>
      <span class="row" style="margin-left:auto">
        <button type="button" data-recall onclick={() => send({ type: 'recallPreset', id: p.id })}>Recall</button>
        <button type="button" data-recall-cut onclick={() => send({ type: 'recallPreset', id: p.id, take: 'cut' })}>Cut</button>
        <button type="button" data-recall-auto onclick={() => send({ type: 'recallPreset', id: p.id, take: 'auto' })}>Auto</button>
        <button type="button" data-overwrite-pvw title="Overwrite this preset with what is in Preview"
          onclick={() => confirm(`Overwrite "${p.name}" with Preview?`) && send({ type: 'updatePreset', id: p.id, from: 'pvw' })}>Overwrite ← PVW</button>
        <button type="button" data-overwrite-pgm title="Overwrite this preset with what is on air"
          onclick={() => confirm(`Overwrite "${p.name}" with Program?`) && send({ type: 'updatePreset', id: p.id, from: 'pgm' })}>Overwrite ← PGM</button>
        <button type="button" onclick={() => startRename(p.id, p.name)}>Rename</button>
        <button type="button" class="danger" onclick={() => remove(p.id, p.name)}>Delete</button>
      </span>
    </div>
  {/each}
</div>

<style>
  .chip { font-size: 11px; padding: 2px 6px; opacity: .5; }
  .chip.on { opacity: 1; outline: 1px solid var(--ui-preview, #4ade80); }
  .preset.current b { color: var(--ui-program, #f87171); }
</style>
