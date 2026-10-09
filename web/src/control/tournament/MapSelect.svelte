<script lang="ts">
  // A map (track) picker: a native select grouped by cup, so it is a full-size touch target. With `noneLabel` the first option
  // is "no choice" (value '', reported as null), used for "cup order" on a per-race override.
  import type { CatalogIndex } from '../../../../shared/catalog'

  let { value, catalog, onchange, label, noneLabel, disabled = false }: {
    value: string; catalog: CatalogIndex; onchange: (id: string | null) => void; label: string; noneLabel?: string; disabled?: boolean
  } = $props()
</script>

<select class="u-select" {value} {disabled} aria-label={label} onchange={(e) => onchange(e.currentTarget.value || null)}>
  {#if noneLabel !== undefined}
    <option value="">{noneLabel}</option>
  {:else if !catalog.track(value)}
    <option value="" disabled>Choose a map…</option>
  {/if}
  {#each catalog.cups as cup (cup.id)}
    <optgroup label={cup.name}>
      {#each catalog.tracksOfCup(cup.id) as tr (tr.id)}<option value={tr.id}>{tr.name}</option>{/each}
    </optgroup>
  {/each}
</select>
