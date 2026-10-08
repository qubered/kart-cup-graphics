<script lang="ts">
  import type { FontStacks, PlayerView } from '../../../shared/types'
  import { fitText } from '../lib/fit-text'
  import Medallion from './Medallion.svelte'
  import Swap from './Swap.svelte'

  let { player, fonts, dur = 0 }: { player: PlayerView; fonts: FontStacks; dur?: number } = $props()
</script>

<div class="lower-third" data-slot={player.slot} style:--pc={player.colour} style:--pt={player.textColour}>
  <div class="bar">
    <div class="chk"></div>
    <!-- colour stripe + chip crossfade when the player colour changes -->
    <Swap key={player.colour} {dur} block class="stripe-wrap"><div class="stripe" style:background={player.colour}></div></Swap>
  </div>
  <Swap key={player.colour + player.textColour} {dur} class="chip-wrap">
    <div class="chip" style:font-family={fonts.names} style:background={player.colour} style:color={player.textColour}>P{player.slot + 1}</div>
  </Swap>
  <div class="txt">
    <Swap key={player.name} {dur} block>
      <div class="name" style:display="block" style:font-family={fonts.names} use:fitText={{ max: 214, text: player.name }}><span>{player.name}</span></div>
    </Swap>
    <Swap key={player.character} {dur} block>
      <div class="char" style:font-family={fonts.labels}>{player.character}</div>
    </Swap>
  </div>
  <Medallion image={player.icon} size={156} stars {dur} />
</div>

<style>
  .lower-third { position: absolute; left: 0; top: 0; width: 430px; height: 160px; transform-origin: 0 0; }
  .bar { position: absolute; left: 70px; right: 0; top: 52px; height: 96px; background: var(--mk-bar); clip-path: polygon(0 0, 100% 0, calc(100% - 34px) 100%, 0 100%); }
  .bar > :global(.stripe-wrap) { position: absolute; left: 0; right: 0; top: 0; height: 8px; }
  .stripe { height: 8px; }
  .chk {
    position: absolute; right: 0; top: 8px; bottom: 0; width: 130px; background-size: 22px 22px;
    background-image: conic-gradient(rgba(255, 255, 255, 0.16) 25%, transparent 0 50%, rgba(255, 255, 255, 0.16) 0 75%, transparent 0);
    -webkit-mask-image: linear-gradient(to right, transparent, #000 80%); mask-image: linear-gradient(to right, transparent, #000 80%);
  }
  .lower-third > :global(.chip-wrap) { position: absolute; left: 168px; top: 18px; }
  .chip {
    background: var(--pc); color: var(--pt); font: italic 900 24px/1 var(--font-name);
    padding: 7px 16px 6px; border-radius: 6px; transform: skewX(-12deg); box-shadow: 0 3px 0 rgba(0, 0, 0, 0.35);
  }
  .txt { position: absolute; left: 172px; top: 72px; width: 214px; }
  .name { font: italic 900 44px/1 var(--font-name); color: #fff; white-space: nowrap; overflow: hidden; }
  .name > span { display: inline-block; transform-origin: left center; white-space: nowrap; }
  .char { font: 800 20px/1 var(--font-label); color: var(--mk-label-cyan); letter-spacing: 3px; text-transform: uppercase; margin-top: 9px; white-space: nowrap; }
  .lower-third > :global(.medallion) { position: absolute; left: 0; top: 2px; }
</style>
