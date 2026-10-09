<script lang="ts">
  // The player's colour chip ("P1" on its colour). Tap it to pick another colour from the swatches.
  import { PLAYER_COLOURS, textOn } from '../../../../shared/palette'
  import type { ColourId } from '../../../../shared/types'

  let { slot, value, onchange }: { slot: number; value: ColourId; onchange: (id: ColourId) => void } = $props()

  let open = $state(false)
  let pos = $state({ left: 0, top: 0 })
  let root: HTMLDivElement | undefined = $state()
  let trigger: HTMLButtonElement | undefined = $state()
  const current = $derived(PLAYER_COLOURS.find((c) => c.id === value))

  $effect(() => {
    if (!open) return
    const off = (e: PointerEvent) => { if (root && !root.contains(e.target as Node)) open = false }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); open = false; trigger?.focus() } }
    document.addEventListener('pointerdown', off)
    document.addEventListener('keydown', esc, true)
    return () => { document.removeEventListener('pointerdown', off); document.removeEventListener('keydown', esc, true) }
  })

  function toggle() {
    if (!open) {
      const r = trigger?.getBoundingClientRect()
      // 4 swatches of 44px + gaps + padding = about 220px wide, 120px tall
      if (r) pos = { left: Math.max(8, Math.min(r.left, window.innerWidth - 236)), top: r.bottom + 4 + 130 > window.innerHeight ? Math.max(8, r.top - 134) : r.bottom + 4 }
    }
    open = !open
  }
</script>

<div class="cc" bind:this={root}>
  <button type="button" class="chip" bind:this={trigger} data-colour-chip aria-haspopup="listbox" aria-expanded={open}
    aria-label="Player {slot + 1} colour: {current?.name ?? ''}" style="background:{current?.hex ?? '#444'};color:{textOn(value)}" onclick={toggle}>P{slot + 1}</button>
  {#if open}
    <div class="pop" role="radiogroup" aria-label="Colour" style="left:{pos.left}px;top:{pos.top}px">
      {#each PLAYER_COLOURS as c (c.id)}
        <button type="button" class="swatch" class:on={value === c.id} style="background:{c.hex}" role="radio" aria-checked={value === c.id} aria-label={c.name} title={c.name} data-colour={c.id}
          onclick={() => { onchange(c.id); open = false; trigger?.focus() }}></button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .cc { position: relative; }
  .chip { width: 44px; height: 44px; padding: 0; border-radius: 9px; border: 2px solid rgba(255,255,255,.14); font-weight: 800; font-size: 14px; }
  .chip:hover:not(:disabled) { border-color: rgba(255,255,255,.55); }
  .pop { position: fixed; z-index: 40; background: var(--ui-panel); border: 1px solid var(--ui-field); border-radius: 10px; padding: 8px; box-shadow: 0 12px 32px rgba(0,0,0,.6); display: grid; grid-template-columns: repeat(4, 44px); gap: 6px; }
  .swatch { width: 44px; height: 44px; padding: 0; border-radius: 9px; border: 3px solid transparent; }
  .swatch.on { border-color: #fff; box-shadow: 0 0 0 2px var(--ui-accent); }
</style>
