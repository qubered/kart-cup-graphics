<script lang="ts">
  // One cue in the rundown. Run: the whole row is a button that stands the cue by (loads its Look into Preview).
  // Edit: drag grip, a button that opens the inline editor, and a remove button.
  import type { CueStack, ShowState } from '../../../../../shared/types'
  import { dragSource } from '../../ui/drag'
  import CueEditor from './CueEditor.svelte'
  import { focusAfterMove, moveCue, removeCue, selectCue } from './actions'
  import { afterHint, rowFlags, takeLabel } from './model'

  interface Props { stack: CueStack; index: number; st: ShowState; edit: boolean; open: boolean; ontoggle: () => void }
  let { stack, index, st, edit, open, ontoggle }: Props = $props()

  const cue = $derived(stack.cues[index])
  const flags = $derived(rowFlags(stack, index))
  const preset = $derived(st.presets.find((p) => p.id === cue.presetId))
  const name = $derived(preset?.name ?? '(missing look)')
  const pill = $derived(cue.take ?? 'none')

  let gripEl = $state<HTMLButtonElement | undefined>()
  // After a keyboard move the row is re-inserted by the list update, which drops focus: put it back on the grip.
  $effect(() => {
    void index
    if (focusAfterMove.id === cue.id && gripEl) { focusAfterMove.id = null; gripEl.focus() }
  })

  function pick(e: MouseEvent) {
    selectCue(stack.id, cue, name)
    // A tapped row must not keep keyboard focus: Space and Enter are the take shortcuts.
    ;(e.currentTarget as HTMLElement).blur()
  }
  // Enter / Space on a focused row act on the row itself and never reach the global take shortcuts.
  function rowKey(e: KeyboardEvent, action: () => void) {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    e.stopPropagation()
    action()
  }
  function gripKey(e: KeyboardEvent) {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    e.stopPropagation()
    const to = index + (e.key === 'ArrowUp' ? -1 : 1)
    if (to < 0 || to >= stack.cues.length) return
    focusAfterMove.id = cue.id
    moveCue(stack, index, to)
  }
</script>

{#snippet face()}
  <span class="n">{index + 1}</span>
  <span class="who">
    <span class="nm">{name}</span>
    {#if flags.onAir || flags.next || cue.action}
      <span class="sub">
        {#if flags.onAir}<span class="u-tag pgm">ON AIR</span>{/if}
        {#if flags.next}<span class="u-tag pvw">NEXT</span>{/if}
        {#if cue.action}<span class="then">{afterHint(cue.action)}</span>{/if}
      </span>
    {/if}
  </span>
  <span class="u-pill {pill}">{takeLabel(cue.take)}</span>
{/snippet}

{#if !edit}
  <div class="cue" class:pgm={flags.onAir} class:pvw={flags.next && !flags.onAir} class:done={flags.done} data-cue={cue.id} data-drop-item>
    <button type="button" class="hit run" data-select aria-current={flags.next ? 'true' : undefined} onclick={pick} onkeydown={(e) => rowKey(e, () => selectCue(stack.id, cue, name))}>
      <span class="bar"></span>
      {@render face()}
    </button>
  </div>
{:else}
  <div class="cue ed" class:open class:pgm={flags.onAir} class:pvw={flags.next && !flags.onAir} class:done={flags.done} data-cue={cue.id} data-drop-item>
    <button type="button" class="u-grip grip" data-grip bind:this={gripEl} aria-label="Reorder cue {index + 1}: drag it, or use the up and down arrow keys"
      use:dragSource={{ kind: 'cue', id: cue.id, label: `${index + 1}  ${name}` }} onkeydown={gripKey}><i></i></button>
    <button type="button" class="hit" data-open aria-expanded={open} onclick={(e) => { ontoggle(); (e.currentTarget as HTMLElement).blur() }} onkeydown={(e) => rowKey(e, ontoggle)}>
      {@render face()}
    </button>
    <button type="button" class="x" data-remove aria-label="Remove cue {index + 1}" onclick={() => removeCue(stack, index)}>✕</button>
  </div>
  {#if open}<CueEditor {stack} {cue} {st} />{/if}
{/if}

<style>
  .cue { display: grid; min-height: 50px; border-bottom: 1px solid #1c1f26; position: relative; }
  .cue.pgm { background: rgba(220, 38, 38, .12); }
  .cue.pvw { background: rgba(22, 163, 74, .14); }
  .cue.done { opacity: .5; }
  .cue.ed { grid-template-columns: 40px minmax(0, 1fr) 44px; align-items: center; min-height: 54px; padding: 0 4px 0 0; }
  .cue.ed.open { background: #181d27; border-bottom: 0; }
  .cue.ed.open.pgm { background: #26202a; }

  .hit { display: grid; align-items: center; gap: 10px; width: 100%; min-height: 50px; margin: 0; padding: 0 12px 0 0; border: 0; border-radius: 0; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; grid-template-columns: 5px 28px minmax(0, 1fr) auto; }
  .hit:hover:not(:disabled) { background: transparent; border-color: transparent; }
  .hit:focus-visible { outline: 2px solid var(--ui-accent); outline-offset: -2px; }
  .ed .hit { grid-template-columns: 22px minmax(0, 1fr) auto; gap: 8px; min-height: 54px; padding: 0 4px 0 0; }
  .bar { align-self: stretch; }
  .pgm .bar { background: var(--ui-program); }
  .pvw .bar { background: var(--ui-preview); }
  .n { text-align: center; color: var(--ui-muted); font: 600 12px var(--ui-mono); }
  .who { display: grid; min-width: 0; }
  .nm { color: #fff; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sub { font-size: 11.5px; color: var(--ui-muted); display: flex; gap: 6px; align-items: center; margin-top: 2px; white-space: nowrap; }
  .then { font-size: 11px; color: #fbbf24; overflow: hidden; text-overflow: ellipsis; }

  .grip { margin: 0; padding: 0; width: 40px; height: 50px; border: 0; border-radius: 0; background: transparent; }
  .grip:hover:not(:disabled) { background: transparent; border-color: transparent; }
  .grip:focus-visible { outline: 2px solid var(--ui-accent); outline-offset: -2px; }
  .x { display: grid; place-items: center; width: 44px; height: 44px; padding: 0; border: 0; border-radius: 8px; background: transparent; color: #9ca3af; font-size: 16px; }
  .x:hover:not(:disabled) { background: rgba(220, 38, 38, .18); border-color: transparent; color: #fca5a5; }
</style>
