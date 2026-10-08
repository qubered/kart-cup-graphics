<script lang="ts">
  // Shared body of raceWin / cupWin: places the hero and/or the scoreboard per the config, part and output format.
  import type { CupWinView, RaceWinView, ViewModel } from '../../../../../shared/types'
  import WinBoard from './WinBoard.svelte'
  import WinHero from './WinHero.svelte'
  import { raceColumns, winLayout } from './layout'

  let { scene, view, enter = 0 }: { scene: RaceWinView | CupWinView; view: ViewModel; enter?: number } = $props()

  const races = $derived(raceColumns(scene))
  const lay = $derived(winLayout(view.format, scene.part, scene.config, scene.rows.length, races))
</script>

<div class="win" data-part={scene.part} data-layout={scene.config.layout}>
  {#if lay.hero}
    <div class="box hero-box" style:left="{lay.hero.left}px" style:top="{lay.hero.top}px" style:width="{lay.hero.dw}px" style:height="{lay.hero.dh}px"
      style:transform="scale({lay.hero.scale})">
      <WinHero {scene} {view} {enter} horizontal={lay.hero.horizontal} />
    </div>
  {/if}
  {#if lay.board}
    <div class="box board-box" style:left="{lay.board.left}px" style:top="{lay.board.top}px" style:width="{lay.board.dw}px" style:height="{lay.board.dh}px"
      style:transform="scale({lay.board.scale})">
      <WinBoard {scene} {view} {enter} compact={lay.board.compact} races={lay.board.races} scale={lay.board.scale} showMeta={lay.metaInBoard} />
    </div>
  {/if}
</div>

<style>
  .win { position: absolute; inset: 0; overflow: hidden; }
  .box { position: absolute; transform-origin: 0 0; }
</style>
