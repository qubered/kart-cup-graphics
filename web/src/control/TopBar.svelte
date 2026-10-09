<script lang="ts">
  import { light, lightTitle } from './presence'
  import { control } from './store'
  import { PAGES, page, goto, undo, undoDepth, undoLabel } from './ui'

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
    return `Race ${r.raceNo} · ${track}`
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
  <span class="title">{st ? `${st.draft.event.title} ${st.draft.event.titleAccent}`.trim() : 'Kart Cup'} — Control</span>
  <nav class="nav" role="tablist" aria-label="Page">
    {#each PAGES as p (p.id)}
      <button type="button" role="tab" data-page={p.id} aria-selected={$page === p.id} onclick={() => goto(p.id)}>{p.label}</button>
    {/each}
  </nav>
  <span class="now" data-now>Now: <b>{nowText}</b></span>
  <button type="button" class="undo" data-undo disabled={$undoDepth === 0} title={$undoLabel ? `Undo: ${$undoLabel} (Ctrl/Cmd+Z)` : 'Nothing to undo'} onclick={() => undo()}>↶ Undo</button>
  <div class="stat">
    {#each st?.outputs ?? [] as o (o.id)}
      {@const lt = light(presence[o.id], o.format)}
      <span title={lightTitle(o.name, presence[o.id], o.format)}>
        <span class="led" class:on={lt === 'on'} class:partial={lt === 'partial'}></span>{o.name}
      </span>
    {/each}
    <span>On air <span class="onair">{onAir}</span></span>
    <span class="clock">{clock}</span>
  </div>
</header>
