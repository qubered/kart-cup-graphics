<script lang="ts">
  import type { CatalogIndex } from '../../../../shared/catalog'
  import type { Player, ShowState } from '../../../../shared/types'
  import { colourHex, textOn } from '../../../../shared/palette'
  import CharacterSelect from '../components/CharacterSelect.svelte'
  import ColourSelect from '../components/ColourSelect.svelte'
  import { send } from '../store'

  let { show, catalog, pending, connected }: { show: ShowState; catalog: CatalogIndex; pending: Record<string, number>; connected: boolean } = $props()

  const idx = [0, 1, 2, 3] as const

  // A player "differs from Program" when any output with a pending change shows a different lower third for the slot.
  function changed(i: number): boolean {
    const p = show.draft.players[i]
    for (const o of show.outputs) {
      if (!pending[o.id]) continue
      const lt = show.program[o.id]?.view.lowerThirds.find((x) => x.slot === i)
      if (!lt) continue
      if (lt.name !== p.name || lt.colour !== colourHex(p.colour) || lt.character !== (catalog.character(p.characterId)?.name ?? '?')) return true
    }
    return false
  }
  const set = (i: 0 | 1 | 2 | 3, patch: Partial<Player>) => send({ type: 'setPlayer', index: i, patch })
</script>

<section class="card" aria-label="Players">
  <h2>Players</h2>
  {#each idx as i (i)}
    {@const p = show.draft.players[i]}
    <div class="row" data-player={i}>
      <span class="chip" style="background:{colourHex(p.colour)};color:{textOn(p.colour)}">P{i + 1}</span>
      <input name="name" type="text" value={p.name} disabled={!connected} maxlength="40" aria-label="Player {i + 1} name" oninput={(e) => set(i, { name: e.currentTarget.value })} />
      <CharacterSelect value={p.characterId} {catalog} disabled={!connected} onchange={(id) => set(i, { characterId: id })} />
      <ColourSelect value={p.colour} disabled={!connected} onchange={(c) => set(i, { colour: c })} />
      {#if changed(i)}<span class="note">● P{i + 1} changed — not on air yet</span>{/if}
    </div>
  {/each}
</section>

<style>
  .card { background: #111827; border: 1px solid #1f2937; border-radius: 8px; padding: 12px 14px; }
  h2 { margin: 0 0 8px; font-size: 13px; text-transform: uppercase; letter-spacing: .06em; opacity: .8; }
  .row { display: flex; align-items: center; gap: 10px; padding: 4px 0; flex-wrap: wrap; }
  .chip { min-width: 34px; text-align: center; font-weight: 700; border-radius: 5px; padding: 3px 6px; }
  input[name='name'] { width: 200px; padding: 5px 8px; background: #1f2937; color: inherit; border: 1px solid #374151; border-radius: 6px; font: inherit; }
  .note { color: #f59e0b; font-size: 12px; }
</style>
