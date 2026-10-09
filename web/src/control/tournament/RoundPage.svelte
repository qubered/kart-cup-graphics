<script lang="ts">
  // One round: its name, a tab per match, and for the selected match its settings, players and results.
  import type { CatalogIndex } from '../../../../shared/catalog'
  import type { Match, Tournament } from '../../../../shared/types'
  import { roundLabel } from '../../../../shared/tournament'
  import { send } from '../store'
  import { act } from '../ui'
  import { twoTap } from '../ui/twotap.svelte'
  import { fillFromPreviousCommands, matchesOfRound, matchStatusOf, newMatchLabel, previousRound, removeRoundCommands, type Readiness } from '../tournament'
  import MatchPlayers from './MatchPlayers.svelte'
  import MatchResults from './MatchResults.svelte'
  import MatchSettings from './MatchSettings.svelte'
  import { openOverview, pickMatch, tourNav } from './nav'

  let { t, matches, catalog, round, ready }: { t: Tournament; matches: Match[]; catalog: CatalogIndex; round: number; ready: Readiness } = $props()

  const tt = twoTap()
  const ms = $derived(matchesOfRound(matches, round))
  const selected = $derived(ms.find((m) => m.id === $tourNav.matchId) ?? ms.find((m) => m.id === t.activeMatchId) ?? ms[0])
  const name = $derived(roundLabel(t, round))
  const fallback = $derived(`Round ${round + 1}`)
  const prev = $derived(previousRound(matches, round))
  const removeCmds = $derived(removeRoundCommands(t, round))
  const hasLive = $derived(ms.some((m) => m.id === t.activeMatchId))

  function renameRound(e: Event & { currentTarget: HTMLInputElement }) {
    const input = e.currentTarget
    const typed = input.value.trim()
    const next = typed === fallback ? '' : typed
    const was = t.roundNames?.[String(round)] ?? null
    input.value = next || fallback
    if ((was ?? '') === next) return
    act('Rename round', [{ type: 'setRoundName', round, name: next || null }], [{ type: 'setRoundName', round, name: was }])
  }
  function fill() {
    const cmds = fillFromPreviousCommands(matches, round)
    if (!cmds.length || prev === null) return
    for (const c of cmds) send(c)
  }
  function removeRound() {
    if (!removeCmds) return
    for (const c of removeCmds) send(c)
    openOverview()
  }

  // Add match = a new match in this round; select its tab once it arrives.
  let known = $state<string[] | null>(null)
  function addMatch() {
    known = matches.map((m) => m.id)
    send({ type: 'addMatch', round, label: newMatchLabel(matches, round) })
  }
  $effect(() => {
    const before = known
    if (!before) return
    const fresh = matches.find((m) => m.round === round && !before.includes(m.id))
    if (fresh) { known = null; pickMatch(fresh.id) }
  })
</script>

<div class="u-ph rph">
  <input class="u-input rname" type="text" name="roundName" data-round-name value={name} maxlength="40" aria-label="Round name" onchange={renameRound} />
  <span class="u-dim count">{ms.length} match{ms.length === 1 ? '' : 'es'}</span>
  <span class="sp"></span>
  {#if prev !== null}
    <button type="button" class="u-btn" data-fill-previous onclick={fill}>Fill players from the previous round’s winners</button>
  {/if}
  <button type="button" class="u-btn danger" class:confirm={tt.armed === `rr:${round}`} data-remove-round disabled={!removeCmds} onclick={() => tt.tap(`rr:${round}`, removeRound)}>
    {tt.armed === `rr:${round}` ? (hasLive ? 'Tap again: it holds the live match' : 'Tap again to remove round') : 'Remove round'}
  </button>
</div>
<div class="mtabs" role="tablist" aria-label="Matches in {name}">
  {#each ms as m (m.id)}
    {@const st = matchStatusOf(m, t.activeMatchId)}
    {@const bad = ready.issues.some((q) => q.matchId === m.id)}
    <button type="button" role="tab" class="mtab" class:on={m.id === selected?.id} aria-selected={m.id === selected?.id} data-match-tab={m.id} data-status={st} onclick={() => pickMatch(m.id)}>
      <b>{m.label || 'Untitled'}</b>
      {#if st !== 'pending'}<em class={st}>{st === 'live' ? 'LIVE' : 'DONE'}</em>{/if}
      {#if bad}<i class="sb warn" aria-label="Needs attention">!</i>{/if}
    </button>
  {/each}
  <button type="button" class="mtab add" data-add-match onclick={addMatch}>＋ Add match</button>
</div>
{#if selected}
  {#key selected.id}
    <div class="rbody">
      <div class="col u-grow">
        <MatchSettings {t} match={selected} {matches} {catalog} />
        <MatchPlayers match={selected} {matches} {catalog} />
      </div>
      <div class="col u-grow right"><MatchResults match={selected} {catalog} /></div>
    </div>
  {/key}
{/if}

<style>
  .rph { gap: 10px; }
  .rname { flex: 0 1 260px; width: auto; font-weight: 600; font-size: 15px; }
  .count { font-size: 12.5px; white-space: nowrap; }
  .sp { flex: 1; }
  .mtabs { display: flex; align-items: flex-end; gap: 4px; padding: 8px 12px 0; border-bottom: 1px solid var(--ui-line); flex: none; overflow-x: auto; }
  .mtab { display: inline-flex; align-items: center; gap: 8px; min-height: 48px; padding: 0 16px; border: 1px solid transparent; border-bottom: 0; border-radius: 10px 10px 0 0; background: transparent; color: var(--ui-muted); font-size: 14px; white-space: nowrap; }
  .mtab:hover:not(:disabled) { background: #181c24; }
  .mtab b { color: #cbd5e1; font-weight: 600; }
  .mtab.on { background: #172554; border-color: #2f56b8; }
  .mtab.on b { color: #fff; }
  .mtab em { font-style: normal; font-size: 10px; font-weight: 700; letter-spacing: .08em; }
  .mtab em.live { color: #4ade80; }
  .mtab em.done { color: #86efac; opacity: .8; }
  .mtab.add { margin-left: auto; color: #93c5fd; font-weight: 600; }
  .sb { width: 20px; height: 20px; border-radius: 50%; display: grid; place-items: center; font: 700 11px/1 var(--ui-font); font-style: normal; background: var(--ui-pending); color: #111; }
  .rbody { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); grid-template-rows: minmax(0, 1fr); }
  .col { min-width: 0; }
  .right { border-left: 1px solid var(--ui-line); }
</style>
