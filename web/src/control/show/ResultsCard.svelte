<script lang="ts">
  import type { CatalogIndex } from '../../../../shared/catalog'
  import type { ShowState } from '../../../../shared/types'
  import { colourHex, textOn } from '../../../../shared/palette'
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
  $effect(() => {
    const k = `${raceNo}|${JSON.stringify(existing?.positions ?? null)}`
    if (k !== key) {
      key = k
      pos = existing ? [...existing.positions] : [0, 0, 0, 0]
    }
  })

  const dups = $derived(duplicatePositions(pos))
  const withEdit = $derived({
    races: [...scores.races.filter((r) => r.raceNo !== raceNo), { positions: pos }],
    adjustments: scores.adjustments,
  })
  const tot = $derived(totals(withEdit))
  let showAdj = $state(false)

  function save() {
    send({ type: 'saveResults', raceNo, trackId, positions: [...pos] })
    picked = null
  }
  const ordinal = (n: number) => `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10 < 4 ? n % 10 : 0]}`
</script>

<section class="card" aria-label="Results">
  <div class="head">
    <h2>Results · Race {raceNo} · {trackName}</h2>
    <label>
      <span class="sr">Race</span>
      <select aria-label="Race picker" value={raceNo} onchange={(e) => (picked = Number(e.currentTarget.value))}>
        {#each Array.from({ length: nextNo }, (_, i) => i + 1) as n (n)}<option value={n}>Race {n}</option>{/each}
      </select>
    </label>
  </div>

  {#each [0, 1, 2, 3] as i (i)}
    {@const p = show.draft.players[i]}
    <div class="row" data-result={i}>
      <span class="chip" style="background:{colourHex(p.colour)};color:{textOn(p.colour)}">P{i + 1}</span>
      <span class="nm">{p.name}</span>
      <select aria-label="Position for {p.name}" value={pos[i] ? String(pos[i]) : ''} disabled={!connected}
        onchange={(e) => { pos[i] = e.currentTarget.value === '' ? 0 : Number(e.currentTarget.value) }}>
        <option value="">—</option>
        {#each Array.from({ length: 12 }, (_, k) => k + 1) as n (n)}<option value={String(n)}>{ordinal(n)}</option>{/each}
      </select>
      <span class="pts">+{pointsFor(pos[i])}</span>
      <span class="tot">Total {tot[i]}</span>
    </div>
  {/each}

  {#each dups as d (d)}<div class="warn">Duplicate position: {d}</div>{/each}

  <div class="actions">
    <button type="button" class="primary" disabled={!connected} onclick={save}>Save results</button>
    <button type="button" onclick={() => (showAdj = !showAdj)} aria-expanded={showAdj}>Edit totals…</button>
  </div>

  {#if showAdj}
    <div class="adj">
      {#each [0, 1, 2, 3] as i (i)}
        <label>
          P{i + 1} adjustment
          <input type="number" step="1" value={scores.adjustments[i] ?? 0} disabled={!connected} aria-label="Adjustment P{i + 1}"
            onchange={(e) => send({ type: 'setAdjustment', index: i as 0 | 1 | 2 | 3, value: Number(e.currentTarget.value) || 0 })} />
        </label>
      {/each}
    </div>
  {/if}

  <p class="foot">Positions 1st–12th score 15, 12, 10, 9 … 1. Saving updates Standings in Preview.</p>
</section>

<style>
  .card { background: #111827; border: 1px solid #1f2937; border-radius: 8px; padding: 12px 14px; }
  .head { display: flex; justify-content: space-between; align-items: center; }
  h2 { margin: 0 0 8px; font-size: 13px; text-transform: uppercase; letter-spacing: .06em; opacity: .8; }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  .row { display: flex; align-items: center; gap: 10px; padding: 4px 0; }
  .chip { min-width: 34px; text-align: center; font-weight: 700; border-radius: 5px; padding: 3px 6px; }
  .nm { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  select, button, input { font: inherit; color: inherit; background: #1f2937; border: 1px solid #374151; border-radius: 6px; padding: 5px 10px; }
  button { cursor: pointer; }
  button:disabled { opacity: .5; cursor: not-allowed; }
  .primary { background: #3b82f6; border-color: #3b82f6; }
  .pts { width: 40px; color: #86efac; text-align: right; }
  .tot { width: 80px; text-align: right; opacity: .85; }
  .warn { color: #f59e0b; font-size: 13px; margin-top: 4px; }
  .actions { display: flex; gap: 10px; margin-top: 10px; }
  .adj { display: flex; gap: 12px; margin-top: 10px; }
  .adj label { display: flex; flex-direction: column; gap: 3px; font-size: 12px; }
  .adj input { width: 80px; }
  .foot { font-size: 12px; opacity: .65; margin: 10px 0 0; }
</style>
