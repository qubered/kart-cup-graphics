<script lang="ts">
  import { control, send } from './store'
  import { SUPPORTED_SCENES } from '../../../shared/view'
  import type { BackgroundId, SceneId } from '../../../shared/types'

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
    { id: 'notice', label: 'Notice' },
  ]
  const progBg = $derived<BackgroundId>(prog?.background?.id ?? 'none')
  const progScene = $derived<SceneId>((prog?.scene?.kind as SceneId | undefined) ?? 'none')
  const progTrack = $derived(!!prog?.trackCard)
  const progLogo = $derived(prog?.scene?.kind === 'title' ? prog.scene.logo : null)
  const progLT = $derived(prog?.lowerThirds ?? [])
  const scenes = $derived(out ? SCENES.filter((s) => SUPPORTED_SCENES[out.format].includes(s.id)) : SCENES)

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
    </div>
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
