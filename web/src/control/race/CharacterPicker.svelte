<script lang="ts">
  // Character picker for a player row: a 44px button that opens a searchable list. The list is positioned on the screen
  // (not inside the row) so the scrolling pad never clips it, and it opens upwards when there is no room below.
  import type { CatalogIndex } from '../../../../shared/catalog'
  import { searchCharacters } from '../catalog'

  let { value, catalog, onchange, label = 'Character' }: { value: string; catalog: CatalogIndex; onchange: (id: string) => void; label?: string } = $props()

  let open = $state(false)
  let q = $state('')
  let active = $state(0)
  let pos = $state({ left: 0, top: 0, bottom: 0, up: false, width: 280 })
  let input: HTMLInputElement | undefined = $state()
  let root: HTMLDivElement | undefined = $state()
  let trigger: HTMLButtonElement | undefined = $state()

  const current = $derived(catalog.character(value))
  const results = $derived(searchCharacters(catalog, q))

  $effect(() => { if (open) input?.focus() })
  $effect(() => {
    if (!open) return
    const off = (e: PointerEvent) => { if (root && !root.contains(e.target as Node)) close() }
    document.addEventListener('pointerdown', off)
    return () => document.removeEventListener('pointerdown', off)
  })

  function toggle() {
    if (open) return close()
    const r = trigger?.getBoundingClientRect()
    if (r) {
      const below = window.innerHeight - r.bottom
      const width = Math.max(280, r.width)
      pos = { left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)), top: r.bottom + 4, bottom: window.innerHeight - r.top + 4, up: below < 360 && r.top > below, width }
    }
    open = true
  }
  function close() { open = false; q = ''; active = 0 }
  function pick(id: string) { onchange(id); close(); trigger?.focus() }
  function key(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, results.length - 1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0) }
    else if (e.key === 'Enter') { e.preventDefault(); if (results[active]) pick(results[active].id) }
    else if (e.key === 'Escape') { e.stopPropagation(); close(); trigger?.focus() }
  }
</script>

<div class="cp" bind:this={root}>
  <button type="button" class="cur" bind:this={trigger} data-character aria-haspopup="listbox" aria-expanded={open} aria-label="{label}: {current?.name ?? 'none'}" onclick={toggle}>
    {#if current}<img src={current.icon} alt="" width="28" height="28" />{/if}
    <span class="nm">{current?.name ?? 'Choose…'}</span><span class="car" aria-hidden="true">▾</span>
  </button>
  {#if open}
    <div class="pop" style="left:{pos.left}px;width:{pos.width}px;{pos.up ? `bottom:${pos.bottom}px` : `top:${pos.top}px`}">
      <input bind:this={input} bind:value={q} oninput={() => (active = 0)} onkeydown={key} placeholder="Search characters…" aria-label="Search characters" class="u-input" />
      <ul role="listbox" aria-label="Characters">
        {#each results as c, i (c.id)}
          <li role="option" aria-selected={i === active} class:active={i === active} data-option={c.id}>
            <button type="button" tabindex="-1" onmousedown={(e) => e.preventDefault()} onclick={() => pick(c.id)}>
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
  .cp { position: relative; min-width: 0; }
  .cur { display: flex; align-items: center; gap: 8px; width: 100%; height: 44px; padding: 0 10px; background: var(--ui-bg); color: #fff; border: 1px solid var(--ui-field); border-radius: 8px; white-space: nowrap; text-align: left; font-size: 14px; }
  .cur img { width: 28px; height: 28px; object-fit: contain; flex: none; }
  .nm { overflow: hidden; text-overflow: ellipsis; min-width: 0; }
  .car { margin-left: auto; color: var(--ui-muted); }
  .pop { position: fixed; z-index: 40; background: var(--ui-panel); border: 1px solid var(--ui-field); border-radius: 10px; padding: 8px; box-shadow: 0 12px 32px rgba(0,0,0,.6); display: grid; gap: 6px; }
  ul { list-style: none; margin: 0; padding: 0; max-height: 300px; overflow: auto; }
  li button { display: flex; align-items: center; gap: 10px; width: 100%; height: 44px; padding: 0 10px; background: none; border: 0; border-radius: 6px; color: inherit; font-size: 14px; text-align: left; }
  li.active button { background: var(--ui-accent); }
  .none { padding: 12px; color: var(--ui-muted); }
</style>
