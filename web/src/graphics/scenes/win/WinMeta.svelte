<script lang="ts">
  // Cup emblem + cup name and the track / race line. Shared by the hero and (when the hero is off) the board header.
  import type { CupWinView, RaceWinView, ViewModel } from '../../../../../shared/types'
  import Medallion from '../../Medallion.svelte'
  import Swap from '../../Swap.svelte'

  let { scene, view, enter = 0, size = 100, align = 'start' }: {
    scene: RaceWinView | CupWinView; view: ViewModel; enter?: number; size?: number; align?: 'start' | 'center'
  } = $props()

  const b = $derived(scene.config.blocks)
  const emblem = $derived(b.cupEmblem && !!scene.cupEmblem)
  const cupLine = $derived(b.cupEmblem ? scene.cupName : '')
  const trackLine = $derived.by(() => {
    if (!b.trackName) return ''
    if (scene.kind === 'raceWin') return scene.empty ? '' : `${scene.raceLabel}  ·  ${scene.trackName}`
    return scene.matchLabel
  })
</script>

{#if emblem || cupLine || trackLine}
  <div class="meta" class:center={align === 'center'}>
    {#if emblem}<div class="emb"><Medallion image={scene.cupEmblem} size={size} emblem dur={enter} /></div>{/if}
    <div class="lines">
      {#if cupLine}
        <Swap key={cupLine} dur={enter}>
          <div class="cup" style:font-size="{size * 0.46}px" style:font-family={view.fonts.labels}>{cupLine}</div>
        </Swap>
      {/if}
      {#if trackLine}
        <Swap key={trackLine} dur={enter}>
          <div class="track" style:font-size="{size * 0.4}px" style:font-family={view.fonts.names}>{trackLine}</div>
        </Swap>
      {/if}
    </div>
  </div>
{/if}

<style>
  .meta { display: flex; align-items: center; gap: 24px; }
  .meta.center { justify-content: center; }
  .emb { flex: none; }
  .lines { display: flex; flex-direction: column; gap: 6px; }
  .cup { font-weight: 800; line-height: 1; letter-spacing: 0.1em; text-transform: uppercase; color: var(--mk-label-cyan); white-space: nowrap; }
  .track { font-weight: 900; font-style: italic; line-height: 1.05; color: #fff; text-transform: uppercase; white-space: nowrap; text-shadow: 0 4px 0 var(--mk-navy); }
</style>
