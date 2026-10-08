<script lang="ts">
  // Scoreboard: one row per player (position, headshot, name, per-race points, total). Designed at boardDesign() size.
  import { flip } from 'svelte/animate'
  import type { CupWinView, RaceWinView, ViewModel } from '../../../../../shared/types'
  import { fitText } from '../../../lib/fit-text'
  import { STAGGER_MS, pop, overshoot } from '../../motion'
  import Medallion from '../../Medallion.svelte'
  import Swap from '../../Swap.svelte'
  import WinMeta from './WinMeta.svelte'
  import { boardDesign } from './layout'

  let { scene, view, enter = 0, compact, races: nRaces, scale = 1, showMeta = false }: {
    scene: RaceWinView | CupWinView; view: ViewModel; enter?: number; compact: boolean; races: number; scale?: number; showMeta?: boolean
  } = $props()

  const d = $derived(boardDesign(scene.rows.length, nRaces, compact, showMeta))
  const cols = $derived(scene.races.slice(-nRaces))
  const st = $derived(enter ? STAGGER_MS : 0)
  const SFX = ['th', 'st', 'nd', 'rd']
  const ord = (n: number) => (n >= 1 && n <= 3 ? SFX[n] : 'th')
  const K = $derived(compact
    ? { rowH: 96, gap: 10, pos: 64, med: 96, nm: 52, nmw: 380, ch: 0, cell: 100, tot: 66, totw: 190, chip: 38 }
    : { rowH: 150, gap: 16, pos: 90, med: 150, nm: 74, nmw: 520, ch: 28, cell: 130, tot: 96, totw: 240, chip: 46 })

  /* the board is scaled into its region: svelte's flip measures in screen pixels, so convert to board pixels first */
  type Rects = { from: DOMRect; to: DOMRect }
  const unscale = (r: DOMRect) => ({ left: r.left / scale, top: r.top / scale, width: r.width / scale, height: r.height / scale }) as DOMRect
  const sflip = (node: Element, r: Rects, p: { duration: number; easing: (t: number) => number }) =>
    flip(node, { from: unscale(r.from), to: unscale(r.to) }, p)
  const lastIdx = $derived(cols.length - 1)
  const hot = (i: number) => scene.kind === 'raceWin' && i === lastIdx
</script>

