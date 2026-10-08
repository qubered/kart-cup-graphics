<script lang="ts">
  import type { HoldView } from '../../../../shared/protocol'
  import type { OutputFormat } from '../../../../shared/types'
  import SkyBackground from '../backgrounds/SkyBackground.svelte'

  interface Props { hold: HoldView; format: OutputFormat; w: number; h: number }
  let { hold, format, w, h }: Props = $props()

  // Twin output = two independent 960 px halves, each carrying its own lockup + message.
  const halves = $derived(format === 'twin' ? [0, 1] : [0])
  const hw = $derived(format === 'twin' ? 960 : w)
  // Title size scales with the half width (and height).
  const size = $derived(Math.round(Math.min(hw * 0.2, h * 0.24)))
  const msgSize = $derived(Math.round(Math.min(hw * 0.055, h * 0.085)))
</script>

<!-- Appears instantly: no transition. -->
<div data-overlay="hold" class="hold" style="width:{w}px;height:{h}px">
  <SkyBackground watermark={hold.title.title} font={hold.fonts.eventTitle} lowfx={true} {w} {h} />
  {#each halves as i (i)}
    <div class="hold-half" style="left:{i * 960}px;width:{hw}px;height:{h}px">
      {#if hold.title.preTitle}
        <div class="pill" style="font-family:{hold.fonts.labels};font-size:{Math.round(size * 0.2)}px"><span>{hold.title.preTitle}</span></div>
      {/if}
      <div class="lockup" data-style={hold.titleStyle} style="font-family:{hold.fonts.eventTitle};font-size:{size}px">
        <span class="t" data-text={hold.title.title}>{hold.title.title}</span>
        {#if hold.title.accent}<span class="a">{hold.title.accent}</span>{/if}
      </div>
      <div class="message" style="font-family:{hold.fonts.labels};font-size:{msgSize}px">{hold.message}</div>
    </div>
  {/each}
</div>

<style>
  .hold { position: absolute; left: 0; top: 0; overflow: hidden; }
  .hold-half {
    position: absolute; top: 0; box-sizing: border-box; padding: 0 5%;
    display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 28px;
  }
  .pill { background: #ffd31a; color: #14213d; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; padding: .35em 1.2em; transform: skewX(-12deg); }
  .pill span { display: inline-block; transform: skewX(12deg); }
  .lockup { display: flex; flex-direction: column; align-items: center; line-height: .95; text-transform: uppercase; max-width: 100%; }
  .t { position: relative; display: inline-block; white-space: nowrap; font-weight: 900; }
  .t::before {
    content: attr(data-text); position: absolute; left: 0; top: 0; z-index: -1; white-space: nowrap;
    -webkit-text-stroke: .14em #0a0f1c; color: #0a0f1c; filter: none;
  }
  .a { font-size: .7em; font-weight: 900; white-space: nowrap; }
  .lockup[data-style='chrome'] .t {
    color: transparent; -webkit-background-clip: text; background-clip: text;
    background-image: linear-gradient(180deg, #fff 0%, #f1f4f7 28%, #c3cad3 46%, #4f5a67 50%, #7f8a97 60%, #cdd4db 82%, #fff 100%);
  }
  .lockup[data-style='chrome'] .a {
    color: transparent; -webkit-background-clip: text; background-clip: text;
    background-image: linear-gradient(90deg, #8be6ff, #2a7bff, #6a3dff, #e02fbf, #ff5a2e);
  }
  .lockup[data-style='classic'] .t { color: #fff; }
  .lockup[data-style='classic'] .t::before { -webkit-text-stroke-color: #0b2a6f; color: #0b2a6f; }
  .lockup[data-style='classic'] .a { color: #ffd31a; -webkit-text-stroke: .08em #0b2a6f; paint-order: stroke fill; }
  .message {
    font-weight: 800; text-transform: uppercase; letter-spacing: .12em; color: #fff;
    background: rgba(11, 42, 111, .78); padding: .45em 1.3em; border-radius: 999px; border: 3px solid rgba(255, 255, 255, .85);
  }
</style>
