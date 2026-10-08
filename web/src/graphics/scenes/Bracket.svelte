<script lang="ts">
  import { fade } from 'svelte/transition'
  import type { BracketNode, BracketView, ViewModel } from '../../../../shared/types'
  import { fitText } from '../../lib/fit-text'
  import { STAGGER_MS, pop } from '../motion'
  import Heading from '../Heading.svelte'
  import Medallion from '../Medallion.svelte'
  import Swap from '../Swap.svelte'
  import { TWIN_HALF, headingSpec, isTwin, layoutBracket } from './matches/layout'

  let { scene, view, enter = 0 }: { scene: BracketView; view: ViewModel; enter?: number } = $props()

  const st = $derived(enter ? STAGGER_MS : 0)
  const head = $derived(headingSpec(view.canvas))
  const wide = $derived(view.canvas.w > 3000)
  const geo = $derived(layoutBracket(
    scene.rounds.map((r) => ({ round: r.round, nodes: r.nodes.map((n) => ({ matchId: n.matchId, slotCount: n.slots.length, fed: n.slots.some((s) => s.fromMatchId !== null) })) })),
    view.canvas,
  ))
  const nodes = $derived(scene.rounds.flatMap((r, ri) => r.nodes.map((n, ni) => ({ n, ri, ni, box: geo.boxes.find((b) => b.matchId === n.matchId)! }))).filter((x) => x.box))
  const byId = $derived(new Map(nodes.map((x) => [x.n.matchId, x])))
  const lines = $derived(nodes.flatMap(({ n, box }) => n.slots.flatMap((s, i) => {
    const from = s.fromMatchId ? byId.get(s.fromMatchId) : undefined
    if (!from) return []
    const x1 = from.box.x + from.box.w, y1 = from.box.y + from.box.h / 2
    const x2 = box.x, y2 = box.slotY[i]
    const key = `${from.n.matchId}>${n.matchId}:${i}`, done = from.n.winner !== null
    if (isTwin(view.canvas) && x1 <= TWIN_HALF && x2 >= TWIN_HALF) {
      // The connector leaves one half and enters the other exactly at the seam, so each half draws its own end of it.
      const xm = TWIN_HALF + (x2 - TWIN_HALF) / 2
      return [{ key: `${key}:l`, d: `M${x1} ${y1} H${TWIN_HALF}`, done }, { key: `${key}:r`, d: `M${TWIN_HALF} ${y1} H${xm} V${y2} H${x2}`, done }]
    }
    const xm = x1 + (x2 - x1) / 2
    return [{ key, d: `M${x1} ${y1} H${xm} V${y2} H${x2}`, done }]
  })))
  const showScores = $derived(scene.config.showScores)
  const showStatus = $derived(scene.config.showStatus)
  const scale = $derived(wide ? 1.25 : 1)
  const statusOf = (n: BracketNode): 'live' | 'done' | null => (n.live ? 'live' : n.status === 'done' ? 'done' : null)
</script>

