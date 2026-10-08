<script lang="ts">
  import type { CatalogIndex } from '../../../../shared/catalog'
  import { searchCharacters } from '../catalog'

  let { value, catalog, onchange, disabled = false }: { value: string; catalog: CatalogIndex; onchange: (id: string) => void; disabled?: boolean } = $props()

  let open = $state(false)
  let q = $state('')
  let active = $state(0)
  let input: HTMLInputElement | undefined = $state()
  let root: HTMLDivElement | undefined = $state()

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
  <button type="button" class="cur" data-character {disabled} onclick={() => (open = !open)} aria-haspopup="listbox" aria-expanded={open}>
    {#if current}<img src={current.icon} alt="" width="22" height="22" />{/if}
    <span>{current?.name ?? 'Choose…'}</span>
  </button>
  {#if open}
    <div class="pop">
      <input bind:this={input} bind:value={q} oninput={() => (active = 0)} onkeydown={key} placeholder="Search characters…" aria-label="Search characters" />
      <ul role="listbox">
        {#each results as c, i (c.id)}
          <li role="option" aria-selected={i === active} class:active={i === active} data-option={c.id}>
            <button type="button" tabindex="-1" onmousedown={(e) => e.preventDefault()} onclick={() => pick(c.id)} onmouseenter={() => (active = i)}>
              <img src={c.icon} alt="" width="22" height="22" /><span>{c.name}</span>
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
  .cs { position: relative; min-width: 180px; }
  .cur { display: flex; align-items: center; gap: 6px; width: 100%; padding: 4px 8px; background: #1f2937; color: inherit; border: 1px solid #374151; border-radius: 6px; cursor: pointer; text-align: left; font: inherit; }
  .cur:disabled { opacity: 0.5; cursor: not-allowed; }
  .pop { position: absolute; z-index: 20; top: 100%; left: 0; width: 260px; background: #111827; border: 1px solid #374151; border-radius: 6px; padding: 6px; box-shadow: 0 8px 24px rgba(0,0,0,.5); }
  input { width: 100%; box-sizing: border-box; padding: 4px 6px; background: #1f2937; color: inherit; border: 1px solid #374151; border-radius: 4px; font: inherit; }
  ul { list-style: none; margin: 6px 0 0; padding: 0; max-height: 260px; overflow: auto; }
  li button { display: flex; align-items: center; gap: 6px; width: 100%; padding: 3px 6px; background: none; border: 0; color: inherit; font: inherit; cursor: pointer; text-align: left; }
  li.active button { background: #3b82f6; }
  .none { padding: 6px; opacity: 0.6; }
</style>
