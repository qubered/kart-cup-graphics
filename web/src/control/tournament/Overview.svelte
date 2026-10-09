<script lang="ts">
  // Overview: the bracket at a glance, what still needs fixing, and the live match (select, Next match, Go to Race).
  import type { Match, ShowState, Tournament } from '../../../../shared/types'
  import { colourHex } from '../../../../shared/palette'
  import { totals } from '../../../../shared/scoring'
  import { hasResults, roundLabel } from '../../../../shared/tournament'
  import { send } from '../store'
  import { act, goto } from '../ui'
  import { autoSource, matchesOfRound, matchStatusOf, nextMatchOf, raceDots, roundNumbers, winnerSlotOf, type Readiness } from '../tournament'
  import { openRound } from './nav'

  let { show, t, matches, ready }: { show: ShowState; t: Tournament; matches: Match[]; ready: Readiness } = $props()

  const rounds = $derived(roundNumbers(matches))
  const live = $derived(matches.find((m) => m.id === t.activeMatchId))
  const next = $derived(nextMatchOf(matches, t.activeMatchId))
  const race = $derived(show.draft.race)
  let showAll = $state(false)
  const LIMIT = 6
  const issues = $derived(showAll ? ready.issues : ready.issues.slice(0, LIMIT))

  function rename(e: Event & { currentTarget: HTMLInputElement }) {
    const name = e.currentTarget.value.trim()
    if (!name) { e.currentTarget.value = t.name; return }
    if (name === t.name) return
    act('Rename tournament', [{ type: 'renameTournament', id: t.id, name }], [{ type: 'renameTournament', id: t.id, name: t.name }])
  }
  /** What a player chip says: the name, or which winner the slot is waiting for. */
  function chip(m: Match, slot: number): string {
    const src = autoSource(m, slot)
    const from = src ? matches.find((x) => x.id === src) : undefined
    if (from && winnerSlotOf(from) === null) return `Winner of ${from.label}`
    return m.data.players[slot].name || `P${slot + 1}`
  }
  const statusText = { live: 'LIVE', done: 'DONE', pending: 'PENDING' } as const
</script>

<div class="u-ph">
  <span class="u-lab">Overview</span>
  <input class="u-input tname" type="text" name="tournamentTitle" data-tournament-name value={t.name} maxlength="100" aria-label="Tournament name" onchange={rename} />
