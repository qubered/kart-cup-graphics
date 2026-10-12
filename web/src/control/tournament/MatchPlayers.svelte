<script lang="ts">
  // The four players of a match: name, character, colour, and where the slot comes from (hand-set, or the winner of another match).
  // A slot that takes a winner is filled automatically and read-only until its source is set to hand-set.
  import type { CatalogIndex } from '../../../../shared/catalog'
  import type { Match, Player } from '../../../../shared/types'
  import { colourHex, textOn } from '../../../../shared/palette'
  import { control, send } from '../store'
  import { changedPlayers } from '../race/logic'
  import { playerCount } from '../../../../shared/tournament'
  import { autoSource, slotSourceGroups, winnerSlotOf } from '../tournament'
  import CharacterPicker from './CharacterPicker.svelte'
  import ColourPicker from './ColourPicker.svelte'

  let { match, matches, catalog }: { match: Match; matches: Match[]; catalog: CatalogIndex } = $props()

  const count = $derived(playerCount(match.data))
  const slots = $derived(([0, 1, 2, 3] as const).filter((i) => i < count))
  // The live match's player details go on air with "Save players" (same as the race screen).
  const st = $derived($control.payload?.state)
  const live = $derived(st?.tournaments.find((x) => x.id === st.activeTournamentId)?.activeMatchId === match.id)
  const changed = $derived(live && st ? changedPlayers(st) : [])
  const groups = $derived(slotSourceGroups(matches, match.id))
  const hasChoices = $derived(groups.earlier.length + groups.other.length > 0)

  function setPlayer(i: number, p: Partial<Player>) {
    const players = [null, null, null, null] as (Partial<Player> | null)[]
    players[i] = p
    send({ type: 'updateMatch', matchId: match.id, patch: { players } })
  }
  function setSource(i: 0 | 1 | 2 | 3, v: string) {
    send({ type: 'setSlotSource', matchId: match.id, slot: i, source: v ? { matchId: v, auto: true } : null })
  }
  /** The source match's name while it has no winner yet (the slot then still holds its old player). */
  function waitingFor(i: number): string | null {
    const id = autoSource(match, i)
    const from = id ? matches.find((m) => m.id === id) : undefined
    return from && winnerSlotOf(from) === null ? from.label : null
  }
</script>

<section class="sec" aria-label="Players">
  <div class="u-lab">Players</div>
  <div class="cnt" role="group" aria-label="Players racing">
    <span class="u-dim">Racing</span>
    {#each [2, 3, 4] as n (n)}
      <button type="button" class="u-btn" class:acc={count === n} aria-pressed={count === n} data-match-player-count={n}
        onclick={() => count !== n && send({ type: 'updateMatch', matchId: match.id, patch: { race: { playerCount: n } } })}>{n}</button>
    {/each}
    <span class="u-dim">(2 = tie-breaker)</span>
  </div>
  {#if live}
    <div class="savebar">
      {#if changed.length}<span class="notonair" data-not-on-air>● {changed.map((i) => `P${i + 1}`).join(', ')} edited, not on air yet</span>{/if}
      <button type="button" class="u-btn" class:acc={changed.length > 0} data-save-players disabled={!changed.length} title="Put the player details on air" onclick={() => send({ type: 'savePlayers' })}>Save players</button>
    </div>
  {/if}
  {#each slots as i (i)}
    {@const p = match.data.players[i]}
    {@const src = autoSource(match, i)}
    {@const waiting = waitingFor(i)}
    <div class="prow" class:auto={src !== null} data-match-player={i} data-auto={src !== null ? 'true' : undefined}>
      <span class="n" style="background:{colourHex(p.colour)};color:{textOn(p.colour)}">P{i + 1}</span>
      <input class="u-input name" class:ph={waiting !== null} name="name" type="text" maxlength="40" aria-label="Player {i + 1} name"
        value={waiting !== null ? '' : p.name} placeholder={waiting !== null ? `Winner of ${waiting}` : 'Name'} disabled={src !== null}
        oninput={(e) => setPlayer(i, { name: e.currentTarget.value })} />
      <CharacterPicker value={p.characterId} {catalog} label="Player {i + 1} character" disabled={src !== null} onchange={(id) => setPlayer(i, { characterId: id })} />
      <ColourPicker value={p.colour} label="Player {i + 1} colour" disabled={src !== null} onchange={(c) => setPlayer(i, { colour: c })} />
      <input class="u-input sub" name="subtitle" type="text" maxlength="80" placeholder="Subtitle: job title · group" aria-label="Player {i + 1} subtitle"
        value={waiting !== null ? '' : (p.subtitle ?? '')} disabled={src !== null} oninput={(e) => setPlayer(i, { subtitle: e.currentTarget.value })} />
      {#if hasChoices}
        <div class="srcrow">
          {#if src !== null}<span class="autotag" data-auto-tag>AUTO</span>{/if}
          <select class="u-select src" name="slotSource" data-slot-source={i} aria-label="Player {i + 1} comes from" value={src ?? ''} onchange={(e) => setSource(i, e.currentTarget.value)}>
            <option value="">Hand-set{match.slotSources?.[i] && !match.slotSources[i]?.auto ? ' (auto off)' : ''}</option>
            {#if groups.earlier.length}
              <optgroup label="Earlier rounds">{#each groups.earlier as c (c.matchId)}<option value={c.matchId}>Winner of {c.label}</option>{/each}</optgroup>
            {/if}
            {#if groups.other.length}
              <optgroup label="Other matches">{#each groups.other as c (c.matchId)}<option value={c.matchId}>Winner of {c.label}</option>{/each}</optgroup>
            {/if}
          </select>
        </div>
      {/if}
    </div>
  {/each}
  <p class="note">A slot set to a winner fills itself from that match. Set it to Hand-set to type a name, pick a character or change the colour.</p>
</section>

<style>
  .cnt { display: flex; align-items: center; gap: 4px; }
  .sec { display: grid; gap: 10px; padding: 14px 16px; }
  .prow { display: grid; grid-template-columns: 36px minmax(80px, 1fr) minmax(120px, 170px) 112px; gap: 8px; align-items: center; padding: 8px; border: 1px solid var(--ui-line); border-radius: 10px; background: var(--ui-panel-2); }
  .prow.auto { border-color: #2f56b8; background: #0f1a36; }
  .prow .n { width: 36px; height: 36px; display: grid; place-items: center; border-radius: 8px; font-weight: 700; font-size: 12.5px; }
  .name.ph::placeholder { font-style: italic; color: #93c5fd; opacity: .85; }
  .prow.auto .name:disabled { opacity: 1; color: #fff; }
  .sub { grid-column: 2 / -1; }
  .srcrow { grid-column: 2 / -1; display: flex; align-items: center; gap: 8px; }
  .srcrow .src { flex: 1; }
  .autotag { flex: none; font: 700 10px/1 var(--ui-font); letter-spacing: .08em; padding: 6px 8px; border-radius: 4px; background: #1e3a8a; color: #bfdbfe; }
  .prow.auto .src { border-color: #2f56b8; }
  .savebar { display: flex; align-items: center; justify-content: flex-end; gap: 10px; }
  .notonair { font-size: 12px; color: var(--ui-pending); }
  .note { margin: 0; font-size: 11.5px; color: var(--ui-muted); }
</style>
