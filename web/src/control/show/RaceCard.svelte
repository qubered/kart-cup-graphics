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

<section class="card flush" aria-label="Race">
  <div class="ch">
    <h2>Race</h2>
    <div class="r"><button type="button" disabled={!connected} onclick={() => send({ type: 'randomRace' })}>Random</button></div>
  </div>
  <div class="rrow">
    <div class="seg sel" role="group" aria-label="Race mode">
      <button type="button" class:on={race.mode === 'cup'} disabled={!connected} onclick={() => send({ type: 'setRace', patch: { mode: 'cup' } })}>Cup</button>
      <button type="button" class:on={race.mode === 'track'} disabled={!connected} onclick={() => send({ type: 'setRace', patch: { mode: 'track' } })}>Single track</button>
    </div>
    {#if race.mode === 'cup'}
      <div class="cupf">
        {#if cup}<img src={cup.emblem} alt="" width="24" height="24" />{/if}
        <select aria-label="Cup" value={race.cupId} disabled={!connected} onchange={(e) => send({ type: 'setRace', patch: { cupId: e.currentTarget.value, raceIndex: 0 } })}>
          {#each catalog.cups as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
        </select>
      </div>
    {:else}
      <div class="cupf"><TrackSelect value={race.trackId} {catalog} disabled={!connected} onchange={(id) => send({ type: 'setRace', patch: { trackId: id } })} /></div>
    {/if}
  </div>

  <div class="rrow count">
    <span>Race</span>
    <input type="number" min="1" max="99" aria-label="Race number" value={race.raceNo} disabled={!connected}
      onchange={(e) => send({ type: 'setRace', patch: { raceNo: Math.max(1, Math.min(99, Math.round(+e.currentTarget.value) || 1)) } })} />
    <span>of</span>
    <input type="number" min="1" max="99" aria-label="Races in total" value={race.raceTotal} disabled={!connected}
      onchange={(e) => send({ type: 'setRace', patch: { raceTotal: Math.max(1, Math.min(99, Math.round(+e.currentTarget.value) || 1)) } })} />
  </div>

  {#if race.mode === 'cup'}
    <div class="races">
      <button type="button" class="arrow" aria-label="Race back" disabled={!connected} onclick={() => send({ type: 'stepRace', delta: -1 })}>◀</button>
      {#each tracks as t, i (t.id)}
        <button type="button" class="race" class:done={played.has(t.id)} class:cur={race.raceIndex === i} data-race-tile={i} disabled={!connected}
          onclick={() => send({ type: 'setRace', patch: { raceIndex: i as 0 | 1 | 2 | 3 } })}>
          <img src={t.thumb} alt="" />
          <span class="rl">{t.name}<small>Race {i + 1}{played.has(t.id) ? ' · done' : race.raceIndex === i ? ' · now' : ''}</small></span>
        </button>
      {/each}
      <button type="button" class="arrow" aria-label="Race forward" disabled={!connected} onclick={() => send({ type: 'stepRace', delta: 1 })}>▶</button>
    </div>
  {/if}
</section>

<style>
  .count { align-items: center; gap: 8px; color: var(--ui-muted); }
  .count input { width: 56px; background: var(--ui-bg); border: 1px solid var(--ui-field); border-radius: 6px; padding: 6px; color: #fff; font-size: 14px; }
  .cupf { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; background: var(--ui-bg); border: 1px solid var(--ui-field); border-radius: 6px; padding: 0 9px; }
  .cupf :global(.cur) { border: 0; padding-left: 0; padding-right: 0; }
  .cupf img { width: 24px; height: 24px; object-fit: contain; flex: none; }
  .cupf select { flex: 1; border: 0; background: transparent; padding: 6px 0; color: #fff; font-size: 14px; }
  .cupf select option { background: var(--ui-panel); }
</style>
