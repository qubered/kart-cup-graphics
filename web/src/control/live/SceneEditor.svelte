<script lang="ts">
  // Right bar of the Live page: the selected screen's scenes (12 tiles), then that scene's options, background and overlays.
  // Everything sends setLayers for the selected output, so what you change here is Preview only until you Take.
  // "Save as new…" in the library swaps this bar for the save form (the library stays visible).
  import { control, send } from '../store'
  import { splitAcrossOutputs } from '../tournament'
  import { activeTournament } from '../../../../shared/tournament'
  import { FORMAT_CANVAS } from '../../../../shared/view'
  import type { Layers } from '../../../../shared/types'
  import { revertToLook } from './centre/actions'
  import SaveForm from './centre/SaveForm.svelte'
  import { saveOpen } from './centre/saveForm'
  import { previewLook } from './centre/status'
  import Thumb from './centre/Thumb.svelte'
  import { sceneView } from './centre/thumbs'
  import SceneOptions from './scene/SceneOptions.svelte'
  import { availableScenes, backgroundLabel, BACKGROUNDS, hasSceneOptions, sceneLabel, scenePatch, togglePlayer } from './scene/scenes'

  const st = $derived($control.payload?.state)
  const id = $derived($control.selectedOutput)
  const out = $derived(st?.outputs.find((o) => o.id === id))
  const layers = $derived(st?.layers[id])
  const prog = $derived(st?.program[id]?.view)
  const tour = $derived(st ? activeTournament(st) : null)
  const canvas = $derived(out ? FORMAT_CANVAS[out.format] : null)
  const scenes = $derived(out ? availableScenes(out.format, tour !== null) : [])
  const split = $derived(st && layers ? splitAcrossOutputs(st.outputs, id, st.layers) : null)

  // on air, for the red dots (Program's view of this screen)
  const progBg = $derived(prog?.background?.id ?? 'none')
  const progScene = $derived(prog?.scene?.kind ?? 'none')
  const progTrack = $derived(!!prog?.trackCard)
  const progLT = $derived(prog?.lowerThirds ?? [])

  function patch(p: Partial<Layers>) {
    send({ type: 'setLayers', outputId: id, patch: p })
  }
  const summary = $derived([layers?.trackCard && 'Track card', layers?.lowerThirds.on && 'Lower thirds'].filter(Boolean).join(' · ') || 'none')
</script>

