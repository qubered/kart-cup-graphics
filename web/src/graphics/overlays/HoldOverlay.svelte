<script lang="ts">
  import type { HoldView } from '../../../../shared/protocol'
  import type { OutputFormat } from '../../../../shared/types'
  import SkyBackground from '../backgrounds/SkyBackground.svelte'
  import TitleLockup from '../TitleLockup.svelte'
  import { fade } from 'svelte/transition'
  import Logo from '../Logo.svelte'
  import Swap from '../Swap.svelte'
  import { TITLE_LAYOUT } from '../title-layout'

  interface Props { hold: HoldView; format: OutputFormat; w: number; h: number; logoSrc?: string | null; /** Fade in/out ms (0 = instant). */ dur?: number }
  let { hold, format, w, h, logoSrc = null, dur = 0 }: Props = $props()

  // Twin output = two independent 960 px halves, each carrying its own background, lockup and message.
  const halves = $derived(format === 'twin' ? [0, 1] : [0])
  const hw = $derived(format === 'twin' ? 960 : w)
  const cfg = $derived(TITLE_LAYOUT[format])
</script>

<!-- Fades in and out over `dur` (0 on the first paint). -->
<div data-overlay="hold" class="hold" style="width:{w}px;height:{h}px" in:fade|global={{ duration: dur }} out:fade|global={{ duration: dur }}>
  {#each halves as i (i)}
    <div class="hold-half" style="left:{i * 960}px;width:{hw}px;height:{h}px">
      <SkyBackground watermark={hold.watermark ?? hold.title.title} font={hold.fonts.eventTitle} lowfx={true} w={hw} {h} />
      <TitleLockup title={hold.title} style={hold.titleStyle} {format} font={hold.fonts.eventTitle} labelFont={hold.fonts.labels} top={cfg.holdTop} {dur} />
      <div class="hold-logo"><Logo size={format === 'wide' ? 160 : format === 'hd' ? 116 : 100} src={logoSrc} {dur} /></div>
      <div class="hold-msg" style:--ms="{cfg.ms}px" style:font-family={hold.fonts.headings}><Swap key={hold.message} {dur}>{hold.message}</Swap></div>
    </div>
  {/each}
</div>

<style>
  .hold { position: absolute; left: 0; top: 0; overflow: hidden; z-index: 0; }
  .hold-half { position: absolute; top: 0; overflow: hidden; }
  .hold-logo { position: absolute; right: 48px; top: 40px; color: #fff; opacity: .92; filter: drop-shadow(0 4px 0 rgba(0, 0, 0, .25)); z-index: 6; }
  .hold-msg {
    position: absolute; left: 50%; bottom: 12%; transform: translateX(-50%); font-style: italic; font-weight: 900; font-size: var(--ms, 90px); line-height: 1;
    color: #fff; letter-spacing: .07em; text-shadow: 0 .09em 0 var(--mk-navy); white-space: nowrap; z-index: 6;
  }
</style>
