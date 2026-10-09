<script lang="ts">
  // The outline on the left: tournament switcher, Overview, one entry per round, Add round, Graphics, and the live match.
  import type { Match, ShowState, Tournament } from '../../../../shared/types'
  import { roundLabel } from '../../../../shared/tournament'
  import { send } from '../store'
  import { newMatchLabel, roundNumbers, summariseRounds, type Readiness } from '../tournament'
  import { openGraphics, openLibrary, openOverview, openRound, type TourPage } from './nav'

  let { show, t, matches, ready, page }: { show: ShowState; t: Tournament | null; matches: Match[]; ready: Readiness; page: TourPage } = $props()

  const MAX_ROUND = 20 // the command schema's limit
  const rounds = $derived(roundNumbers(matches))
  const summaries = $derived(t ? summariseRounds(matches, t.activeMatchId, ready.issues) : [])
  const live = $derived(t ? matches.find((m) => m.id === t.activeMatchId) : undefined)
  const race = $derived(show.draft.race)
  const canAddRound = $derived(rounds.length > 0 && Math.max(...rounds) < MAX_ROUND)

  // Add round = a new match in the next round number; open that round once it arrives.
  let pendingRound = $state<number | null>(null)
  function addRound() {
    const r = Math.max(...rounds) + 1
    pendingRound = r
    send({ type: 'addMatch', round: r, label: newMatchLabel(matches, r) })
  }
  $effect(() => {
    if (pendingRound !== null && rounds.includes(pendingRound)) {
      const r = pendingRound
      pendingRound = null
      openRound(r)
    }
  })
</script>

<section class="u-panel outline" aria-label="Tournament outline">
  <div class="u-ph"><span class="u-lab">Tournament</span></div>
  {#if t}
    <button type="button" class="tsw" data-library aria-current={page === 'lib' ? 'page' : undefined} onclick={() => openLibrary()}>
      <span><small>Loaded</small><b data-loaded-name>{t.name}</b></span><span class="u-dim">All ›</span>
    </button>
    <div class="steps u-grow">
      <button type="button" class="step" data-overview aria-current={page === 'overview' ? 'page' : undefined} onclick={openOverview}>
        <span class="stx"><b>Overview</b><small>{ready.ok ? 'Ready to run' : `${ready.warn} thing${ready.warn === 1 ? '' : 's'} to fix`}</small></span>
        {#if ready.ok}<i class="sb ok" aria-label="Ready">✓</i>{:else}<i class="sb warn" aria-label="{ready.warn} to fix">{ready.warn}</i>{/if}
      </button>
      <div class="grp">Rounds</div>
      {#each summaries as r (r.round)}
        <button type="button" class="step" data-round={r.round} aria-current={page === `round:${r.round}` ? 'page' : undefined} onclick={() => openRound(r.round)}>
          <span class="stx">
            <b>{roundLabel(t, r.round)}{#if r.live} <em class="livetag" data-live-round>LIVE</em>{/if}</b>
            <small>{r.total} match{r.total === 1 ? '' : 'es'} · {r.done} done</small>
            <span class="dots" aria-hidden="true">{#each r.statuses as s, i (i)}<i class={s}></i>{/each}</span>
          </span>
          {#if r.warn}<i class="sb warn" aria-label="{r.warn} to fix">{r.warn}</i>{:else}<i class="sb ok" aria-label="Ready">✓</i>{/if}
        </button>
      {/each}
      <button type="button" class="step addr" data-add-round disabled={!canAddRound} onclick={addRound}><span class="stx"><b>＋ Add round</b></span></button>
      <div class="grp">Scenes</div>
      <button type="button" class="step" data-graphics aria-current={page === 'graphics' ? 'page' : undefined} onclick={openGraphics}>
        <span class="stx"><b>Graphics</b><small>Win screen, matches, bracket</small></span>
      </button>
    </div>
    {#if live}
      <div class="foot" data-live-footer><span class="u-tag pvw">LIVE</span><span><b>{live.label}</b> · Race {race.raceNo} / {race.raceTotal}</span></div>
    {/if}
  {:else}
    <div class="steps u-grow">
      <div class="none"><b>No tournament loaded</b><small>Free play: the Race page runs one match with no bracket. Create or load a tournament to run several.</small></div>
      <button type="button" class="u-btn acc" data-new="bracket" onclick={() => openLibrary('bracket')}>＋ New bracket<small>4 semis + final</small></button>
      <button type="button" class="u-btn" data-new="empty" onclick={() => openLibrary('empty')}>＋ New tournament<small>One empty match</small></button>
      {#if show.tournaments.length}
        <button type="button" class="u-btn ghost" data-library aria-current={page === 'lib' ? 'page' : undefined} onclick={() => openLibrary()}>All tournaments ›</button>
      {/if}
    </div>
  {/if}
</section>

<style>
  .outline { min-width: 0; }
  .tsw { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 60px; padding: 8px 14px; border: 0; border-bottom: 1px solid var(--ui-line); border-radius: 0; background: transparent; text-align: left; flex: none; }
  .tsw:hover:not(:disabled) { background: #181c24; }
  .tsw[aria-current='page'] { background: #172554; }
  .tsw span:first-child { display: grid; gap: 1px; min-width: 0; }
  .tsw small { font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--ui-muted); }
  .tsw b { color: #fff; font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .steps { padding: 10px; display: grid; gap: 6px; align-content: start; }
  .grp { margin: 8px 4px 0; font-size: 11px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--ui-muted); }
  .step { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 56px; padding: 8px 12px; border-radius: 10px; border: 1px solid transparent; background: transparent; text-align: left; white-space: normal; }
  .step:hover:not(:disabled) { background: #181c24; border-color: transparent; }
  .step[aria-current='page'] { background: #172554; border-color: #2f56b8; }
  .stx { display: grid; gap: 2px; min-width: 0; }
  .stx b { color: #fff; font-size: 14px; }
  .stx small { color: var(--ui-muted); font-size: 11.5px; }
  .livetag { font-style: normal; font-size: 10px; font-weight: 700; letter-spacing: .08em; color: #4ade80; margin-left: 4px; }
  .dots { display: flex; gap: 3px; margin-top: 3px; }
  .dots i { width: 18px; height: 5px; border-radius: 3px; background: #2d3340; display: block; }
  .dots i.done { background: #166534; }
  .dots i.live { background: #22c55e; box-shadow: 0 0 0 1px #bbf7d0; }
  .sb { flex: none; width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; font: 700 11.5px/1 var(--ui-font); font-style: normal; }
  .sb.ok { background: #14532d; color: #86efac; }
  .sb.warn { background: var(--ui-pending); color: #111; }
  .addr { border: 1px dashed var(--ui-field); min-height: 48px; }
  .addr b { color: #cbd5e1; font-weight: 600; }
  .addr:disabled { opacity: .5; }
  .foot { flex: none; display: flex; align-items: center; gap: 8px; min-height: 48px; padding: 6px 14px; border-top: 1px solid var(--ui-line); font-size: 12.5px; color: var(--ui-muted); }
  .foot b { color: #fff; }
  .none { display: grid; gap: 4px; padding: 6px 4px 10px; }
  .none b { color: #fff; }
  .none small { color: var(--ui-muted); font-size: 12px; line-height: 1.4; }
</style>
