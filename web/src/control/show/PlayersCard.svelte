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

<section class="card flush" aria-label="Players">
  <div class="ch">
    <h2>Players</h2>
    {#each idx as i (i)}{#if changed(i)}<span class="note">● P{i + 1} changed — not on air yet</span>{/if}{/each}
  </div>
  {#each idx as i (i)}
    {@const p = show.draft.players[i]}
    <div class="prow" data-player={i}>
      <span class="n" style="background:{colourHex(p.colour)};color:{textOn(p.colour)}">P{i + 1}</span>
      <input name="name" type="text" value={p.name} disabled={!connected} maxlength="40" aria-label="Player {i + 1} name" oninput={(e) => set(i, { name: e.currentTarget.value })} />
      <CharacterSelect value={p.characterId} {catalog} disabled={!connected} onchange={(id) => set(i, { characterId: id })} />
      <ColourSelect value={p.colour} disabled={!connected} onchange={(c) => set(i, { colour: c })} />
      <input class="sub" name="subtitle" type="text" value={p.subtitle ?? ''} disabled={!connected} maxlength="80" placeholder="Subtitle: job title · group" aria-label="Player {i + 1} subtitle" oninput={(e) => set(i, { subtitle: e.currentTarget.value })} />
    </div>
  {/each}
  <div style="height:6px"></div>
</section>
