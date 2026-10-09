<script lang="ts">
  // Player colour picker with 44px swatches (the Tournament workspace's own copy of the shared select).
  import { PLAYER_COLOURS } from '../../../../shared/palette'
  import type { ColourId } from '../../../../shared/types'

  let { value, onchange, label = 'Colour', disabled = false }: { value: ColourId; onchange: (id: ColourId) => void; label?: string; disabled?: boolean } = $props()

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
  <button type="button" class="cur" data-colour-pick {disabled} aria-haspopup="listbox" aria-expanded={open} aria-label="{label}: {current?.name ?? ''}" onclick={() => (open = !open)}>
    <i class="dot" style="background:{current?.hex ?? '#444'}"></i><span class="nm">{current?.name ?? 'Colour'}</span><span class="car">▾</span>
  </button>
  {#if open}
    <div class="pop" role="radiogroup" aria-label={label}>
      {#each PLAYER_COLOURS as c (c.id)}
        <button
          type="button" class="sw" class:on={value === c.id} style="background:{c.hex}" role="radio" aria-checked={value === c.id}
          aria-label={c.name} title={c.name} data-colour={c.id} {disabled}
          onclick={() => { onchange(c.id); open = false }}
        ></button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .cl { position: relative; min-width: 0; }
  .cur { display: flex; align-items: center; gap: 8px; width: 100%; height: 44px; padding: 0 10px; background: var(--ui-bg); color: #fff; border: 1px solid var(--ui-field); border-radius: 8px; cursor: pointer; text-align: left; font-size: 14px; white-space: nowrap; }
  .cur:disabled { opacity: .45; cursor: not-allowed; }
  .dot { width: 20px; height: 20px; border-radius: 5px; display: block; flex: none; }
  .nm { overflow: hidden; text-overflow: ellipsis; }
  .car { margin-left: auto; color: var(--ui-muted); }
  .pop { position: absolute; z-index: 20; top: 100%; right: 0; margin-top: 2px; background: var(--ui-panel); border: 1px solid var(--ui-field); border-radius: 8px; padding: 8px; box-shadow: 0 8px 24px rgba(0,0,0,.5); display: grid; grid-template-columns: repeat(4, 44px); gap: 8px; }
  .sw { width: 44px; height: 44px; border-radius: 8px; border: 2px solid transparent; padding: 0; cursor: pointer; }
  .sw.on { border-color: #fff; box-shadow: 0 0 0 2px var(--ui-accent); }
  .sw:disabled { opacity: .5; cursor: not-allowed; }
</style>
