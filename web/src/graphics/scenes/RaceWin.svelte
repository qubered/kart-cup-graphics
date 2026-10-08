<script lang="ts">
  // Winner of the latest saved race: hero (icon, name, WINNER) and/or running scoreboard, per scene.config and scene.part.
  import type { RaceWinView, ViewModel } from '../../../../shared/types'
  import WinScreen from './win/WinScreen.svelte'

  let { scene, view, enter = 0 }: { scene: RaceWinView; view: ViewModel; enter?: number } = $props()
</script>

<WinScreen {scene} {view} {enter} />
