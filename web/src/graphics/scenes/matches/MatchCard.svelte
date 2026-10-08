<script lang="ts">
  import { flip } from 'svelte/animate'
  import type { MatchCardView, MatchesDetail, ViewModel } from '../../../../../shared/types'
  import { fitText } from '../../../lib/fit-text'
  import { pop, overshoot, STAGGER_MS } from '../../motion'
  import Medallion from '../../Medallion.svelte'
  import Swap from '../../Swap.svelte'
  import type { Orient } from './layout'

  interface Props {
    card: MatchCardView; view: ViewModel; detail: MatchesDetail; orient: Exclude<Orient, 'strip'>
    w: number; h: number
    /** Show the totals of a match that has no results yet (as 0), or hide them. */
    showPending: boolean
    liveMarker: boolean; focus?: boolean; enter?: number
  }
  let { card, view, detail, orient, w, h, showPending, liveMarker, focus = false, enter = 0 }: Props = $props()

  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
  const st = $derived(enter ? STAGGER_MS : 0)
  const scored = $derived(card.hasResults || showPending)
  const isLive = $derived(liveMarker && card.live)
  const vert = $derived(orient === 'v')

  /* v: header on top, rows below. h: header column on the left, players side by side. */
  const headerH = $derived(clamp(h * 0.17, 52, 96))
  const headW = $derived(w > 2500 ? 420 : 300)
  const rh = $derived((h - headerH - 22) / 4)
  const rowH = $derived(rh - 8)
  const narrow = $derived(w < 700)
  const pad = $derived(narrow ? 12 : 24)

  const races = $derived(card.races.length)
  const raceW = $derived(Math.min(rowH * 0.8, (w * 0.4) / Math.max(1, races)))
  const totalW = $derived(rowH * (narrow ? 1.1 : 1.55))
  const posW = $derived(narrow ? 0 : rowH * 1.0)
  const medal = $derived(narrow ? Math.round(rowH * 0.8) : rowH - 8)
  const nameBase = $derived(w - 32 - 2 * pad - (narrow ? 22 : 0) - posW - medal - (narrow ? 8 : 16) - totalW - 12)
  /* per-race columns only when the names keep a sensible width, otherwise "full" falls back to compact totals */
  const showRaces = $derived(vert && detail === 'full' && scored && races > 0 && nameBase - races * raceW >= 260)
  const nameW = $derived(Math.floor(Math.max(60, nameBase - (showRaces ? races * raceW : 0))))

  /* h orient */
  const cellW = $derived((w - headW - 24) / 4)
  const cMedal = $derived(Math.round(h * 0.52))
  const cName = $derived(Math.floor(Math.max(50, cellW - 36 - cMedal - 24)))
  const cRaces = $derived(detail === 'full' && scored && races > 0)

  /* winner-only hero */
  const bodyH = $derived(vert ? h - headerH - 20 : h - 20)
  const bodyW = $derived(vert ? w : w - headW)
  const colHero = $derived(vert && narrow)
  const heroMedal = $derived(Math.round(colHero ? bodyH * 0.5 : Math.min(bodyH * 0.9, bodyW * 0.3)))
  const heroTot = $derived(colHero ? bodyH * 0.2 : Math.max(40, bodyH * 0.36))
  const heroName = $derived(colHero ? Math.floor(bodyW - 40) : Math.floor(Math.max(80, bodyW - heroMedal - heroTot * 2.2 - 36 * 2 - 80)))
  const winnerRow = $derived(card.rows.find((r) => r.winner) ?? null)

  const SFX = ['th', 'st', 'nd', 'rd']
  const ord = (n: number) => (n >= 1 && n <= 3 ? SFX[n] : 'th')
  const posLabel = (r: { position: number; player: { slot: number } }) => (card.hasResults ? `${r.position}` : `P${r.player.slot + 1}`)
  const totalLabel = (t: number) => (scored ? `${t}` : '–')
</script>

