<script lang="ts">
  // Settings of one match: label, round, cup or single track, the map of each of the four races, and the race counter.
  import type { CatalogIndex } from '../../../../shared/catalog'
  import type { Match, RaceState, Tournament } from '../../../../shared/types'
  import { roundLabel } from '../../../../shared/tournament'
  import { send } from '../store'
  import { twoTap } from '../ui/twotap.svelte'
  import { roundNumbers, trackOverridesWith } from '../tournament'
  import MapSelect from './MapSelect.svelte'
  import { openRound } from './nav'

  let { t, match, matches, catalog }: { t: Tournament; match: Match; matches: Match[]; catalog: CatalogIndex } = $props()

  const tt = twoTap()
  const race = $derived(match.data.race)
  const cup = $derived(catalog.cup(race.cupId))
  const isLive = $derived(match.id === t.activeMatchId)
  const rounds = $derived(roundNumbers(matches))
  const changed = $derived([0, 1, 2, 3].filter((i) => race.trackOverrides?.[i]).length)
  // The maps are an exception, so they start folded away unless one is already changed.
  let mapsPick = $state<boolean | null>(null)
  const mapsOpen = $derived(mapsPick ?? changed > 0)

  const setRace = (patch: Partial<RaceState>) => send({ type: 'updateMatch', matchId: match.id, patch: { race: patch } })
  const clampRace = (v: string) => Math.max(1, Math.min(99, Math.round(+v) || 1))
  /** The map of race `i` as the cup would have it, for the "Cup order" option. */
  const cupTrack = (i: number) => catalog.track(cup?.tracks[i] ?? '')?.name ?? '?'

  function setLabel(e: Event & { currentTarget: HTMLInputElement }) {
    const label = e.currentTarget.value
    if (label.trim()) send({ type: 'updateMatch', matchId: match.id, patch: { label } })
  }
  function restoreLabel(e: Event & { currentTarget: HTMLInputElement }) {
    if (!e.currentTarget.value.trim()) e.currentTarget.value = match.label
  }
  function moveToRound(value: string) {
    const round = Number(value)
    if (!Number.isInteger(round) || round === match.round) return
    send({ type: 'updateMatch', matchId: match.id, patch: { round } })
    openRound(round, match.id)
  }
  function remove() {
    send({ type: 'removeMatch', matchId: match.id })
  }
</script>

