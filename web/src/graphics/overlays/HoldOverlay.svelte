<script lang="ts">
  import type { HoldView } from '../../../../shared/protocol'
  import type { OutputFormat } from '../../../../shared/types'
  import SkyBackground from '../backgrounds/SkyBackground.svelte'
  import TitleLockup from '../TitleLockup.svelte'
  import { TITLE_LAYOUT } from '../title-layout'

  interface Props { hold: HoldView; format: OutputFormat; w: number; h: number }
  let { hold, format, w, h }: Props = $props()

  // Twin output = two independent 960 px halves, each carrying its own background, lockup and message.
  const halves = $derived(format === 'twin' ? [0, 1] : [0])
  const hw = $derived(format === 'twin' ? 960 : w)
  const cfg = $derived(TITLE_LAYOUT[format])
</script>

<!-- Appears instantly: no transition. -->
<div data-overlay="hold" class="hold" style="width:{w}px;height:{h}px">
  {#each halves as i (i)}
    <div class="hold-half" style="left:{i * 960}px;width:{hw}px;height:{h}px">
      <SkyBackground watermark={hold.watermark ?? hold.title.title} font={hold.fonts.eventTitle} lowfx={true} w={hw} {h} />
      <TitleLockup title={hold.title} style={hold.titleStyle} {format} font={hold.fonts.eventTitle} labelFont={hold.fonts.labels} top={cfg.holdTop} />
      <div class="hold-msg" style:--ms="{cfg.ms}px" style:font-family={hold.fonts.headings}>{hold.message}</div>
    </div>
  {/each}
</div>

<style>
  .hold { position: absolute; left: 0; top: 0; overflow: hidden; z-index: 0; }
  .hold-half { position: absolute; top: 0; overflow: hidden; }
  .hold-msg {
    position: absolute; left: 50%; bottom: 12%; transform: translateX(-50%); font-style: italic; font-weight: 900; font-size: var(--ms, 90px); line-height: 1;
    color: #fff; letter-spacing: .07em; text-shadow: 0 .09em 0 var(--mk-navy); white-space: nowrap; z-index: 6;
  }
</style>
