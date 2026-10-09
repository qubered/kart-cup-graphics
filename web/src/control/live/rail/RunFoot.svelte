<script lang="ts">
  // Run mode footer: GO, then Back / Skip (move the standby cue) and Rewind.
  import type { CueStack, ShowState } from '../../../../../shared/types'
  import GoButton from './GoButton.svelte'
  import { rewind, stepSelection } from './actions'
  import { currentIndex, standbyIndex } from './model'

  interface Props { stack: CueStack; st: ShowState }
  let { stack, st }: Props = $props()

  const idx = $derived(standbyIndex(stack))
  const lookName = (i: number) => {
    const c = stack.cues[i]
    return (c && st.presets.find((p) => p.id === c.presetId)?.name) || 'cue'
  }
  const canBack = $derived(idx >= 1)
  const canSkip = $derived(stack.cues.length > 0 && idx < stack.cues.length - 1)
  const canRewind = $derived(currentIndex(stack) !== -1 || idx > 0)
</script>

<div class="rfoot">
  <GoButton {stack} {st} />
  <div class="steps">
    <button type="button" class="u-btn" data-select-prev disabled={!canBack} onclick={() => stepSelection(stack.id, -1, lookName(idx - 1))}>◀ Back</button>
    <button type="button" class="u-btn" data-select-next disabled={!canSkip} onclick={() => stepSelection(stack.id, 1, lookName(idx + 1))}>Skip ▶</button>
    <button type="button" class="u-btn" data-stack-rewind disabled={!canRewind} onclick={() => rewind(stack, lookName(0))}>Rewind</button>
  </div>
</div>

<style>
  .rfoot { display: grid; gap: 8px; padding: 12px; border-top: 1px solid var(--ui-line); background: #101319; flex: none; grid-template-columns: minmax(0, 1fr); }
  .steps { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
  .steps .u-btn { padding: 0; }
</style>
