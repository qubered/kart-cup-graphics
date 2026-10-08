<script lang="ts">
  import type { LogoMode, TitleView, ViewModel } from '../../../../shared/types'
  import { STAGGER_MS, pop } from '../motion'
  import TitleLockup from '../TitleLockup.svelte'
  import Logo from '../Logo.svelte'

  let { title, view, enter = 0, logo = 'corner', logoSrc = null }: { title: TitleView; view: ViewModel; enter?: number; logo?: LogoMode; logoSrc?: string | null } = $props()

  const halves = $derived(view.format === 'twin')
  const st = $derived(enter ? STAGGER_MS : 0)
  // Same top-right spot and sizes as the HOLD screen; clear of the track card (top-left) and the lower thirds.
  const logoSize = $derived(view.format === 'wide' ? 160 : view.format === 'hd' ? 116 : 100)
</script>

<div class="title-scene">
  {#if halves}
    {#each [0, 1] as h (h)}
      <div class="half" style:left="{h * 960}px" in:pop|global={{ duration: enter, delay: h * st }}>
        <TitleLockup {title} style={view.eventTitleStyle} format={view.format} font={view.fonts.eventTitle} labelFont={view.fonts.labels} dur={enter} logo={logo === 'title'} {logoSrc} />
        {#if logo === 'corner'}<div class="logo-mark"><Logo size={logoSize} src={logoSrc} /></div>{/if}
      </div>
    {/each}
  {:else}
    <div class="center" in:pop|global={{ duration: enter }}>
      <TitleLockup {title} style={view.eventTitleStyle} format={view.format} font={view.fonts.eventTitle} labelFont={view.fonts.labels} dur={enter} logo={logo === 'title'} {logoSrc} />
      {#if logo === 'corner'}<div class="logo-mark"><Logo size={logoSize} src={logoSrc} /></div>{/if}
    </div>
  {/if}
</div>

<style>
  .title-scene { position: absolute; inset: 0; z-index: 0; /* own stacking context so the lockup never paints over later layers (HOLD, FTB) */ }
  .center { position: absolute; inset: 0; }
  .logo-mark { position: absolute; right: 48px; top: 40px; color: #fff; opacity: .92; filter: drop-shadow(0 4px 0 rgba(0, 0, 0, .25)); }
  .half { position: absolute; top: 0; width: 960px; height: 100%; overflow: hidden; }
</style>
