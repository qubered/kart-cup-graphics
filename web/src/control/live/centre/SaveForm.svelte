<script lang="ts">
  // "Save as new look": an inline form in the right bar (the library stays visible). A look always captures every screen;
  // the switches only choose what comes back when it is recalled. Defaults: Look and Outputs armed on, Race & players and Scores off.
  import { untrack } from 'svelte'
  import { control } from '../../store'
  import { activeStack } from '../../ui'
  import { activeTournament } from '../../../../../shared/tournament'
  import type { PresetScope, TakeMode } from '../../../../../shared/types'
  import { saveLook } from './actions'
  import { defaultSaveScope, suggestName } from './looks'
  import RecallOptions from './RecallOptions.svelte'
  import { saveOpen } from './saveForm'

  const st = $derived($control.payload?.state)
  const stack = $derived($activeStack)
  const tournament = $derived(st ? activeTournament(st) !== null : false)

  // The form opens fresh each time it is shown, so the suggestion is read once.
  let name = $state(untrack(() => (st ? suggestName(st.layers, st.outputs, $control.selectedOutput, st.presets.map((p) => p.name)) : '')))
  let from = $state<'pvw' | 'pgm'>('pvw')
  let scope = $state<PresetScope>(defaultSaveScope())
  let addCue = $state(false)
  let take = $state<'cut' | 'auto' | 'none'>('auto')
  let busy = $state(false)

  const screens = $derived((st?.outputs ?? []).map((o) => o.name))
  const selectedName = $derived(st?.outputs.find((o) => o.id === $control.selectedOutput)?.name ?? '')
  const takeValue = (t: 'cut' | 'auto' | 'none'): TakeMode | null => (t === 'none' ? null : t)

  async function save() {
    const n = name.trim()
    if (!n || busy || !st) return
    busy = true
    const ok = await saveLook({ name: n, from, scope: { ...scope }, cue: addCue && stack ? { stackId: stack.id, take: takeValue(take) } : null })
    busy = false
    if (ok) saveOpen.set(false)
  }
  const focusName = (el: HTMLInputElement) => { el.focus(); el.select() }
</script>

<section class="u-panel" aria-label="Save look" data-save-form>
  <div class="u-ph">
    <button type="button" class="u-btn sm back" data-save-cancel onclick={() => saveOpen.set(false)}>← Back</button>
    <b class="ttl">Save look</b>
  </div>
  <form class="u-grow body" onsubmit={(e) => { e.preventDefault(); void save() }}>
    <div class="fld">
      <label class="u-lab" for="save-look-name">Name</label>
      <input id="save-look-name" class="u-input big" name="lookName" maxlength="100" autocomplete="off" bind:value={name} use:focusName
        onkeydown={(e) => { if (e.key === 'Escape') saveOpen.set(false) }} />
    </div>
    <p class="note u-dim u-sm" data-save-note>
      Saves all {screens.length} screens ({screens.join(', ')}), not just {selectedName}. The options below choose what comes back when it is recalled.
    </p>
    <div class="fld">
      <span class="u-lab">Save from</span>
      <div class="u-seg blue seg44" role="group" aria-label="Save from">
        <button type="button" class:sel={from === 'pvw'} data-save-from="pvw" aria-pressed={from === 'pvw'} onclick={() => (from = 'pvw')}>Preview</button>
        <button type="button" class:sel={from === 'pgm'} data-save-from="pgm" aria-pressed={from === 'pgm'} onclick={() => (from = 'pgm')}>On air now</button>
      </div>
    </div>
    <div class="fld">
      <span class="u-lab">Remember when recalled</span>
      <RecallOptions {scope} {tournament} onchange={(s) => (scope = s)} />
    </div>
    {#if stack}
      <div class="fld">
        <button type="button" class="u-tgl" class:on={addCue} data-save-add-cue aria-pressed={addCue} onclick={() => (addCue = !addCue)}>
          <span class="u-tt"><b>Also add to “{stack.name}” as cue {stack.cues.length + 1}</b><small>Take: {take === 'none' ? 'recall only' : take} · changeable later</small></span><span class="u-sw"></span>
        </button>
        {#if addCue}
          <div class="u-seg blue seg44" role="group" aria-label="Take for the new cue">
            {#each [['cut', 'Cut'], ['auto', 'Auto'], ['none', 'Recall only']] as [v, l] (v)}
              <button type="button" class:sel={take === v} data-save-take={v} aria-pressed={take === v} onclick={() => (take = v as 'cut' | 'auto' | 'none')}>{l}</button>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
    <div class="actions">
      <button type="button" class="u-btn" data-save-cancel onclick={() => saveOpen.set(false)}>Cancel</button>
      <button type="submit" class="u-btn acc" data-save-submit disabled={!name.trim() || busy}>Save look</button>
    </div>
  </form>
</section>

<style>
  .ttl { color: #fff; }
  .back { height: 44px; }
  .body { padding: 12px; display: grid; gap: 14px; align-content: start; }
  .fld { display: grid; gap: 6px; }
  .big { height: 48px; font-size: 15px; font-weight: 600; }
  .note { margin: 0; line-height: 1.4; }
  .seg44 > button { height: 44px; }
  .actions { display: grid; grid-template-columns: 1fr 1.4fr; gap: 8px; }
</style>
