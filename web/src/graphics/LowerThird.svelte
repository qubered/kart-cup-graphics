<script lang="ts">
  import { fade } from 'svelte/transition'
  import type { FontStacks, PlayerView } from '../../../shared/types'
  import { fitText } from '../lib/fit-text'
  import Medallion from './Medallion.svelte'

  let { player, fonts, dur = 0 }: { player: PlayerView; fonts: FontStacks; dur?: number } = $props()
</script>

<div class="lower-third" data-slot={player.slot} style:--c={player.colour} style:--tc={player.textColour}>
  <div class="bar"></div>
  <div class="med"><Medallion image={player.art || player.icon} size={118} stars {dur} /></div>
  <div class="chip" style:font-family={fonts.labels}><span>P{player.slot + 1}</span></div>
  <div class="texts">
    {#key player.name + '\u0000' + player.character}
      <div class="txt" in:fade={{ duration: dur }} out:fade={{ duration: dur }}>
        <span class="name" style:font-family={fonts.names} use:fitText={{ max: 214, text: player.name }}>{player.name}</span>
        <span class="char" style:font-family={fonts.labels} use:fitText={{ max: 214, text: player.character }}>{player.character}</span>
      </div>
    {/key}
  </div>
</div>

<style>
  .lower-third { position: relative; width: 430px; height: 160px; }
  .bar {
    position: absolute; left: 56px; top: 34px; right: 0; height: 100px;
    background: linear-gradient(180deg, #1d4870, #0e2a46);
    clip-path: polygon(0 0, 100% 0, calc(100% - 28px) 100%, 0 100%);
    filter: none;
  }
  .bar::before { content: ''; position: absolute; left: 0; right: 0; top: 0; height: 7px; background: var(--c); }
  .bar::after {
    content: ''; position: absolute; right: 0; top: 7px; bottom: 0; width: 55%;
    background-image: conic-gradient(rgba(255, 255, 255, 0.09) 25%, transparent 0 50%, rgba(255, 255, 255, 0.09) 0 75%, transparent 0);
    background-size: 20px 20px;
    -webkit-mask-image: linear-gradient(to left, #000, transparent);
    mask-image: linear-gradient(to left, #000, transparent);
  }
  .med { position: absolute; left: 0; top: 12px; }
  .chip {
    position: absolute; left: 134px; top: 19px; height: 30px; min-width: 54px; padding: 0 12px;
    transform: skewX(-12deg); background: var(--c); color: var(--tc);
    display: flex; align-items: center; justify-content: center;
    font-weight: 800; font-size: 20px; letter-spacing: 0.04em;
    box-shadow: 0 3px 0 rgba(0, 0, 0, 0.3), 0 0 0 2px rgba(255, 255, 255, 0.85);
  }
  .chip span { display: block; transform: skewX(12deg); }
  .texts { position: absolute; left: 138px; top: 52px; width: 214px; height: 74px; display: grid; }
  .txt { grid-area: 1 / 1; display: flex; flex-direction: column; align-items: flex-start; min-width: 0; }
  .name {
    max-width: 214px; white-space: nowrap; overflow: hidden; line-height: 1.12; padding-right: 6px;
    font-size: 42px; font-weight: 900; font-style: italic; color: #fff; text-shadow: 0 3px 0 rgba(0, 0, 0, 0.35);
  }
  .char {
    max-width: 214px; white-space: nowrap; overflow: hidden; margin-top: 2px;
    font-size: 18px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #aee9ff;
  }
</style>
