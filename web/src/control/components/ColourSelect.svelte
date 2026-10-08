<script lang="ts">
  import { PLAYER_COLOURS } from '../../../../shared/palette'
  import type { ColourId } from '../../../../shared/types'
  let { value, onchange, disabled = false }: { value: ColourId; onchange: (id: ColourId) => void; disabled?: boolean } = $props()

  let open = $state(false)
  let root: HTMLDivElement | undefined = $state()
  const current = $derived(PLAYER_COLOURS.find((c) => c.id === value))

  $effect(() => {
    if (!open) return
    const off = (e: MouseEvent) => { if (root && !root.contains(e.target as Node)) open = false }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); open = false } }
    document.addEventListener('mousedown', off)
    document.addEventListener('keydown', esc, true)
    return () => { document.removeEventListener('mousedown', off); document.removeEventListener('keydown', esc, true) }
  })
</script>

<div class="cl" bind:this={root}>
  <button type="button" class="cur" {disabled} aria-haspopup="listbox" aria-expanded={open} aria-label="Colour: {current?.name ?? ''}" onclick={() => (open = !open)}>
    <i class="dot" style="background:{current?.hex ?? '#444'}"></i><span>{current?.name ?? 'Colour'}</span><span class="car">▾</span>
  </button>
  {#if open}
    <div class="pop swatches" role="radiogroup" aria-label="Colour">
      {#each PLAYER_COLOURS as c (c.id)}
        <button
          type="button"
          class="sw"
          class:on={value === c.id}
          style="background:{c.hex}"
          role="radio"
          aria-checked={value === c.id}
          aria-label={c.name}
          title={c.name}
          data-colour={c.id}
          {disabled}
          onclick={() => { onchange(c.id); open = false }}
        ></button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .cl { position: relative; min-width: 0; }
  .cur { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 9px; background: var(--ui-bg); color: #fff; border: 1px solid var(--ui-field); border-radius: 6px; cursor: pointer; text-align: left; font: inherit; font-size: 14px; white-space: nowrap; }
  .cur:disabled { opacity: .45; cursor: not-allowed; }
  .dot { width: 16px; height: 16px; border-radius: 4px; display: block; flex: none; }
  .car { margin-left: auto; color: var(--ui-muted); }
  .pop { position: absolute; z-index: 20; top: 100%; right: 0; margin-top: 2px; background: var(--ui-panel); border: 1px solid var(--ui-field); border-radius: 6px; padding: 8px; box-shadow: 0 8px 24px rgba(0,0,0,.5); display: grid; grid-template-columns: repeat(4, 26px); gap: 6px; }
  .sw { width: 26px; height: 26px; border-radius: 6px; border: 2px solid transparent; padding: 0; cursor: pointer; }
  .sw.on { border-color: #fff; box-shadow: 0 0 0 2px var(--ui-accent); }
  .sw:disabled { opacity: .5; cursor: not-allowed; }
</style>
