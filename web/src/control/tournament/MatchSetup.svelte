<script lang="ts">
  import type { CatalogIndex } from '../../../../shared/catalog'
  import type { Match, Player, RaceState, Tournament } from '../../../../shared/types'
  import { colourHex, textOn } from '../../../../shared/palette'
  import { matchWinnerSlot } from '../../../../shared/tournament'
  import CharacterSelect from '../components/CharacterSelect.svelte'
  import ColourSelect from '../components/ColourSelect.svelte'
  import TrackSelect from '../components/TrackSelect.svelte'
  import { send } from '../store'
  import { slotSourceChoices } from '../tournament'

  let { tournament, match, matches, catalog, connected }: {
    tournament: Tournament; match: Match; matches: Match[]; catalog: CatalogIndex; connected: boolean
  } = $props()

  const idx = [0, 1, 2, 3] as const
  const race = $derived(match.data.race)
  const cup = $derived(catalog.cup(race.cupId))
  const choices = $derived(slotSourceChoices(matches, match.id))
  const computed = $derived(matchWinnerSlot(null, match.data))
  const isActive = $derived(match.id === tournament.activeMatchId)

  const setPlayer = (i: number, p: Partial<Player>) => {
    const players = [null, null, null, null] as (Partial<Player> | null)[]
    players[i] = p
    send({ type: 'updateMatch', matchId: match.id, patch: { players } })
  }
  const setRace = (patch: Partial<RaceState>) => send({ type: 'updateMatch', matchId: match.id, patch: { race: patch } })
  const clampRace = (v: string) => Math.max(1, Math.min(99, Math.round(+v) || 1))
  const sourceOf = (i: number) => match.slotSources?.[i]
  const sourceVal = (i: number) => (sourceOf(i)?.auto ? sourceOf(i)!.matchId : '')
  function setSource(i: 0 | 1 | 2 | 3, v: string) {
    send({ type: 'setSlotSource', matchId: match.id, slot: i, source: v ? { matchId: v, auto: true } : null })
  }
  function setWinner(v: string) {
    send({ type: 'setWinnerOverride', matchId: match.id, slot: v === '' ? null : (Number(v) as 0 | 1 | 2 | 3) })
  }
  function remove() {
    if (confirm(`Remove match "${match.label}"?`)) send({ type: 'removeMatch', matchId: match.id })
  }
</script>

