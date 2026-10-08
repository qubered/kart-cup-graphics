<script lang="ts">
  import { fade } from 'svelte/transition'
  import type { OutputPayload } from '../../../shared/protocol'
  import { enterDuration, exitDuration } from './motion'
  import SkyBackground from './backgrounds/SkyBackground.svelte'
  import IconPattern from './backgrounds/IconPattern.svelte'
  import HoldOverlay from './overlays/HoldOverlay.svelte'
  import Ftb from './overlays/Ftb.svelte'

  interface Props { payload: OutputPayload | null; firstPaint: boolean; lowfx: boolean; debug: boolean; connected: boolean }
  let { payload, firstPaint, lowfx, debug, connected }: Props = $props()

  const view = $derived(payload?.view ?? null)
  // First render after (re)load is always a CUT: every duration is 0.
  const enter = $derived(!payload || firstPaint ? 0 : enterDuration(payload.frame.mode, payload.frame.speed))
  const exit = $derived(!payload || firstPaint ? 0 : exitDuration(payload.frame.mode, payload.frame.speed))
</script>

<svelte:head>
  <style>
    html, body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
  </style>
</svelte:head>

{#if view}
  <div id="canvas" style="width:{view.canvas.w}px;height:{view.canvas.h}px">
    <!-- Layer order, bottom to top: Background, Scene, Track card, Lower thirds, HOLD, FTB. -->

    <!-- BACKGROUND (A, B here; Background C / StickerWall is added by the graphics task) -->
    {#if view.background}
      {#key view.background.id}
        <div class="layer" data-layer="background" data-bg={view.background.id} in:fade={{ duration: enter }} out:fade={{ duration: exit }}>
          {#if view.background.id === 'A'}
            <SkyBackground watermark={view.background.watermark} font={view.fonts.eventTitle} {lowfx} w={view.canvas.w} h={view.canvas.h} />
          {:else if view.background.id === 'B'}
            <IconPattern w={view.canvas.w} h={view.canvas.h} />
          {/if}
          <!-- BACKGROUND C: {:else if view.background.id === 'C'} <StickerWall ... /> -->
        </div>
      {/key}
    {/if}

    <!-- SCENE: SceneLayer goes inside this container -->
    <div class="layer" data-layer="scene"></div>

    <!-- TRACK CARD: TrackCardLayer goes inside this container -->
    <div class="layer" data-layer="trackcard"></div>

    <!-- LOWER THIRDS: LowerThirdsLayer goes inside this container -->
    <div class="layer" data-layer="lowerthirds"></div>

    <!-- HOLD: instant, no transition -->
    {#if payload?.hold}
      <HoldOverlay hold={payload.hold} format={view.format} w={view.canvas.w} h={view.canvas.h} />
    {/if}

    <!-- FTB: 500 ms opacity fade -->
    <Ftb on={payload?.ftb ?? false} />
  </div>
{/if}

{#if debug}
  <div data-debug>
    out={payload?.outputId ?? '?'} {connected ? 'connected' : 'DISCONNECTED'}
    {view ? `${view.format} ${view.canvas.w}x${view.canvas.h}` : 'no view'}
    bg={view?.background?.id ?? '-'} scene={view?.scene?.kind ?? '-'} hold={payload?.hold ? 'on' : 'off'} ftb={payload?.ftb ? 'on' : 'off'}
    taken={payload?.frame.takenAt ?? 0}
  </div>
{/if}

<style>
  #canvas { position: relative; overflow: hidden; background: transparent; }
  .layer { position: absolute; left: 0; top: 0; width: 100%; height: 100%; }
  [data-debug] {
    position: fixed; left: 8px; bottom: 8px; z-index: 99999; padding: 4px 8px;
    font: 12px/1.3 monospace; color: #fff; background: rgba(0, 0, 0, .75); pointer-events: none; white-space: pre-wrap;
  }
</style>
