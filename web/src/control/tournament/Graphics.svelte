<script lang="ts">
  // Graphics: the three tournament scene configs (win screens, matches scene, bracket), each with a schematic preview from the live data
  // and Send to Preview, which puts that scene into the Preview of the output chosen on the Live page.
  import type { CatalogIndex } from '../../../../shared/catalog'
  import type { Layers, MatchesDetail, MatchesLayout, OutputConfig, OutputFormat, SceneId, ShowState, Tournament, WinScreenConfig } from '../../../../shared/types'
  import { deriveView, isSceneSupported } from '../../../../shared/view'
  import { control, send } from '../store'
  import { goto, toast } from '../ui'
  import ScenePreview from './ScenePreview.svelte'

  let { show, t, catalog }: { show: ShowState; t: Tournament; catalog: CatalogIndex } = $props()

  const win = $derived(t.winScreen)
  const ms = $derived(t.matchesScene)
  const br = $derived(t.bracket)
  const out = $derived(show.outputs.find((o) => o.id === $control.selectedOutput) ?? show.outputs[0])
  let winKind = $state<'raceWin' | 'cupWin'>('raceWin')

  const BLOCKS: { key: keyof WinScreenConfig['blocks']; label: string }[] = [
    { key: 'hero', label: 'Winner hero' }, { key: 'board', label: 'Scoreboard' }, { key: 'racePoints', label: 'Per-race points' },
    { key: 'cupEmblem', label: 'Cup emblem' }, { key: 'trackName', label: 'Track name' },
  ]
  const WIN_LAYOUTS: { id: WinScreenConfig['layout']; label: string }[] = [
    { id: 'heroLeft', label: 'Hero left, board right' }, { id: 'heroCentre', label: 'Hero centre, board below' },
  ]
  const LAYOUTS: { id: MatchesLayout; label: string }[] = [
    { id: 'grid', label: '2×2' }, { id: 'row', label: '4 across' }, { id: 'stack', label: '1×4' }, { id: 'focus', label: 'Focus' },
  ]
  const DETAILS: { id: MatchesDetail; label: string }[] = [{ id: 'full', label: 'Full' }, { id: 'compact', label: 'Compact' }, { id: 'winner', label: 'Winner only' }]
  const FORMATS: { id: OutputFormat; label: string }[] = [{ id: 'wide', label: 'Wide' }, { id: 'twin', label: 'Twin' }, { id: 'hd', label: 'HD' }]
  const LABELS: Record<string, string> = { raceWin: 'Race win', cupWin: 'Cup win', matches: 'Matches', bracket: 'Bracket' }

  /** The scene as an output of `format` would derive it, from the live data. Win screens preview on an HD canvas (a twin only shows halves). */
  function view(scene: SceneId, format: OutputFormat) {
    const o: OutputConfig = { id: 'preview', name: 'Preview', format, safeArea: { top: 0, right: 0, bottom: 0, left: 0 }, graphicsScale: 1 }
    const layers: Layers = { background: 'none', scene, trackCard: false, lowerThirds: { on: false, players: [] }, part: 'full' }
    return deriveView(show.draft, layers, o, catalog, t).scene
  }
  const winView = $derived(view(winKind, 'hd'))
  const matchesView = $derived(view('matches', out?.format ?? 'wide'))
  const bracketView = $derived(view('bracket', 'hd'))

  /** The part that makes `scene` valid on the selected output (keeps the current one when it already is), or null when it cannot show the scene. */
  function partFor(scene: SceneId): Layers['part'] | null {
    if (!out) return null
    const cur = show.layers[out.id]?.part ?? 'full'
    return (['full', 'hero', 'board'] as const).find((p) => p === cur && isSceneSupported(out.format, scene, p)) ?? (['hero', 'board', 'full'] as const).find((p) => isSceneSupported(out.format, scene, p)) ?? null
  }
  const canSend = (scene: SceneId) => partFor(scene) !== null
  function sendToPreview(scene: 'raceWin' | 'cupWin' | 'matches' | 'bracket') {
    const part = partFor(scene)
    if (!out || !part) return
    const isWin = scene === 'raceWin' || scene === 'cupWin'
    send({ type: 'setLayers', outputId: out.id, patch: { scene, ...(isWin && part !== (show.layers[out.id]?.part ?? 'full') ? { part } : {}) } })
    toast(`${LABELS[scene]} is in the ${out.name} Preview`)
  }
</script>

<div class="u-ph">
  <span class="u-lab">Graphics</span>
  <span class="u-dim sub">What the tournament scenes show. Previews use the live data.</span>
  <span class="target" data-target={out?.id}>Sends to <b>{out?.name ?? 'no output'}</b> <button type="button" class="u-link" onclick={() => goto('live')}>Change on Live ›</button></span>
