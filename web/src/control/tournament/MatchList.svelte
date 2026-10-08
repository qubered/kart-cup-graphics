<script lang="ts">
  import type { CatalogIndex } from '../../../../shared/catalog'
  import type { Match, Tournament } from '../../../../shared/types'
  import { colourHex } from '../../../../shared/palette'
  import { totals } from '../../../../shared/scoring'
  import { matchWinnerSlot } from '../../../../shared/tournament'
  import { send } from '../store'

  let { tournament, matches, catalog, connected, selectedId, onselect }: {
    tournament: Tournament; matches: Match[]; catalog: CatalogIndex; connected: boolean; selectedId: string; onselect: (id: string) => void
  } = $props()

  const activeIdx = $derived(matches.findIndex((m) => m.id === tournament.activeMatchId))
  const rounds = $derived([...new Set(matches.map((m) => m.round))].sort((a, b) => a - b))
  const winnerName = (m: Match) => {
    const w = matchWinnerSlot(m.winnerOverride, m.data)
    return w === null ? null : m.data.players[w]?.name
  }
</script>

<section class="card flush" aria-label="Matches">
  <div class="ch">
    <h2>Matches</h2>
    <div class="r">
      <button type="button" data-add-match disabled={!connected} onclick={() => send({ type: 'addMatch' })}>Add match</button>
      <button type="button" class="primary" data-next-match disabled={!connected || activeIdx === -1 || activeIdx >= matches.length - 1}
        onclick={() => send({ type: 'nextMatch' })}>Go to next match ▶</button>
    </div>
  </div>
  {#each rounds as round (round)}
    <div class="rh">{round === 0 ? 'Round 1' : `Round ${round + 1}`}</div>
    {#each matches.filter((m) => m.round === round) as m (m.id)}
      {@const tot = totals(m.data.scores)}
      {@const w = winnerName(m)}
      <div class="mrow" class:active={m.id === tournament.activeMatchId} class:sel={m.id === selectedId} data-match={m.id} data-status={m.status}>
        <button type="button" class="pick" data-edit-match={m.id} aria-pressed={m.id === selectedId} onclick={() => onselect(m.id)}>
          <b>{m.label}</b>
          <span class="dim">{m.data.race.mode === 'cup' ? (catalog.cup(m.data.race.cupId)?.name ?? '?') : (catalog.track(m.data.race.trackId)?.name ?? '?')}</span>
        </button>
        <span class="chips">
          {#each m.data.players as p, i (i)}
            <i class="chip" class:win={w !== null && matchWinnerSlot(m.winnerOverride, m.data) === i} style="border-color:{colourHex(p.colour)}" title="{p.name} · {tot[i]}">{p.name || `P${i + 1}`}<small>{tot[i]}</small></i>
          {/each}
        </span>
        <span class="st" data-st>{m.id === tournament.activeMatchId ? 'LIVE' : m.status === 'done' ? 'DONE' : 'PENDING'}</span>
        <button type="button" data-make-active={m.id} disabled={!connected || m.id === tournament.activeMatchId} onclick={() => send({ type: 'setActiveMatch', matchId: m.id })}>Make active</button>
      </div>
    {/each}
  {/each}
</section>

<style>
  .rh { padding: 6px 12px 2px; font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--ui-muted); font-weight: 600; }
  .mrow { display: flex; align-items: center; gap: 8px; padding: 6px 12px; border-top: 1px solid var(--ui-line); border-left: 3px solid transparent; }
  .mrow.sel { background: #131a29; }
  .mrow.active { border-left-color: var(--ui-program); background: #1f1416; }
  .mrow.active.sel { background: #26171b; }
  .pick { display: flex; flex-direction: column; align-items: flex-start; gap: 1px; width: 128px; flex: none; border: 0; background: transparent; padding: 2px 4px; text-align: left; overflow: hidden; }
  .pick b { color: #fff; }
  .pick .dim { font-size: 11px; max-width: 120px; overflow: hidden; text-overflow: ellipsis; }
  .chips { flex: 1; display: flex; gap: 4px; flex-wrap: wrap; min-width: 0; }
  .chip { font-style: normal; font-size: 11.5px; border: 1px solid; border-radius: 4px; padding: 1px 5px; color: #cbd5e1; }
  .chip small { margin-left: 4px; color: #fff; font-family: var(--ui-mono); }
  .chip.win { background: #14532d; color: #fff; }
  .st { font-size: 10.5px; font-weight: 700; letter-spacing: .06em; color: var(--ui-muted); width: 56px; text-align: center; }
  .mrow.active .st { color: var(--ui-program, #f87171); }
  .mrow[data-status=done] .st { color: #86efac; }
</style>
