<script lang="ts">
  // Right panel: the ranked table the Standings and race-win graphics read, the leader note, and (once every race is saved) the winner.
  import { colourHex, textOn } from '../../../../shared/palette'
  import type { ShowState, Tournament } from '../../../../shared/types'
  import { act } from '../ui'
  import { boardColumns, boardRows, leaderNote, liveRaceNo, matchComplete, racesDone, winnerInfo } from './logic'

  let { st, tournament, matchId }: { st: ShowState; tournament: Tournament | null; matchId: string | null } = $props()

  const data = $derived(st.draft)
  const cols = $derived(boardColumns(data))
  const rows = $derived(boardRows(data, cols))
  const names = $derived(data.players.map((p) => p.name))
  const live = $derived(liveRaceNo(data.race))
  const done = $derived(racesDone(data))
  const total = $derived(Math.max(1, data.race.raceTotal))
  const complete = $derived(matchComplete(data))
  const match = $derived(tournament?.matches.find((m) => m.id === matchId) ?? null)
  const winner = $derived(complete ? winnerInfo(data, match?.winnerOverride ?? null) : null)
  const upNext = $derived(tournament && matchId ? tournament.matches[tournament.matches.findIndex((m) => m.id === matchId) + 1] : undefined)

  function nextMatch() {
    if (!upNext || !matchId) return
    act('Next match', [{ type: 'nextMatch' }], [{ type: 'setActiveMatch', matchId }], `Live match is now ${upNext.label}. Nothing changes on air until you Take.`)
  }
</script>

<section class="u-panel sb" aria-label="Scoreboard" data-scoreboard>
  <div class="u-ph">
    <span class="u-lab">Scoreboard</span>
    <span class="u-dim cnt" data-race-count>{done} of {total} races</span>
  </div>
  <div class="row hdr" aria-hidden="true">
    <span></span><span></span><span class="n">Player</span>
    <span class="rc">{#each Array.from({ length: cols }, (_, c) => c + 1) as c (c)}<i>R{c}</i>{/each}</span>
    <span class="a">Adj</span><span class="t">Total</span>
  </div>
  <div class="u-grow" role="table" aria-label="Standings">
    {#each rows as r, k (r.slot)}
      {@const p = data.players[r.slot]}
      <div class="row" class:lead={r.leader} role="row" data-sb-row={r.slot} data-rank={k + 1}>
        <span class="rk">{k + 1}</span>
        <i class="pcb" style="background:{colourHex(p.colour)};color:{textOn(p.colour)}">P{r.slot + 1}</i>
        <b class="n" title={p.name}>{p.name}</b>
        <span class="rc">
          {#each r.points as pt, c (c)}
            <i class:cur={c + 1 === live} class:none={pt === null} data-race-points={c + 1}>{pt ?? '·'}</i>
          {/each}
        </span>
        <span class="a" class:nz={r.adjustment !== 0}>{r.adjustment ? (r.adjustment > 0 ? '+' : '') + r.adjustment : ''}</span>
        <span class="t" data-total>{r.total}</span>
      </div>
    {/each}
  </div>

  <div class="foot">
    {#if winner}
      <div class="win" data-winner>
        <div>
          <span class="u-lab">{match ? `${match.label} winner` : 'Winner'}</span>
          <b data-winner-name>{names[winner.slot]}</b>
          <small>{winner.total} pts{winner.byHand ? ' · set by hand' : winner.tieBroken ? ' · tie broken by the last race' : ''}</small>
        </div>
        {#if tournament}
          {#if upNext}
            <button type="button" class="u-btn acc big" data-next-match onclick={nextMatch}>Next match ▶ <small>{upNext.label}</small></button>
          {:else}
            <span class="u-dim sm">That was the last match.</span>
          {/if}
        {:else}
          <span class="u-dim sm">Final standings. Create a tournament on the Tournament page to carry on to a next match.</span>
        {/if}
      </div>
    {:else}
      <div class="note" data-leader-note>{leaderNote(rows, names, done, total)}</div>
    {/if}
    <div class="u-dim u-sm src">This is the table the Standings and race-win graphics read.</div>
  </div>
</section>

<style>
  .sb { min-width: 0; }
  .cnt { font-size: 12px; margin-left: 4px; }
  .row { display: grid; grid-template-columns: 22px 28px minmax(0, 1fr) auto 36px 56px; gap: 8px; align-items: center; padding: 0 14px; min-height: 76px; border-bottom: 1px solid #1c1f26; }
  .row.hdr { min-height: 30px; font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--ui-muted); border-bottom: 0; padding-top: 6px; flex: none; }
  .row.lead { background: linear-gradient(90deg, rgba(30,58,138,.28), transparent 70%); }
  .rk { font: 700 13px var(--ui-mono); color: var(--ui-muted); text-align: center; }
  .pcb { width: 26px; height: 26px; border-radius: 6px; display: grid; place-items: center; font: 700 10px var(--ui-font); font-style: normal; }
  .n { color: #fff; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .row.hdr .n { font-size: 10.5px; font-weight: 400; color: var(--ui-muted); }
  .rc { display: flex; gap: 3px; }
  .rc i { width: 30px; text-align: center; font: 600 12px var(--ui-mono); font-style: normal; color: #cbd5e1; padding: 4px 0; border-radius: 5px; background: #161a22; }
  .rc i.none { color: #4b5563; }
  .rc i.cur { outline: 1px solid #3b82f6; }
  .row.hdr .rc i { background: none; color: var(--ui-muted); font-size: 10px; padding: 0; outline: 0; }
  .a { text-align: center; font: 600 12px var(--ui-mono); color: var(--ui-muted); }
  .a.nz { color: #fff; }
  .t { text-align: right; font: 800 24px var(--ui-mono); color: #fff; }
  .row.hdr .t, .row.hdr .a { font: 400 10.5px var(--ui-font); color: var(--ui-muted); }

  .foot { border-top: 1px solid var(--ui-line); background: #101319; padding: 12px 14px; flex: none; display: grid; gap: 8px; }
  .note { font-size: 13px; color: #cbd5e1; }
  .win { display: grid; gap: 10px; }
  .win b { display: block; font-size: 30px; line-height: 1.15; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .win small { color: var(--ui-muted); font-size: 12.5px; }
  .big { height: 60px; font-size: 16px; }
  .src { margin-top: 2px; }

  @media (max-width: 1500px) {
    .row { grid-template-columns: 20px 26px minmax(0, 1fr) auto 26px 44px; gap: 6px; padding: 0 10px; }
    .rc i { width: 24px; }
    .t { font-size: 22px; }
  }
</style>