<section class="sec" aria-label="Match settings" data-setup={match.id}>
  <div class="row">
    <input class="u-input" type="text" name="matchLabel" value={match.label} maxlength="40" aria-label="Match label" oninput={setLabel} onblur={restoreLabel} />
    <select class="u-select round" name="matchRound" aria-label="Round" value={String(match.round)} onchange={(e) => moveToRound(e.currentTarget.value)}>
      {#each rounds as r (r)}<option value={String(r)}>{roundLabel(t, r)}</option>{/each}
    </select>
  </div>
  <div class="row">
    {#if isLive}
      <span class="u-tag pvw livetag" data-live-tag>LIVE MATCH</span>
    {:else}
      <button type="button" class="u-btn" data-make-active={match.id} onclick={() => send({ type: 'setActiveMatch', matchId: match.id })}>Make live</button>
    {/if}
    <button type="button" class="u-btn danger end" class:confirm={tt.armed === `rm:${match.id}`} data-remove-match disabled={matches.length < 2} onclick={() => tt.tap(`rm:${match.id}`, remove)}>
      {tt.armed === `rm:${match.id}` ? (isLive ? 'Tap again: this is the live match' : 'Tap again to remove') : 'Remove match'}
    </button>
  </div>

  <div class="row">
    <div class="u-seg blue mode" role="group" aria-label="Race mode">
      <button type="button" class:sel={race.mode === 'cup'} data-mode="cup" aria-pressed={race.mode === 'cup'} onclick={() => setRace({ mode: 'cup' })}>Cup</button>
      <button type="button" class:sel={race.mode === 'track'} data-mode="track" aria-pressed={race.mode === 'track'} onclick={() => setRace({ mode: 'track' })}>Single track</button>
    </div>
    {#if race.mode === 'cup'}
      <div class="cupf">
        {#if cup}<img src={cup.emblem} alt="" width="28" height="28" />{/if}
        <select class="u-select" class:emb={!!cup} name="matchCup" aria-label="Cup" value={race.cupId} onchange={(e) => setRace({ cupId: e.currentTarget.value, raceIndex: 0 })}>
          {#each catalog.cups as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
        </select>
      </div>
    {:else}
      <div class="trackf"><MapSelect label="Track" {catalog} value={race.trackId} onchange={(id) => id && setRace({ trackId: id })} /></div>
    {/if}
  </div>

  {#if race.mode === 'cup'}
    <div class="maps" data-maps>
      <button type="button" class="mtoggle" class:mod={changed > 0} data-maps-toggle aria-expanded={mapsOpen} onclick={() => (mapsPick = !mapsOpen)}>
        <b>Maps</b>
        <span>{changed ? `${changed} changed from the cup order` : 'Follow the cup order'}</span>
        <span class="car">{mapsOpen ? '▴' : '▾'}</span>
      </button>
      {#if mapsOpen}
        <div class="mgrid">
          {#each [0, 1, 2, 3] as i (i)}
            {@const over = race.trackOverrides?.[i] ?? null}
            <div class="map" class:over>
              <span class="rn">Race {i + 1}</span>
              <MapSelect label="Map for race {i + 1}" {catalog} value={over ?? ''} noneLabel="{cupTrack(i)} · cup order"
                onchange={(id) => setRace({ trackOverrides: trackOverridesWith(race.trackOverrides, i, id) })} />
              {#if over}
                <button type="button" class="u-btn" data-map-reset={i} onclick={() => setRace({ trackOverrides: trackOverridesWith(race.trackOverrides, i, null) })}>↺ Cup order</button>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  <div class="count">
    <span class="u-dim">Race</span>
    <input class="u-input" type="number" min="1" max="99" aria-label="Race number" value={race.raceNo} onchange={(e) => setRace({ raceNo: clampRace(e.currentTarget.value) })} />
    <span class="u-dim">of</span>
    <input class="u-input" type="number" min="1" max="99" aria-label="Races in total" value={race.raceTotal} onchange={(e) => setRace({ raceTotal: clampRace(e.currentTarget.value) })} />
  </div>
</section>

<style>
  .sec { display: grid; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--ui-line); }
  .row { display: flex; gap: 10px; align-items: center; }
  .row > .u-input { flex: 1; }
  .round { flex: 0 0 160px; width: 160px; }
  .end { margin-left: auto; }
  .livetag { padding: 8px 10px; font-size: 11px; }
  .mode { flex: none; }
  .sec :global(.u-seg > button) { height: 44px; }
  .cupf { position: relative; flex: 1; min-width: 0; }
  .cupf img { position: absolute; left: 10px; top: 8px; width: 28px; height: 28px; object-fit: contain; pointer-events: none; }
  .cupf .emb { padding-left: 46px; }
  .trackf { flex: 1; min-width: 0; }
  .maps { display: grid; gap: 8px; }
  .mtoggle { display: flex; align-items: center; gap: 10px; height: 44px; padding: 0 12px; border-radius: 8px; border: 1px dashed var(--ui-field); background: transparent; text-align: left; }
  .mtoggle b { color: #cbd5e1; }
  .mtoggle span { color: var(--ui-muted); font-size: 12.5px; }
  .mtoggle .car { margin-left: auto; }
  .mtoggle.mod { border-style: solid; border-color: #b45309; background: #2a1e07; }
  .mtoggle.mod span:not(.car) { color: #fde68a; }
  .mgrid { display: grid; gap: 8px; }
  .map { display: grid; grid-template-columns: 52px minmax(0, 1fr); gap: 8px; align-items: center; min-width: 0; }
  .map.over { grid-template-columns: 52px minmax(0, 1fr) auto; }
  .map .rn { font-size: 12.5px; color: var(--ui-muted); }
  .map.over .rn { color: #fbbf24; }
  .map.over :global(.u-select) { border-color: #b45309; background: #2a1e07; }
  .count { display: flex; align-items: center; gap: 8px; }
  .count .u-input { width: 72px; }
</style>