{#if $saveOpen}
  <SaveForm />
{:else}
  <section class="u-panel scenep" aria-label="Scene editor" data-scene-editor>
    {#if out && layers && canvas && st}
      <div class="u-ph">
        <span class="u-lab ttl" data-scene-title>{out.name} screen</span>
        <span class="u-dim fmt">{canvas.w}×{canvas.h}</span>
      </div>
      <div class="stat3" data-look-based>
        <span class="based">Based on <b>{$previewLook.preset?.name ?? 'nothing yet'}</b></span>
        {#if $previewLook.preset}
          {#if $previewLook.modified}<span class="u-tag mod">● MODIFIED</span>{:else}<span class="u-tag pvw">SAVED</span>{/if}
        {/if}
        <button type="button" class="u-btn revert" data-revert disabled={!$previewLook.preset || !$previewLook.modified} onclick={revertToLook}>↺ Revert</button>
      </div>
      <div class="u-grow">
        <div class="u-sec">
          <div class="u-sh"><span class="u-lab">Scene</span><span class="u-sum">{sceneLabel(layers.scene)}</span></div>
          <div class="scgrid" role="group" aria-label="Scene">
            {#each scenes as s (s.id)}
              <button type="button" class="scb" class:sel={layers.scene === s.id} class:u-livedot={progScene === s.id} data-scene={s.id} aria-label={s.label} aria-pressed={layers.scene === s.id}
                onclick={() => patch(scenePatch(out.format, layers, s.id))}>
                <Thumb view={sceneView(s.id, layers, out, st.draft, $control.catalog, tour)} />
                <span class="scl">{s.label}</span>
              </button>
            {/each}
          </div>
        </div>

        {#if layers.scene !== 'none'}
          <div class="u-sec" data-scene-options={layers.scene}>
            <div class="u-sh"><span class="u-lab">{sceneLabel(layers.scene)} options</span></div>
            {#if hasSceneOptions(layers.scene, out.format, tour !== null)}
              <SceneOptions {out} {layers} {prog} {tour} {split} {patch} />
            {:else}
              <div class="u-dim u-sm" data-no-options>No extra options for this scene.</div>
            {/if}
          </div>
        {/if}

        <div class="u-sec">
          <div class="u-sh"><span class="u-lab">Background</span><span class="u-sum">{backgroundLabel(layers.background)}</span></div>
          <div class="u-seg bgseg" role="group" aria-label="Background">
            {#each BACKGROUNDS as b (b.id)}
              <button type="button" class:sel={layers.background === b.id} class:u-livedot={progBg === b.id} data-background={b.id} aria-label={b.label} aria-pressed={layers.background === b.id}
                onclick={() => patch({ background: b.id })}>
                <b>{b.letter}</b>{#if b.word}<small>{b.word}</small>{/if}
              </button>
            {/each}
          </div>
        </div>

        <div class="u-sec">
          <div class="u-sh"><span class="u-lab">Overlays</span><span class="u-sum">{summary}</span></div>
          <div class="two">
            <button type="button" class="u-tgl" class:on={layers.trackCard} class:u-livedot={progTrack} aria-pressed={layers.trackCard} data-overlay="trackCard"
              onclick={() => patch({ trackCard: !layers.trackCard })}><span class="u-tt"><b>Track card</b></span><span class="u-sw"></span></button>
            <button type="button" class="u-tgl" class:on={layers.lowerThirds.on} class:u-livedot={progLT.length > 0} aria-pressed={layers.lowerThirds.on} data-overlay="lowerThirds"
              onclick={() => patch({ lowerThirds: { ...layers.lowerThirds, on: !layers.lowerThirds.on } })}><span class="u-tt"><b>Lower thirds</b></span><span class="u-sw"></span></button>
          </div>
          {#if out.format !== 'twin'}
            <div class="chips4" role="group" aria-label="Lower-third players">
              {#each [0, 1, 2, 3] as i (i)}
                <button type="button" class="u-chip" class:on={layers.lowerThirds.players.includes(i)} class:dis={!layers.lowerThirds.on} aria-pressed={layers.lowerThirds.players.includes(i)} data-lt-player={i}
                  onclick={() => patch({ lowerThirds: { ...layers.lowerThirds, players: togglePlayer(layers.lowerThirds.players, i) } })}>P{i + 1}</button>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </section>
{/if}

<style>
  .ttl { color: #e5e7eb; font-size: 12px; }
  .fmt { font-size: 12px; }
  .stat3 { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid var(--ui-line); font-size: 12.5px; color: var(--ui-muted); flex: none; }
  .stat3 b { color: #fff; }
  .based { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .stat3 .u-tag { flex: none; }
  .revert { margin-left: auto; flex: none; }
  .scgrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
  .scb { position: relative; display: block; min-height: 44px; padding: 4px; border: 1px solid var(--ui-line); border-radius: 8px; background: var(--ui-panel-2); text-align: center; cursor: pointer; white-space: normal; }
  .scb:hover:not(:disabled) { background: #1a1f2a; border-color: #4a5160; }
  .scb.sel { border-color: var(--ui-preview); box-shadow: 0 0 0 1px var(--ui-preview); background: #0f2418; }
  .scl { display: block; padding: 4px 0 1px; font-size: 12px; font-weight: 600; color: #cbd5e1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .scb.sel .scl { color: #fff; }
  .scb.u-livedot::after { top: 8px; right: 8px; }
  .bgseg > button { height: 48px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; padding: 0 4px; }
  .bgseg b { font-size: 15px; line-height: 1; }
  .bgseg small { font-size: 10px; font-weight: 500; opacity: .8; line-height: 1; }
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .chips4 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
  .chips4 .u-chip { height: 44px; }
  .chips4 .u-chip.dis:not(.on) { opacity: .55; }
</style>
