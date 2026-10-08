<script lang="ts">
  import { onMount } from 'svelte'
  import { connect } from '../lib/socket'
  import { fit } from '../lib/fit'
  import { standings } from '../../../shared/scoring'
  import { indexCatalog, type Catalog, type CatalogIndex } from '../../../shared/catalog'
  import { colourHex } from '../../../shared/palette'
  import type { ControlPayload, ServerMessage } from '../../../shared/protocol'
  import { multiviewLayout, MV_W, MV_H, type Tile } from './layout'

  const CANVAS = { wide: { w: 3840, h: 1152 }, twin: { w: 1920, h: 1152 }, hd: { w: 1920, h: 1080 } } as const

  let payload = $state<ControlPayload | null>(null)
  let connected = $state(false)
  let now = $state(Date.now())
  let scale = $state(1)
  let catalog = $state<CatalogIndex | null>(null)

  onMount(() => {
    const conn = connect(
      { role: 'multiview' },
      {
        onMessage(m: ServerMessage) { if (m.type === 'state') payload = m },
        onStatus(up) { connected = up },
      },
    )
    const tick = setInterval(() => (now = Date.now()), 1000)
    const resize = () => (scale = Math.min(window.innerWidth / MV_W, window.innerHeight / MV_H))
    resize()
    window.addEventListener('resize', resize)
    fetch('/assets/catalog.json')
      .then((r) => r.json())
      .then((c: Catalog) => (catalog = indexCatalog(c)))
      .catch(() => {})
    return () => { conn.close(); clearInterval(tick); window.removeEventListener('resize', resize) }
  })

  const st = $derived(payload?.state ?? null)
  const tiles = $derived(st ? multiviewLayout(st.outputs) : [])
  const hold = $derived(!!st?.overlay.hold.on)

  const pad = (n: number) => String(n).padStart(2, '0')
  const clock = $derived(new Date(now).toLocaleTimeString('en-GB'))
  const onAir = $derived.by(() => {
    const since = st?.clocks.onAirSince
    if (!since) return '--:--:--'
    const s = Math.max(0, Math.floor((now - since) / 1000))
    return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
  })
  const trackId = $derived.by(() => {
    if (!st) return ''
    const r = st.draft.race
    return r.mode === 'cup' ? (catalog?.tracksOfCup(r.cupId)[r.raceIndex]?.id ?? '') : r.trackId
  })
  const trackName = $derived(catalog?.track(trackId)?.name ?? '')
  const raceLine = $derived.by(() => {
    if (!st) return ''
    const r = st.draft.race
    if (r.mode === 'cup') return `Race ${r.raceIndex + 1} / 4 · ${catalog?.cup(r.cupId)?.name ?? ''} · ${trackName}`
    return `Race ${st.draft.scores.races.length + 1} · ${trackName}`
  })
  const rows = $derived(st ? standings(st.draft.scores) : [])

  function outputOf(t: Extract<Tile, { kind: 'output' }>) {
    return st?.outputs.find((o) => o.id === t.outputId)
  }
  function lit(t: Extract<Tile, { kind: 'output' }>): boolean {
    const p = payload?.presence[t.outputId]
    return !!p && (t.view === 'program' ? p.program : p.preview) > 0
  }
  const src = (t: Extract<Tile, { kind: 'output' }>) =>
    `/out/${encodeURIComponent(t.outputId)}?lowfx=1${t.view === 'preview' ? '&view=preview' : ''}`
</script>

<div class="stage-wrap">
  <div class="stage" style="transform:scale({scale})">
    {#each tiles as t, i (t.kind === 'output' ? `${t.outputId}:${t.view}` : t.kind + i)}
      {#if t.kind === 'output'}
        {@const o = outputOf(t)}
        {#if o}
          {@const c = CANVAS[o.format]}
          <div class="tile {t.view}" class:hold data-tile style="left:{t.x}px;top:{t.y}px;width:{t.w}px;height:{t.h}px">
            <div class="vp" use:fit={{ width: c.w, height: c.h }}>
              <div class="frame" style="width:{c.w}px;height:{c.h}px"><iframe title="{o.name} {t.view}" src={src(t)} width={c.w} height={c.h} scrolling="no"></iframe></div>
            </div>
            <div class="label"><i class="light" class:up={lit(t)}></i>{o.name.toUpperCase()} · {t.view.toUpperCase()}</div>
          </div>
        {/if}
      {:else if t.kind === 'info'}
        <div class="tile panel" class:hold data-tile style="left:{t.x}px;top:{t.y}px;width:{t.w}px;height:{t.h}px">
          <div class="clock">{clock}</div>
          <div class="kv"><span>ON AIR</span><b>{onAir}</b></div>
          <div class="kv"><span>NOW</span><b>{raceLine}</b></div>
          {#if !connected}<div class="warn">Disconnected — reconnecting…</div>{/if}
        </div>
      {:else}
        <div class="tile panel" class:hold data-tile style="left:{t.x}px;top:{t.y}px;width:{t.w}px;height:{t.h}px">
          <div class="ttl">STANDINGS</div>
          {#each rows as r (r.playerIndex)}
            {@const p = st!.draft.players[r.playerIndex]}
            <div class="srow"><span class="pos">{r.position}</span><i class="dot" style="background:{colourHex(p.colour)}"></i><span class="nm">{p.name}</span><b>{r.total}</b></div>
          {/each}
          <div class="next">Up next: {trackName}</div>
        </div>
      {/if}
    {/each}
  </div>
</div>

<style>
  :global(html), :global(body) { margin: 0; background: #05080f; overflow: hidden; height: 100%; }
  .stage-wrap { position: fixed; inset: 0; overflow: hidden; }
  .stage { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; transform-origin: 0 0; font-family: system-ui, sans-serif; color: #e5e7eb; }
  .tile { position: absolute; box-sizing: border-box; overflow: hidden; background: #000; border: 3px solid #374151; }
  .tile.program { border-color: #dc2626; }
  .tile.preview { border-color: #16a34a; }
  .tile.hold { border-color: #f59e0b; }
  .vp { width: 100%; overflow: hidden; }
  .frame { position: relative; }
  iframe { border: 0; display: block; background: transparent; }
  .label { position: absolute; left: 6px; top: 6px; padding: 2px 8px; font-size: 14px; font-weight: 700; letter-spacing: .05em; background: rgba(0,0,0,.65); border-radius: 4px; display: flex; align-items: center; gap: 6px; }
  .light { width: 9px; height: 9px; border-radius: 50%; background: #6b7280; display: inline-block; }
  .light.up { background: #22c55e; }
  .panel { background: #0f172a; padding: 12px 16px; display: flex; flex-direction: column; gap: 6px; }
  .clock { font-size: 44px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .kv { display: flex; gap: 10px; align-items: baseline; font-size: 20px; }
  .kv span { opacity: .6; font-size: 14px; width: 64px; }
  .warn { color: #f59e0b; }
  .ttl { font-size: 13px; letter-spacing: .08em; opacity: .7; }
  .srow { display: flex; align-items: center; gap: 8px; font-size: 18px; }
  .pos { width: 18px; opacity: .7; }
  .dot { width: 12px; height: 12px; border-radius: 50%; }
  .nm { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .next { margin-top: auto; font-size: 13px; opacity: .7; }
</style>
