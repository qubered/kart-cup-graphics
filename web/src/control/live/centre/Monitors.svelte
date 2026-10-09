<script lang="ts">
  // Preview (green) and Program (red) of the selected output, always side by side so the Looks library gets the room.
  // Real output pages in low-effects mode, scaled to fit. The label bar sits above the picture: nothing covers it.
  import { fit } from '../../../lib/fit'
  import { light } from '../../presence'
  import { control } from '../../store'
  import { FORMAT_CANVAS } from '../../../../../shared/view'
  import type { SceneId } from '../../../../../shared/types'
  import { sceneLabel } from '../scene/scenes'
  import { MIN_PANE, monitorSize, naturalHeight } from './layout'
  import { onAirLookId, previewLook } from './status'

  /** height: pane height chosen with the divider (px), null = the biggest the arrangement allows. stacked: Preview above Program. room: tallest pane the column can spare.
   *  onlimit: reports the tallest useful pane (monitors at the full column width) to the divider. */
  let { height = null, stacked = false, room = 100000, onlimit }: { height?: number | null; stacked?: boolean; room?: number; onlimit?: (n: number) => void } = $props()
  let boxW = $state(0)

  const st = $derived($control.payload?.state)
  const out = $derived(st?.outputs.find((o) => o.id === $control.selectedOutput))
  const onAir = $derived(light($control.payload?.presence[$control.selectedOutput], out?.format ?? 'hd') !== 'off')
  const canvas = $derived(out ? FORMAT_CANVAS[out.format] : { w: 1920, h: 1080 })
  const name = $derived((out?.name ?? '').toUpperCase())
  const previewName = $derived($previewLook.preset?.name ?? null)
  // Program: the look that is on air, else what the output shows ("Next race", "Background only").
  const programName = $derived.by(() => {
    const look = st?.presets.find((p) => p.id === $onAirLookId)
    if (look) return look.name
    const view = out ? st?.program[out.id]?.view : undefined
    if (view?.scene) return sceneLabel(view.scene.kind as SceneId)
    return view?.background ? 'Background only' : 'Nothing on air'
  })
  const aspect = $derived(canvas.w / canvas.h)
  // The pane never needs more than the monitors at the full column width (more would only be blank space), nor more than the column can spare.
  const maxH = $derived(boxW ? Math.max(MIN_PANE, Math.min(naturalHeight(boxW, aspect, stacked), room)) : 0)
  $effect(() => { onlimit?.(maxH) })
  // Automatic = side by side at the natural size (CSS), or stacked at the tallest pane that fits. A chosen height is clamped to what is useful.
  const paneH = $derived(boxW ? (height ? Math.min(Math.max(MIN_PANE, height), maxH) : stacked ? maxH : null) : null)
  const sized = $derived(paneH && boxW ? monitorSize(boxW, paneH, aspect, stacked) : null)
  const flags = $derived([st?.overlay.hold.on ? 'HOLD' : '', st?.overlay.ftb ? 'FTB' : ''].filter(Boolean))
</script>

<div class="pane" data-monitors-pane bind:clientWidth={boxW} style:height={paneH ? `${paneH}px` : undefined}>
{#if out}
  {#key out.id}
    <div class="monitors" class:sized={!!sized} class:stacked data-stacked={stacked} style:--mw={sized ? `${sized}px` : undefined} data-monitors>
      <div class="mon pv" data-monitor="preview">
        <div class="mh">
          <span class="t">PREVIEW · {name}</span>
          <span class="src">
            {#if $previewLook.modified}<span class="u-tag mod">MODIFIED</span>{/if}
            <b class:dim={!previewName}>{previewName ?? 'Unsaved'}</b>
          </span>
        </div>
        <div class="fitbox" use:fit={{ width: canvas.w, height: canvas.h }}>
          <iframe title="Preview {out.name}" src="/out/{out.id}?view=preview&lowfx=1" width={canvas.w} height={canvas.h}></iframe>
        </div>
      </div>
      <div class="mon pg" data-monitor="program">
        <div class="mh">
          <span class="t">PROGRAM · {name}{onAir ? ' · ON AIR' : ''}{flags.map((f) => ` · ${f}`).join('')}</span>
          <span class="src"><b>{programName}</b></span>
        </div>
        <div class="fitbox" use:fit={{ width: canvas.w, height: canvas.h }}>
          <iframe title="Program {out.name}" src="/out/{out.id}?lowfx=1" width={canvas.w} height={canvas.h}></iframe>
        </div>
      </div>
    </div>
  {/key}
{/if}
</div>

<style>
  .pane { flex: none; min-width: 0; display: flex; flex-direction: column; justify-content: center; }
  .monitors.sized { grid-template-columns: repeat(2, var(--mw)); justify-content: center; }
  .monitors.stacked { grid-template-columns: minmax(0, 1fr); }
  .monitors.sized.stacked { grid-template-columns: var(--mw); }
  .monitors { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px; flex: none; }
  .mon { min-width: 0; overflow: hidden; background: #000; border: 2px solid var(--ui-line); border-radius: 8px; }
  .mon.pv { border-color: var(--ui-preview); }
  .mon.pg { border-color: var(--ui-program); }
  .mh { display: flex; align-items: center; gap: 10px; height: 26px; padding: 0 8px; color: #fff; font: 700 11px/1 var(--ui-font); letter-spacing: .05em; }
  .pv .mh { background: var(--ui-preview); }
  .pg .mh { background: var(--ui-program); }
  .t { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .src { margin-left: auto; display: inline-flex; align-items: center; gap: 6px; min-width: 0; font-weight: 600; letter-spacing: 0; }
  .src b { font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }
  .src b.dim { font-weight: 500; opacity: .85; }
  .fitbox { min-width: 0; }
  iframe { color-scheme: normal; border: 0; display: block; background: transparent; pointer-events: none; }
</style>
