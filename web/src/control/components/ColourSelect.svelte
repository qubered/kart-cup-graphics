<script lang="ts">
  import { PLAYER_COLOURS } from '../../../../shared/palette'
  import type { ColourId } from '../../../../shared/types'
  let { value, onchange, disabled = false }: { value: ColourId; onchange: (id: ColourId) => void; disabled?: boolean } = $props()
</script>

<div class="swatches" role="radiogroup" aria-label="Colour">
  {#each PLAYER_COLOURS as c (c.id)}
    <button
      type="button"
      class="sw"
      class:on={value === c.id}
      style="background:{c.hex}"
      role="radio"
      aria-checked={value === c.id}
      aria-label={c.name}
      title={c.name}
      data-colour={c.id}
      {disabled}
      onclick={() => onchange(c.id)}
    ></button>
  {/each}
</div>

<style>
  .swatches { display: flex; gap: 4px; }
  .sw { width: 22px; height: 22px; border-radius: 50%; border: 2px solid transparent; padding: 0; cursor: pointer; }
  .sw.on { border-color: #fff; box-shadow: 0 0 0 2px #3b82f6; }
  .sw:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
