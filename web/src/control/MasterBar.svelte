<script lang="ts">
  import { control, send } from './store'

  const st = $derived($control.payload?.state)
  const pending = $derived($control.payload?.pending ?? {})
  const presence = $derived($control.payload?.presence ?? {})
  const armed = $derived(st?.armed ?? [])
  const hold = $derived(st?.overlay.hold)
  const ftb = $derived(st?.overlay.ftb ?? false)

  function toggleArm(id: string) {
    send({ type: 'arm', outputIds: armed.includes(id) ? armed.filter((x) => x !== id) : [...armed, id] })
  }
</script>

<footer class="master">
  <div class="sec">
    <h2>Take to</h2>
    <div class="chips">
      {#each st?.outputs ?? [] as o (o.id)}
        <button class="chip" class:armed={armed.includes(o.id)} data-arm={o.id} aria-pressed={armed.includes(o.id)}
          onclick={() => toggleArm(o.id)}>
          <span class="dot" class:on={(presence[o.id]?.program ?? 0) > 0}></span>
          {o.name} <small>{o.format === 'wide' ? '3840×1152' : o.format === 'twin' ? '1920×1152' : '1920×1080'}</small>
          {#if (pending[o.id] ?? 0) > 0}<span class="badge" data-pending>{pending[o.id]}</span>{/if}
        </button>
      {/each}
      <button class="chip" data-arm-all onclick={() => send({ type: 'arm', outputIds: (st?.outputs ?? []).map((o) => o.id) })}>ALL</button>
    </div>
    <div class="hints"><kbd>Space</kbd> AUTO · <kbd>Enter</kbd> CUT · <kbd>1</kbd>–<kbd>9</kbd> arm · <kbd>H</kbd> HOLD · <kbd>Shift+Esc</kbd> CLEAR · <kbd>Shift+B</kbd> FTB</div>
  </div>
  <div class="sec">
    <h2>Transition</h2>
    <div class="row">
      <button class="big cut" onclick={() => send({ type: 'take', mode: 'cut' })}>CUT</button>
      <button class="big auto" onclick={() => send({ type: 'take', mode: 'auto' })}>AUTO</button>
      <div class="seg" role="group" aria-label="Transition speed">
        {#each ['fast', 'normal', 'slow'] as sp (sp)}
          <button class:draft={st?.transition === sp} onclick={() => send({ type: 'setTransition', speed: sp as 'fast' | 'normal' | 'slow' })}>
            {sp === 'fast' ? 'Fast' : sp === 'normal' ? 'Normal' : 'Slow'}
          </button>
        {/each}
      </div>
    </div>
  </div>
  <div class="sec">
    <h2>Emergency · all outputs</h2>
    <div class="row">
      <button class="big hold" class:on={hold?.on} aria-pressed={hold?.on ?? false}
        onclick={() => send({ type: 'hold', on: !hold?.on })}>HOLD<small>{st?.draft.event.holdMessage ?? ''}</small></button>
      <button class="big clear" onclick={() => send({ type: 'clear' })}>CLEAR</button>
      <button class="big ftb" class:on={ftb} aria-pressed={ftb} onclick={() => send({ type: 'ftb', on: !ftb })}>FTB</button>
    </div>
  </div>
</footer>
