<script lang="ts">
  import { fade } from 'svelte/transition'
  import type { FontStacks, TrackCardView } from '../../../shared/types'
  import { fitText } from '../lib/fit-text'
  import Medallion from './Medallion.svelte'

  let { card, fonts, upright = false, dur = 0 }: { card: TrackCardView; fonts: FontStacks; upright?: boolean; dur?: number } = $props()
</script>

<div class="track-card">
  <div class="bar"><div class="chk"></div></div>
  <Medallion image={card.cupEmblem} size={120} emblem {dur} />
  {#key card.raceLabel + '\u0000' + card.cupName + '\u0000' + card.trackName}
    <div class="txt" in:fade={{ duration: dur }} out:fade={{ duration: dur }}>
      <div class="row">
        <span class="race" style:font-family={fonts.names}>{card.raceLabel}</span>
        <span class="cup" style:font-family={fonts.labels}>{card.cupName}</span>
      </div>
      <div class="track-name" style:display="block" style:font-family={fonts.headings} style:font-style={upright ? 'normal' : 'italic'} use:fitText={{ max: 352, text: card.trackName }}><span>{card.trackName}</span></div>
    </div>
  {/key}
</div>

<style>
  .track-card { position: absolute; left: 0; top: 0; width: 540px; height: 120px; }
  .bar { position: absolute; left: 56px; right: 0; top: 14px; height: 92px; background: var(--mk-bar); clip-path: polygon(0 0, 100% 0, calc(100% - 30px) 100%, 0 100%); }
  .bar::before { content: ''; position: absolute; left: 0; right: 0; top: 0; height: 6px; background: var(--mk-yellow); }
  .chk {
    position: absolute; right: 0; top: 6px; bottom: 0; width: 120px; background-size: 22px 22px;
    background-image: conic-gradient(rgba(255, 255, 255, 0.16) 25%, transparent 0 50%, rgba(255, 255, 255, 0.16) 0 75%, transparent 0);
    -webkit-mask-image: linear-gradient(to right, transparent, #000 80%); mask-image: linear-gradient(to right, transparent, #000 80%);
  }
  .track-card > :global(.medallion) { position: absolute; left: 0; top: 0; }
  .txt { position: absolute; inset: 0; }
  .row { position: absolute; left: 138px; top: 28px; display: flex; align-items: center; gap: 16px; }
  .race {
    background: var(--mk-yellow); color: var(--mk-navy); font: italic 900 15px/1 var(--font-name); padding: 4px 10px; border-radius: 4px;
    transform: skewX(-12deg); letter-spacing: 1px; white-space: nowrap;
  }
  .cup { font: 800 15px/1 var(--font-label); color: var(--mk-label-cyan); letter-spacing: 2px; text-transform: uppercase; white-space: nowrap; }
  .track-name { position: absolute; left: 138px; top: 56px; width: 352px; font: italic 900 34px/1.05 var(--font-head); color: #fff; white-space: nowrap; overflow: hidden; }
  .track-name > span { display: inline-block; transform-origin: left center; white-space: nowrap; }
</style>