</div>
<div class="u-grow ov">
  <section aria-label="Bracket at a glance">
    <div class="u-lab head">Bracket at a glance <span class="u-dim tip">· tap a match to edit it</span></div>
    <div class="glance" data-bracket>
      {#each rounds as r (r)}
        <div class="rgroup">
          <div class="rhead">{roundLabel(t, r)}</div>
          <div class="rcards">
            {#each matchesOfRound(matches, r) as m (m.id)}
              {@const st = matchStatusOf(m, t.activeMatchId)}
              {@const ws = winnerSlotOf(m)}
              {@const scored = hasResults(m.data)}
              {@const tot = totals(m.data.scores)}
              <button type="button" class="mc {st}" data-match={m.id} data-status={st} onclick={() => openRound(r, m.id)}>
                <span class="l1"><b>{m.label || 'Untitled'}</b><em class={st}>{statusText[st]}</em></span>
                <span class="l2">
                  {#each m.data.players as p, i (i)}
                    <i class:w={scored && ws === i} style:--c={colourHex(p.colour)}><span class="nm">{chip(m, i)}</span>{#if scored}<small>{tot[i]}</small>{/if}</i>
                  {/each}
                </span>
                <span class="rdots" aria-hidden="true">
                  {#each raceDots(m) as d, i (i)}<i class="{d}" class:cur={st === 'live' && i === race.raceNo - 1}></i>{/each}
                </span>
              </button>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </section>

  <div class="ovgrid">
    <div class="left">
      <div class="rv" class:ok={ready.matches.ok} class:warn={!ready.matches.ok} data-check="matches">
        <i class="sb">{ready.matches.ok ? '✓' : ready.matches.warn}</i>
        <div><b>Rounds and matches</b><small>{ready.matches.ok ? `${rounds.length} round${rounds.length === 1 ? '' : 's'}, ${matches.length} match${matches.length === 1 ? '' : 'es'}` : `${ready.matches.warn} to fix`}</small></div>
      </div>
      <div class="rv" class:ok={ready.players.ok} class:warn={!ready.players.ok} data-check="players">
        <i class="sb">{ready.players.ok ? '✓' : ready.players.warn}</i>
        <div><b>Players</b><small>{ready.players.ok ? 'Every slot has a name or a winner source' : `${ready.players.warn} slot${ready.players.warn === 1 ? '' : 's'} still to name`}</small></div>
      </div>
      {#if ready.issues.length}
        <div class="issues" data-issues>
          <div class="u-lab">To fix</div>
          {#each issues as x (`${x.matchId}:${x.kind}:${x.slot ?? ''}`)}
            <button type="button" class="issue" data-issue={x.kind} data-match-id={x.matchId} onclick={() => openRound(x.round, x.matchId)}>
              <span>{x.text}</span><em>Fix ›</em>
            </button>
          {/each}
          {#if ready.issues.length > LIMIT}
            <button type="button" class="u-link more" data-issues-toggle onclick={() => (showAll = !showAll)}>{showAll ? 'Show fewer' : `Show all ${ready.issues.length}`}</button>
          {/if}
        </div>
      {/if}
    </div>
    <div class="right">
      {#if live}
        <div class="rv live" data-live-card>
          <div><b>Live match</b><small>{live.label} · Race {race.raceNo} / {race.raceTotal}. The Race page runs this match.</small></div>
        </div>
      {/if}
      <select class="u-select" name="liveMatch" data-live-select aria-label="Live match" value={t.activeMatchId} onchange={(e) => send({ type: 'setActiveMatch', matchId: e.currentTarget.value })}>
        {#each rounds as r (r)}
          <optgroup label={roundLabel(t, r)}>
            {#each matchesOfRound(matches, r) as m (m.id)}<option value={m.id}>{m.label}</option>{/each}
          </optgroup>
        {/each}
      </select>
      <button type="button" class="u-btn" data-next-match disabled={!next} onclick={() => send({ type: 'nextMatch' })}>
        Next match ▶ {#if next}<small class="u-dim">{next.label}</small>{/if}
      </button>
      <button type="button" class="u-btn acc big" data-go-race onclick={() => goto('race')}>Go to Race ▶</button>
    </div>
  </div>
</div>

<style>
  .tname { margin-left: 4px; flex: 1; width: auto; }
  .ov { padding: 16px; display: grid; gap: 18px; align-content: start; }
  .head { margin-bottom: 8px; }
  .tip { text-transform: none; letter-spacing: 0; font-weight: 400; }
  .glance { display: flex; flex-wrap: wrap; gap: 14px 22px; align-items: flex-start; }
  .rgroup { display: grid; gap: 6px; }
  .rhead { font-size: 11px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--ui-muted); }
  .rcards { display: flex; flex-wrap: wrap; gap: 8px; }
  .mc { width: 188px; display: grid; gap: 7px; padding: 10px; text-align: left; white-space: normal; border-radius: 10px; border: 1px solid var(--ui-field); background: var(--ui-panel-2); }
  .mc:hover:not(:disabled) { border-color: #4a5160; background: #181c24; }
  .mc.live { border-color: #22c55e; box-shadow: inset 0 0 0 1px #22c55e; }
  .l1 { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
  .l1 b { color: #fff; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .l1 em { font-style: normal; font-size: 10px; font-weight: 700; letter-spacing: .08em; color: var(--ui-muted); }
  .l1 em.live { color: #4ade80; }
  .l1 em.done { color: #86efac; opacity: .8; }
  .l2 { display: flex; flex-wrap: wrap; gap: 4px; }
  .l2 > i { font-style: normal; font-size: 11.5px; max-width: 100%; display: inline-flex; align-items: center; gap: 4px; border: 1px solid var(--c); border-radius: 4px; padding: 1px 5px; color: #cbd5e1; min-width: 0; }
  .l2 > i .nm { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 92px; }
  .l2 > i small { color: #fff; font-family: var(--ui-mono); }
  .l2 > i.w { background: #14532d; color: #fff; }
  .rdots { display: flex; gap: 3px; }
  .rdots i { flex: 1; max-width: 22px; height: 5px; border-radius: 3px; background: #2d3340; display: block; }
  .rdots i.done { background: #22c55e; }
  .rdots i.part { background: #fbbf24; }
  .rdots i.cur { box-shadow: 0 0 0 1px #fff; }

  .ovgrid { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(250px, 1fr); gap: 18px; align-items: start; }
  .left, .right { display: grid; gap: 8px; align-content: start; }
  .rv { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 1px solid var(--ui-line); border-radius: 10px; background: var(--ui-panel-2); }
  .rv b { display: block; color: #fff; }
  .rv small { display: block; color: var(--ui-muted); font-size: 12px; margin-top: 2px; }
  .rv.warn { background: #2a1e07; border-color: #78350f; }
  .rv.live { background: #0f2a1a; border-color: #1d6b3b; }
  .sb { flex: none; width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; font: 700 12px/1 var(--ui-font); font-style: normal; }
  .rv.ok .sb { background: #14532d; color: #86efac; }
  .rv.warn .sb { background: var(--ui-pending); color: #111; }
  .issues { display: grid; gap: 6px; margin-top: 4px; }
  .issue { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 48px; padding: 6px 14px; text-align: left; white-space: normal; border-radius: 10px; border: 1px solid #78350f; background: #2a1e07; color: #fde68a; font-size: 13.5px; }
  .issue:hover:not(:disabled) { background: #3a2a0a; border-color: #b45309; }
  .issue em { font-style: normal; font-weight: 700; color: #fbbf24; flex: none; }
  .more { min-height: 44px; }
  .big { height: 56px; font-size: 16px; }
</style>
