<script lang="ts">
  let { on }: { on: boolean } = $props()
</script>

<div data-overlay="ftb" class:on></div>

<style>
  div { position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: #000; opacity: 0; pointer-events: none; transition: opacity 500ms linear; }
  div.on { opacity: 1; }
</style>
