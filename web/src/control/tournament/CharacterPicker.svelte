<script lang="ts">
  // Searchable character picker with 44px targets (the Tournament workspace's own copy of the shared select).
  import type { CatalogIndex } from '../../../../shared/catalog'
  import { searchCharacters } from '../catalog'

  let { value, catalog, onchange, label = 'Character', disabled = false }: { value: string; catalog: CatalogIndex; onchange: (id: string) => void; label?: string; disabled?: boolean } = $props()

  let open = $state(false)
  let q = $state('')
  let active = $state(0)
  let input: HTMLInputElement | undefined = $state()
  let root: HTMLDivElement | undefined = $state()

  /** Open upwards (and shorten the list) when the page would cut the popup off below the button. */
  let up = $state(false)
  let room = $state(280)
  function toggle(e: MouseEvent) {
    if (!open) {
      const b = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const box = root?.closest('.u-grow')?.getBoundingClientRect()
      const below = (box?.bottom ?? window.innerHeight) - b.bottom - 12
      const above = b.top - (box?.top ?? 0) - 12
      up = below < 340 && above > below
      room = Math.max(140, Math.min(280, (up ? above : below) - 64))
    }
    open = !open
  }

  const current = $derived(catalog.character(value))
  const results = $derived(searchCharacters(catalog, q))

  $effect(() => {
    if (open) input?.focus()
  })
  $effect(() => {
    if (!open) return
    const off = (e: MouseEvent) => { if (root && !root.contains(e.target as Node)) close() }
    document.addEventListener('mousedown', off)
    return () => document.removeEventListener('mousedown', off)
  })

  function close() { open = false; q = ''; active = 0 }
  function pick(id: string) { onchange(id); close() }
  function key(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, results.length - 1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0) }
    else if (e.key === 'Enter') { e.preventDefault(); if (results[active]) pick(results[active].id) }
    else if (e.key === 'Escape') { e.stopPropagation(); close() }
  }
</script>

<div class="cs" bind:this={root}>
  <button type="button" class="cur" data-character {disabled} onclick={toggle} aria-haspopup="listbox" aria-expanded={open} aria-label="{label}: {current?.name ?? 'none'}">
    {#if current}<img src={current.icon} alt="" width="28" height="28" />{/if}
    <span class="nm">{current?.name ?? 'Choose…'}</span><span class="car">▾</span>
  </button>
  {#if open}
    <div class="pop" class:up>
      <input bind:this={input} bind:value={q} oninput={() => (active = 0)} onkeydown={key} placeholder="Search characters…" aria-label="Search characters" />
      <ul role="listbox" style="max-height:{room}px">
        {#each results as c, i (c.id)}
          <li role="option" aria-selected={i === active} class:active={i === active} data-option={c.id}>
            <button type="button" tabindex="-1" onmousedown={(e) => e.preventDefault()} onclick={() => pick(c.id)} onmouseenter={() => (active = i)}>
              <img src={c.icon} alt="" width="28" height="28" /><span>{c.name}</span>
            </button>
          </li>
        {:else}
          <li class="none">No matches</li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<style>
  .cs { position: relative; min-width: 0; }
  .cur { display: flex; align-items: center; gap: 8px; width: 100%; height: 44px; padding: 0 10px; background: var(--ui-bg); color: #fff; border: 1px solid var(--ui-field); border-radius: 8px; white-space: nowrap; cursor: pointer; text-align: left; font-size: 14px; }
  .cur:disabled { opacity: .5; cursor: not-allowed; }
  .cur img { width: 28px; height: 28px; object-fit: contain; flex: none; }
  .nm { overflow: hidden; text-overflow: ellipsis; }
  .car { margin-left: auto; color: var(--ui-muted); }
  .pop { position: absolute; z-index: 20; top: 100%; left: 0; width: 280px; margin-top: 2px; background: var(--ui-panel); border: 1px solid var(--ui-field); border-radius: 8px; padding: 6px; box-shadow: 0 8px 24px rgba(0,0,0,.5); }
  input { width: 100%; height: 44px; padding: 0 10px; background: var(--ui-bg); color: inherit; border: 1px solid var(--ui-field); border-radius: 6px; font: inherit; }
  .pop.up { top: auto; bottom: 100%; margin-top: 0; margin-bottom: 2px; }
  ul { list-style: none; margin: 6px 0 0; padding: 0; overflow: auto; }
  li button { display: flex; align-items: center; gap: 8px; width: 100%; min-height: 40px; padding: 4px 8px; background: none; border: 0; border-radius: 6px; color: inherit; font: inherit; font-size: 14px; cursor: pointer; text-align: left; }
  li.active button { background: var(--ui-accent); }
  .none { padding: 8px; opacity: .6; }
</style>
