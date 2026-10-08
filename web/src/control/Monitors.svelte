<script lang="ts">
  import { light } from './presence'
  import { control } from './store'
  import { fit } from '../lib/fit'
  import { FORMAT_CANVAS } from '../../../shared/view'

  const out = $derived($control.payload?.state.outputs.find((o) => o.id === $control.selectedOutput))
  const onAir = $derived(light($control.payload?.presence[$control.selectedOutput], out?.format ?? 'hd') !== 'off')
  const canvas = $derived(out ? FORMAT_CANVAS[out.format] : { w: 1920, h: 1080 })
</script>

{#if out}
  {#key out.id}
    <div class="monitors" class:pair={canvas.w / canvas.h < 2.5}>
      <div class="mon pv">
        <span class="t">PREVIEW</span>
        <div class="fitbox" use:fit={{ width: canvas.w, height: canvas.h }}>
          <iframe title="Preview {out.name}" src="/out/{out.id}?view=preview&lowfx=1" width={canvas.w} height={canvas.h}></iframe>
        </div>
      </div>
      <div class="mon pg">
        <span class="t">PROGRAM{onAir ? ' · ON AIR' : ''}</span>
        <div class="fitbox" use:fit={{ width: canvas.w, height: canvas.h }}>
          <iframe title="Program {out.name}" src="/out/{out.id}?lowfx=1" width={canvas.w} height={canvas.h}></iframe>
        </div>
      </div>
    </div>
  {/key}
{/if}