<div class="bracket" data-format={view.format}>
  {#each head.xs as hx (hx)}
    <div class="hold" style:left="{hx}px" style:top="{head.top}px">
      <div in:pop|global={{ duration: enter }}>
        <Swap key="{view.headingLook}|{view.fonts.headings}|{view.headingUpright}" dur={enter}>
          <Heading text="BRACKET" look={view.headingLook} font={view.fonts.headings} upright={view.headingUpright} size={head.size} />
        </Swap>
      </div>
    </div>
  {/each}

  <svg class="lines" width={view.canvas.w} height={view.canvas.h} viewBox="0 0 {view.canvas.w} {view.canvas.h}" in:fade|global={{ duration: enter, delay: enter ? 3 * st : 0 }}>
    {#each lines as l (l.key)}<path d={l.d} class:done={l.done} />{/each}
  </svg>

  {#each nodes as { n, ri, box } (n.matchId)}
    {@const st2 = statusOf(n)}
    <div class="node" class:is-live={showStatus && n.live} class:fed={box.style === 'slots'} data-match={n.matchId} data-style={box.style}
      style:left="{box.x}px" style:top="{box.y}px" style:width="{box.w}px" style:height="{box.h}px" style:--head="{box.head}px" style:--h="{box.h}px"
      in:pop|global={{ duration: enter, delay: (ri + 1) * st }}>
      <div class="panel"></div>
      <div class="hd" style:height="{box.head}px" style:font-family={view.fonts.names}>
        <span class="label" style:font-size="{box.head * 0.6 * (box.style === 'slots' ? 1 : 0.95)}px">{n.label}</span>
        {#if showStatus && st2 === 'live'}<span class="chip live"><i></i>LIVE</span>
        {:else if showStatus && st2 === 'done'}<span class="chip done">DONE</span>{/if}
      </div>

      {#if box.style === 'winner'}
        {@const bh = box.h - box.head - 10}
        {@const ms = Math.round(Math.min(bh * 0.92, 150 * scale))}
        {@const nw = Math.floor(Math.max(60, box.w - ms - (showScores ? 190 * scale : 60) - 90))}
        <div class="body" style:top="{box.head + 4}px" style:height="{bh}px">
          {#if n.winner}
            {@const total = n.slots.find((s) => s.winner)?.total ?? 0}
            <Swap key={n.winner.slot + '|' + n.winner.name + '|' + n.winner.icon} dur={enter}>
              <div class="win" style:--pc={n.winner.colour}>
                <Medallion image={n.winner.icon} size={ms} stars dur={enter} />
                <div class="wname" style:width="{nw}px" style:font-size="{Math.max(30, bh * 0.4)}px" style:font-family={view.fonts.names}
                  use:fitText={{ max: nw, text: n.winner.name }}><span>{n.winner.name}</span></div>
                {#if showScores && n.hasResults}<div class="wtot" style:font-size="{Math.max(34, bh * 0.46)}px" style:font-family={view.fonts.names}>{total}</div>{/if}
              </div>
            </Swap>
          {:else}
            <div class="pend">
              {#each n.slots as s (s.player.slot)}<Medallion image={s.player.icon} size={Math.min(bh * 0.8, 110 * scale)} dur={enter} />{/each}
            </div>
          {/if}
        </div>
      {:else}
        {@const rh = (box.h - box.head - 16) / n.slots.length}
        {@const rowH = rh - 8}
        {@const ms = Math.round(rowH - 6)}
        {@const nw = Math.floor(Math.max(60, box.w - 64 - ms - (showScores ? rowH * 1.7 : 20) - 60))}
        {#each n.slots as s, i (s.player.slot)}
          <div class="row" class:first={s.winner} data-slot={s.player.slot}
            style:top="{box.head + 8 + i * rh}px" style:height="{rowH}px" style:--pc={s.player.colour} style:--rh="{rowH}px">
            <div class="bg"><div class="lead"></div></div>
            <div class="medal" style:margin-left="40px"><Medallion image={s.player.icon} size={ms} dur={enter} /></div>
            <Swap key={s.player.name} dur={enter}>
              <div class="name" style:display="block" style:width="{nw}px" style:font-family={view.fonts.names} use:fitText={{ max: nw, text: s.player.name }}><span>{s.player.name}</span></div>
            </Swap>
            {#if showScores}
              <Swap key={n.hasResults ? s.total : '–'} dur={enter}><div class="tot" style:width="{rowH * 1.7}px" style:font-family={view.fonts.names}>{n.hasResults ? s.total : '–'}</div></Swap>
            {/if}
          </div>
        {/each}
      {/if}
    </div>
  {/each}
</div>

<style>
  .bracket { position: absolute; inset: 0; overflow: hidden; }
  .hold { position: absolute; width: max-content; translate: -50% 0; }
  .lines { position: absolute; left: 0; top: 0; }
  .lines path { fill: none; stroke: rgba(255, 255, 255, .5); stroke-width: 6; stroke-linejoin: round; }
  .lines path.done { stroke: var(--mk-yellow); stroke-width: 8; }
  .node { position: absolute; color: #fff; }
  .panel {
    position: absolute; inset: 0; background: var(--mk-bar);
    clip-path: polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%);
  }
  .panel::before { content: ''; position: absolute; left: 0; right: 0; top: 0; height: 10px; background: #6bb7ef; }
  .is-live .panel { box-shadow: inset 0 0 0 5px var(--mk-yellow); }
  .is-live .panel::before { background: var(--mk-yellow); }
  .hd { position: absolute; left: 0; right: 0; top: 10px; display: flex; align-items: center; gap: 18px; padding: 0 28px; }
  .label { font-weight: 900; font-style: italic; line-height: 1; text-transform: uppercase; letter-spacing: 1px; white-space: nowrap; text-shadow: 0 3px 0 rgba(0, 0, 0, .35); }
  .chip { font: italic 900 calc(var(--head) * 0.4)/1 var(--font-name); letter-spacing: 3px; padding: 6px 14px 5px; border-radius: 8px; transform: skewX(-12deg); box-shadow: 0 4px 0 rgba(0, 0, 0, .35); }
  .chip.live { display: inline-flex; align-items: center; gap: 8px; background: #e60012; }
  .chip.live i { width: 0.5em; height: 0.5em; border-radius: 50%; background: #fff; animation: blink 1.4s ease-in-out infinite; }
  .chip.done { background: rgba(255, 255, 255, .16); color: var(--mk-label-cyan); box-shadow: none; }
  @keyframes blink { 50% { opacity: .25 } }
  .body { position: absolute; left: 0; right: 0; display: flex; align-items: center; justify-content: center; }
  .win { display: flex; align-items: center; gap: 28px; padding: 0 28px; }
  .wname { font-weight: 900; font-style: italic; line-height: 1.1; white-space: nowrap; overflow: hidden; text-shadow: 0 3px 0 rgba(0, 0, 0, .3); }
  .wname > span { display: inline-block; white-space: nowrap; }
  .wtot { font-weight: 900; font-style: italic; line-height: 1; color: var(--mk-yellow); min-width: 90px; text-align: right; }
  .pend { display: flex; gap: 22px; opacity: .8; }
  .row { position: absolute; left: 16px; right: 16px; display: flex; align-items: center; }
  .bg { position: absolute; inset: 0; clip-path: polygon(22px 0, 100% 0, calc(100% - 22px) 100%, 0 100%); background: var(--row-dark); }
  .bg::before { content: ''; position: absolute; z-index: 1; left: 12px; top: 0; bottom: 0; width: 14px; background-color: var(--pc); transform: skewX(-13deg); }
  .lead { position: absolute; inset: 0; background: var(--row-leader); opacity: 0; transition: opacity var(--d, 0ms); }
  .first .lead { opacity: 1; }
  .medal { position: relative; flex: none; margin-right: 16px; }
  .name { position: relative; flex: none; font-size: calc(var(--rh) * 0.56); font-weight: 900; font-style: italic; line-height: 1.1; white-space: nowrap; overflow: hidden; }
  .name > span { display: inline-block; white-space: nowrap; }
  .tot { position: relative; flex: none; text-align: right; padding-right: 36px; box-sizing: border-box; font: italic 900 calc(var(--rh) * 0.68)/1 var(--font-name); }
  .first .name, .first .tot { color: var(--row-leader-ink); }
</style>
