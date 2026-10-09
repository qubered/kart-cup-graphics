<script lang="ts">
  // The big GO: fires the standby cue. Locked (disabled, greyed) while the rundown is in Edit mode.
  import type { CueStack, ShowState } from '../../../../../shared/types'
  import { goStack } from './actions'
  import { standbyIndex, takeLabel } from './model'

  interface Props { stack: CueStack; st: ShowState; locked?: boolean }
  let { stack, st, locked = false }: Props = $props()

  const idx = $derived(standbyIndex(stack))
  const standby = $derived(stack.cues[idx])
  const lookName = $derived(standby ? (st.presets.find((p) => p.id === standby.presetId)?.name ?? '(missing look)') : '')
  const off = $derived(locked || !standby)
</script>

<button type="button" class="go" class:off class:locked data-go data-stack-go disabled={off} onclick={() => goStack(stack.id)}>
  <span class="gl">GO</span>
  <span class="gt">
    {#if locked}
      <small>Locked while editing</small>
    {:else if standby}
      <small>Fires cue {idx + 1} · {takeLabel(standby.take)}</small>
      <b>{lookName}</b>
    {:else if stack.cues.length}
      <small>End of rundown</small>
      <b>Rewind to start again</b>
    {:else}
      <small>No cues yet</small>
      <b>Switch to Edit to add some</b>
    {/if}
  </span>
  {#if !locked}<kbd>G</kbd>{/if}
</button>

<style>
  .go { height: 78px; width: 100%; border-radius: 10px; background: var(--ui-preview); color: #03140a; display: flex; align-items: center; gap: 14px; padding: 0 16px; border: 1px solid #22c55e; text-align: left; cursor: pointer; }
  .go:hover:not(:disabled) { background: #19b04f; border-color: #4ade80; }
  .go:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
  .gl { font: 800 34px/1 var(--ui-font); letter-spacing: .04em; }
  .gt { display: flex; flex-direction: column; min-width: 0; }
  .gt small { font-size: 11.5px; font-weight: 600; opacity: .8; }
  .gt b { font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .go kbd { margin-left: auto; background: rgba(0, 0, 0, .22); color: #052e16; }
  .go.off { background: #1b1f27; border-color: var(--ui-field); color: #6b7280; opacity: 1; }
  .go.off kbd { background: #0c0e12; color: #6b7280; }
  .go.locked { height: 46px; }
  .go.locked .gl { font-size: 20px; }
</style>
