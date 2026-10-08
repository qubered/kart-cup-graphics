<script lang="ts">
  import { control, send } from './store'

  const st = $derived($control.payload?.state)
  const pending = $derived($control.payload?.pending ?? {})
  const presence = $derived($control.payload?.presence ?? {})
  const armed = $derived(st?.armed ?? [])
  const hold = $derived(st?.overlay.hold)
  const ftb = $derived(st?.overlay.ftb ?? false)

  const SIZE = { wide: '3840×1152', twin: '1920×1152', hd: '1920×1080' } as const

  function toggleArm(id: string) {
    send({ type: 'arm', outputIds: armed.includes(id) ? armed.filter((x) => x !== id) : [...armed, id] })
  }
</script>

<footer class="master">
  <div class="ms">
    <span class="lab">Take to · click to arm</span>
    <div class="ochips">
      {#each st?.outputs ?? [] as o (o.id)}
        {@const online = (presence[o.id]?.program ?? 0) > 0}
        <button class="oc" class:arm={armed.includes(o.id)} data-arm={o.id} aria-pressed={armed.includes(o.id)}
          onclick={() => toggleArm(o.id)}>
          {#if (pending[o.id] ?? 0) > 0}<span class="p" data-pending>{pending[o.id]}</span>{/if}
          <div class="nn"><span class="led" class:on={online}></span>{o.name}</div>
          <div class="s">{online ? `${SIZE[o.format]}${armed.includes(o.id) ? ' · armed' : ''}` : 'offline'}</div>
        </button>
      {/each}
      <button class="oc all" data-arm-all onclick={() => send({ type: 'arm', outputIds: (st?.outputs ?? []).map((o) => o.id) })}>ALL</button>
    </div>
  </div>
  <div class="ms">
    <span class="lab">Transition</span>
    <div class="row" style="flex-wrap:nowrap">
      <button class="bb cut" onclick={() => send({ type: 'take', mode: 'cut' })}>CUT<small>instant</small></button>
      <button class="bb auto" onclick={() => send({ type: 'take', mode: 'auto' })}>AUTO<small>animated</small></button>
      <div class="durs" role="group" aria-label="Transition speed">
        {#each ['fast', 'normal', 'slow'] as sp (sp)}
          <button class:on={st?.transition === sp} onclick={() => send({ type: 'setTransition', speed: sp as 'fast' | 'normal' | 'slow' })}>
            {sp === 'fast' ? 'Fast' : sp === 'normal' ? 'Normal' : 'Slow'}
          </button>
        {/each}
      </div>
    </div>
    <div class="kb"><kbd>Space</kbd> AUTO · <kbd>Enter</kbd> CUT · <kbd>1</kbd>–<kbd>9</kbd> arm</div>
  </div>
  <div class="ms">
    <span class="lab">Emergency · all outputs · instant</span>
    <div class="row" style="flex-wrap:nowrap">
      <button class="bb hold" class:on={hold?.on} aria-pressed={hold?.on ?? false}
        onclick={() => send({ type: 'hold', on: !hold?.on })}>HOLD<small>"{st?.draft.event.holdMessage ?? ''}"</small></button>
      <button class="bb clear" onclick={() => send({ type: 'clear' })}>CLEAR<small>graphics off</small></button>
      <button class="bb ftb" class:on={ftb} aria-pressed={ftb} onclick={() => send({ type: 'ftb', on: !ftb })}>FTB<small>to black</small></button>
    </div>
    <div class="kb"><kbd>H</kbd> hold · <kbd>⇧Esc</kbd> clear · <kbd>⇧B</kbd> FTB</div>
  </div>
</footer>
