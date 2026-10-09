<script lang="ts">
  // The options of the chosen scene (every conditional row the old layer panel had). Red dot = what Program has for this screen.
  import { send } from '../../store'
  import { choiceToRef, rangeSet, refToChoice, toggleRound } from '../../tournament'
  import type { Command, Layers, OutputConfig, Tournament, ViewModel } from '../../../../../shared/types'
  import { availableParts, LOGO_MODES, nextAnnounce, nextReveal, qrStyles, qrStyleSelected, REVEAL_STEPS, revealLabel } from './scenes'

  interface Props {
    out: OutputConfig
    layers: Layers
    /** What this screen shows on air. */
    prog: ViewModel | undefined
    tour: Tournament | null
    /** "Split across outputs" commands, or null when there is no second screen that can show the scoreboard. */
    split: Command[] | null
    patch: (p: Partial<Layers>) => void
  }
  let { out, layers, prog, tour, split, patch }: Props = $props()

  const part = $derived(layers.part ?? 'full')
  const parts = $derived(availableParts(out.format, layers.scene))
  const mset = $derived(layers.matchSet)
  const rounds = $derived([...new Set((tour?.matches ?? []).map((m) => m.round))].sort((a, b) => a - b))
  const nMatches = $derived(tour?.matches.length ?? 0)
  const styles = $derived(qrStyles(out.format))

  // on air, for the red dots
  const ps = $derived(prog?.scene ?? null)
  const progLineup = $derived(ps?.kind === 'lineup' ? ps.players.length : null)
  const progAnnounce = $derived(ps?.kind === 'announce' ? ps.player.slot : null)
  const progCard = $derived(ps?.kind === 'announce' ? ps.card : null)
  const progQr = $derived(ps?.kind === 'qr' ? ps.style : null)
  const progNoticeQr = $derived(ps?.kind === 'notice' && !!ps.qr)
  const progLogo = $derived(ps?.kind === 'title' ? ps.logo : null)
  const progPart = $derived(ps?.kind === 'raceWin' || ps?.kind === 'cupWin' ? ps.part : null)
</script>

