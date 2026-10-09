<script lang="ts">
  // Race page: the live race and its map (left), the players and finishing places (centre), the scoreboard (right).
  // It never changes graphics and never switches matches (that is the Tournament page). With an active tournament the draft IS the
  // active match, so everything here edits the live match; without one it is free play.
  import { activeTournament } from '../../../../shared/tournament'
  import { control } from '../store'
  import LiveRace from './LiveRace.svelte'
  import { sameRow } from './logic'
  import PlayersPad from './PlayersPad.svelte'
  import Scoreboard from './Scoreboard.svelte'
  import { staging } from './staging.svelte'

  const st = $derived($control.payload?.state)
  const catalog = $derived($control.catalog)
  const tournament = $derived(st ? activeTournament(st) : null)
  const matchId = $derived(tournament?.activeMatchId ?? null)
  const matchKey = $derived(`${tournament?.id ?? 'free'}:${matchId ?? ''}`)

  // An entry that has been saved is no longer "unsaved": forget it once the saved result matches.
  $effect(() => {
    if (!st) return
    for (const no of staging.nos(matchKey)) {
      const saved = st.draft.scores.races.find((r) => r.raceNo === no)
      if (sameRow(staging.get(matchKey, no), saved?.positions)) staging.drop(matchKey, no)
    }
  })
</script>

{#if st && catalog}
  <div class="racepage">
    <LiveRace {st} {catalog} {tournament} {matchId} {matchKey} />
    <PlayersPad {st} {catalog} {matchId} {matchKey} pending={$control.payload?.pending ?? {}} />
    <Scoreboard {st} {tournament} {matchId} />
  </div>
{:else}
  <section class="u-panel" style="margin:12px 14px"><div class="u-empty"><b>Race</b><span>Loading…</span></div></section>
{/if}

<style>
  .racepage { display: grid; grid-template-columns: minmax(300px, 350px) minmax(0, 1fr) minmax(330px, 440px); gap: 14px; padding: 12px 14px; height: 100%; min-height: 0; }
  @media (max-width: 1500px) {
    .racepage { grid-template-columns: minmax(270px, 300px) minmax(0, 1fr) minmax(350px, 380px); gap: 10px; padding: 10px; }
  }
</style>