<div class="board" class:compact style:width="{d.dw}px" style:height="{d.dh}px" data-win-board>
  {#if showMeta}
    <div class="meta" style:height="{compact ? 110 : 130}px" in:pop|global={{ duration: enter }}>
      <WinMeta {scene} {view} {enter} size={compact ? 80 : 100} />
    </div>
  {/if}
  {#if nRaces > 0}
    <div class="head" style:height="{compact ? 44 : 60}px" style:padding-right="{K.totw + 70}px" style:font-family={view.fonts.labels}>
      {#each cols as c, i (c.raceNo)}
        <div class="hc" class:hot={hot(i)} style:width="{K.cell}px" title={c.trackName}>R{c.raceNo}</div>
      {/each}
    </div>
  {/if}
  <div class="rows" style:gap="{K.gap}px">
    {#each scene.rows as r, i (r.player.slot)}
      <div class="row" class:first={r.winner} data-slot={r.player.slot} style:height="{K.rowH}px" style:--pc={r.player.colour} style:--pt={r.player.textColour} style:--d="{enter}ms"
        animate:sflip={{ duration: enter, easing: overshoot }}>
        <div class="inner" in:pop|global={{ duration: enter, delay: (i + 1) * st }}>
          <div class="bg"><div class="lead"></div></div>
          <Swap key={r.position} dur={enter}>
            <div class="pos" style:width="{K.pos + 40}px" style:font-size="{K.pos}px" style:font-family={view.fonts.names}>{r.position}{#if !compact}<sup>{ord(r.position)}</sup>{/if}</div>
          </Swap>
          <div class="medal" style:width="{K.med}px" style:height="{K.med}px"><Medallion image={r.player.icon} size={K.med - 8} stars={!compact} dur={enter} /></div>
          <div class="who">
            <Swap key={r.player.name} dur={enter}>
              <div class="name" style:display="block" style:font-size="{K.nm}px" style:width="{K.nmw}px" style:font-family={view.fonts.names}
                use:fitText={{ max: K.nmw, text: r.player.name }}><span>{r.player.name}</span></div>
            </Swap>
            {#if K.ch}
              <Swap key={r.player.character} dur={enter}>
                <div class="char" style:font-size="{K.ch}px" style:font-family={view.fonts.labels}>{r.player.character}</div>
              </Swap>
            {/if}
          </div>
          {#if nRaces > 0}
            <div class="cells">
              {#each r.racePoints.slice(-nRaces) as p, ci (ci)}
                <div class="cell" style:width="{K.cell}px">
                  <span class="chip" class:hot={hot(ci)} style:font-size="{K.chip}px" style:font-family={view.fonts.names}>{p}</span>
                </div>
              {/each}
            </div>
          {/if}
          <Swap key={r.total} dur={enter}>
            <div class="tot" style:width="{K.totw}px" style:font-size="{K.tot}px" style:font-family={view.fonts.names}>{r.total}<small>PTS</small></div>
          </Swap>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .board { position: relative; display: flex; flex-direction: column; }
  .meta { display: flex; align-items: center; padding-left: 40px; flex: none; }
  .head { display: flex; align-items: flex-end; justify-content: flex-end; flex: none; padding-bottom: 8px; box-sizing: border-box; }
  .hc { text-align: center; font-weight: 800; letter-spacing: 0.1em; color: var(--mk-label-cyan); font-size: 28px; line-height: 1; flex: none; }
  .compact .hc { font-size: 22px; }
  .hc.hot { color: var(--mk-yellow); }
  .rows { display: flex; flex-direction: column; }
  .row { position: relative; width: 100%; flex: none; }
  .inner { position: absolute; inset: 0; display: flex; align-items: center; padding: 0 70px 0 56px; box-sizing: border-box; }
  .inner > :global(.swap) { display: block; flex: none; }
  .bg { position: absolute; inset: 0; clip-path: polygon(30px 0, 100% 0, calc(100% - 30px) 100%, 0 100%); background: var(--row-dark); }
  .bg::before { content: ''; position: absolute; z-index: 1; left: 16px; top: 0; bottom: 0; width: 20px; background-color: var(--pc); transform: skewX(-13deg); transition: background-color var(--d); }
  .lead { position: absolute; inset: 0; background: var(--row-leader); opacity: 0; transition: opacity var(--d); }
  .first .lead { opacity: 1; }
  .inner > :global(*) { position: relative; z-index: 2; }
  .inner > .bg { position: absolute; z-index: 0; }
  .pos { display: flex; align-items: center; font-weight: 900; font-style: italic; line-height: 1; color: #fff; transition: color var(--d); }
  .pos sup { font-size: 0.42em; margin-left: 4px; align-self: flex-start; margin-top: 0.3em; }
  .medal { flex: none; display: grid; place-items: center; }
  .who { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; margin-left: 24px; }
  .who :global(.swap) { display: block; }
  .name { font-weight: 900; font-style: italic; line-height: 1.05; color: #fff; white-space: nowrap; overflow: hidden; transition: color var(--d); }
  .name > span { display: inline-block; white-space: nowrap; }
  .char { font-weight: 800; line-height: 1; letter-spacing: 7px; text-transform: uppercase; color: var(--mk-label-cyan); transition: color var(--d); }
  .cells { display: flex; flex: none; }
  .cell { display: flex; justify-content: center; }
  .chip {
    min-width: 1.9em; padding: 0.2em 0.35em; box-sizing: border-box; text-align: center; font-weight: 900; font-style: italic; line-height: 1;
    color: #fff; background: rgba(255, 255, 255, 0.14); border-radius: 0.28em; transform: skewX(-12deg); transition: background-color var(--d), color var(--d);
  }
  .chip.hot { background: var(--pc); color: var(--pt); }
  .tot { flex: none; display: flex; align-items: center; justify-content: flex-end; box-sizing: border-box; font-weight: 900; font-style: italic; line-height: 1; color: #fff; transition: color var(--d); }
  .tot small { font-size: 0.34em; margin-left: 0.3em; letter-spacing: 0.1em; }
  .first .pos, .first .name, .first .tot { color: var(--row-leader-ink); }
  .first .char { color: var(--row-leader-sub); }
  .first .chip { background: rgba(40, 28, 3, 0.16); color: var(--row-leader-ink); }
  .first .chip.hot { background: var(--pc); color: var(--pt); }
</style>