{#snippet head()}
  <div class="head" class:col={!vert} style:font-family={view.fonts.names}>
    <span class="label" style:font-size="{vert ? headerH * 0.6 : Math.min(h * 0.26, 64)}px">{card.label}</span>
    <span class="meta" class:nocup={narrow || (showRaces && w < 1000) || (!vert && w < 2500)}>
      {#if card.cupEmblem}<span class="emb"><Medallion image={card.cupEmblem} size={vert ? headerH * 0.78 : 54} emblem dur={enter} /></span>{/if}
      <span class="cup" style:font-family={view.fonts.labels} style:font-size="{vert ? headerH * 0.3 : 26}px">{card.cupName}</span>
    </span>
    {#if isLive}<span class="live" style:font-size="{vert ? headerH * 0.34 : 28}px"><i></i>LIVE</span>{/if}
    {#if showRaces}
      <span class="rlabels" style:right="{16 + pad + totalW}px" style:font-family={view.fonts.labels}>
        {#each card.races as r (r.raceNo)}<span style:width="{raceW}px" style:font-size="{Math.min(26, headerH * 0.3)}px">R{r.raceNo}</span>{/each}
      </span>
    {/if}
  </div>
{/snippet}

<div class="card" class:focus class:is-live={isLive} data-match={card.id} data-orient={orient} data-detail={detail}
  style:width="{w}px" style:height="{h}px" style:--d="{enter}ms">
  <div class="panel"></div>
  {#if vert}
    <div class="top" style:height="{headerH}px">{@render head()}</div>
  {:else}
    <div class="side" style:width="{headW}px">{@render head()}</div>
  {/if}

  {#if detail === 'winner'}
    <div class="hero" style:left="{vert ? 0 : headW}px" style:top="{vert ? headerH : 0}px" style:width="{bodyW}px" style:height="{vert ? h - headerH : h}px"
      style:--pc={card.winner?.colour ?? '#8fdcff'}>
      {#if card.winner}
        <Swap key={card.winner.slot} dur={enter}>
          <div class="hero-in" class:col={colHero}>
            <Medallion image={card.winner.icon} size={heroMedal} stars dur={enter} />
            <div class="htxt">
              <div class="wlabel" style:font-family={view.fonts.labels} style:font-size="{colHero ? bodyH * 0.07 : Math.max(22, bodyH * 0.12)}px">WINNER</div>
              <div class="hname" style:font-family={view.fonts.names} style:font-size="{colHero ? bodyH * 0.17 : Math.max(36, bodyH * 0.32)}px" style:width="{heroName}px"
                use:fitText={{ max: heroName, text: card.winner.name }}><span>{card.winner.name}</span></div>
            </div>
            {#if winnerRow && scored}<div class="htotal" style:font-family={view.fonts.names} style:font-size="{heroTot}px">{winnerRow.total}</div>{/if}
          </div>
        </Swap>
      {:else}
        <div class="tbd" style:font-family={view.fonts.names} style:font-size="{Math.max(36, bodyH * 0.3)}px">TBD</div>
      {/if}
    </div>
  {:else if vert}
    <div class="rows">
      {#each card.rows as r, i (r.player.slot)}
        <div class="prow" class:first={r.winner} data-slot={r.player.slot}
          style:top="{headerH + 4 + i * rh}px" style:left="16px" style:width="{w - 32}px" style:height="{rowH}px"
          style:--pc={r.player.colour} style:--pt={r.player.textColour} style:--rh="{rowH}px"
          animate:flip={{ duration: enter, easing: overshoot }}>
          <div class="inner" in:pop|global={{ duration: enter, delay: (i + 1) * st }}>
            <div class="bg"><div class="lead"></div></div>
            {#if !narrow}
              <div class="pos" style:width="{posW}px" style:font-family={view.fonts.names} style:margin-left="{pad}px">
              <Swap key={posLabel(r)} dur={enter}><span>{posLabel(r)}{#if card.hasResults}<sup>{ord(r.position)}</sup>{/if}</span></Swap>
            </div>
            {/if}
            <div class="medal" style:width="{medal}px" style:height="{medal}px" style:margin-left="{narrow ? pad + 22 : 0}px"><Medallion image={r.player.icon} size={medal} dur={enter} /></div>
            <Swap key={r.player.name} dur={enter}>
              <div class="name" style:display="block" style:width="{nameW}px" style:font-family={view.fonts.names} use:fitText={{ max: nameW, text: r.player.name }}><span>{r.player.name}</span></div>
            </Swap>
            {#if showRaces}
              {#each r.racePoints as p, k (k)}<div class="rp" style:width="{raceW}px" style:font-family={view.fonts.names}>{p}</div>{/each}
            {/if}
            <Swap key={totalLabel(r.total)} dur={enter}>
              <div class="tot" style:width="{totalW}px" style:font-family={view.fonts.names}>{totalLabel(r.total)}</div>
            </Swap>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="cells" style:left="{headW}px" style:right="16px">
      {#each card.rows as r, i (r.player.slot)}
        <div class="cell" class:first={r.winner} data-slot={r.player.slot} style:width="{cellW}px" style:left="{i * cellW}px"
          style:--pc={r.player.colour} style:--pt={r.player.textColour} animate:flip={{ duration: enter, easing: overshoot }}>
          <div class="inner" in:pop|global={{ duration: enter, delay: (i + 1) * st }}>
            <div class="bg"><div class="lead"></div></div>
            <div class="medal" style:width="{cMedal}px" style:height="{cMedal}px"><Medallion image={r.player.icon} size={cMedal} dur={enter} /></div>
            <div class="ctxt">
              <Swap key={r.player.name} dur={enter}>
                <div class="name" style:display="block" style:width="{cName}px" style:font-size="{Math.round(h * 0.2)}px" style:font-family={view.fonts.names} use:fitText={{ max: cName, text: r.player.name }}><span>{r.player.name}</span></div>
              </Swap>
              <div class="l2">
                <Swap key={totalLabel(r.total)} dur={enter}>
                  <span class="tot" style:font-size="{Math.round(h * 0.28)}px" style:font-family={view.fonts.names}>{totalLabel(r.total)}</span>
                </Swap>
              </div>
              {#if cRaces}<span class="cr" style:font-family={view.fonts.labels} style:font-size="{Math.round(h * 0.11)}px">{r.racePoints.join(' · ')}</span>{/if}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .card { position: absolute; left: 0; top: 0; }
  .panel {
    position: absolute; inset: 0; background: var(--mk-bar);
    clip-path: polygon(0 0, 100% 0, 100% calc(100% - 36px), calc(100% - 36px) 100%, 0 100%);
  }
  .panel::before { content: ''; position: absolute; left: 0; right: 0; top: 0; height: 10px; background: #6bb7ef; }
  .is-live .panel::before { background: var(--mk-yellow); height: 14px; }
  .is-live .panel { box-shadow: inset 0 0 0 5px var(--mk-yellow); }
  .top { position: absolute; left: 0; right: 0; top: 10px; }
  .side { position: absolute; left: 0; top: 10px; bottom: 0; }
  .head { position: absolute; inset: 0; display: flex; align-items: center; gap: 18px; padding: 0 24px; color: #fff; }
  .head.col { flex-direction: column; align-items: flex-start; justify-content: center; gap: 8px; padding: 0 24px; }
  .label { font-weight: 900; font-style: italic; line-height: 1; letter-spacing: 1px; text-transform: uppercase; white-space: nowrap; text-shadow: 0 3px 0 rgba(0, 0, 0, .35); }
  .meta { display: inline-flex; align-items: center; gap: 12px; min-width: 0; }
  .emb { display: inline-flex; }
  .nocup .cup { display: none; }
  .cup { font-weight: 800; letter-spacing: 5px; text-transform: uppercase; color: var(--mk-label-cyan); white-space: nowrap; }
  .live {
    display: inline-flex; align-items: center; gap: 10px; background: #e60012; color: #fff; font: italic 900 28px/1 var(--font-name);
    padding: 7px 18px 6px; border-radius: 8px; transform: skewX(-12deg); letter-spacing: 3px; box-shadow: 0 4px 0 rgba(0, 0, 0, .35);
  }
  .live i { width: 0.5em; height: 0.5em; border-radius: 50%; background: #fff; animation: blink 1.4s ease-in-out infinite; }
  @keyframes blink { 50% { opacity: .25 } }
  .rlabels { position: absolute; bottom: 4px; display: flex; font-weight: 800; letter-spacing: 3px; color: var(--mk-label-cyan); }
  .rlabels span { text-align: center; }

  .rows, .cells { position: absolute; inset: 0; }
  .cells { top: 10px; bottom: 16px; }
  .prow { position: absolute; }
  .cell { position: absolute; top: 14px; bottom: 6px; padding: 0 5px; box-sizing: border-box; }
  .inner { position: absolute; inset: 0; display: flex; align-items: center; color: #fff; }
  .bg { position: absolute; inset: 0; clip-path: polygon(24px 0, 100% 0, calc(100% - 24px) 100%, 0 100%); background: var(--row-dark); }
  .bg::before { content: ''; position: absolute; z-index: 1; left: 12px; top: 0; bottom: 0; width: 14px; background-color: var(--pc); transform: skewX(-13deg); transition: background-color var(--d); }
  .lead { position: absolute; inset: 0; background: var(--row-leader); opacity: 0; transition: opacity var(--d); }
  .first .lead { opacity: 1; }
  .pos { position: relative; flex: none; font: italic 900 calc(var(--rh) * 0.62)/1 var(--font-name); white-space: nowrap; }
  .pos sup { font-size: 0.42em; margin-left: 2px; vertical-align: top; position: relative; top: 0.12em; }
  .medal { position: relative; flex: none; margin-right: 16px; }
  .name { position: relative; flex: none; font-size: calc(var(--rh) * 0.56); font-weight: 900; font-style: italic; line-height: 1.1; white-space: nowrap; overflow: hidden; }
  .name > span { display: inline-block; white-space: nowrap; }
  .rp { position: relative; flex: none; text-align: center; font: italic 800 calc(var(--rh) * 0.46)/1 var(--font-name); color: rgba(255, 255, 255, .78); }
  .tot { position: relative; flex: none; text-align: right; font: italic 900 calc(var(--rh) * 0.7)/1 var(--font-name); }
  .cell .tot { width: auto; text-align: left; }
  .l2 { display: flex; align-items: baseline; gap: 16px; white-space: nowrap; }
  .first .pos, .first .name, .first .tot, .first .rp, .first .cr { color: var(--row-leader-ink); }
  .cell .medal { margin: 0 14px 0 28px; }
  .ctxt { position: relative; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
  .cr { font-weight: 800; letter-spacing: 2px; color: var(--mk-label-cyan); white-space: nowrap; }
  .first .cr { color: var(--row-leader-sub); }

  .hero { position: absolute; display: flex; align-items: center; justify-content: center; }
  .hero-in { display: flex; align-items: center; gap: 36px; color: #fff; padding: 0 30px; }
  .hero-in.col { flex-direction: column; gap: 6px; padding: 0; }
  .hero-in.col .htxt { align-items: center; }
  .hero-in.col .wlabel { letter-spacing: 6px; }
  .htxt { display: flex; flex-direction: column; gap: 6px; }
  .wlabel { font-weight: 800; letter-spacing: 12px; color: var(--mk-label-cyan); line-height: 1; text-transform: uppercase; }
  .hname { font-weight: 900; font-style: italic; line-height: 1.1; white-space: nowrap; overflow: hidden; color: #fff; text-shadow: 0 4px 0 rgba(0, 0, 0, .3); }
  .hname > span { display: inline-block; white-space: nowrap; }
  .htotal { font-weight: 900; font-style: italic; line-height: 1; color: var(--mk-yellow); }
    .tbd { font-weight: 900; font-style: italic; letter-spacing: 8px; color: rgba(255, 255, 255, .45); }
</style>
