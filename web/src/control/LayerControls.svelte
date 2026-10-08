<script lang="ts">
  import { control, send } from './store'
  import { isSceneSupported } from '../../../shared/view'
  import { activeTournament } from '../../../shared/tournament'
  import type { BackgroundId, QrStyle, SceneId, ScenePart } from '../../../shared/types'
  import { choiceToRef, rangeSet, refToChoice, splitAcrossOutputs, toggleRound } from './tournament'

  const st = $derived($control.payload?.state)
  const id = $derived($control.selectedOutput)
  const out = $derived(st?.outputs.find((o) => o.id === id))
  const layers = $derived(st?.layers[id])
  const prog = $derived(st?.program[id]?.view)

  const BGS: { id: BackgroundId; label: string }[] = [
    { id: 'A', label: 'A · Sky' },
    { id: 'B', label: 'B · Icons' },
    { id: 'C', label: 'C · Stickers' },
    { id: 'none', label: 'None' },
  ]
  const SCENES: { id: SceneId; label: string }[] = [
    { id: 'none', label: 'None' },
    { id: 'title', label: 'Title' },
    { id: 'lineup', label: 'Line-up' },
    { id: 'nextRace', label: 'Next race' },
    { id: 'standings', label: 'Standings' },
    { id: 'winner', label: 'Winner' },
    { id: 'raceWin', label: 'Race win' },
    { id: 'cupWin', label: 'Cup win' },
    { id: 'bracket', label: 'Bracket' },
    { id: 'matches', label: 'Matches' },
    { id: 'notice', label: 'Notice' },
    { id: 'qr', label: 'QR codes' },
  ]
  const PARTS: { id: ScenePart; label: string }[] = [{ id: 'full', label: 'Full' }, { id: 'hero', label: 'Hero' }, { id: 'board', label: 'Board' }]
  const progBg = $derived<BackgroundId>(prog?.background?.id ?? 'none')
  const progScene = $derived<SceneId>((prog?.scene?.kind as SceneId | undefined) ?? 'none')
  const progQr = $derived(prog?.scene?.kind === 'qr' ? prog.scene.style : null)
  /** QR layouts offered per format (twins always show one code per half). */
  const QR_STYLES = $derived<[QrStyle, string][]>(
    out?.format === 'wide' ? [['center', 'Centre'], ['title', 'Title + sides'], ['sides', 'Sides']]
      : out?.format === 'hd' ? [['center', 'QR only'], ['title', 'Title + QR']] : [])
  const progNoticeQr = $derived(prog?.scene?.kind === 'notice' && !!prog.scene.qr)
  const progTrack = $derived(!!prog?.trackCard)
  const progLogo = $derived(prog?.scene?.kind === 'title' ? prog.scene.logo : null)
  const progLT = $derived(prog?.lowerThirds ?? [])
  const tour = $derived(st ? activeTournament(st) : null)
  // Bracket and matches need a tournament; hide them otherwise so nothing changes for shows without one.
  const scenes = $derived(
    SCENES.filter((s) => (!out || isSceneSupported(out.format, s.id, s.id === 'raceWin' || s.id === 'cupWin' ? 'hero' : 'full')) && (tour || (s.id !== 'bracket' && s.id !== 'matches'))),
  )
  const isWin = $derived(layers?.scene === 'raceWin' || layers?.scene === 'cupWin')
  const part = $derived<ScenePart>(layers?.part ?? 'full')
  const parts = $derived(PARTS.filter((p) => !out || isSceneSupported(out.format, layers?.scene ?? 'none', p.id)))
  const split = $derived(st && layers ? splitAcrossOutputs(st.outputs, id, st.layers) : null)
  const mset = $derived(layers?.matchSet)
  const rounds = $derived([...new Set((tour?.matches ?? []).map((m) => m.round))].sort((a, b) => a - b))
  const nMatches = $derived(tour?.matches.length ?? 0)

  function patch(p: Record<string, unknown>) {
    send({ type: 'setLayers', outputId: id, patch: p })
  }
  function togglePlayer(i: number) {
    if (!layers) return
    const cur = layers.lowerThirds.players
    const next = cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i].sort((a, b) => a - b)
    patch({ lowerThirds: { ...layers.lowerThirds, players: next } })
  }
</script>

