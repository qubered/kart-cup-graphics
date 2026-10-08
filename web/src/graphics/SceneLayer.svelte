<script lang="ts">
  import { fade } from 'svelte/transition'
  import { cubicIn } from 'svelte/easing'
  import type { SceneView, ViewModel } from '../../../shared/types'
  import TitleScene from './scenes/TitleScene.svelte'
  import LineupScene from './scenes/LineupScene.svelte'
  import NextRaceScene from './scenes/NextRaceScene.svelte'
  import StandingsScene from './scenes/StandingsScene.svelte'
  import WinnerScene from './scenes/WinnerScene.svelte'

  let { scene, view, enter, exit, lowfx = false }: { scene: SceneView; view: ViewModel; enter: number; exit: number; lowfx?: boolean } = $props()
</script>

{#key scene.kind}
  <div class="scene-wrap" in:fade|global={{ duration: enter }} out:fade|global={{ duration: exit, easing: cubicIn }}>
    {#if scene.kind === 'title'}
      <TitleScene title={scene.title} {view} {enter} />
    {:else if scene.kind === 'lineup'}
      <LineupScene {scene} {view} {enter} />
    {:else if scene.kind === 'nextRace'}
      <NextRaceScene {scene} {view} {enter} />
    {:else if scene.kind === 'standings'}
      <StandingsScene {scene} {view} {enter} />
    {:else if scene.kind === 'winner'}
      <WinnerScene {scene} {view} {enter} {lowfx} />
    {/if}
  </div>
{/key}

<style>
  .scene-wrap { position: absolute; inset: 0; }
</style>
