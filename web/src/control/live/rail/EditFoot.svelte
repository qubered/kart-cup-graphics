<script lang="ts">
  // Edit mode footer: add a cue from Preview in one step, where Looks come from, a new rundown, and the locked GO.
  import type { CueStack, ShowState } from '../../../../../shared/types'
  import { control } from '../../store'
  import GoButton from './GoButton.svelte'
  import { addCueFromPreview, newRundown } from './actions'
  import { loadedPreset, nextRundownName, previewModified, suggestLookName } from './model'

  interface Props { stack: CueStack; st: ShowState; onadded: (cueId: string) => void }
  let { stack, st, onadded }: Props = $props()

  const loaded = $derived(loadedPreset(st))
  const modified = $derived(previewModified(st))
  const suggested = $derived(suggestLookName(st, $control.selectedOutput))
  // Held until the new cue shows up (or the server refuses), so a double tap cannot add two.
  let busy = $state(false)

  async function add() {
    if (busy) return
    busy = true
    try {
      const id = await addCueFromPreview(stack.id, suggested)
      if (id) onadded(id)
    } finally { busy = false }
  }
</script>

<div class="rfoot">
  <button type="button" class="u-btn ghost addprev" data-add-from-preview disabled={busy} onclick={add}>
    <span>＋ Add cue from Preview</span>
    <span class="what">{loaded?.name ?? 'New look'}{#if modified}<span class="mod"> · modified</span>{/if} → saved as “{suggested}”</span>
  </button>
  <div class="u-dim u-sm hint">Add from the Looks library: tap ＋ on a Look or drag its grip onto this list</div>
  <button type="button" class="u-btn" data-new-rundown onclick={() => newRundown(nextRundownName(st.stacks))}>＋ New rundown</button>
  <GoButton {stack} {st} locked />
</div>

<style>
  .rfoot { display: grid; gap: 8px; padding: 12px; border-top: 1px solid var(--ui-line); background: #101319; flex: none; grid-template-columns: minmax(0, 1fr); }
  .u-btn.addprev { height: 58px; flex-direction: column; gap: 2px; border-color: var(--ui-accent); color: #bfdbfe; min-width: 0; }
  .what { font-weight: 400; font-size: 11px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--ui-muted); }
  .mod { color: #fbbf24; font-weight: 600; }
  .hint { text-align: center; }
</style>
