<script lang="ts">
  import './ui.css'
  import { control } from '../store'
  import { dismissToast, toasts, undo } from '../ui'
</script>

<div class="u-toasts" aria-live="polite">
  {#if $control.error}
    <div class="u-toast error" role="status">{$control.error}</div>
  {/if}
  {#each $toasts as t (t.id)}
    <div class="u-toast" class:error={t.kind === 'error'} role="status" data-toast>
      <span>{t.message}</span>
      {#if t.undoable}<button type="button" data-undo onclick={() => { dismissToast(t.id); undo() }}>Undo</button>{/if}
      <button type="button" class="x" aria-label="Dismiss" onclick={() => dismissToast(t.id)}>✕</button>
    </div>
  {/each}
</div>
