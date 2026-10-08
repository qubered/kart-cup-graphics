<script lang="ts">
  import type { CatalogIndex } from '../../../../shared/catalog'
  import type { ShowState } from '../../../../shared/types'
  import TrackSelect from '../components/TrackSelect.svelte'
  import { send } from '../store'

  let { show, catalog, connected }: { show: ShowState; catalog: CatalogIndex; connected: boolean } = $props()

  const race = $derived(show.draft.race)
  const cup = $derived(catalog.cup(race.cupId))
  const tracks = $derived(catalog.tracksOfCup(race.cupId))
  const played = $derived(new Set(show.draft.scores.races.map((r) => r.trackId)))
</script>

<section class="card" aria-label="Race">
  <h2>Race</h2>
  <div class="bar">
    <div class="seg" role="group" aria-label="Race mode">
      <button type="button" class:on={race.mode === 'cup'} disabled={!connected} onclick={() => send({ type: 'setRace', patch: { mode: 'cup' } })}>Cup</button>
      <button type="button" class:on={race.mode === 'track'} disabled={!connected} onclick={() => send({ type: 'setRace', patch: { mode: 'track' } })}>Single track</button>
    </div>
    <button type="button" class="rand" disabled={!connected} onclick={() => send({ type: 'randomRace' })}>Random</button>
  </div>

  {#if race.mode === 'cup'}
    <div class="cuprow">
      {#if cup}<img src={cup.emblem} alt="" width="40" height="40" />{/if}
      <select aria-label="Cup" value={race.cupId} disabled={!connected} onchange={(e) => send({ type: 'setRace', patch: { cupId: e.currentTarget.value, raceIndex: 0 } })}>
        {#each catalog.cups as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
      </select>
      <button type="button" aria-label="Previous race" disabled={!connected} onclick={() => send({ type: 'stepRace', delta: -1 })}>◀</button>
      <button type="button" aria-label="Next race" disabled={!connected} onclick={() => send({ type: 'stepRace', delta: 1 })}>▶</button>
    </div>
    <div class="tiles">
      {#each tracks as t, i (t.id)}
        <button type="button" class="tile" class:done={played.has(t.id)} class:current={race.raceIndex === i} data-race-tile={i} disabled={!connected}
          onclick={() => send({ type: 'setRace', patch: { raceIndex: i as 0 | 1 | 2 | 3 } })}>
          <img src={t.thumb} alt="" />
          <span>{i + 1} · {t.name}</span>
        </button>
      {/each}
    </div>
  {:else}
    <TrackSelect value={race.trackId} {catalog} disabled={!connected} onchange={(id) => send({ type: 'setRace', patch: { trackId: id } })} />
  {/if}
</section>

<style>
  .card { background: #111827; border: 1px solid #1f2937; border-radius: 8px; padding: 12px 14px; }
  h2 { margin: 0 0 8px; font-size: 13px; text-transform: uppercase; letter-spacing: .06em; opacity: .8; }
  .bar { display: flex; gap: 10px; align-items: center; margin-bottom: 10px; }
  .seg { display: inline-flex; }
  button, select { font: inherit; color: inherit; background: #1f2937; border: 1px solid #374151; border-radius: 6px; padding: 5px 10px; cursor: pointer; }
  button:disabled, select:disabled { opacity: .5; cursor: not-allowed; }
  .seg button { border-radius: 0; }
  .seg button:first-child { border-radius: 6px 0 0 6px; }
  .seg button:last-child { border-radius: 0 6px 6px 0; }
  .seg .on { background: #3b82f6; border-color: #3b82f6; }
  .cuprow { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
  .tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .tile { display: flex; flex-direction: column; gap: 4px; padding: 6px; text-align: left; }
  .tile img { width: 100%; aspect-ratio: 5 / 3; object-fit: cover; border-radius: 4px; background: #0b1220; }
  .tile.done { opacity: .45; }
  .tile.current { outline: 2px solid #3b82f6; opacity: 1; }
  .tile span { font-size: 12px; }
</style>
