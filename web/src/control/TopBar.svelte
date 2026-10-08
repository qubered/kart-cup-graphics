<script lang="ts">
  import { control } from './store'

  let now = $state(Date.now())
  $effect(() => {
    const t = setInterval(() => (now = Date.now()), 1000)
    return () => clearInterval(t)
  })

  const st = $derived($control.payload?.state)
  const presence = $derived($control.payload?.presence ?? {})
  const nowText = $derived.by(() => {
    if (!st || !$control.catalog) return '—'
    const r = st.draft.race
    const cat = $control.catalog
    const track = cat.track(r.trackId)?.name ?? '?'
    if (r.mode === 'cup') return `Race ${r.raceIndex + 1} / 4 · ${cat.cup(r.cupId)?.name ?? '?'} · ${track}`
    return `Race ${st.draft.scores.races.length + 1} · ${track}`
  })
  const clock = $derived(new Date(now).toLocaleTimeString([], { hour12: false }))
  const onAir = $derived.by(() => {
    const since = st?.clocks.onAirSince
    if (!since) return '00:00:00'
    const s = Math.max(0, Math.floor((now - since) / 1000))
    const p = (n: number) => String(n).padStart(2, '0')
    return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`
  })
</script>

<header class="topbar">
  <span class="title">Kart Cup Graphics</span>
  <span class="now" data-now>Now: <b>{nowText}</b></span>
  <span class="spacer"></span>
  <div class="lights">
    {#each st?.outputs ?? [] as o (o.id)}
      <span class="light" title="{o.name}: {presence[o.id]?.program ?? 0} program, {presence[o.id]?.preview ?? 0} preview clients">
        <span class="dot" class:on={(presence[o.id]?.program ?? 0) > 0}></span>{o.name}
      </span>
    {/each}
  </div>
  <span class="dim">On air <span class="clock">{onAir}</span></span>
  <span class="clock">{clock}</span>
</header>
