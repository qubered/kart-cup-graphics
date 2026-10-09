<script lang="ts">
  // Centre panel: the four players and the finishing-place pad for the live race.
  // Places are staged here until all four are set, then saved in one command, so the scoreboard and any on-air standings never show half a race.
  import type { CatalogIndex } from '../../../../shared/catalog'
  import { colourHex } from '../../../../shared/palette'
  import { POINTS } from '../../../../shared/scoring'
  import { effectiveTrackId } from '../../../../shared/tournament'
  import type { Player, ShowState } from '../../../../shared/types'
  import { send } from '../store'
  import { act } from '../ui'
  import { twoTap } from '../ui/twotap.svelte'
  import CharacterPicker from './CharacterPicker.svelte'
  import ColourChip from './ColourChip.svelte'
  import { PLACES, SLOTS, changedPlayers, clearRaceCommands, isCompleteRow, liveRaceNo, placedCount, rowPoints, rowView, sameRow, stepPlan, tapPlace, trackOfRace } from './logic'
  import { staging } from './staging.svelte'

  let { st, catalog, matchId, matchKey, pending }: {
    st: ShowState; catalog: CatalogIndex; matchId: string | null; matchKey: string; pending: Record<string, number>
  } = $props()

  const ORD = ['1st', '2nd', '3rd', '4th']
  const draft = $derived(st.draft)
  const race = $derived(draft.race)
  const raceNo = $derived(liveRaceNo(race))
  const trackId = $derived(trackOfRace(catalog, race, raceNo) || race.trackId)
  const trackName = $derived(catalog.track(trackId)?.name ?? '')
  const saved = $derived(draft.scores.races.find((r) => r.raceNo === raceNo))
  const view = $derived(rowView(saved?.positions, staging.get(matchKey, raceNo)))
  const changed = $derived(changedPlayers(st, catalog, pending))
  const fwd = $derived(stepPlan(catalog, race, 1))
  const nextName = $derived(race.mode === 'cup' && fwd ? (catalog.track(effectiveTrackId(catalog, race, race.raceIndex + 1))?.name ?? '') : '')
  const done = $derived(view.complete && !view.staged)
  const canClear = $derived(!!saved || !!staging.get(matchKey, raceNo))

  // ---- results ----
  function tap(slot: number, place: number) {
    const next = tapPlace(view.row, slot, place)
    if (isCompleteRow(next)) {
      if (sameRow(next, saved?.positions)) { staging.drop(matchKey, raceNo); return }
      staging.set(matchKey, raceNo, next) // shown until the server confirms it
      send({ type: 'saveResults', raceNo, trackId, positions: [...next] })
    } else if (placedCount(next) === 0 && !saved) {
      staging.drop(matchKey, raceNo)
    } else {
      staging.set(matchKey, raceNo, next)
    }
  }
  const revert = () => staging.drop(matchKey, raceNo)

  const clr = twoTap()
  $effect(() => { if (raceNo) clr.reset() })
  function clearRace() {
    const s = saved
    if (!s) { staging.drop(matchKey, raceNo); return }
    clr.tap('clear', () => {
      staging.drop(matchKey, raceNo)
      act(`Clear race ${raceNo}`, clearRaceCommands(matchId, draft.scores, raceNo),
        [{ type: 'saveResults', raceNo, trackId: s.trackId, positions: [...s.positions] }], `Cleared race ${raceNo}`)
    })
  }
  function nextRace() {
    if (fwd) act('Next race', fwd.commands, fwd.undo, fwd.message)
  }

  const adj = (i: number) => draft.scores.adjustments[i] ?? 0
  const setAdj = (i: 0 | 1 | 2 | 3, value: number) => send({ type: 'setAdjustment', index: i, value: Math.max(-99, Math.min(99, Math.round(value) || 0)) })

  // ---- players ----
  const setPlayer = (i: 0 | 1 | 2 | 3, patch: Partial<Player>) => send({ type: 'setPlayer', index: i, patch })
  // The name field keeps its own text while it has focus (a state update must never rewrite what is being typed) and saves shortly after typing stops, and on Enter or blur.
  let drafts: Record<number, string | undefined> = $state({})
  const timers: Record<number, ReturnType<typeof setTimeout> | undefined> = {}
  function saveName(i: 0 | 1 | 2 | 3, value: string) { if (value !== draft.players[i].name) setPlayer(i, { name: value }) }
  function nameInput(i: 0 | 1 | 2 | 3, value: string) {
    drafts[i] = value
    clearTimeout(timers[i])
    timers[i] = setTimeout(() => saveName(i, value), 350)
  }
  function nameCommit(i: 0 | 1 | 2 | 3, value: string) {
    clearTimeout(timers[i])
    saveName(i, value)
    drafts[i] = undefined
  }
  function nameKey(i: 0 | 1 | 2 | 3, e: KeyboardEvent & { currentTarget: HTMLInputElement }) {
    if (e.key === 'Enter') { e.currentTarget.blur(); return } // blur saves
    if (e.key !== 'Escape') return
    clearTimeout(timers[i])
    drafts[i] = undefined
    e.currentTarget.value = draft.players[i].name
    e.currentTarget.blur()
  }