</div>
<div class="u-grow cards">
  <section class="gc" aria-label="Win screen" data-config="winScreen">
    <div class="gch"><b>Win screens</b><span class="u-dim">race win · cup win</span></div>
    <div class="u-seg blue" role="group" aria-label="Win screen to preview">
      <button type="button" class:sel={winKind === 'raceWin'} data-win-kind="raceWin" aria-pressed={winKind === 'raceWin'} onclick={() => (winKind = 'raceWin')}>Race win</button>
      <button type="button" class:sel={winKind === 'cupWin'} data-win-kind="cupWin" aria-pressed={winKind === 'cupWin'} onclick={() => (winKind = 'cupWin')}>Cup win</button>
    </div>
    <ScenePreview scene={winView} />
    <div class="opt"><span class="u-lab">Layout</span>
      <div class="u-seg blue" role="group" aria-label="Win screen layout">
        {#each WIN_LAYOUTS as l (l.id)}
          <button type="button" class:sel={win.layout === l.id} data-win-layout={l.id} aria-pressed={win.layout === l.id} onclick={() => send({ type: 'setWinScreenConfig', patch: { layout: l.id } })}>{l.label}</button>
        {/each}
      </div>
    </div>
    <div class="opt"><span class="u-lab">Blocks</span>
      <div class="tgrid">
        {#each BLOCKS as b (b.key)}
          <button type="button" class="u-tgl" class:on={win.blocks[b.key]} aria-pressed={win.blocks[b.key]} data-win-block={b.key}
            onclick={() => send({ type: 'setWinScreenConfig', patch: { blocks: { [b.key]: !win.blocks[b.key] } } })}><span class="u-tt">{b.label}</span><span class="u-sw"></span></button>
        {/each}
      </div>
    </div>
    <button type="button" class="u-btn" data-send={winKind} disabled={!canSend(winKind)} onclick={() => sendToPreview(winKind)}>Send {LABELS[winKind].toLowerCase()} to Preview</button>
  </section>

  <section class="gc" aria-label="Matches scene" data-config="matchesScene">
    <div class="gch"><b>Matches scene</b><span class="u-dim">all matches at a glance</span></div>
    <ScenePreview scene={matchesView} />
    <div class="opt"><span class="u-lab">Layout</span>
      <div class="u-seg blue" role="group" aria-label="Matches layout">
        {#each LAYOUTS as l (l.id)}
          <button type="button" class:sel={ms.layout === l.id} data-matches-layout={l.id} aria-pressed={ms.layout === l.id} onclick={() => send({ type: 'setMatchesSceneConfig', patch: { layout: l.id } })}>{l.label}</button>
        {/each}
      </div>
    </div>
    {#each FORMATS as f (f.id)}
      <div class="opt"><span class="u-lab">Detail · {f.label}</span>
        <div class="u-seg blue" role="group" aria-label="Detail on {f.label}">
          {#each DETAILS as d (d.id)}
            <button type="button" class:sel={ms.detail[f.id] === d.id} data-matches-detail="{f.id}-{d.id}" aria-pressed={ms.detail[f.id] === d.id}
              onclick={() => send({ type: 'setMatchesSceneConfig', patch: { detail: { [f.id]: d.id } } })}>{d.label}</button>
          {/each}
        </div>
      </div>
    {/each}
    <div class="opt"><span class="u-lab">Pending matches</span>
      <div class="u-seg blue" role="group" aria-label="Pending scores">
        <button type="button" class:sel={ms.pendingScores === 'zeros'} data-pending="zeros" aria-pressed={ms.pendingScores === 'zeros'} onclick={() => send({ type: 'setMatchesSceneConfig', patch: { pendingScores: 'zeros' } })}>Show 0s</button>
        <button type="button" class:sel={ms.pendingScores === 'hide'} data-pending="hide" aria-pressed={ms.pendingScores === 'hide'} onclick={() => send({ type: 'setMatchesSceneConfig', patch: { pendingScores: 'hide' } })}>Hide scores</button>
      </div>
      <button type="button" class="u-tgl" class:on={ms.liveMarker} aria-pressed={ms.liveMarker} data-live-marker onclick={() => send({ type: 'setMatchesSceneConfig', patch: { liveMarker: !ms.liveMarker } })}><span class="u-tt">Live marker</span><span class="u-sw"></span></button>
    </div>
    <button type="button" class="u-btn" data-send="matches" disabled={!canSend('matches')} onclick={() => sendToPreview('matches')}>Send matches to Preview</button>
  </section>

  <section class="gc" aria-label="Bracket" data-config="bracket">
    <div class="gch"><b>Bracket scene</b><span class="u-dim">rounds feeding the final</span></div>
    <ScenePreview scene={bracketView} />
    <div class="opt"><span class="u-lab">Show</span>
      <div class="tgrid">
        <button type="button" class="u-tgl" class:on={br.showScores} aria-pressed={br.showScores} data-bracket-scores onclick={() => send({ type: 'setBracketConfig', patch: { showScores: !br.showScores } })}><span class="u-tt">Scores</span><span class="u-sw"></span></button>
        <button type="button" class="u-tgl" class:on={br.showStatus} aria-pressed={br.showStatus} data-bracket-status onclick={() => send({ type: 'setBracketConfig', patch: { showStatus: !br.showStatus } })}><span class="u-tt">Status</span><span class="u-sw"></span></button>
      </div>
    </div>
    <button type="button" class="u-btn" data-send="bracket" disabled={!canSend('bracket')} onclick={() => sendToPreview('bracket')}>Send bracket to Preview</button>
  </section>
</div>

<style>
  .sub { font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
  .target { margin-left: auto; display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--ui-muted); white-space: nowrap; }
  .target b { color: #fff; }
  .cards { padding: 14px; display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: 14px; align-items: start; }
  .gc { display: grid; gap: 10px; padding: 14px; border: 1px solid var(--ui-line); border-radius: 12px; background: var(--ui-panel-2); min-width: 0; }
  .gch { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
  .gch b { color: #fff; font-size: 15px; }
  .gch .u-dim { font-size: 12px; }
  .opt { display: grid; gap: 6px; }
  .tgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
  .u-tgl { width: 100%; }
  /* every target is at least 44px */
  .gc :global(.u-seg > button) { height: 44px; white-space: normal; line-height: 1.15; }
</style>