{#if layers.scene === 'lineup'}
  <div class="optrow">
    <span class="u-lab">Reveal</span>
    <div class="u-seg seg44" role="group" aria-label="Line-up reveal">
      {#each REVEAL_STEPS as n (n)}
        <button type="button" class:sel={(layers.lineupShown ?? 4) === n} class:u-livedot={progLineup === n} aria-pressed={(layers.lineupShown ?? 4) === n}
          onclick={() => patch({ lineupShown: n })}>{revealLabel(n)}</button>
      {/each}
    </div>
    <button type="button" class="u-btn" data-next-player onclick={() => patch({ lineupShown: nextReveal(layers) })}>Next player</button>
  </div>
{/if}

{#if layers.scene === 'announce'}
  <div class="optrow" data-announce-controls>
    <span class="u-lab">Player</span>
    <div class="u-seg seg44" role="group" aria-label="Announced player">
      {#each [0, 1, 2, 3] as i (i)}
        <button type="button" data-announce-slot={i} class:sel={(layers.announceSlot ?? 0) === i} class:u-livedot={progAnnounce === i} aria-pressed={(layers.announceSlot ?? 0) === i}
          onclick={() => patch({ announceSlot: i })}>P{i + 1}</button>
      {/each}
    </div>
    <button type="button" class="u-btn" data-next-announce onclick={() => patch({ announceSlot: nextAnnounce(layers) })}>Next player</button>
    <button type="button" class="u-tgl" class:on={!layers.announceBare} class:u-livedot={progCard === false} data-announce-card aria-pressed={!layers.announceBare}
      onclick={() => patch({ announceBare: !layers.announceBare })}>
      <span class="u-tt"><b>Show player card</b><small>Off: just the player colour and flags</small></span><span class="u-sw"></span>
    </button>
  </div>
{/if}

{#if layers.scene === 'notice'}
  <div class="optrow">
    <button type="button" class="u-tgl" class:on={!!layers.noticeQr} class:u-livedot={progNoticeQr} aria-pressed={!!layers.noticeQr} onclick={() => patch({ noticeQr: !layers.noticeQr })}>
      <span class="u-tt"><b>Show QR codes</b></span><span class="u-sw"></span>
    </button>
  </div>
{/if}

{#if layers.scene === 'qr' && styles.length}
  <div class="optrow">
    <span class="u-lab">Layout</span>
    <div class="u-seg seg44" role="group" aria-label="QR layout">
      {#each styles as [m, l] (m)}
        <button type="button" class:sel={qrStyleSelected(out.format, layers, m)} class:u-livedot={progQr === m} aria-pressed={qrStyleSelected(out.format, layers, m)}
          onclick={() => patch({ qrStyle: m })}>{l}</button>
      {/each}
    </div>
  </div>
{/if}

{#if layers.scene === 'raceWin' || layers.scene === 'cupWin'}
  <div class="optrow" data-win-controls>
    <span class="u-lab">Part</span>
    <div class="u-seg seg44" role="group" aria-label="Part">
      {#each parts as p (p.id)}
        <button type="button" data-part={p.id} class:sel={part === p.id} class:u-livedot={progPart === p.id} aria-pressed={part === p.id} onclick={() => patch({ part: p.id })}>{p.label}</button>
      {/each}
    </div>
    <button type="button" class="u-btn" data-split disabled={!split} title="Hero on this output, scoreboard on another" onclick={() => split?.forEach((c) => send(c))}>Split across outputs</button>
    {#if tour}
      <span class="u-lab">Match shown</span>
      <select class="u-select" name="matchRef" aria-label="Match shown" value={refToChoice(layers.matchRef)} onchange={(e) => patch({ matchRef: choiceToRef(e.currentTarget.value) })}>
        <option value="active">Active match</option>
        <option value="previous">Previous match</option>
        {#each tour.matches as m (m.id)}<option value={m.id}>{m.label}</option>{/each}
      </select>
    {/if}
  </div>
{/if}

{#if layers.scene === 'matches' && tour}
  <div class="optrow" data-matches-controls>
    <span class="u-lab">Matches</span>
    <div class="wrap">
      <button type="button" class="u-chip" class:on={!mset?.rounds?.length && !mset?.ids?.length && !mset?.range} data-set-all onclick={() => patch({ matchSet: {} })}>All</button>
      {#each rounds as r (r)}
        <button type="button" class="u-chip" class:on={mset?.rounds?.includes(r)} aria-pressed={!!mset?.rounds?.includes(r)} data-set-round={r} onclick={() => patch({ matchSet: toggleRound(mset, r) })}>Round {r + 1}</button>
      {/each}
    </div>
    <div class="range">
      <label class="u-sm u-dim">From
        <input class="u-input" type="number" min="1" max={nMatches} aria-label="From match" value={mset?.range ? mset.range[0] + 1 : ''}
          onchange={(e) => patch({ matchSet: rangeSet(mset, e.currentTarget.value === '' ? null : +e.currentTarget.value, mset?.range ? mset.range[1] + 1 : null, nMatches) })} />
      </label>
      <label class="u-sm u-dim">to
        <input class="u-input" type="number" min="1" max={nMatches} aria-label="To match" value={mset?.range ? mset.range[1] + 1 : ''}
          onchange={(e) => patch({ matchSet: rangeSet(mset, mset?.range ? mset.range[0] + 1 : null, e.currentTarget.value === '' ? null : +e.currentTarget.value, nMatches) })} />
      </label>
    </div>
  </div>
{/if}

{#if layers.scene === 'title'}
  <div class="optrow">
    <span class="u-lab">Logo</span>
    <div class="u-seg seg44" role="group" aria-label="Logo">
      {#each LOGO_MODES as m (m.id)}
        <button type="button" class:sel={(layers.logo ?? 'corner') === m.id} class:u-livedot={progLogo === m.id} aria-pressed={(layers.logo ?? 'corner') === m.id}
          onclick={() => patch({ logo: m.id })}>{m.label}</button>
      {/each}
    </div>
  </div>
{/if}

<style>
  .optrow { display: grid; gap: 6px; }
  .optrow + .optrow { margin-top: 4px; }
  .seg44 > button { height: 44px; }
  .wrap { display: flex; flex-wrap: wrap; gap: 6px; }
  .wrap .u-chip { height: 44px; padding: 0 14px; }
  .range { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .range label { display: grid; gap: 4px; }
  .range .u-input { width: 100%; }
</style>