</script>

<section class="u-panel pad" aria-label="Players and result" data-pad>
  <div class="u-ph">
    <span class="u-lab">Players &amp; result</span>
    <b class="rn">Race {raceNo}</b>
    {#if trackName}<span class="u-dim">· {trackName}</span>{/if}
    {#if changed.length}
      <span class="note" data-not-on-air title="Edited in Preview; Take to put it on air">● {changed.map((i) => `P${i + 1}`).join(', ')} edited, not on air yet</span>
    {/if}
  </div>

  <div class="head" aria-hidden="true"><span>Player</span><span>Finishing place · tap one per player</span><span class="rcol">Race</span><span>Adjust</span></div>

  <div class="u-grow rows">
    {#each SLOTS as i (i)}
      {@const p = draft.players[i]}
      <div class="prow" data-player={i} data-result={i}>
        <div class="chipc"><ColourChip slot={i} value={p.colour} onchange={(c) => setPlayer(i, { colour: c })} /></div>
        <div class="who">
          <input name="name" type="text" class="u-input nm" maxlength="40" autocomplete="off" aria-label="Player {i + 1} name"
            value={drafts[i] ?? p.name}
            onfocus={() => (drafts[i] = p.name)}
            oninput={(e) => nameInput(i, e.currentTarget.value)}
            onblur={(e) => nameCommit(i, e.currentTarget.value)}
            onkeydown={(e) => nameKey(i, e)} />
          <CharacterPicker value={p.characterId} {catalog} label="Player {i + 1} character" onchange={(id) => setPlayer(i, { characterId: id })} />
        </div>
        <div class="places" role="group" aria-label="{p.name} finishing place">
          {#each PLACES as pl (pl)}
            {@const by = view.row.indexOf(pl)}
            {@const mine = by === i}
            <button type="button" class="place" class:sel={mine} class:staged={mine && view.staged} class:taken={by >= 0 && !mine}
              data-place={pl} aria-pressed={mine} aria-label="{p.name} {ORD[pl - 1]}, {POINTS[pl - 1]} points{by >= 0 && !mine ? `, taken by ${draft.players[by].name}` : ''}"
              onclick={() => tap(i, pl)}>
              <b>{ORD[pl - 1]}</b><small>+{POINTS[pl - 1]}</small>
              {#if by >= 0 && !mine}<i class="by" style="background:{colourHex(draft.players[by].colour)}"></i>{/if}
            </button>
          {/each}
        </div>
        <div class="rcol rpts" class:on={view.row[i] > 0} aria-label="Points this race">{view.row[i] > 0 ? `+${rowPoints(view.row, i)}` : '—'}</div>
        <div class="adj" role="group" aria-label="Adjustment for {p.name}">
          <button type="button" class="u-btn" data-adj="-1" aria-label="Minus one point for {p.name}" onclick={() => setAdj(i, adj(i) - 1)}>−</button>
          <input type="number" class="u-input val" class:nz={adj(i) !== 0} data-adj-value step="1" min="-99" max="99" aria-label="Adjustment for {p.name}"
            value={adj(i)} onchange={(e) => setAdj(i, +e.currentTarget.value)} />
          <button type="button" class="u-btn" data-adj="1" aria-label="Plus one point for {p.name}" onclick={() => setAdj(i, adj(i) + 1)}>+</button>
        </div>
      </div>
    {/each}
  </div>

  <div class="foot">
    {#each view.issues as issue (issue)}<div class="msg warn" data-issue>{issue}</div>{/each}
    {#if done}
      <div class="msg ok" data-status="saved">Race {raceNo} is complete and saved</div>
    {:else if view.complete}
      <div class="msg warn" data-status="saving">Saving race {raceNo}…</div>
    {:else if view.placed > 0}
      <div class="msg warn" data-status="partial">
        {view.placed} of 4 placed{view.staged ? ', not saved yet' : ''}. Tap a place for each remaining player{saved && view.staged ? '; the scoreboard keeps the saved result until then' : ''}.
        {#if view.staged && saved}<button type="button" class="u-link rv" data-revert onclick={revert}>Back to the saved result</button>{/if}
      </div>
    {:else if staging.get(matchKey, raceNo)}
      <div class="msg warn" data-status="partial">Nothing placed. The saved result stays until all four places are set or the race is cleared.
        <button type="button" class="u-link rv" data-revert onclick={revert}>Back to the saved result</button></div>
    {:else}
      <div class="msg" data-status="empty">Tap each player’s finishing place. Tap a taken place to move it.</div>
    {/if}
    <div class="acts">
      <button type="button" class="u-btn clear" class:confirm={clr.armed === 'clear'} data-clear-race disabled={!canClear} onclick={clearRace}>
        {clr.armed === 'clear' ? `Tap again to clear race ${raceNo}` : '↺ Clear this race'}
      </button>
      <button type="button" class="u-btn big" class:acc={done && !!fwd} data-next-race disabled={!done || !fwd} onclick={nextRace}>
        {#if done && fwd}Next race ▶ {#if nextName}<small>{nextName}</small>{/if}
        {:else if !fwd}{done ? 'That was the last race' : 'Complete the race to finish the match'}
        {:else}Complete the race to continue{/if}
      </button>
    </div>
  </div>
</section>

<style>
  .pad { min-width: 0; }
  .rn { color: #fff; }
  .note { margin-left: auto; font-size: 12px; color: var(--ui-pending); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .head, .prow { display: grid; grid-template-columns: 44px minmax(190px, 270px) auto 48px auto; justify-content: space-between; column-gap: 12px; align-items: center; padding: 0 14px; }
  .head { min-height: 30px; font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--ui-muted); flex: none; padding-top: 6px; }
  .head > span:first-child { grid-column: 1 / 3; }
  .head .rcol, .head > span:nth-child(2) { text-align: center; }
  .rows { overflow: auto; }
  .prow { min-height: 104px; padding-top: 8px; padding-bottom: 8px; border-bottom: 1px solid #1c1f26; }
  .who { display: grid; gap: 6px; min-width: 0; }
  .nm { font-weight: 700; }
  .places { display: grid; grid-template-columns: repeat(4, minmax(58px, 80px)); gap: 6px; }
  .place { height: 64px; padding: 0; border: 1px solid var(--ui-field); border-radius: 9px; background: #161a22; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; touch-action: manipulation; min-width: 0; }
  .place b { font-size: 16px; color: #fff; }
  .place small { font-size: 11px; color: var(--ui-muted); }
  .place.taken { opacity: .6; }
  .place.sel, .place.sel:hover:not(:disabled) { background: #1e3a8a; border-color: #3b82f6; }
  .place.sel small { color: #bfdbfe; }
  .place.sel.staged, .place.sel.staged:hover:not(:disabled) { background: #78350f; border-color: #d97706; }
  .place.sel.staged small { color: #fde68a; }
  .by { position: absolute; top: 6px; right: 6px; width: 9px; height: 9px; border-radius: 50%; }
  .rpts { font: 700 15px var(--ui-mono); color: var(--ui-muted); text-align: center; }
  .rpts.on { color: #4ade80; }
  .adj { display: grid; grid-template-columns: 44px 56px 44px; gap: 4px; align-items: center; }
  .adj .u-btn { width: 44px; padding: 0; font-size: 20px; touch-action: manipulation; }
  .val { width: 100%; padding: 0 2px; text-align: center; font-family: var(--ui-mono); color: var(--ui-muted); -moz-appearance: textfield; }
  .val.nz { color: #fff; }
  .val::-webkit-outer-spin-button, .val::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

  .foot { border-top: 1px solid var(--ui-line); background: #101319; padding: 12px 14px; display: grid; gap: 10px; flex: none; }
  .msg { font-size: 13px; color: var(--ui-muted); }
  .msg.ok { color: #4ade80; font-weight: 600; }
  .msg.warn { color: var(--ui-pending); }
  .rv { display: inline-flex; align-items: center; min-height: 44px; padding: 0 6px; }
  .acts { display: flex; gap: 8px; }
  .acts .u-btn { height: 56px; }
  .acts .clear { flex: none; min-width: 170px; }
  .acts .big { flex: 1; font-size: 16px; }

  /* narrower screens: name and character share a line, the places move under it */
  @media (max-width: 1500px) {
    .head { display: none; }
    .prow { grid-template-columns: 44px minmax(0, 1fr) auto; grid-template-areas: 'chip who who' 'places places adj'; row-gap: 8px; min-height: 0; }
    .chipc { grid-area: chip; }
    .who { grid-area: who; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
    .places { grid-area: places; grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .adj { grid-area: adj; }
    .rcol { display: none; }
  }
</style>
