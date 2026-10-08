<script lang="ts">
  import type { CatalogIndex } from '../../../../shared/catalog'
  import type { ShowState } from '../../../../shared/types'
  import { colourHex } from '../../../../shared/palette'
  import { pointsFor, totals } from '../../../../shared/scoring'
  import { duplicatePositions } from '../catalog'
  import { send } from '../store'

  let { show, catalog, connected }: { show: ShowState; catalog: CatalogIndex; connected: boolean } = $props()

  const scores = $derived(show.draft.scores)
  const race = $derived(show.draft.race)
  const nextNo = $derived(scores.races.length + 1)

  // null = follow the next unscored race
  let picked: number | null = $state(null)
  const raceNo = $derived(picked ?? nextNo)

  const existing = $derived(scores.races.find((r) => r.raceNo === raceNo))
  const trackId = $derived(
    existing?.trackId ?? (race.mode === 'cup' ? (catalog.tracksOfCup(race.cupId)[race.raceIndex]?.id ?? '') : race.trackId),
  )
  const trackName = $derived(catalog.track(trackId)?.name ?? '?')

  let pos: number[] = $state([0, 0, 0, 0])
  let key = ''
  // typed totals, staged until Save
  let edited: (number | null)[] = $state([null, null, null, null])
  $effect(() => {
    const k = `${raceNo}|${JSON.stringify(existing?.positions ?? null)}`
    if (k !== key) {
      key = k
      pos = existing ? [...existing.positions] : [0, 0, 0, 0]
      edited = [null, null, null, null]
    }
  })

  const dups = $derived(duplicatePositions(pos))
  const withEdit = $derived({
    races: [...scores.races.filter((r) => r.raceNo !== raceNo), { positions: pos }],
    adjustments: scores.adjustments,
  })
  const tot = $derived(totals(withEdit))
  const baseTotals = $derived(totals({ races: withEdit.races, adjustments: [0, 0, 0, 0] }))

  function save() {
    const adjustments = edited.map((v, i) => (v === null ? (scores.adjustments[i] ?? 0) : v - baseTotals[i]))
    send({ type: 'saveResults', raceNo, trackId, positions: [...pos], adjustments })
    edited = [null, null, null, null]
    picked = null
  }
  const ordinal = (n: number) => `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10 < 4 ? n % 10 : 0]}`
</script>

<section class="card flush" aria-label="Results">
  <div class="ch">
    <h2>Results · Race {raceNo} · {trackName}</h2>
    <div class="r">
      <label>
        <span class="sr">Race</span>
        <select aria-label="Race picker" value={raceNo} onchange={(e) => (picked = Number(e.currentTarget.value))}>
          {#each Array.from({ length: nextNo }, (_, i) => i + 1) as n (n)}<option value={n}>Race {n}</option>{/each}
        </select>
      </label>
      <button type="button" class="primary" disabled={!connected} onclick={save}>Save results</button>
    </div>
  </div>

  <table class="res">
    <thead><tr><th>PLAYER</th><th>FINISHED</th><th>POINTS</th><th>TOTAL</th></tr></thead>
    <tbody>
      {#each [0, 1, 2, 3] as i (i)}
        {@const p = show.draft.players[i]}
        <tr data-result={i}>
          <td><span class="pc" style="background:{colourHex(p.colour)}"></span>{p.name} <span class="dim">· {catalog.character(p.characterId)?.name ?? ''}</span></td>
          <td>
            <select aria-label="Position for {p.name}" value={pos[i] ? String(pos[i]) : ''} disabled={!connected}
              onchange={(e) => { pos[i] = e.currentTarget.value === '' ? 0 : Number(e.currentTarget.value) }}>
              <option value="">—</option>
              {#each Array.from({ length: 12 }, (_, k) => k + 1) as n (n)}<option value={String(n)}>{ordinal(n)}</option>{/each}
            </select>
          </td>
          <td class="num plus">+{pointsFor(pos[i])}</td>
          <td class="num">
            <input class="total" type="number" step="1" value={edited[i] ?? tot[i]} disabled={!connected} aria-label="Total {p.name}"
              onchange={(e) => { edited[i] = e.currentTarget.value === '' ? null : Number(e.currentTarget.value) }} />
          </td>
        </tr>
      {/each}
    </tbody>
  </table>

  {#each dups as d (d)}<div class="warn">Duplicate position: {d}</div>{/each}


  <p class="foot">Positions 1st–12th score 15, 12, 10, 9 … 1. Type in a total to override it. Nothing goes to the scoreboard until you press Save results.</p>
</section>

<style>
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  .warn { color: var(--ui-pending); font-size: 13px; padding: 6px 12px 0; }
  .total { width: 64px; }
</style>
