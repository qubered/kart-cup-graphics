<script lang="ts">
  // Left panel: which race is live, its map, and the (compact) race settings.
  import type { CatalogIndex } from '../../../../shared/catalog'
  import type { ShowState, Tournament } from '../../../../shared/types'
  import { searchTracks } from '../catalog'
  import { send } from '../store'
  import { act, goto } from '../ui'
  import { twoTap } from '../ui/twotap.svelte'
  import { liveRaceNo, mapPlan, overrideCount, raceTiles, stepPlan, trackOfRace } from './logic'
  import { staging } from './staging.svelte'

  let { st, catalog, tournament, matchId, matchKey }: {
    st: ShowState; catalog: CatalogIndex; tournament: Tournament | null; matchId: string | null; matchKey: string
  } = $props()

  const draft = $derived(st.draft)
  const race = $derived(draft.race)
  const results = $derived(draft.scores.races)
  const cup = $derived(catalog.cup(race.cupId))
  const raceNo = $derived(liveRaceNo(race))
  const trackId = $derived(trackOfRace(catalog, race, raceNo) || race.trackId)
  const tiles = $derived(raceTiles(catalog, race, results, staging.nos(matchKey)))
  const groups = $derived(searchTracks(catalog, ''))
  const matchLabel = $derived(tournament?.matches.find((m) => m.id === matchId)?.label ?? '')
  const custom = $derived(race.mode === 'cup' && !!race.trackOverrides?.[race.raceIndex])
  const hasProgress = $derived(results.length > 0 || overrideCount(race) > 0)
  const back = $derived(stepPlan(catalog, race, -1))
  const fwd = $derived(stepPlan(catalog, race, 1))

  function step(plan: ReturnType<typeof stepPlan>) { if (plan) for (const c of plan.commands) send(c) }

  function openRace(t: (typeof tiles)[number]) {
    if (t.live) return
    if (race.mode === 'cup') send({ type: 'setRace', patch: { raceIndex: t.index as 0 | 1 | 2 | 3 } })
    else send({ type: 'setRace', patch: { raceNo: t.raceNo, ...(t.trackId ? { trackId: t.trackId } : {}) } })
  }

  function pickMap(id: string, el: HTMLSelectElement) {
    const plan = mapPlan(catalog, race, results, id)
    if (!plan) { el.value = trackId; return }
    act('Change map', plan.commands, plan.undo)
  }
  function backToCup() {
    const plan = mapPlan(catalog, race, results, null)
    if (plan) act('Back to cup order', plan.commands, plan.undo)
  }

  // Race settings. A new cup replaces the hand-picked maps, so with any picked it asks for a second tap.
  let pendingCup: string | null = $state(null)
  const picked = $derived(overrideCount(race))
  function pickCup(id: string) {
    if (id === race.cupId) { pendingCup = null; return }
    if (picked > 0) { pendingCup = id; return }
    send({ type: 'setRace', patch: { cupId: id, raceIndex: 0 } })
  }
  function confirmCup() {
    if (pendingCup) send({ type: 'setRace', patch: { cupId: pendingCup, raceIndex: 0 } })
    pendingCup = null
  }
  // a cup change that actually happened (here or elsewhere) settles the question; unrelated state updates must not
  const cupId = $derived(race.cupId)
  $effect(() => { if (cupId) pendingCup = null })

  const rnd = twoTap()
  function randomRace() {
    if (!hasProgress) return send({ type: 'randomRace' })
    rnd.tap('random', () => send({ type: 'randomRace' }))
  }
</script>

