<script lang="ts">
  // Schematic thumbnail of a screen: the background as a CSS pattern and the scene drawn as a small SVG, from a real ViewModel
  // (names, colours, standings... come from deriveView, so it agrees with the graphics). It is NOT the graphics renderer:
  // Output.svelte injects page-wide html/body styles and every copy would run the full animated scene, so tiles stay cheap and safe.
  import type { PlayerView, ViewModel } from '../../../../../shared/types'

  interface Props { view: ViewModel | null }
  let { view }: Props = $props()

  const scene = $derived(view?.scene ?? null)
  const bg = $derived(view?.background?.id ?? 'none')

  const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)
  /** textLength that keeps a long string inside `max` units but leaves short strings at their natural width. */
  const tl = (s: string, size: number, max: number) => Math.max(1, Math.min(max, s.length * size * 0.62))
  const barW = (total: number, max: number, from: number, to: number) => from + ((to - from) * total) / Math.max(1, max)
  const words = (s: string): [string, string] => {
    const i = s.indexOf(' ')
    return i < 0 ? [s, ''] : [s.slice(0, i), s.slice(i + 1)]
  }
  const noticeLines = $derived(
    scene?.kind === 'notice'
      ? scene.doc.blocks.map((b) => b.runs.map((r) => r.text).join('')).filter((t) => t.trim()).slice(0, 4)
      : [],
  )
  const matchGrid = $derived.by(() => {
    if (scene?.kind !== 'matches') return null
    const cards = scene.cards.slice(0, 6)
    const cols = cards.length <= 2 ? Math.max(1, cards.length) : cards.length <= 4 ? 2 : 3
    const rows = Math.max(1, Math.ceil(cards.length / cols))
    const w = (144 - (cols - 1) * 4) / cols
    const h = (72 - (rows - 1) * 4) / rows
    return { cards, cols, w, h }
  })
  const bracketCols = $derived(scene?.kind === 'bracket' ? scene.rounds : [])
  const colour = (p: PlayerView) => p.colour
</script>

