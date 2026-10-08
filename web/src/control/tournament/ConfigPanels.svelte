<script lang="ts">
  import type { MatchesDetail, MatchesLayout, OutputFormat, Tournament, WinScreenConfig } from '../../../../shared/types'
  import { send } from '../store'

  let { tournament, connected }: { tournament: Tournament; connected: boolean } = $props()

  const win = $derived(tournament.winScreen)
  const ms = $derived(tournament.matchesScene)
  const br = $derived(tournament.bracket)

  const BLOCKS: { key: keyof WinScreenConfig['blocks']; label: string }[] = [
    { key: 'hero', label: 'Winner hero' }, { key: 'board', label: 'Scoreboard' }, { key: 'racePoints', label: 'Per-race points' },
    { key: 'cupEmblem', label: 'Cup emblem' }, { key: 'trackName', label: 'Track name' },
  ]
  const WIN_LAYOUTS: { id: WinScreenConfig['layout']; label: string }[] = [
    { id: 'heroLeft', label: 'Hero left, board right' }, { id: 'heroCentre', label: 'Hero centre, board below' },
  ]
  const LAYOUTS: { id: MatchesLayout; label: string }[] = [
    { id: 'grid', label: '2×2 grid' }, { id: 'row', label: '4 across' }, { id: 'stack', label: '1×4 stack' }, { id: 'focus', label: 'Focus card' },
  ]
  const DETAILS: { id: MatchesDetail; label: string }[] = [
    { id: 'full', label: 'Full' }, { id: 'compact', label: 'Compact' }, { id: 'winner', label: 'Winner only' },
  ]
  const FORMATS: { id: OutputFormat; label: string }[] = [{ id: 'wide', label: 'Wide' }, { id: 'twin', label: 'Twin' }, { id: 'hd', label: 'HD' }]
</script>

<section class="card flush" aria-label="Win screen" data-config="winScreen">
  <div class="ch"><h2>Win screens (race win, cup win)</h2></div>
  <div class="cp">
    <div class="lrow"><span class="k">Layout</span>
      <div class="seg sel" role="group" aria-label="Win screen layout">
        {#each WIN_LAYOUTS as l (l.id)}
          <button type="button" class:on={win.layout === l.id} data-win-layout={l.id} disabled={!connected} onclick={() => send({ type: 'setWinScreenConfig', patch: { layout: l.id } })}>{l.label}</button>
        {/each}
      </div>
    </div>
    <div class="lrow"><span class="k">Blocks</span>
      {#each BLOCKS as b (b.key)}
        <button type="button" class="sw" class:draft={win.blocks[b.key]} aria-pressed={win.blocks[b.key]} data-win-block={b.key} disabled={!connected}
          onclick={() => send({ type: 'setWinScreenConfig', patch: { blocks: { [b.key]: !win.blocks[b.key] } } })}><i></i>{b.label}</button>
      {/each}
    </div>
  </div>
</section>

<section class="card flush" aria-label="Matches scene" data-config="matchesScene">
  <div class="ch"><h2>Matches scene</h2></div>
  <div class="cp">
    <div class="lrow"><span class="k">Layout</span>
      <div class="seg sel" role="group" aria-label="Matches layout">
        {#each LAYOUTS as l (l.id)}
          <button type="button" class:on={ms.layout === l.id} data-matches-layout={l.id} disabled={!connected} onclick={() => send({ type: 'setMatchesSceneConfig', patch: { layout: l.id } })}>{l.label}</button>
        {/each}
      </div>
    </div>
    {#each FORMATS as f (f.id)}
      <div class="lrow"><span class="k">Detail · {f.label}</span>
        <div class="seg sel" role="group" aria-label="Detail on {f.label}">
          {#each DETAILS as d (d.id)}
            <button type="button" class:on={ms.detail[f.id] === d.id} data-matches-detail="{f.id}-{d.id}" disabled={!connected}
              onclick={() => send({ type: 'setMatchesSceneConfig', patch: { detail: { [f.id]: d.id } } })}>{d.label}</button>
          {/each}
        </div>
      </div>
    {/each}
    <div class="lrow"><span class="k">Pending matches</span>
      <div class="seg sel" role="group" aria-label="Pending scores">
        <button type="button" class:on={ms.pendingScores === 'zeros'} data-pending="zeros" disabled={!connected} onclick={() => send({ type: 'setMatchesSceneConfig', patch: { pendingScores: 'zeros' } })}>Show 0s</button>
        <button type="button" class:on={ms.pendingScores === 'hide'} data-pending="hide" disabled={!connected} onclick={() => send({ type: 'setMatchesSceneConfig', patch: { pendingScores: 'hide' } })}>Hide scores</button>
      </div>
      <button type="button" class="sw" class:draft={ms.liveMarker} aria-pressed={ms.liveMarker} data-live-marker disabled={!connected}
        onclick={() => send({ type: 'setMatchesSceneConfig', patch: { liveMarker: !ms.liveMarker } })}><i></i>Live marker</button>
    </div>
  </div>
</section>

<section class="card flush" aria-label="Bracket" data-config="bracket">
  <div class="ch"><h2>Bracket scene</h2></div>
  <div class="cp">
    <div class="lrow"><span class="k">Show</span>
      <button type="button" class="sw" class:draft={br.showScores} aria-pressed={br.showScores} data-bracket-scores disabled={!connected}
        onclick={() => send({ type: 'setBracketConfig', patch: { showScores: !br.showScores } })}><i></i>Scores</button>
      <button type="button" class="sw" class:draft={br.showStatus} aria-pressed={br.showStatus} data-bracket-status disabled={!connected}
        onclick={() => send({ type: 'setBracketConfig', patch: { showStatus: !br.showStatus } })}><i></i>Status</button>
    </div>
  </div>
</section>

<style>
  .cp { padding: 10px 12px; display: flex; flex-direction: column; gap: 10px; }
  .lrow .k { width: 130px; }
</style>
