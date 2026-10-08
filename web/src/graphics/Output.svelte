<script lang="ts">
  import { fade } from 'svelte/transition'
  import type { OutputPayload } from '../../../shared/protocol'
  import { SPEED_MS, enterDuration, exitDuration } from './motion'
  import SkyBackground from './backgrounds/SkyBackground.svelte'
  import IconPattern from './backgrounds/IconPattern.svelte'
  import HoldOverlay from './overlays/HoldOverlay.svelte'
  import Ftb from './overlays/Ftb.svelte'
  import StickerWall from './backgrounds/StickerWall.svelte'
  import SceneLayer from './SceneLayer.svelte'
  import TrackCardLayer from './TrackCardLayer.svelte'
  import LowerThirdsLayer from './LowerThirdsLayer.svelte'

  interface Props {
    payload: OutputPayload | null; firstPaint: boolean; lowfx: boolean; debug: boolean; connected: boolean
    /** Render only the left or right half of the canvas (e.g. one twin LED). The canvas itself is unchanged. */
    part?: 'left' | 'right'
    /** Superwide composite: no fixed debug panel / head styles (the parent provides them). */
    embedded?: boolean
    /** Superwide: width of the whole stage and this canvas's x offset in it, so backgrounds line up across outputs. */
    stage?: { w: number; x: number }
  }
  let { payload, firstPaint, lowfx, debug, connected, part, embedded = false, stage }: Props = $props()

  // ?key=1: the matte of an opaque layer is flat white, so don't render (and filter) animated art for it.
  const keyMode = typeof document !== 'undefined' && document.documentElement.getAttribute('data-matte') === 'key'

  const view = $derived(payload?.view ?? null)

  // Backgrounds are slices of the 5760-wide LED stage [left twin 960 | wide 3840 | right twin 960], so separate outputs line up
  // without the superwide page. A full twin canvas holds both halves side by side, so it draws two slices (left end / right end).
  const STAGE_W = 5760, TWIN_HALF = 960
  const segments = $derived.by(() => {
    if (stage) return [{ left: 0, width: '100%', x: stage.x, w: stage.w }]
    if (view?.format === 'wide') return [{ left: 0, width: '100%', x: TWIN_HALF, w: STAGE_W }]
    if (view?.format === 'twin') {
      if (part === 'left') return [{ left: 0, width: '100%', x: 0, w: STAGE_W }]
      if (part === 'right') return [{ left: 0, width: '100%', x: STAGE_W - TWIN_HALF * 2, w: STAGE_W }]
      return [
        { left: 0, width: `${TWIN_HALF}px`, x: 0, w: STAGE_W },
        { left: TWIN_HALF, width: `${TWIN_HALF}px`, x: STAGE_W - TWIN_HALF, w: STAGE_W },
      ]
    }
    return [{ left: 0, width: '100%', x: 0, w: undefined as number | undefined }]
  })
  // First render after (re)load is always a CUT: every duration is 0.
  const enter = $derived(!payload || firstPaint ? 0 : enterDuration(payload.frame.mode, payload.frame.speed))
  // Background identity for the crossfade: A/B/C, plus the settings that restyle B (Mattify) and C (its watermark and title plate, which have no in-place swap).
  const bgKey = $derived.by(() => {
    const b = view?.background
    if (!b) return ''
    if (b.id === 'B') return `B|${payload?.mattify ?? false}`
    if (b.id === 'C') return `C|${b.watermark}|${b.title.preTitle}|${b.title.title}|${b.title.accent}|${view?.fonts.eventTitle}`
    return b.id
  })
  const holdMs = $derived(!payload || firstPaint ? 0 : SPEED_MS.normal)
  const exit = $derived(!payload || firstPaint ? 0 : exitDuration(payload.frame.mode, payload.frame.speed))
</script>

