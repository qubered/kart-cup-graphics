<script lang="ts">
  import { control } from './store'
  import { fit } from '../lib/fit'
  import { FORMAT_CANVAS } from '../../../shared/view'

  const out = $derived($control.payload?.state.outputs.find((o) => o.id === $control.selectedOutput))
  const canvas = $derived(out ? FORMAT_CANVAS[out.format] : { w: 1920, h: 1080 })
</script>

{#if out}
  {#key out.id}
    <div class="monitors">
      <div>
        <div class="mon-label pv">PREVIEW</div>
        <div class="mon pv" use:fit={{ width: canvas.w, height: canvas.h }}>
          <iframe title="Preview {out.name}" src="/out/{out.id}?view=preview&lowfx=1" width={canvas.w} height={canvas.h}></iframe>
        </div>
      </div>
      <div>
        <div class="mon-label pg">PROGRAM</div>
        <div class="mon pg" use:fit={{ width: canvas.w, height: canvas.h }}>
          <iframe title="Program {out.name}" src="/out/{out.id}?lowfx=1" width={canvas.w} height={canvas.h}></iframe>
        </div>
      </div>
    </div>
  {/key}
{/if}
