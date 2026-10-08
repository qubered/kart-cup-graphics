<script lang="ts">
  import type { CatalogIndex } from '../../../../shared/catalog'
  import type { Match, RaceResult } from '../../../../shared/types'
  import { colourHex } from '../../../../shared/palette'
  import { pointsFor, totals } from '../../../../shared/scoring'
  import { duplicatePositions } from '../catalog'
  import { send } from '../store'
  import { defaultTrackId, nextRaceNo, removeRace, setPosition } from '../tournament'

  let { match, catalog, connected }: { match: Match; catalog: CatalogIndex; connected: boolean } = $props()

  const races = $derived(match.data.scores.races)
  const adj = $derived([0, 1, 2, 3].map((i) => match.data.scores.adjustments[i] ?? 0))
  const tot = $derived(totals({ races, adjustments: adj }))
  const ordinal = (n: number) => `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10 < 4 ? n % 10 : 0]}`

  const save = (next: RaceResult[]) => send({ type: 'setMatchResults', matchId: match.id, races: next })
  const trackName = (id: string) => catalog.track(id)?.name ?? '?'
  function addRace() {
    const raceNo = nextRaceNo(races)
    save(setPosition(races, raceNo, defaultTrackId(catalog, match.data.race, raceNo), 0, 0))
  }
  function setAdj(i: number, v: string) {
    const next = [...adj]
    next[i] = Math.round(Number(v)) || 0
    send({ type: 'setMatchResults', matchId: match.id, adjustments: next })
  }
</script>

<section class="card flush" aria-label="Match results" data-results={match.id}>
  <div class="ch">
    <h2>Results · {match.label}</h2>
    <div class="r"><button type="button" data-add-race disabled={!connected} onclick={addRace}>Add race</button></div>
  </div>
  <table class="res">
    <thead>
      <tr>
        <th>RACE</th>
        {#each match.data.players as p, i (i)}<th><span class="pc" style="background:{colourHex(p.colour)}"></span>{p.name || `P${i + 1}`}</th>{/each}
        <th></th>
      </tr>
    </thead>
    <tbody>
      {#each races as r (r.raceNo)}
        <tr data-race-row={r.raceNo}>
          <td>{r.raceNo} <span class="dim">· {trackName(r.trackId)}</span></td>
          {#each [0, 1, 2, 3] as i (i)}
            <td>
              <select aria-label="Race {r.raceNo} position for P{i + 1}" data-pos={i} value={r.positions[i] ? String(r.positions[i]) : ''} disabled={!connected}
                onchange={(e) => save(setPosition(races, r.raceNo, r.trackId, i, e.currentTarget.value === '' ? 0 : Number(e.currentTarget.value)))}>
                <option value="">—</option>
                {#each Array.from({ length: 12 }, (_, k) => k + 1) as n (n)}<option value={String(n)}>{ordinal(n)}</option>{/each}
              </select>
              <span class="plus">+{pointsFor(r.positions[i] ?? 0)}</span>
            </td>
          {/each}
          <td><button type="button" class="danger" aria-label="Remove race {r.raceNo}" disabled={!connected} onclick={() => save(removeRace(races, r.raceNo))}>✕</button></td>
        </tr>
        {#each duplicatePositions(r.positions) as d (d)}<tr><td colspan="6" class="warn">Race {r.raceNo}: duplicate position {d}</td></tr>{/each}
      {/each}
      {#if !races.length}<tr><td colspan="6" class="dim">No races saved yet.</td></tr>{/if}
      <tr class="adj">
        <td>Adjustment</td>
        {#each [0, 1, 2, 3] as i (i)}
          <td><input type="number" step="1" value={adj[i]} disabled={!connected} aria-label="Adjustment for P{i + 1}" data-adj={i} onchange={(e) => setAdj(i, e.currentTarget.value)} /></td>
        {/each}
        <td></td>
      </tr>
      <tr class="tot">
        <td>Total</td>
        {#each [0, 1, 2, 3] as i (i)}<td class="num" data-total={i}>{tot[i]}</td>{/each}
        <td></td>
      </tr>
    </tbody>
  </table>
  <p class="foot">Edits save straight away and update the winner, bracket and scenes. Works on any match, live or not.</p>
</section>

<style>
  .warn { color: var(--ui-pending); font-size: 12.5px; }
  .plus { margin-left: 4px; font-size: 11.5px; }
  .adj input { width: 64px; }
  .tot td { font-weight: 700; border-bottom: 0; }
  .res select { min-width: 62px; }
</style>
