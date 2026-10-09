<script lang="ts">
  import './ui/ui.css'
  import { control, send } from './store'
  import { shortcutCommand } from './shortcuts'
  import { activeStack, editRundown, page, undo } from './ui'
  import TopBar from './TopBar.svelte'
  import MasterBar from './MasterBar.svelte'
  import Toasts from './ui/Toasts.svelte'
  import Live from './live/Live.svelte'
  import Race from './race/Race.svelte'
  import Workspace from './tournament/Workspace.svelte'
  import Setup from './setup/Setup.svelte'

  const st = $derived($control.payload?.state)
  const TEXT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

  function onKeydown(e: KeyboardEvent) {
    const el = e.target as HTMLElement | null
    const typing = TEXT_TAGS.has((el?.tagName ?? '').toUpperCase()) || !!el?.isContentEditable
    // Undo: Ctrl/Cmd+Z. Text fields keep their own native undo.
    if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'z') {
      if (typing || !$control.connected) return
      e.preventDefault()
      undo()
      return
    }
    if (!st || !$control.connected || e.ctrlKey || e.metaKey || e.altKey) return
    // The notice editor is a rich-text field: typing there (space, Enter, capital B...) must never fire the show shortcuts.
    if (el?.isContentEditable && e.key !== 'Escape') return
    const cmd = shortcutCommand(
      { key: e.key, shiftKey: e.shiftKey, targetTag: el?.tagName ?? 'BODY' },
      { outputs: st.outputs.map((o) => o.id), armed: st.armed, hold: st.overlay.hold.on, ftb: st.overlay.ftb, goStackId: $editRundown ? null : ($activeStack?.id ?? null) },
    )
    if (cmd) {
      e.preventDefault()
      send(cmd)
    }
  }
  function onKeyup(e: KeyboardEvent) {
    // Stop a focused button from also "clicking" on Space.
    if (e.key === ' ' && (e.target as HTMLElement | null)?.tagName === 'BUTTON') e.preventDefault()
  }
</script>

<svelte:window onkeydown={onKeydown} onkeyup={onKeyup} />

{#if !$control.connected}
  <div class="banner" role="alert">Disconnected — reconnecting…</div>
{/if}
<Toasts />

<fieldset class="bare shell" disabled={!$control.connected}>
  <TopBar />
  <div class="page">
    {#if $page === 'live'}
      <Live />
    {:else if $page === 'race'}
      <Race />
    {:else if $page === 'tour'}
      <Workspace />
    {:else}
      <Setup />
    {/if}
  </div>
  <MasterBar />
</fieldset>

<style>
  .page { min-height: 0; min-width: 0; position: relative; }
</style>
