<script lang="ts">
  // Live page layout: rundown rail (left) · monitors + Looks library (centre) · this screen's scenes and options (right).
  // Each column is its own component so they can be built independently.
  import RundownRail from './RundownRail.svelte'
  import Centre from './Centre.svelte'
  import SceneEditor from './SceneEditor.svelte'
</script>

<div class="live">
  <RundownRail />
  <Centre />
  <SceneEditor />
</div>

<style>
  .live { display: grid; grid-template-columns: minmax(300px, 340px) minmax(0, 1fr) minmax(300px, 360px); gap: 14px; padding: 12px 14px; height: 100%; min-height: 0; }
</style>