{#if out && layers}
  <div class="layers">
    <div class="lrow">
      <span class="k">Background</span>
      <div class="seg lay">
        {#each BGS as b (b.id)}
          <button class:draft={layers.background === b.id} class:live={progBg === b.id}
            onclick={() => patch({ background: b.id })}>{b.label}</button>
        {/each}
      </div>
      <span class="legend">
        <span><b style="background:var(--ui-preview)"></b>preview</span>
        <span><b style="background:var(--ui-program)"></b>on air</span>
      </span>
    </div>
    <div class="lrow">
      <span class="k">Scene</span>
      <div class="seg lay">
        {#each scenes as s (s.id)}
          <button class:draft={layers.scene === s.id} class:live={progScene === s.id}
            onclick={() => patch({ scene: s.id })}>{s.label}</button>
        {/each}
      </div>
      {#if layers.scene === 'lineup'}
        <span class="k">Reveal</span>
        <div class="seg lay">
          {#each [1, 2, 3, 4] as n (n)}
            <button class:draft={(layers.lineupShown ?? 4) === n} onclick={() => patch({ lineupShown: n })}>{n === 4 ? 'All' : n === 1 ? 'P1' : `P1–${n}`}</button>
          {/each}
          <button onclick={() => patch({ lineupShown: Math.min(4, (layers.lineupShown ?? 4) + 1) })}>Next player</button>
        </div>
      {/if}
      {#if layers.scene === 'notice'}
        <button class="sw" class:draft={!!layers.noticeQr} class:live={progNoticeQr} aria-pressed={!!layers.noticeQr}
          onclick={() => patch({ noticeQr: !layers.noticeQr })}><i></i>Show QR codes</button>
      {/if}
      {#if layers.scene === 'qr' && QR_STYLES.length}
        <span class="k">Layout</span>
        <div class="seg lay">
          {#each QR_STYLES as [m, l] (m)}
            <button class:draft={(layers.qrStyle ?? 'center') === m || (m === 'center' && out.format === 'hd' && layers.qrStyle === 'sides')} class:live={progQr === m}
              onclick={() => patch({ qrStyle: m })}>{l}</button>
          {/each}
        </div>
      {/if}
    </div>
    {#if isWin}
      <div class="lrow" data-win-controls>
        <span class="k">Part</span>
        <div class="seg lay">
          {#each parts as p (p.id)}
            <button data-part={p.id} class:draft={part === p.id} onclick={() => patch({ part: p.id })}>{p.label}</button>
          {/each}
        </div>
        <button data-split disabled={!split} title="Hero on this output, scoreboard on another" onclick={() => split?.forEach((c) => send(c))}>Split across outputs</button>
        {#if tour}
          <span class="k">Match</span>
          <select name="matchRef" aria-label="Match shown" value={refToChoice(layers.matchRef)} onchange={(e) => patch({ matchRef: choiceToRef(e.currentTarget.value) })}>
            <option value="active">Active match</option>
            <option value="previous">Previous match</option>
            {#each tour.matches as m (m.id)}<option value={m.id}>{m.label}</option>{/each}
          </select>
        {/if}
      </div>
    {/if}
    {#if layers.scene === 'matches' && tour}
      <div class="lrow" data-matches-controls>
        <span class="k">Matches</span>
        <button class:draft={!mset?.rounds?.length && !mset?.ids?.length && !mset?.range} data-set-all onclick={() => patch({ matchSet: {} })}>All</button>
        {#each rounds as r (r)}
          <button class:draft={mset?.rounds?.includes(r)} data-set-round={r} onclick={() => patch({ matchSet: toggleRound(mset, r) })}>Round {r + 1}</button>
        {/each}
        <label class="pchk">From
          <input type="number" min="1" max={nMatches} aria-label="From match" value={mset?.range ? mset.range[0] + 1 : ''}
            onchange={(e) => patch({ matchSet: rangeSet(mset, e.currentTarget.value === '' ? null : +e.currentTarget.value, mset?.range ? mset.range[1] + 1 : null, nMatches) })} />
        </label>
        <label class="pchk">to
          <input type="number" min="1" max={nMatches} aria-label="To match" value={mset?.range ? mset.range[1] + 1 : ''}
            onchange={(e) => patch({ matchSet: rangeSet(mset, mset?.range ? mset.range[0] + 1 : null, e.currentTarget.value === '' ? null : +e.currentTarget.value, nMatches) })} />
        </label>
      </div>
    {/if}
    <div class="lrow">
      <span class="k">Overlays</span>
      <button class="sw" class:draft={layers.trackCard} class:live={progTrack} aria-pressed={layers.trackCard}
        onclick={() => patch({ trackCard: !layers.trackCard })}><i></i>Track card</button>
      {#if layers.scene === 'title'}
        <span class="k">Logo</span>
        <div class="seg lay">
          {#each [['off', 'Off'], ['corner', 'Corner'], ['title', 'In title']] as [m, l] (m)}
            <button class:draft={(layers.logo ?? 'corner') === m} class:live={progLogo === m}
              onclick={() => patch({ logo: m })}>{l}</button>
          {/each}
        </div>
      {/if}
      <button class="sw" class:draft={layers.lowerThirds.on} class:live={progLT.length > 0} aria-pressed={layers.lowerThirds.on}
        onclick={() => patch({ lowerThirds: { ...layers.lowerThirds, on: !layers.lowerThirds.on } })}><i></i>Lower thirds</button>
      {#if out.format !== 'twin'}
        {#each [0, 1, 2, 3] as i (i)}
          <label class="pchk"><input type="checkbox" checked={layers.lowerThirds.players.includes(i)}
            onchange={() => togglePlayer(i)} />P{i + 1}</label>
        {/each}
      {/if}
    </div>
  </div>
{/if}
