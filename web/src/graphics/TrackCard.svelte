<script lang="ts">
  import { fade } from 'svelte/transition'
  import type { FontStacks, TrackCardView } from '../../../shared/types'
  import { fitText } from '../lib/fit-text'
  import Medallion from './Medallion.svelte'

  let { card, fonts, upright = false, dur = 0 }: { card: TrackCardView; fonts: FontStacks; upright?: boolean; dur?: number } = $props()
</script>

<div class="track-card">
  <div class="bar"></div>
  <div class="med"><Medallion image={card.cupEmblem} size={110} {dur} /></div>
  <div class="texts">
    {#key card.raceLabel + '\u0000' + card.cupName + '\u0000' + card.trackName}
      <div class="txt" in:fade={{ duration: dur }} out:fade={{ duration: dur }}>
        <div class="top">
          <span class="chip" style:font-family={fonts.labels}>{card.raceLabel}</span>
          <span class="cup" style:font-family={fonts.labels} use:fitText={{ max: 170, text: card.cupName }}>{card.cupName}</span>
        </div>
        <span class="track-name" style:font-family={fonts.headings} style:font-style={upright ? 'normal' : 'italic'} use:fitText={{ max: 352, text: card.trackName }}>{card.trackName}</span>
      </div>
    {/key}
  </div>
</div>

<style>
  .track-card { position: relative; width: 540px; height: 120px; }
  .bar {
    position: absolute; left: 52px; top: 12px; right: 0; height: 96px;
    background: linear-gradient(180deg, #1d4870, #0e2a46);
    clip-path: polygon(0 0, 100% 0, calc(100% - 30px) 100%, 0 100%);
  }
  .bar::before { content: ''; position: absolute; left: 0; right: 0; top: 0; height: 7px; background: #ffd21f; }
  .bar::after {
    content: ''; position: absolute; right: 0; top: 7px; bottom: 0; width: 45%;
    background-image: conic-gradient(rgba(255, 255, 255, 0.08) 25%, transparent 0 50%, rgba(255, 255, 255, 0.08) 0 75%, transparent 0);
    background-size: 20px 20px;
    -webkit-mask-image: linear-gradient(to left, #000, transparent);
    mask-image: linear-gradient(to left, #000, transparent);
  }
  .med { position: absolute; left: 0; top: 5px; }
  .texts { position: absolute; left: 128px; top: 22px; width: 352px; height: 80px; display: grid; }
  .txt { grid-area: 1 / 1; display: flex; flex-direction: column; align-items: flex-start; min-width: 0; }
  .top { display: flex; align-items: center; gap: 12px; height: 28px; }
  .chip {
    display: inline-block; padding: 3px 12px 2px; background: #ffd21f; color: #14213d; transform: skewX(-12deg);
    font-weight: 800; font-size: 18px; letter-spacing: 0.06em; white-space: nowrap; box-shadow: 0 2px 0 rgba(0, 0, 0, 0.3);
  }
  .cup {
    max-width: 170px; white-space: nowrap; overflow: hidden;
    font-size: 18px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #aee9ff;
  }
  .track-name {
    max-width: 352px; white-space: nowrap; overflow: hidden; padding-right: 6px; margin-top: 2px;
    font-size: 40px; font-weight: 900; line-height: 1.15; color: #fff; text-shadow: 0 3px 0 rgba(0, 0, 0, 0.35);
  }
</style>
