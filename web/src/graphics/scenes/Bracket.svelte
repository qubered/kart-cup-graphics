<script lang="ts">
  // Placeholder: replaced by the scene agents. Props are the final contract.
  import type { BracketView, ViewModel } from '../../../../shared/types'

  let { scene, view, enter = 0 }: { scene: BracketView; view: ViewModel; enter?: number } = $props()
  void enter
</script>

<div class="stub" style:font-family={view.fonts.headings}>{scene.kind}</div>

<style>
  .stub { position: absolute; inset: 0; display: grid; place-items: center; color: #fff; font-size: 80px; }
</style>
