<script lang="ts">
  // Winner of a whole match: hero (icon, name, WINNER, total) and/or final scoreboard, per scene.config and scene.part.
  import type { CupWinView, ViewModel } from '../../../../shared/types'
  import WinScreen from './win/WinScreen.svelte'

  let { scene, view, enter = 0 }: { scene: CupWinView; view: ViewModel; enter?: number } = $props()
</script>

<WinScreen {scene} {view} {enter} />
