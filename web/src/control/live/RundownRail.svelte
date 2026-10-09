<script lang="ts">
  // The rundown rail (left column of the Live page). Run: tap a row to stand it by, GO fires it. Edit (GO locked): drag to reorder or to add Looks,
  // open a cue to change its Look / take / after / recalls, remove it. Every edit is undoable (see rail/actions.ts).
  import { tick } from 'svelte'
  import { control } from '../store'
  import { activeStack, editRundown } from '../ui'
  import { dropZone, type DragPayload } from '../ui/drag'
  import CueRow from './rail/CueRow.svelte'
  import EditFoot from './rail/EditFoot.svelte'
  import RailHeader from './rail/RailHeader.svelte'
  import RunFoot from './rail/RunFoot.svelte'
  import { addCueFromLook, moveCue, newRundown } from './rail/actions'
  import { dropDestination, nextRundownName, standbyIndex } from './rail/model'

  const st = $derived($control.payload?.state)
  const stack = $derived($activeStack)
  const edit = $derived($editRundown)

  // The cue whose editor is open (Edit mode only). Closed when the mode or the rundown changes, or when the cue is gone.
  let openCue = $state<string | null>(null)
  let key = ''
  $effect(() => {
    const k = `${stack?.id}|${edit}`
    if (k !== key) { key = k; openCue = null }
  })
  const openId = $derived(edit && stack?.cues.some((c) => c.id === openCue) ? openCue : null)

  let panel = $state<HTMLElement | undefined>()
  // In Run mode keep the NEXT row on screen as GO and Back / Skip move it down a long rundown.
  const nextCueId = $derived(stack ? stack.cues[standbyIndex(stack)]?.id : undefined)
  $effect(() => {
    const id = nextCueId
    if (!id || edit) return
    void tick().then(() => panel?.querySelector(`[data-cue="${id}"]`)?.scrollIntoView({ block: 'nearest' }))
  })
  /** Open a cue's editor and bring it into view (it sits right under its row). */
  async function reveal(cueId: string) {
    openCue = cueId
    await tick()
    panel?.querySelector(`[data-cue-editor="${cueId}"]`)?.scrollIntoView({ block: 'nearest' })
  }
  const toggle = (cueId: string) => { if (openId === cueId) openCue = null; else void reveal(cueId) }

  // Drops: a cue reorders the list; a Look from the library adds a cue at the drop slot. Edit mode only (the zone accepts nothing in Run).
  function onDrop(p: DragPayload, index: number) {
    const s = stack
    if (!$control.connected || !$editRundown || !s) return
    if (p.kind === 'cue') {
      const from = s.cues.findIndex((c) => c.id === p.id)
      if (from !== -1) moveCue(s, from, dropDestination(from, index))
    } else if (p.kind === 'look') {
      const look = st?.presets.find((x) => x.id === p.id)
      if (look) void addCueFromLook(s.id, look.id, Math.min(index, s.cues.length))
    }
  }
</script>

<section class="u-panel rail" class:editing={edit} data-rail data-stack={stack?.id} aria-label="Rundown" bind:this={panel}>
  <RailHeader {stack} stacks={st?.stacks ?? []} />
  {#if edit}<div class="editbar" role="status">EDITING — GO is locked. Switch to Run to fire cues.</div>{/if}

  {#if st && stack}
    <div class="u-grow list" use:dropZone={{ accept: edit ? ['look', 'cue'] : [], onDrop }}>
      {#each stack.cues as cue, i (cue.id)}
        <CueRow {stack} index={i} {st} {edit} open={openId === cue.id} ontoggle={() => toggle(cue.id)} />
      {/each}
      {#if !stack.cues.length}
        <div class="u-empty" data-empty><b>No cues yet</b><span>{edit ? 'Set up Preview how you want it, then tap “Add cue from Preview”.' : 'Switch to Edit to build this rundown.'}</span></div>
      {/if}
    </div>
    {#if edit}<EditFoot {stack} {st} onadded={reveal} />{:else}<RunFoot {stack} {st} />{/if}
  {:else}
    <div class="u-grow">
      <div class="u-empty" data-empty>
        <b>No rundown yet</b><span>A rundown is the running order of Looks you fire with GO.</span>
        <button type="button" class="u-btn acc make" data-new-rundown disabled={!st} onclick={() => newRundown(nextRundownName(st?.stacks ?? []))}>＋ New rundown</button>
      </div>
    </div>
  {/if}
</section>

<style>
  .editbar { background: #3a2a07; color: #fde68a; font-size: 12px; font-weight: 600; padding: 7px 12px; border-bottom: 1px solid #5c4410; flex: none; }
  .list { position: relative; }
  .make { margin: 8px auto 0; }
</style>