<section class="card flush" aria-label="Match setup" data-setup={match.id}>
  <div class="ch">
    <h2>Setup · {match.label}{isActive ? ' · live' : ''}</h2>
    <div class="r"><button type="button" class="danger" data-remove-match disabled={!connected || matches.length < 2} onclick={remove}>Remove match</button></div>
  </div>

  <div class="rrow">
    <input type="text" name="matchLabel" value={match.label} maxlength="40" aria-label="Match label" disabled={!connected}
      oninput={(e) => e.currentTarget.value.trim() && send({ type: 'updateMatch', matchId: match.id, patch: { label: e.currentTarget.value } })} />
    <label class="dim">Round
      <input type="number" min="0" max="9" aria-label="Round" value={match.round} disabled={!connected}
        onchange={(e) => send({ type: 'updateMatch', matchId: match.id, patch: { round: Math.max(0, Math.min(9, Math.round(+e.currentTarget.value) || 0)) } })} />
    </label>
  </div>

  <div class="rrow">
    <div class="seg sel" role="group" aria-label="Race mode">
      <button type="button" class:on={race.mode === 'cup'} disabled={!connected} onclick={() => setRace({ mode: 'cup' })}>Cup</button>
      <button type="button" class:on={race.mode === 'track'} disabled={!connected} onclick={() => setRace({ mode: 'track' })}>Single track</button>
    </div>
    {#if race.mode === 'cup'}
      <div class="cupf">
        {#if cup}<img src={cup.emblem} alt="" width="24" height="24" />{/if}
        <select name="matchCup" aria-label="Cup" value={race.cupId} disabled={!connected} onchange={(e) => setRace({ cupId: e.currentTarget.value, raceIndex: 0 })}>
          {#each catalog.cups as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
        </select>
      </div>
    {:else}
      <div class="cupf"><TrackSelect value={race.trackId} {catalog} disabled={!connected} onchange={(id) => setRace({ trackId: id })} /></div>
    {/if}
  </div>
  <div class="rrow count">
    <span>Race</span>
    <input type="number" min="1" max="99" aria-label="Race number" value={race.raceNo} disabled={!connected} onchange={(e) => setRace({ raceNo: clampRace(e.currentTarget.value) })} />
    <span>of</span>
    <input type="number" min="1" max="99" aria-label="Races in total" value={race.raceTotal} disabled={!connected} onchange={(e) => setRace({ raceTotal: clampRace(e.currentTarget.value) })} />
  </div>

  {#each idx as i (i)}
    {@const p = match.data.players[i]}
    <div class="prow" data-match-player={i}>
      <span class="n" style="background:{colourHex(p.colour)};color:{textOn(p.colour)}">P{i + 1}</span>
      <input name="name" type="text" value={p.name} disabled={!connected} maxlength="40" aria-label="Player {i + 1} name" oninput={(e) => setPlayer(i, { name: e.currentTarget.value })} />
      <CharacterSelect value={p.characterId} {catalog} disabled={!connected} onchange={(id) => setPlayer(i, { characterId: id })} />
      <ColourSelect value={p.colour} disabled={!connected} onchange={(c) => setPlayer(i, { colour: c })} />
      <input class="sub" name="subtitle" type="text" value={p.subtitle ?? ''} disabled={!connected} maxlength="80" placeholder="Subtitle: job title · group" aria-label="Player {i + 1} subtitle" oninput={(e) => setPlayer(i, { subtitle: e.currentTarget.value })} />
    </div>
  {/each}

  <div class="ovr">
    <h2>Overrides</h2>
    <div class="field">
      <label for="winner-{match.id}">Winner</label>
      <select id="winner-{match.id}" name="winnerOverride" value={match.winnerOverride === null ? '' : String(match.winnerOverride)} disabled={!connected} onchange={(e) => setWinner(e.currentTarget.value)}>
        <option value="">Auto{computed === null ? ' (no results yet)' : `: ${match.data.players[computed]?.name}`}</option>
        {#each idx as i (i)}<option value={String(i)}>{match.data.players[i].name || `Player ${i + 1}`} (P{i + 1})</option>{/each}
      </select>
    </div>
    {#each idx as i (i)}
      <div class="field">
        <label for="src-{match.id}-{i}">P{i + 1} comes from</label>
        <select id="src-{match.id}-{i}" name="slotSource" data-slot-source={i} value={sourceVal(i)} disabled={!connected || !choices.length} onchange={(e) => setSource(i, e.currentTarget.value)}>
          <option value="">Manual (set above){sourceOf(i) && !sourceOf(i)?.auto ? ' · auto off' : ''}</option>
          {#each choices as c (c.matchId)}<option value={c.matchId}>Auto: winner of {c.label}</option>{/each}
        </select>
      </div>
    {/each}
    <p class="foot" style="padding:0">Auto slots follow the source match's winner. Editing a slot's player by hand turns auto off for it; pick the source again to turn it back on.</p>
  </div>
</section>

<style>
  .rrow input[type=text] { flex: 1; }
  .count { align-items: center; gap: 8px; color: var(--ui-muted); }
  .count input { width: 56px; }
  .cupf { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; background: var(--ui-bg); border: 1px solid var(--ui-field); border-radius: 6px; padding: 0 9px; }
  .cupf :global(.cur) { border: 0; padding-left: 0; padding-right: 0; }
  .cupf img { width: 24px; height: 24px; object-fit: contain; flex: none; }
  .cupf select { flex: 1; border: 0; background: transparent; padding: 6px 0; color: #fff; font-size: 14px; }
  .cupf select option { background: var(--ui-panel); }
  .ovr { padding: 10px 12px 4px; border-top: 1px solid var(--ui-line); margin-top: 6px; }
</style>
