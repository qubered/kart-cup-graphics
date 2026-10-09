<script lang="ts">
  // One tab per output (the screen the monitors and the scene editor follow). LED = connected pages, amber badge = changes pending in Preview.
  import { light } from '../../presence'
  import { control, selectOutput } from '../../store'

  const outputs = $derived($control.payload?.state.outputs ?? [])
  const pending = $derived($control.payload?.pending ?? {})
  const presence = $derived($control.payload?.presence ?? {})
</script>

<div class="otabs" role="tablist" aria-label="Outputs">
  {#each outputs as o (o.id)}
    {@const lt = light(presence[o.id], o.format)}
    <button class="otab" role="tab" data-output-tab={o.id} aria-selected={$control.selectedOutput === o.id} onclick={() => selectOutput(o.id)}>
      <span class="led" class:on={lt === 'on'} class:partial={lt === 'partial'}></span>{o.name}
      {#if (pending[o.id] ?? 0) > 0}<span class="badge" data-pending title="Changes in Preview that Program does not have yet">{pending[o.id]}</span>{/if}
    </button>
  {/each}
  <a class="otab mv" href="/multiview" target="_blank" rel="noopener">Open Multiview ↗</a>
</div>

<style>
  .otabs { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; flex: none; }
  .otab { display: inline-flex; align-items: center; gap: 8px; height: 44px; padding: 0 16px; border-radius: 9px; border: 1px solid var(--ui-line); background: transparent; color: var(--ui-muted); font-size: 14px; font-weight: 600; text-decoration: none; cursor: pointer; white-space: nowrap; }
  .otab:hover:not(:disabled) { background: #181c24; border-color: var(--ui-line); color: #fff; }
  .otab[aria-selected='true'] { background: #1d2430; border-color: #3a4455; color: #fff; }
  .mv { margin-left: auto; font-weight: 500; }
  .led { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #4b5563; flex: none; }
  .led.on { background: #22c55e; }
  .led.partial { background: #f59e0b; }
  .badge { background: var(--ui-pending); color: #111; font: 700 11px/1 var(--ui-font); border-radius: 9px; padding: 3px 7px; }
</style>