<section class="u-panel live" aria-label="Live race" data-live-race>
  <div class="u-ph">
    <span class="u-lab">Live race</span>
    <span class="rn" data-race-label>Race {raceNo}{race.mode === 'cup' ? ` of ${race.raceTotal}` : ''}</span>
    <span class="steps">
      <button type="button" class="u-btn step" aria-label="Race back" data-step-race="-1" disabled={!back} onclick={() => step(back)}>◀</button>
      <button type="button" class="u-btn step" aria-label="Race forward" data-step-race="1" disabled={!fwd} onclick={() => step(fwd)}>▶</button>
    </span>
  </div>

  <div class="ctx" data-context>
    <small class="u-lab lbl">{tournament ? tournament.name : 'No tournament'}</small>
    <button type="button" class="u-link go" onclick={() => goto('tour')}>{tournament ? 'Change match' : 'Tournaments'} ›</button>
    <b class="mname">{tournament ? matchLabel : 'Free play'}</b>
    {#if race.mode === 'cup'}
      <span class="cupname">{#if cup}<img src={cup.emblem} alt="" width="22" height="22" />{/if}{cup?.name ?? ''}</span>
    {:else}
      <span class="cupname u-dim">Single track</span>
    {/if}
  </div>

  {#if race.mode === 'track'}
    <div class="count">
      <span class="u-lab">Race</span>
      <input class="u-input num" type="number" min="1" max="99" aria-label="Race number" value={race.raceNo}
        onchange={(e) => send({ type: 'setRace', patch: { raceNo: Math.max(1, Math.min(99, Math.round(+e.currentTarget.value) || 1)) } })} />
      <span class="u-lab">of</span>
      <input class="u-input num" type="number" min="1" max="99" aria-label="Races in total" value={race.raceTotal}
        onchange={(e) => send({ type: 'setRace', patch: { raceTotal: Math.max(1, Math.min(99, Math.round(+e.currentTarget.value) || 1)) } })} />
    </div>
  {/if}

  <div class="u-grow tiles">
    {#each tiles as t (t.index)}
      {@const name = catalog.track(t.trackId)?.name}
      <button type="button" class="tile" class:cur={t.live} class:done={t.state === 'done'} class:part={t.state === 'partial'} data-race-tile={t.index} data-state={t.state}
        aria-pressed={t.live} aria-label="Race {t.raceNo}{name ? `, ${name}` : ''}" onclick={() => openRace(t)}>
        <span class="no">{t.state === 'done' ? '✓' : t.raceNo}</span>
        {#if t.trackId && catalog.track(t.trackId)}<img class="th" src={catalog.track(t.trackId)?.thumb} alt="" width="72" height="41" />{:else}<span class="th empty"></span>{/if}
        <span class="nm">
          <b>{name ?? (race.mode === 'track' ? `Race ${t.raceNo}` : '—')}</b>
          <small>{t.live ? 'Live race' : t.state === 'done' ? 'Complete' : t.state === 'partial' ? 'In progress' : 'Not started'}{t.live && t.state === 'done' ? ' · complete' : ''}</small>
        </span>
        {#if t.custom}<span class="u-tag mod" title="Hand-picked map, not the cup's order">MAP</span>{/if}
      </button>
    {/each}
  </div>

  <div class="map">
    <label>
      <span class="u-lab">{race.mode === 'cup' ? `Map for race ${raceNo}` : `Track for race ${raceNo}`}</span>
      <select class="u-select" data-map-select aria-label={race.mode === 'cup' ? `Map for race ${raceNo}` : `Track for race ${raceNo}`} value={trackId}
        onchange={(e) => pickMap(e.currentTarget.value, e.currentTarget)}>
        {#if !catalog.track(trackId)}<option value={trackId}>Choose a track…</option>{/if}
        {#each groups as g (g.cup.id)}
          <optgroup label={g.cup.name}>
            {#each g.tracks as t (t.id)}<option value={t.id}>{t.name}</option>{/each}
          </optgroup>
        {/each}
      </select>
    </label>
    {#if custom}
      <button type="button" class="u-btn" data-map-reset onclick={backToCup}>Back to cup order</button>
    {:else if race.mode === 'cup'}
      <span class="u-dim hint">Follows the cup order. Pick another map if this race is played elsewhere.</span>
    {:else}
      <span class="u-dim hint">Each race has its own track. Pick it before the next race starts.</span>
    {/if}
  </div>

  <details class="settings" data-race-settings>
    <summary>Race settings</summary>
    <div class="body">
      <div class="u-seg" role="group" aria-label="Race mode">
        <button type="button" class:sel={race.mode === 'cup'} aria-pressed={race.mode === 'cup'} onclick={() => send({ type: 'setRace', patch: { mode: 'cup' } })}>Cup</button>
        <button type="button" class:sel={race.mode === 'track'} aria-pressed={race.mode === 'track'} onclick={() => send({ type: 'setRace', patch: { mode: 'track' } })}>Single track</button>
      </div>
      {#if race.mode === 'cup'}
        <label class="cupfield">
          <span class="u-lab">Cup</span>
          <select class="u-select" aria-label="Cup" data-cup-select value={pendingCup ?? race.cupId} onchange={(e) => pickCup(e.currentTarget.value)}>
            {#each catalog.cups as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
          </select>
        </label>
        {#if pendingCup}
          <div class="warnbox" role="alert">
            <span>Switching to {catalog.cup(pendingCup)?.name} clears {picked} hand-picked map{picked === 1 ? '' : 's'} and goes back to race 1.</span>
            <div class="row2">
              <button type="button" class="u-btn confirm" data-cup-confirm onclick={confirmCup}>Switch cup</button>
              <button type="button" class="u-btn" onclick={() => (pendingCup = null)}>Keep {cup?.name}</button>
            </div>
          </div>
        {:else}
          <span class="u-dim hint">{tournament ? 'This match’s cup is also set on the Tournament page. ' : ''}Changing the cup clears hand-picked maps and goes back to race 1.</span>
        {/if}
      {/if}
      <button type="button" class="u-btn" class:confirm={rnd.armed === 'random'} data-random-race onclick={randomRace}>
        {rnd.armed === 'random' ? `Tap again: random ${race.mode === 'cup' ? 'cup, back to race 1' : 'track'}` : 'Random race'}
      </button>
    </div>
  </details>
</section>

<style>
  .live { min-width: 0; overflow-y: auto; }
  .rn { color: #fff; font-weight: 700; }
  .steps { margin-left: auto; display: flex; gap: 6px; }
  .step { width: 44px; padding: 0; height: 44px; }
  .ctx { display: grid; grid-template-columns: minmax(0, 1fr) auto; column-gap: 10px; align-items: center; padding: 0 12px 10px; border-bottom: 1px solid var(--ui-line); flex: none; }
  .lbl { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .mname { color: #fff; font-size: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cupname { display: inline-flex; align-items: center; gap: 6px; color: #cbd5e1; font-size: 13px; white-space: nowrap; }
  .cupname img { object-fit: contain; }
  .go { min-height: 44px; padding: 0 2px 0 8px; white-space: nowrap; text-align: right; }
  .count { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid var(--ui-line); flex: none; }
  .num { width: 76px; text-align: center; }

  .tiles { padding: 10px; display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; align-content: start; flex: 1 1 0; min-height: 190px; }
  .tile { display: grid; grid-template-columns: 30px 72px minmax(0, 1fr) auto; gap: 10px; align-items: center; min-height: 76px; padding: 8px 10px; border: 1px solid var(--ui-line); border-radius: 10px; background: var(--ui-panel-2); text-align: left; width: 100%; touch-action: manipulation; }
  .no { width: 30px; height: 30px; border-radius: 50%; border: 1px solid var(--ui-field); display: grid; place-items: center; font-weight: 700; color: var(--ui-muted); }
  .th { width: 72px; height: 41px; border-radius: 6px; border: 1px solid rgba(255,255,255,.12); object-fit: cover; background: #0b0d11; display: block; }
  .nm b { display: block; color: #fff; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .nm small { color: var(--ui-muted); font-size: 11.5px; }
  .tile.done .no { color: #4ade80; border-color: #1d6b3b; }
  .tile.done .nm small { color: #86efac; }
  .tile.part .nm small { color: var(--ui-pending); }
  .tile.cur { border-color: #3b82f6; background: #14233f; box-shadow: 0 0 0 1px #3b82f6; }
  .tile.cur .no { background: #3b82f6; color: #fff; border-color: #3b82f6; }
  .tile.cur .nm small { color: #93c5fd; font-weight: 700; }
  .tile.cur:hover:not(:disabled) { border-color: #3b82f6; background: #14233f; }

  .map { padding: 12px; border-top: 1px solid var(--ui-line); background: #101319; display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; flex: none; }
  .map label, .cupfield { display: grid; grid-template-columns: minmax(0, 1fr); gap: 6px; }
  .hint { font-size: 12px; line-height: 1.35; }

  .settings { border-top: 1px solid var(--ui-line); flex: none; }
  .settings summary { display: flex; align-items: center; min-height: 44px; padding: 0 12px; cursor: pointer; font-weight: 600; font-size: 13px; color: #cbd5e1; list-style: none; }
  .settings summary::-webkit-details-marker { display: none; }
  .settings summary::after { content: '▾'; margin-left: auto; color: var(--ui-muted); }
  .settings[open] summary::after { content: '▴'; }
  .settings .body { padding: 0 12px 12px; display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; }
  .warnbox { display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; padding: 10px; border: 1px solid #b45309; border-radius: 8px; background: #2a1d08; color: #fde68a; font-size: 12.5px; }
  .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
</style>
