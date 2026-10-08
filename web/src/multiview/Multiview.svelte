<script lang="ts">
  import { light } from '../control/presence'
  import { onMount } from 'svelte'
  import { connect } from '../lib/socket'
  import { fit } from '../lib/fit'
  import { standings } from '../../../shared/scoring'
  import { indexCatalog, type Catalog, type CatalogIndex } from '../../../shared/catalog'
  import { colourHex } from '../../../shared/palette'
  import type { ControlPayload, ServerMessage } from '../../../shared/protocol'
  import { multiviewLayout, MV_W, MV_H, type Tile } from './layout'
  import { cueWindow } from './cues'

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
    if (!since) return '00:00:00'
    const s = Math.max(0, Math.floor((now - since) / 1000))
    return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
  })
  const trackId = $derived.by(() => {
    if (!st) return ''
    const r = st.draft.race
    return r.mode === 'cup' ? (catalog?.tracksOfCup(r.cupId)[r.raceIndex]?.id ?? '') : r.trackId
  })
  const trackName = $derived(catalog?.track(trackId)?.name ?? '')
  const raceNow = $derived.by(() => {
    if (!st) return ''
    const r = st.draft.race
    return r.mode === 'cup' ? `Race ${r.raceIndex + 1} / 4` : `Race ${st.draft.scores.races.length + 1}`
  })
  const raceSub = $derived.by(() => {
    if (!st) return ''
    const r = st.draft.race
    return r.mode === 'cup' ? `${catalog?.cup(r.cupId)?.name ?? ''} · ${trackName}` : trackName
  })
  const upNext = $derived.by(() => {
    if (!st) return '—'
    const r = st.draft.race
    if (r.mode !== 'cup' || r.raceIndex >= 3) return '—'
    return catalog?.tracksOfCup(r.cupId)[r.raceIndex + 1]?.name ?? '—'
  })
  const rows = $derived(st ? standings(st.draft.scores) : [])

  const ROW_H = 34
  function cueRowsFor(t: Tile) {
    const stacks = st?.stacks ?? []
    if (!st || !stacks.length) return []
    const total = Math.max(2, Math.floor((t.h - 64) / ROW_H))
    const each = Math.max(2, Math.floor(total / stacks.length) - 1)
    return stacks.map((k) => ({ stack: k, win: cueWindow(k, st.presets, each) }))
  }

  function outputOf(t: Extract<Tile, { kind: 'output' }>) {
    return st?.outputs.find((o) => o.id === t.outputId)
  }
  function lit(t: Extract<Tile, { kind: 'output' }>): boolean {
    const p = payload?.presence[t.outputId]
    if (!p) return false
    if (t.view === 'preview') return p.preview > 0
    const o = outputOf(t)
    return !!o && light(p, o.format) === 'on'
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
          {@const up = lit(t)}
          <div class="tile {t.view}" class:hold data-tile style="left:{t.x}px;top:{t.y}px;width:{t.w}px;height:{t.h}px">
            <div class="vp" use:fit={{ width: c.w, height: c.h }}>
              <div class="frame" style="width:{c.w}px;height:{c.h}px"><iframe title="{o.name} {t.view}" src={src(t)} width={c.w} height={c.h} scrolling="no"></iframe></div>
            </div>
            <div class="lbl"><i class="swatch"></i>{o.name.toUpperCase()} · {t.view.toUpperCase()}</div>
            <div class="stat"><span class="led" class:off={!up}></span>{up ? 'connected' : 'offline'}</div>
          </div>
        {/if}
      {:else if t.kind === 'info'}
        <div class="tile info" class:hold data-tile style="left:{t.x}px;top:{t.y}px;width:{t.w}px;height:{t.h}px">
          <div><div class="k">Time of day</div><div class="big">{clock}</div></div>
          <div><div class="k">On air</div><div class="onair">{onAir}</div></div>
          <div><div class="k">Now</div><div class="v">{raceNow}</div><div class="sub">{raceSub}</div></div>
          {#if !connected}<div class="warn">Disconnected — reconnecting…</div>{/if}
        </div>
      {:else if t.kind === 'cues'}
        <div class="tile cues" class:hold data-tile data-cuelist style="left:{t.x}px;top:{t.y}px;width:{t.w}px;height:{t.h}px">
          <div class="k">Cue list</div>
          {#each cueRowsFor(t) as { stack, win } (stack.id)}
            <div class="stk" data-stack={stack.id}>{stack.name}</div>
            {#if win.before}<div class="more">↑ {win.before} more</div>{/if}
            {#each win.rows as r (r.id)}
              <div class="crow {r.status}" data-cue-row={r.id}>
                <span class="n">{r.n}</span>
                <span class="nm">{r.name}</span>
                <span class="tk">{r.take ? r.take.toUpperCase() : 'LOAD'}</span>
                <span class="st">{r.status.toUpperCase()}</span>
              </div>
            {/each}
            {#if win.after}<div class="more">↓ {win.after} more</div>{/if}
          {:else}
            <div class="more">No cue stacks</div>
          {/each}
        </div>
      {:else}
        <div class="tile stand" class:hold data-tile style="left:{t.x}px;top:{t.y}px;width:{t.w}px;height:{t.h}px">
          <div class="k">Standings</div>
          {#each rows as r (r.playerIndex)}
            {@const p = st!.draft.players[r.playerIndex]}
            <div class="srow"><span class="n">{r.position}</span><span class="c" style="background:{colourHex(p.colour)}"></span><span class="nm">{p.name}</span><span class="pt">{r.total}</span></div>
          {/each}
          <div class="k" style="margin-top:auto">Up next</div>
          <div class="v">{upNext}</div>
        </div>
      {/if}
    {/each}
  </div>
</div>

<style>
  :global(html), :global(body) { margin: 0; background: #000; overflow: hidden; height: 100%; }
  .stage-wrap { position: fixed; inset: 0; overflow: hidden; background: #000; }
  .stage { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; transform-origin: 0 0;
    font: 600 14px/1 var(--ui-font); color: #fff; }
  .stage :global(*) { box-sizing: border-box; }
  .tile { position: absolute; overflow: hidden; background: #000; border: 3px solid #333; }
  .tile.program { border-color: var(--ui-program); }
  .tile.preview { border-color: var(--ui-preview); }
  .tile.hold { border-color: var(--ui-hold); }
  .vp { width: 100%; overflow: hidden; }
  .frame { position: relative; }
  iframe { color-scheme: normal; border: 0; display: block; background: transparent; }
  .lbl { position: absolute; left: 50%; bottom: 8px; transform: translateX(-50%); z-index: 9; background: rgba(0,0,0,.75); padding: 6px 12px; border-radius: 4px; font-size: 15px; letter-spacing: .06em; white-space: nowrap; display: flex; gap: 8px; align-items: center; }
  .swatch { width: 10px; height: 10px; border-radius: 50%; display: block; }
  .program .swatch { background: var(--ui-program); }
  .preview .swatch { background: var(--ui-preview); }
  .stat { position: absolute; right: 8px; top: 8px; z-index: 9; background: rgba(0,0,0,.7); padding: 4px 8px; border-radius: 4px; font-size: 12px; display: flex; gap: 6px; align-items: center; }
  .led { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; }
  .led.off { background: #4b5563; }
  .info { display: flex; flex-wrap: wrap; gap: 12px 36px; align-content: center; padding: 18px 24px; border-color: #222; background: #0b0d11; }
  .cues { display: flex; flex-direction: column; gap: 4px; padding: 18px 20px; border-color: #222; background: #0b0d11; }
  .stk { margin-top: 8px; font-size: 16px; font-weight: 700; color: #cbd5e1; }
  .more { color: var(--ui-muted); font-size: 12px; padding-left: 6px; }
  .crow { display: flex; align-items: center; gap: 10px; height: 30px; padding: 0 10px; border-left: 5px solid transparent; background: #12151b; border-radius: 3px; font-size: 18px; }
  .crow .n { width: 24px; color: var(--ui-muted); font-family: var(--ui-mono); }
  .crow .nm { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .crow .tk { font-size: 12px; letter-spacing: .08em; color: var(--ui-muted); }
  .crow .st { width: 40px; text-align: right; font-size: 13px; font-weight: 800; letter-spacing: .06em; }
  .crow.pgm { border-left-color: var(--ui-program); background: #2a1217; }
  .crow.pgm .st { color: var(--ui-program); }
  .crow.pvw { border-left-color: var(--ui-preview); background: #0f2417; }
  .crow.pvw .st { color: var(--ui-preview); }
  .stand { display: flex; flex-direction: column; gap: 8px; padding: 18px 24px; border-color: #222; background: #0b0d11; }
  .tile.hold.info, .tile.hold.stand, .tile.hold.cues { border-color: var(--ui-hold); }
  .k { font-size: 13px; letter-spacing: .12em; color: var(--ui-muted); text-transform: uppercase; }
  .big { font: 700 56px/1 var(--ui-mono); font-variant-numeric: tabular-nums; }
  .onair { white-space: nowrap; font: 700 56px/1 var(--ui-mono); margin-top: 8px; font-variant-numeric: tabular-nums; }
  .v { font-size: 24px; font-weight: 700; }
  .info .v { margin-top: 8px; }
  .sub { color: var(--ui-muted); margin-top: 6px; }
  .warn { color: var(--ui-hold); }
  .srow { display: flex; align-items: center; gap: 14px; font-size: 26px; font-weight: 700; }
  .srow .n { width: 30px; color: var(--ui-muted); }
  .srow .c { width: 10px; height: 28px; border-radius: 2px; }
  .srow .nm { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .srow .pt { font-family: var(--ui-mono); }
</style>
