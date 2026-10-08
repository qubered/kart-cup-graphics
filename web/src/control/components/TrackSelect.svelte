<script lang="ts">
  import type { CatalogIndex } from '../../../../shared/catalog'
  import { searchTracks } from '../catalog'

  let { value, catalog, onchange, disabled = false }: { value: string; catalog: CatalogIndex; onchange: (id: string) => void; disabled?: boolean } = $props()

  let open = $state(false)
  let q = $state('')
  let active = $state(0)
  let input: HTMLInputElement | undefined = $state()
  let root: HTMLDivElement | undefined = $state()

  const current = $derived(catalog.track(value))
  const groups = $derived(searchTracks(catalog, q))
  const flat = $derived(groups.flatMap((g) => g.tracks))

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
    if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, flat.length - 1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0) }
    else if (e.key === 'Enter') { e.preventDefault(); if (flat[active]) pick(flat[active].id) }
    else if (e.key === 'Escape') { e.stopPropagation(); close() }
  }
</script>

<div class="ts" bind:this={root}>
  <button type="button" class="cur" data-track {disabled} onclick={() => (open = !open)} aria-haspopup="listbox" aria-expanded={open}>
    {#if current}<img src={current.thumb} alt="" width="40" height="24" />{/if}
    <span>{current?.name ?? 'Choose a track…'}</span><span class="car">▾</span>
  </button>
  {#if open}
    <div class="pop">
      <input bind:this={input} bind:value={q} oninput={() => (active = 0)} onkeydown={key} placeholder="Search tracks…" aria-label="Search tracks" />
      <div class="list" role="listbox">
        {#each groups as g (g.cup.id)}
          <div class="grp"><img src={g.cup.emblem} alt="" width="16" height="16" />{g.cup.name}</div>
          {#each g.tracks as t (t.id)}
            <div role="option" aria-selected={flat[active]?.id === t.id} class="opt" class:active={flat[active]?.id === t.id} data-option={t.id}>
              <button type="button" tabindex="-1" onmousedown={(e) => e.preventDefault()} onclick={() => pick(t.id)} onmouseenter={() => (active = flat.findIndex((x) => x.id === t.id))}>
                <img src={t.thumb} alt="" width="40" height="24" /><span>{t.name}</span>
              </button>
            </div>
          {/each}
        {:else}
          <div class="none">No matches</div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .ts { position: relative; min-width: 0; }
  .cur { display: flex; align-items: center; gap: 6px; width: 100%; padding: 6px 9px; background: var(--ui-bg); color: #fff; border: 1px solid var(--ui-field); border-radius: 6px; white-space: nowrap; cursor: pointer; text-align: left; font: inherit; }
  .cur:disabled { opacity: 0.5; cursor: not-allowed; }
  .pop { position: absolute; z-index: 20; top: 100%; left: 0; width: 300px; background: var(--ui-panel); border: 1px solid var(--ui-field); border-radius: 6px; padding: 6px; box-shadow: 0 8px 24px rgba(0,0,0,.5); }
  input { width: 100%; box-sizing: border-box; padding: 4px 6px; background: var(--ui-bg); color: inherit; border: 1px solid var(--ui-field); border-radius: 4px; font: inherit; }
  .list { margin-top: 6px; max-height: 300px; overflow: auto; }
  .grp { display: flex; align-items: center; gap: 6px; padding: 4px 6px; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; opacity: .7; }
  .opt button { display: flex; align-items: center; gap: 6px; width: 100%; padding: 3px 6px; background: none; border: 0; color: inherit; font: inherit; cursor: pointer; text-align: left; }
  .opt.active button { background: var(--ui-accent); }
  .none { padding: 6px; opacity: .6; }
  .cur span:first-of-type { overflow: hidden; text-overflow: ellipsis; }
  .car { margin-left: auto; color: var(--ui-muted); }
  .cur img { width: 24px; height: 24px; object-fit: contain; }
</style>
