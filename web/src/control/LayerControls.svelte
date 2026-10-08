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
  ]
  const progBg = $derived<BackgroundId>(prog?.background?.id ?? 'none')
  const progScene = $derived<SceneId>((prog?.scene?.kind as SceneId | undefined) ?? 'none')
  const progTrack = $derived(!!prog?.trackCard)
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
  <div class="card">
    <h2>Layers · {out.name}</h2>
    <div class="layer">
      <span class="lbl">Background</span>
      <div class="seg">
        {#each BGS as b (b.id)}
          <button class:draft={layers.background === b.id} class:live={progBg === b.id}
            onclick={() => patch({ background: b.id })}>{b.label}</button>
        {/each}
      </div>
      <span class="lbl">Scene</span>
      <div class="seg">
        {#each scenes as s (s.id)}
          <button class:draft={layers.scene === s.id} class:live={progScene === s.id}
            onclick={() => patch({ scene: s.id })}>{s.label}</button>
        {/each}
      </div>
      <span class="lbl">Overlays</span>
      <div class="seg">
        <button class:draft={layers.trackCard} class:live={progTrack}
          onclick={() => patch({ trackCard: !layers.trackCard })}>Track card</button>
        <button class:draft={layers.lowerThirds.on} class:live={progLT.length > 0}
          onclick={() => patch({ lowerThirds: { ...layers.lowerThirds, on: !layers.lowerThirds.on } })}>Lower thirds</button>
        {#if out.format !== 'twin'}
          {#each [0, 1, 2, 3] as i (i)}
            <label class="pchk"><input type="checkbox" checked={layers.lowerThirds.players.includes(i)}
              onchange={() => togglePlayer(i)} />P{i + 1}</label>
          {/each}
        {/if}
      </div>
    </div>
    <div class="row" style="margin-top:12px">
      <a href="/multiview" target="_blank" rel="noopener"><button type="button">Open Multiview</button></a>
    </div>
  </div>
{/if}