<div class="th" data-bg={bg} aria-hidden="true">
  {#if view}
    <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid meet" focusable="false">
      {#if scene?.kind === 'title'}
        {@const shift = scene.logo === 'title' ? 14 : 0}
        {#if scene.logo === 'corner'}<circle cx="147" cy="13" r="7" fill="#ffd21f" stroke="#4a3300" stroke-width="1.4" />{/if}
        {#if scene.logo === 'title'}<circle cx="30" cy="46" r="13" fill="#ffd21f" stroke="#4a3300" stroke-width="1.6" />{/if}
        {#if scene.title.preTitle}<text x={80 + shift} y="24" text-anchor="middle" class="s" font-size="6" fill="#ffd31a" textLength={tl(scene.title.preTitle, 6, 70)} lengthAdjust="spacingAndGlyphs">{clip(scene.title.preTitle, 22)}</text>{/if}
        <text x={80 + shift} y="46" text-anchor="middle" class="s big" font-size="18" fill="#fff" textLength={tl(scene.title.title, 18, 118 - shift)} lengthAdjust="spacingAndGlyphs">{clip(scene.title.title, 16)}</text>
        <text x={80 + shift} y="62" text-anchor="middle" class="s" font-size="11" fill="#ffd21f" textLength={tl(scene.title.accent, 11, 90)} lengthAdjust="spacingAndGlyphs">{clip(scene.title.accent, 14)}</text>
      {:else if scene?.kind === 'lineup'}
        {#each scene.players as p, i (i)}
          <rect x={8 + i * 37} y="22" width="34" height="46" rx="4" fill={colour(p)} />
          <circle cx={25 + i * 37} cy="38" r="9" fill="#fff" opacity=".9" />
          <text x={25 + i * 37} y="62" text-anchor="middle" class="s" font-size="7" fill={p.textColour} textLength={tl(p.name || '—', 7, 30)} lengthAdjust="spacingAndGlyphs">{clip(p.name || '—', 8)}</text>
        {/each}
      {:else if scene?.kind === 'announce'}
        <rect x="0" y="0" width="160" height="90" fill={colour(scene.player)} />
        {#each [0, 1] as r (r)}
          {#each Array.from({ length: 16 }, (_, c) => c) as c (c)}
            <rect x={c * 10} y={r === 0 ? 0 : 80} width="10" height="5" fill={(c + r) % 2 ? '#fff' : '#0a0f1c'} />
            <rect x={c * 10} y={r === 0 ? 5 : 85} width="10" height="5" fill={(c + r) % 2 ? '#0a0f1c' : '#fff'} />
          {/each}
        {/each}
        {#if scene.card}
        <circle cx="38" cy="45" r="20" fill="#ffd21f" stroke="#4a3300" stroke-width="2" />
        <text x="68" y="30" class="s" font-size="7" fill="#fff">PLAYER {scene.player.slot + 1}</text>
        <text x="68" y="48" class="s big" font-size="14" fill="#fff" textLength={tl(scene.player.name || '—', 14, 80)} lengthAdjust="spacingAndGlyphs">{clip(scene.player.name || '—', 9)}</text>
        {/if}
        {#if scene.card && scene.player.subtitle}<text x="68" y="59" class="s" font-size="5.5" fill="#fff" textLength={tl(scene.player.subtitle, 5.5, 80)} lengthAdjust="spacingAndGlyphs">{clip(scene.player.subtitle, 24)}</text>{/if}
      {:else if scene?.kind === 'nextRace'}
        {@const [a, b] = words(scene.trackName)}
        <rect x="10" y="18" width="64" height="54" rx="4" fill="#2a7bff" stroke="#fff" stroke-width="1" />
        <text x="42" y={b ? 42 : 48} text-anchor="middle" class="s" font-size="8" fill="#fff" textLength={tl(a, 8, 56)} lengthAdjust="spacingAndGlyphs">{clip(a, 11)}</text>
        {#if b}<text x="42" y="53" text-anchor="middle" class="s" font-size="8" fill="#fff" textLength={tl(b, 8, 56)} lengthAdjust="spacingAndGlyphs">{clip(b, 11)}</text>{/if}
        <text x="84" y="40" class="s big" font-size="11" fill="#fff" textLength={tl(scene.raceLabel, 11, 70)} lengthAdjust="spacingAndGlyphs">{scene.raceLabel}</text>
        <text x="84" y="54" class="s" font-size="8" fill="#ffd21f" textLength={tl(scene.cupName.toUpperCase(), 8, 70)} lengthAdjust="spacingAndGlyphs">{clip(scene.cupName.toUpperCase(), 14)}</text>
      {:else if scene?.kind === 'standings'}
        {@const mx = Math.max(1, ...scene.rows.map((r) => r.total))}
        {#each scene.rows.slice(0, 4) as r, i (i)}
          {@const w = barW(r.total, mx, 70, 140)}
          <rect x="10" y={14 + i * 18} width={w} height="14" rx="3" fill={colour(r.player)} />
          <text x="14" y={24 + i * 18} class="s" font-size="8" fill={r.player.textColour} textLength={tl(r.player.name || '—', 8, 50)} lengthAdjust="spacingAndGlyphs">{clip(r.player.name || '—', 8)}</text>
          <text x={10 + w - 4} y={24 + i * 18} text-anchor="end" class="s" font-size="8" fill={r.player.textColour}>{r.total}</text>
        {/each}
      {:else if scene?.kind === 'winner'}
        <circle cx="46" cy="45" r="25" fill="#ffd21f" stroke="#4a3300" stroke-width="2" />
        <text x="46" y="55" text-anchor="middle" class="s big" font-size="28" fill="#0d2147">1</text>
        <text x="80" y="49" class="s big" font-size="14" fill="#fff" textLength={tl(scene.player.name || '—', 14, 70)} lengthAdjust="spacingAndGlyphs">{clip(scene.player.name || '—', 9)}</text>
      {:else if scene?.kind === 'raceWin' || scene?.kind === 'cupWin'}
        {@const full = scene.part === 'full'}
        {@const hx = full ? 38 : 80}
        {@const mx = Math.max(1, ...scene.rows.map((r) => r.total))}
        {#if scene.part !== 'board'}
          <circle cx={hx} cy="38" r="20" fill="#ffd21f" stroke="#4a3300" stroke-width="2" />
          <text x={hx} y="47" text-anchor="middle" class="s big" font-size="24" fill="#0d2147">{scene.kind === 'cupWin' ? '★' : '1'}</text>
          <text x={hx} y="72" text-anchor="middle" class="s big" font-size="10" fill="#fff" textLength={tl(scene.winner.name || '—', 10, full ? 64 : 100)} lengthAdjust="spacingAndGlyphs">{clip(scene.winner.name || '—', 10)}</text>
        {/if}
        {#if scene.part !== 'hero'}
          {#each scene.rows.slice(0, 4) as r, i (i)}
            {@const x0 = full ? 76 : 24}
            {@const w = barW(r.total, mx, full ? 40 : 60, full ? 76 : 112)}
            <rect x={x0} y={14 + i * 18} width={w} height="14" rx="3" fill={colour(r.player)} />
            <text x={x0 + 4} y={24 + i * 18} class="s" font-size="7" fill={r.player.textColour} textLength={tl(r.player.name || '—', 7, 36)} lengthAdjust="spacingAndGlyphs">{clip(r.player.name || '—', 7)}</text>
            <text x={x0 + w - 3} y={24 + i * 18} text-anchor="end" class="s" font-size="7" fill={r.player.textColour}>{r.total}</text>
          {/each}
        {/if}
      {:else if scene?.kind === 'bracket'}
        {@const nr = Math.max(1, bracketCols.length)}
        {@const colW = nr > 1 ? (160 - 20 - 42) / (nr - 1) : 0}
        {#each bracketCols as round, ri (ri)}
          {#each round.nodes.slice(0, 6) as node, ni (ni)}
            {@const n = Math.min(6, round.nodes.length)}
            {@const y = (90 / (n + 1)) * (ni + 1) - 6}
            <rect x={10 + ri * colW} y={y} width="42" height="12" rx="2.5" fill="#fff" opacity=".93" stroke={node.live ? '#2f6fdb' : 'none'} stroke-width="1.4" />
            <text x={13 + ri * colW} y={y + 8.2} class="s" font-size="5.5" fill="#14213d" textLength={tl(node.label, 5.5, 36)} lengthAdjust="spacingAndGlyphs">{clip(node.label, 10)}</text>
          {/each}
        {/each}
      {:else if scene?.kind === 'matches' && matchGrid}
        {#each matchGrid.cards as card, i (i)}
          {@const cx = 8 + (i % matchGrid.cols) * (matchGrid.w + 4)}
          {@const cy = 9 + Math.floor(i / matchGrid.cols) * (matchGrid.h + 4)}
          {@const mx = Math.max(1, ...card.rows.map((r) => r.total))}
          <rect x={cx} y={cy} width={matchGrid.w} height={matchGrid.h} rx="3" fill="#fff" opacity=".93" stroke={card.live ? '#2f6fdb' : 'none'} stroke-width="1.4" />
          <text x={cx + 3} y={cy + 8} class="s" font-size="5.5" fill="#14213d" textLength={tl(card.label, 5.5, matchGrid.w - 6)} lengthAdjust="spacingAndGlyphs">{clip(card.label, 12)}</text>
          {#each card.rows.slice(0, 4) as r, ri (ri)}
            <rect x={cx + 3} y={cy + 11 + ri * 4.6} width={barW(r.total, mx, 6, matchGrid.w - 8)} height="3.2" rx="1" fill={colour(r.player)} />
          {/each}
        {/each}
      {:else if scene?.kind === 'notice'}
        <rect x="16" y="12" width="128" height="66" rx="5" fill="#fff" opacity=".94" />
        {#each noticeLines as line, i (i)}
          <text x="24" y={27 + i * 12} class="s" font-size="7" fill="#14213d" textLength={tl(clip(line, 26), 7, 100)} lengthAdjust="spacingAndGlyphs">{clip(line, 26)}</text>
        {/each}
        {#if scene.qr}
          <rect x="116" y="50" width="22" height="22" rx="2" fill="#14213d" />
          <rect x="120" y="54" width="6" height="6" fill="#fff" /><rect x="128" y="54" width="6" height="6" fill="#fff" /><rect x="120" y="62" width="6" height="6" fill="#fff" />
        {/if}
      {:else if scene?.kind === 'qr'}
        {#each [34, 96] as x (x)}
          <rect {x} y="20" width="32" height="32" rx="3" fill="#fff" />
          <rect x={x + 3} y="23" width="9" height="9" fill="#14213d" /><rect x={x + 20} y="23" width="9" height="9" fill="#14213d" /><rect x={x + 3} y="40" width="9" height="9" fill="#14213d" />
          <rect x={x + 16} y="36" width="5" height="5" fill="#14213d" /><rect x={x + 24} y="42" width="5" height="5" fill="#14213d" />
        {/each}
        <text x="80" y="66" text-anchor="middle" class="s" font-size="6" fill="#fff" textLength={tl(clip(scene.text.split('\n')[0] ?? '', 26), 6, 110)} lengthAdjust="spacingAndGlyphs">{clip(scene.text.split('\n')[0] ?? '', 26)}</text>
      {/if}
      {#if view.trackCard}
        <rect x="6" y="62" width="66" height="11" rx="2" fill="#ffd21f" />
        <text x="10" y="70" class="s" font-size="6" fill="#0b2a6f" textLength={tl(clip(view.trackCard.trackName, 18), 6, 58)} lengthAdjust="spacingAndGlyphs">{clip(view.trackCard.trackName, 18)}</text>
      {/if}
      {#if view.lowerThirds.length}
        {@const n = view.lowerThirds.length}
        {@const w = (148 - (n - 1) * 3) / n}
        {#each view.lowerThirds as p, i (i)}
          <rect x={6 + i * (w + 3)} y="77" width={w} height="9" rx="2" fill={colour(p)} />
          <text x={9 + i * (w + 3)} y="83.5" class="s" font-size="5" fill={p.textColour} textLength={tl(clip(p.name || '—', 9), 5, Math.max(8, w - 6))} lengthAdjust="spacingAndGlyphs">{clip(p.name || '—', 9)}</text>
        {/each}
      {/if}
    </svg>
  {/if}
</div>

<style>
  .th { position: relative; aspect-ratio: 16 / 9; border-radius: 5px; overflow: hidden; background: #0b0d12; }
  .th[data-bg='none'] { background: repeating-conic-gradient(#181c26 0% 25%, #0f1218 0% 50%) 0 0 / 12px 12px; }
  .th[data-bg='A'] { background: linear-gradient(160deg, #25c8f6 0%, #0e9ce6 38%, #0b72d8 72%, #2b4ec6 100%); }
  .th[data-bg='B'] { background: radial-gradient(circle, #03458f 0 3px, transparent 3.5px) 0 0 / 11px 11px, #0553a6; }
  .th[data-bg='C'] { background: radial-gradient(circle, #dadada 0 2.5px, transparent 3px) 0 0 / 10px 10px, #f3f3f3; }
  svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
  text { font-family: var(--ui-font); font-weight: 800; }
  text.big { font-weight: 900; font-style: italic; paint-order: stroke; stroke: #0a0f1c; stroke-width: .6px; stroke-linejoin: round; }
</style>
