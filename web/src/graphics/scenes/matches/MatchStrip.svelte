<script lang="ts">
  import type { MatchCardView, MatchesDetail, ViewModel } from '../../../../../shared/types'
  import { fitText } from '../../../lib/fit-text'
  import Medallion from '../../Medallion.svelte'
  import Swap from '../../Swap.svelte'

  interface Props {
    card: MatchCardView; view: ViewModel; detail: MatchesDetail; w: number; h: number
    showPending: boolean; liveMarker: boolean; enter?: number
  }
  let { card, view, detail, w, h, showPending, liveMarker, enter = 0 }: Props = $props()

  const scored = $derived(card.hasResults || showPending)
  const isLive = $derived(liveMarker && card.live)
  const labelW = $derived(Math.round(Math.min(w * 0.3, h * 3.2)))
  const cellW = $derived((w - labelW - 40) / 4)
  const medal = $derived(Math.round(Math.min(h * 0.62, cellW * 0.4)))
  const wNameW = $derived(Math.floor(Math.max(60, w - labelW - medal - 220)))
  const winnerRow = $derived(card.rows.find((r) => r.winner) ?? null)
  const totalLabel = (t: number) => (scored ? `${t}` : '–')
</script>

<div class="strip" class:is-live={isLive} data-match={card.id} data-orient="strip" data-detail={detail}
  style:width="{w}px" style:height="{h}px" style:--h="{h}px" style:--d="{enter}ms">
  <div class="bg"></div>
  <div class="lab" style:width="{labelW}px" style:font-family={view.fonts.names}>
    <span class="t">{card.label}</span>
    {#if isLive}<span class="live"><i></i>LIVE</span>{/if}
  </div>
  {#if detail === 'winner'}
    <div class="win" style:left="{labelW}px" style:right="20px">
      {#if card.winner}
        <Swap key={card.winner.slot} dur={enter}>
          <div class="win-in" style:--pc={card.winner.colour}>
            <Medallion image={card.winner.icon} size={medal} dur={enter} />
            <div class="wname" style:width="{wNameW}px" style:font-family={view.fonts.names} use:fitText={{ max: wNameW, text: card.winner.name }}><span>{card.winner.name}</span></div>
            {#if winnerRow && scored}<div class="wtot" style:font-family={view.fonts.names}>{winnerRow.total}</div>{/if}
          </div>
        </Swap>
      {:else}
        <div class="tbd" style:font-family={view.fonts.names}>TBD</div>
      {/if}
    </div>
  {:else}
    <div class="mini" style:left="{labelW}px" style:right="20px">
      {#each card.rows as r (r.player.slot)}
        <div class="m" class:first={r.winner} data-slot={r.player.slot} style:width="{cellW}px" style:--pc={r.player.colour}>
          <Medallion image={r.player.icon} size={medal} dur={enter} />
          <Swap key={totalLabel(r.total)} dur={enter}><span class="v" style:font-size="{Math.round(Math.min(h * 0.4, cellW * 0.22))}px" style:font-family={view.fonts.names}>{totalLabel(r.total)}</span></Swap>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .strip { position: absolute; left: 0; top: 0; color: #fff; }
  .bg { position: absolute; inset: 0; clip-path: polygon(22px 0, 100% 0, calc(100% - 22px) 100%, 0 100%); background: var(--row-dark); }
  .is-live .bg { box-shadow: inset 0 0 0 4px var(--mk-yellow); }
  .lab { position: absolute; left: 36px; top: 0; bottom: 0; display: flex; flex-direction: column; justify-content: center; gap: 6px; }
  .t { font-weight: 900; font-style: italic; font-size: calc(var(--h) * 0.3); line-height: 1; text-transform: uppercase; white-space: nowrap; }
  .live { align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; background: #e60012; font: italic 900 calc(var(--h) * 0.17)/1 var(--font-name); letter-spacing: 2px; padding: 4px 10px 3px; border-radius: 6px; }
  .live i { width: 0.5em; height: 0.5em; border-radius: 50%; background: #fff; animation: blink 1.4s ease-in-out infinite; }
  @keyframes blink { 50% { opacity: .25 } }
  .mini, .win { position: absolute; top: 0; bottom: 0; display: flex; align-items: center; }
  .win { justify-content: flex-start; }
  .win-in { display: flex; align-items: center; gap: 22px; }
  .m { display: flex; align-items: center; gap: 8px; position: relative; }
  .v { font-weight: 900; font-style: italic; line-height: 1; }
  .m.first .v { color: var(--mk-yellow); }
  .wname { font-weight: 900; font-style: italic; font-size: calc(var(--h) * 0.4); line-height: 1.1; white-space: nowrap; overflow: hidden; }
  .wname > span { display: inline-block; white-space: nowrap; }
  .wtot { font: italic 900 calc(var(--h) * 0.46)/1 var(--font-name); color: var(--mk-yellow); }
  .tbd { font: italic 900 calc(var(--h) * 0.36)/1 var(--font-name); letter-spacing: 6px; color: rgba(255, 255, 255, .45); }
</style>
