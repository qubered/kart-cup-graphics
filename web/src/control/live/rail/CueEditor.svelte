<script lang="ts">
  // The inline editor under an open cue (Edit mode): its Look, Take, After and per-cue recall overrides.
  // Every change is one undoable edit (see actions.ts).
  import type { Cue, CueStack, ShowState } from '../../../../../shared/types'
  import { makeUnique, setCueAfter, setCueLook, setCueScope, setCueTake } from './actions'
  import { AFTERS, SCOPE_KEYS, TAKES, afterFromValue, effectiveScope, hasScopeOverride, nextScopeOverride, recallSummary, takeFromValue, takeValue, usedByCount } from './model'

  interface Props { stack: CueStack; cue: Cue; index: number; st: ShowState }
  let { stack, cue, index, st }: Props = $props()

  const n = $derived(index + 1)
  const preset = $derived(st.presets.find((p) => p.id === cue.presetId))
  const used = $derived(usedByCount(st, cue.presetId))
  const eff = $derived(effectiveScope(preset, cue))
  const summary = $derived(recallSummary(eff, hasScopeOverride(cue)))
  let customise = $state(false)
</script>

<div class="ceditor" data-cue-editor={cue.id}>
  <label class="r">
    <span>Look</span>
    <select class="u-select" name="cuePreset" value={cue.presetId}
      onchange={(e) => setCueLook(stack, cue, n, e.currentTarget.value, st.presets.find((p) => p.id === e.currentTarget.value)?.name ?? '')}>
      {#if !preset}<option value={cue.presetId}>(missing look)</option>{/if}
      {#each st.presets as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
    </select>
  </label>

  {#if used > 1}
    <div class="warn" data-shared><span>⚠ Used by {used} cues</span><button type="button" class="u-btn" data-make-unique onclick={() => makeUnique(stack, cue, n)}>Make unique</button></div>
  {:else}
    <div class="warn quiet">Only this cue uses this Look</div>
  {/if}

  <div class="r">
    <span>Take</span>
    <div class="u-seg blue" role="group" aria-label="Take">
      {#each TAKES as t (t.value)}
        <button type="button" data-take={t.value} class:sel={takeValue(cue.take) === t.value} aria-pressed={takeValue(cue.take) === t.value}
          onclick={() => setCueTake(stack, cue, n, takeFromValue(t.value), t.label)}>{t.label}</button>
      {/each}
    </div>
  </div>

  <label class="r">
    <span>After</span>
    <select class="u-select" name="cueAction" value={cue.action ?? ''}
      onchange={(e) => setCueAfter(stack, cue, n, afterFromValue(e.currentTarget.value), AFTERS.find((a) => a.value === e.currentTarget.value)?.label ?? 'Nothing')}>
      {#each AFTERS as a (a.value)}<option value={a.value}>{a.label}</option>{/each}
    </select>
  </label>

  <div class="r">
    <span>Recalls</span>
    <button type="button" class="recalls" data-recalls aria-expanded={customise} onclick={() => (customise = !customise)}>
      <span class="sum">{summary}</span><span class="car">Customise {customise ? '▴' : '›'}</span>
    </button>
  </div>

  {#if customise}
    <div class="chips" data-cue-scope={cue.id}>
      {#each SCOPE_KEYS as { key, label } (key)}
        {@const own = cue.scope?.[key]}
        {@const on = own ?? preset?.scope[key] ?? false}
        <button type="button" class="u-chip" class:on class:forced={own !== undefined} data-scope={key}
          aria-label="{label}: {own === undefined ? `inherits the Look (${on ? 'on' : 'off'})` : `forced ${own ? 'on' : 'off'} for this cue`}"
          onclick={() => setCueScope(stack, cue, n, key, nextScopeOverride(own), label)}>{label}{own === undefined ? '' : own ? ' ✓' : ' ✕'}</button>
      {/each}
    </div>
    <div class="hint">Tap cycles: inherit the Look → force on → force off.</div>
  {/if}
</div>

<style>
  .ceditor { padding: 4px 12px 14px; background: #181d27; border-bottom: 1px solid #2a3140; display: grid; gap: 10px; }
  .r { display: grid; grid-template-columns: 64px minmax(0, 1fr); gap: 8px; align-items: center; }
  .r > span:first-child { color: var(--ui-muted); font-size: 12px; }
  .warn { font-size: 12px; color: #fbbf24; display: flex; gap: 8px; align-items: center; margin-left: 72px; min-width: 0; }
  .warn .u-btn { margin-left: auto; flex: none; }
  .warn.quiet { color: var(--ui-muted); }
  .recalls { min-height: 44px; border: 1px solid var(--ui-field); border-radius: 8px; background: var(--ui-bg); display: flex; align-items: center; padding: 5px 12px; gap: 8px; color: #fff; width: 100%; font-size: 13px; text-align: left; min-width: 0; }
  .recalls:hover:not(:disabled) { background: var(--ui-bg); border-color: #4a5160; }
  .sum { min-width: 0; line-height: 1.25; white-space: normal; overflow-wrap: anywhere; }
  .car { margin-left: auto; color: var(--ui-muted); flex: none; }
  .chips { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-left: 72px; }
  .chips .u-chip { height: 44px; }
  .hint { font-size: 11px; color: var(--ui-muted); margin-left: 72px; }
</style>
