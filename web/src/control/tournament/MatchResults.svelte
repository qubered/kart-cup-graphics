<script lang="ts">
  // Results of one match, any match (live or not): the finishing place of every player in every saved race, adjustments, totals
  // and the winner override. Edits save straight away. During the show the Race page is where results are entered.
  import type { CatalogIndex } from '../../../../shared/catalog'
  import type { Match, RaceResult } from '../../../../shared/types'
  import { colourHex } from '../../../../shared/palette'
  import { pointsFor, totals } from '../../../../shared/scoring'
  import { matchWinnerSlot } from '../../../../shared/tournament'
  import { duplicatePositions } from '../catalog'
  import { send } from '../store'
  import { defaultTrackId, nextRaceNo, removeRace, setPosition } from '../tournament'

  let { match, catalog }: { match: Match; catalog: CatalogIndex } = $props()

  const slots = [0, 1, 2, 3] as const
  const races = $derived(match.data.scores.races)
  const adj = $derived(slots.map((i) => match.data.scores.adjustments[i] ?? 0))
  const tot = $derived(totals({ races, adjustments: adj }))
  const winner = $derived(matchWinnerSlot(match.winnerOverride, match.data))
  const computed = $derived(matchWinnerSlot(null, match.data))
  const ordinal = (n: number) => `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10 < 4 ? n % 10 : 0]}`
  const name = (i: number) => match.data.players[i]?.name || `P${i + 1}`

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
  function setWinner(v: string) {
    send({ type: 'setWinnerOverride', matchId: match.id, slot: v === '' ? null : (Number(v) as 0 | 1 | 2 | 3) })
  }
</script>

<section class="sec" aria-label="Match results" data-results={match.id}>
  <div class="hd">
    <span class="u-lab">Results</span>
    <button type="button" class="u-btn" data-add-race onclick={addRace}>＋ Add race</button>
  </div>
  <div class="tw">
  <table class="res">
    <thead>
      <tr>
        <th>Race</th>
        {#each slots as i (i)}
          <th><span class="pc" style="background:{colourHex(match.data.players[i].colour)}"></span><span class="pn">{name(i)}</span></th>
        {/each}
        <th></th>
      </tr>
    </thead>
    <tbody>
      {#each races as r (r.raceNo)}
        <tr data-race-row={r.raceNo}>
          <td class="rl"><b>{r.raceNo}</b><span class="u-dim">{trackName(r.trackId)}</span></td>
          {#each slots as i (i)}
            <td>
              <select class="u-select pos" aria-label="Race {r.raceNo} position for {name(i)}" data-pos={i} value={r.positions[i] ? String(r.positions[i]) : ''}
                onchange={(e) => save(setPosition(races, r.raceNo, r.trackId, i, e.currentTarget.value === '' ? 0 : Number(e.currentTarget.value)))}>
                <option value="">—</option>
                {#each Array.from({ length: 12 }, (_, k) => k + 1) as n (n)}<option value={String(n)}>{ordinal(n)}</option>{/each}
              </select>
              <span class="plus">+{pointsFor(r.positions[i] ?? 0)}</span>
            </td>
          {/each}
          <td><button type="button" class="u-btn danger x" aria-label="Remove race {r.raceNo}" data-remove-race={r.raceNo} onclick={() => save(removeRace(races, r.raceNo))}>✕</button></td>
        </tr>
        {#each duplicatePositions(r.positions) as d (d)}<tr><td colspan="6" class="warn">Race {r.raceNo}: duplicate position {d}</td></tr>{/each}
      {/each}
      {#if !races.length}<tr><td colspan="6" class="u-dim empty">No races saved yet.</td></tr>{/if}
      <tr class="adj">
        <td class="rl">Adjustment</td>
        {#each slots as i (i)}
          <td><input class="u-input" type="number" step="1" value={adj[i]} aria-label="Adjustment for {name(i)}" data-adj={i} onchange={(e) => setAdj(i, e.currentTarget.value)} /></td>
        {/each}
        <td></td>
      </tr>
      <tr class="tot">
        <td class="rl">Total</td>
        {#each slots as i (i)}
          <td class="num" class:win={winner === i}><span data-total={i}>{tot[i]}</span>{#if winner === i} <span class="star" aria-label="Winner">★</span>{/if}</td>
        {/each}
        <td></td>
      </tr>
    </tbody>
  </table>
  </div>

  <div class="ovr">
    <label class="u-lab" for="winner-{match.id}">Winner</label>
    <select id="winner-{match.id}" class="u-select" name="winnerOverride" value={match.winnerOverride === null ? '' : String(match.winnerOverride)} onchange={(e) => setWinner(e.currentTarget.value)}>
      <option value="">Auto{computed === null ? ' (no results yet)' : `: ${name(computed)}`}</option>
      {#each slots as i (i)}<option value={String(i)}>{name(i)} (P{i + 1})</option>{/each}
    </select>
    <p class="note">Corrections for any match, live or not. Ties go to the last race. A hand-picked winner fills the next round too. During the show use the Race page.</p>
  </div>
</section>

<style>
  .sec { display: grid; gap: 10px; padding: 14px 16px; min-width: 0; }
  .tw { overflow-x: auto; min-width: 0; }
  .hd { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .res { width: 100%; border-collapse: collapse; font-size: 13px; }
  .res th { text-align: left; font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--ui-muted); font-weight: 600; padding: 6px 4px; border-bottom: 1px solid var(--ui-line); white-space: nowrap; }
  .res th .pn { display: inline-block; max-width: 70px; overflow: hidden; text-overflow: ellipsis; vertical-align: bottom; }
  .res td { padding: 5px 3px; border-bottom: 1px solid #1c1f26; vertical-align: middle; }
  .pc { display: inline-block; width: 6px; height: 16px; border-radius: 2px; margin-right: 5px; vertical-align: middle; }
  .rl { min-width: 84px; }
  .rl b { margin-right: 6px; color: #fff; }
  .rl .u-dim { font-size: 11.5px; }
  .pos { width: 100%; min-width: 60px; padding: 0 4px; }
  .plus { display: block; margin-top: 2px; font-size: 11px; color: #4ade80; }
  .x { width: 44px; padding: 0; }
  .adj .u-input { width: 100%; min-width: 56px; padding: 0 6px; }
  .tot td { border-bottom: 0; font-weight: 700; }
  .num { font-family: var(--ui-mono); color: #fff; font-size: 15px; }
  .num.win { color: #4ade80; }
  .star { font-size: 12px; }
  .warn { color: var(--ui-pending); font-size: 12.5px; }
  .empty { padding: 12px 4px; }
  .ovr { display: grid; gap: 6px; margin-top: 4px; }
  .note { margin: 0; font-size: 11.5px; color: var(--ui-muted); }
</style>
