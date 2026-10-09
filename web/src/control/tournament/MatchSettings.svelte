<script lang="ts">
  // Settings of one match: label, round, cup or single track, the map of each of the four races, and the race counter.
  import type { CatalogIndex } from '../../../../shared/catalog'
  import type { Match, RaceState, Tournament } from '../../../../shared/types'
  import { roundLabel } from '../../../../shared/tournament'
  import { send } from '../store'
  import { toast } from '../ui'
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
    toast(`Removed “${match.label}”`)
  }
</script>

<section class="sec" aria-label="Match settings" data-setup={match.id}>
  <div class="row">
    <input class="u-input" type="text" name="matchLabel" value={match.label} maxlength="100" aria-label="Match label" oninput={setLabel} onblur={restoreLabel} />
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
      {tt.armed === `rm:${match.id}` ? 'Tap again to remove' : 'Remove match'}
    </button>
  </div>

  <div class="u-seg blue" role="group" aria-label="Race mode">
    <button type="button" class:sel={race.mode === 'cup'} data-mode="cup" aria-pressed={race.mode === 'cup'} onclick={() => setRace({ mode: 'cup' })}>Cup</button>
    <button type="button" class:sel={race.mode === 'track'} data-mode="track" aria-pressed={race.mode === 'track'} onclick={() => setRace({ mode: 'track' })}>Single track</button>
  </div>

  {#if race.mode === 'cup'}
    <div class="cupf">
      {#if cup}<img src={cup.emblem} alt="" width="28" height="28" />{/if}
      <select name="matchCup" aria-label="Cup" value={race.cupId} onchange={(e) => setRace({ cupId: e.currentTarget.value, raceIndex: 0 })}>
        {#each catalog.cups as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
      </select>
    </div>
    <div class="maps" data-maps>
      <div class="u-lab">Maps <span class="u-dim tip">· follows the cup order; pick another map for a race played elsewhere</span></div>
      {#each [0, 1, 2, 3] as i (i)}
        {@const over = race.trackOverrides?.[i] ?? null}
        <div class="map" class:over>
          <span class="rn">Race {i + 1}</span>
          <MapSelect label="Map for race {i + 1}" {catalog} value={over ?? ''} noneLabel="Cup order: {cupTrack(i)}"
            onchange={(id) => setRace({ trackOverrides: trackOverridesWith(race.trackOverrides, i, id) })} />
          {#if over}
            <button type="button" class="u-btn" data-map-reset={i} onclick={() => setRace({ trackOverrides: trackOverridesWith(race.trackOverrides, i, null) })}>↺ Cup order</button>
          {/if}
        </div>
      {/each}
    </div>
  {:else}
    <MapSelect label="Track" {catalog} value={race.trackId} onchange={(id) => id && setRace({ trackId: id })} />
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
  .row .u-input { flex: 1; }
  .round { flex: 0 0 170px; width: 170px; }
  .end { margin-left: auto; }
  .livetag { padding: 8px 10px; font-size: 11px; }
  .cupf { display: flex; align-items: center; gap: 8px; height: 44px; padding: 0 10px; border: 1px solid var(--ui-field); border-radius: 8px; background: var(--ui-bg); }
  .cupf img { width: 28px; height: 28px; object-fit: contain; flex: none; }
  .cupf select { flex: 1; min-width: 0; height: 42px; border: 0; background: transparent; color: #fff; font-size: 14px; }
  .cupf select option { background: var(--ui-panel); }
  .maps { display: grid; gap: 8px; }
  .tip { text-transform: none; letter-spacing: 0; font-weight: 400; font-size: 11.5px; }
  .map { display: grid; grid-template-columns: 56px minmax(0, 1fr); gap: 8px; align-items: center; }
  .map.over { grid-template-columns: 56px minmax(0, 1fr) auto; }
  .map .rn { font-size: 12.5px; color: var(--ui-muted); }
  .map.over :global(.u-select) { border-color: #b45309; background: #2a1e07; }
  .count { display: flex; align-items: center; gap: 8px; }
  .count .u-input { width: 72px; }
  .sec :global(.u-seg > button) { height: 44px; }
</style>