<svelte:head>
  <style>
    html, body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
    /* Cut & fill (?fill=1 / ?key=1): opaque black behind the graphics; the key turns every pixel white and keeps its alpha. */
    html[data-matte] body { background: #000; }
    html[data-matte=key] #app { filter: brightness(0) invert(1); }
  </style>
</svelte:head>

{#if view}
  <div class="crop" data-part={part ?? 'full'} style="width:{part ? view.canvas.w / 2 : view.canvas.w}px;height:{view.canvas.h}px">
  <div id={embedded ? undefined : 'canvas'} class="canvas" style="width:{view.canvas.w}px;height:{view.canvas.h}px{part === 'right' ? `;transform:translateX(-${view.canvas.w / 2}px)` : ''}">
    <!-- Layer order, bottom to top: Background, Scene, Track card, Lower thirds, HOLD, FTB. -->

    <!-- BACKGROUND (A, B, C) -->
    {#if view.background}
      {#key bgKey}
        <div class="layer" data-layer="background" data-bg={view.background.id} in:fade|global={{ duration: enter }} out:fade|global={{ duration: exit }}>
          {#if keyMode}
            <div class="key-solid"></div>
          {:else if view.background.id === 'A'}
            {#each segments as seg (seg.left)}
              <div class="seg" style:left="{seg.left}px" style:width={seg.width}>
                <SkyBackground watermark={view.background.watermark} font={view.fonts.eventTitle} {lowfx} w={view.canvas.w} h={view.canvas.h} dur={enter} stageW={seg.w} stageX={seg.x} />
              </div>
            {/each}
          {:else if view.background.id === 'B'}
            {#each segments as seg (seg.left)}
              <div class="seg" style:left="{seg.left}px" style:width={seg.width}>
                <IconPattern w={view.canvas.w} h={view.canvas.h} mattify={payload?.mattify ?? false} stageW={seg.w} stageX={seg.x} />
              </div>
            {/each}
          {:else if view.background.id === 'C'}
            {#if view.format === 'twin'}
              <!-- Two 960 px screens: each draws its own wall (own logo plate), so nothing straddles the seam. -->
              {#each [0, TWIN_HALF] as left (left)}
                <div class="seg" style:left="{left}px" style:width="{TWIN_HALF}px">
                  <StickerWall watermark={view.background.watermark} title={view.background.title} titleFont={view.fonts.eventTitle} labelFont={view.fonts.labels} {lowfx} w={TWIN_HALF} h={view.canvas.h} />
                </div>
              {/each}
            {:else}
              <StickerWall watermark={view.background.watermark} title={view.background.title} titleFont={view.fonts.eventTitle} labelFont={view.fonts.labels} {lowfx} w={view.canvas.w} h={view.canvas.h} />
            {/if}
          {/if}
        </div>
      {/key}
    {/if}

    <!-- SCENE: SceneLayer goes inside this container -->
    <div class="layer" data-layer="scene">{#if view.scene}<SceneLayer scene={view.scene} {view} {enter} {exit} {lowfx} logoSrc={payload?.logo ?? null} />{/if}</div>

    <!-- TRACK CARD: TrackCardLayer goes inside this container -->
    <div class="layer" data-layer="trackcard">{#if view.trackCard}<TrackCardLayer card={view.trackCard} {view} {enter} {exit} />{/if}</div>

    <!-- LOWER THIRDS: LowerThirdsLayer goes inside this container -->
    <div class="layer" data-layer="lowerthirds">{#if view.lowerThirds.length}<LowerThirdsLayer players={view.lowerThirds} {view} {enter} {exit} />{/if}</div>

    <!-- HOLD: fades in/out like FTB (instant on the first paint) -->
    {#if payload?.hold && keyMode}
      <div class="key-solid" data-overlay="hold" in:fade|global={{ duration: holdMs }} out:fade|global={{ duration: holdMs }}></div>
    {:else if payload?.hold}
      <HoldOverlay hold={payload.hold} logoSrc={payload.logo} format={view.format} w={view.canvas.w} h={view.canvas.h} dur={holdMs} />
    {/if}

    <!-- FTB: 500 ms opacity fade -->
    <Ftb on={payload?.ftb ?? false} />
  </div>
  </div>
{/if}

{#if debug && !embedded}
  <div data-debug>
    out={payload?.outputId ?? '?'} {connected ? 'connected' : 'DISCONNECTED'}
    {view ? `${view.format} ${view.canvas.w}x${view.canvas.h}` : 'no view'}
    bg={view?.background?.id ?? '-'} scene={view?.scene?.kind ?? '-'} hold={payload?.hold ? 'on' : 'off'} ftb={payload?.ftb ? 'on' : 'off'}
    taken={payload?.frame.takenAt ?? 0}
  </div>
{/if}

<style>
  .crop { position: relative; overflow: hidden; background: transparent; }
  .canvas { position: relative; overflow: hidden; background: transparent; }
  /* Each layer is its own stacking context so z-indexes inside a layer never escape above later layers (scene, HOLD, ...). */
  .seg { position: absolute; top: 0; height: 100%; overflow: hidden; }
  .key-solid { position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: #fff; }
  .layer { position: absolute; left: 0; top: 0; width: 100%; height: 100%; isolation: isolate; }
  [data-debug] {
    position: fixed; left: 8px; bottom: 8px; z-index: 99999; padding: 4px 8px;
    font: 12px/1.3 monospace; color: #fff; background: rgba(0, 0, 0, .75); pointer-events: none; white-space: pre-wrap;
  }
</style>
