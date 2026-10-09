<script lang="ts">
  // A schematic preview of a tournament scene, drawn from the real scene data (live names, colours and totals) with plain HTML.
  // It shows what the config changes (layout, blocks, detail, scores, status), not the real renderer.
  import type { SceneView } from '../../../../shared/types'

  let { scene }: { scene: SceneView | null } = $props()

  const MAX_CARDS = 4
  const dash = (n: number | null | undefined) => (n === null || n === undefined ? '' : `+${n}`)
</script>

<div class="pv" aria-hidden="true" data-preview={scene?.kind ?? 'none'}>
  {#if scene && (scene.kind === 'raceWin' || scene.kind === 'cupWin')}
    {@const b = scene.config.blocks}
    <div class="win" class:centre={scene.config.layout === 'heroCentre'}>
      {#if b.hero}
        <div class="hero">
          <span class="disc" style="border-color:{scene.winner.colour}">{#if scene.winner.icon}<img src={scene.winner.icon} alt="" />{/if}</span>
          <b class="wn">{scene.winner.name || 'Winner'}</b>
          {#if b.cupEmblem && scene.cupEmblem}<img class="emb" src={scene.cupEmblem} alt="" />{/if}
          {#if b.trackName}<small>{scene.kind === 'raceWin' ? (scene.trackName || 'Race') : scene.cupName}</small>{/if}
        </div>
      {/if}
      {#if b.board}
        <div class="board">
          {#each scene.rows as r (r.player.slot)}
            <span class="brow" style="--c:{r.player.colour}"><i class="pos">{r.position}</i><b>{r.player.name || `P${r.player.slot + 1}`}</b>{#if b.racePoints && scene.kind === 'raceWin'}<em>{dash(r.lastRacePoints)}</em>{/if}<span class="tot">{r.total}</span></span>
          {/each}
        </div>
      {/if}
      {#if !b.hero && !b.board}<span class="none">Nothing selected</span>{/if}
    </div>
  {:else if scene && scene.kind === 'matches'}
    {@const shown = scene.cards.slice(0, MAX_CARDS)}
    {@const hide = scene.config.pendingScores === 'hide'}
    <div class="mt {scene.layout}" data-layout={scene.layout}>
      {#each shown as c (c.id)}
        {@const focus = scene.layout === 'focus' && c.id === scene.focusId}
        <div class="mc" class:live={c.live && scene.config.liveMarker} class:focus>
          <b>{c.label}{#if c.live && scene.config.liveMarker} <i class="dot"></i>{/if}</b>
          {#if scene.detail === 'winner'}
            <span class="wl">{c.winner ? c.winner.name : '—'}</span>
          {:else}
            {#each (scene.detail === 'compact' && !focus ? c.rows.slice(0, 2) : c.rows) as r (r.player.slot)}
              <span class="mr" style="--c:{r.player.colour}"><i></i><span class="nm">{r.player.name || `P${r.player.slot + 1}`}</span>{#if c.hasResults || !hide}<em>{r.total}</em>{/if}</span>
            {/each}
          {/if}
        </div>
      {/each}
      {#if scene.cards.length > MAX_CARDS}<span class="more">+{scene.cards.length - MAX_CARDS} more</span>{/if}
    </div>
  {:else if scene && scene.kind === 'bracket'}
    <div class="br">
      {#each scene.rounds as rd (rd.round)}
        <div class="col">
          {#each rd.nodes as n (n.matchId)}
            <div class="node" class:live={n.live && scene.config.showStatus}>
              <b>{n.label}{#if scene.config.showStatus && n.live} <i class="dot"></i>{/if}{#if scene.config.showStatus && n.status === 'done'} <small>done</small>{/if}</b>
              <span>{#if n.winner}{n.winner.name}{#if scene.config.showScores}{` · ${n.slots.find((s) => s.winner)?.total ?? 0}`}{/if}{:else}TBD{/if}</span>
            </div>
          {/each}
        </div>
      {/each}
    </div>
  {:else}
    <span class="none">Not available on this output</span>
  {/if}
</div>

<style>
  .pv { position: relative; aspect-ratio: 16 / 9; width: 100%; overflow: hidden; border: 1px solid var(--ui-field); border-radius: 8px; background: linear-gradient(135deg, #1b1747, #0d0b24); padding: 8px; display: grid; align-items: stretch; color: #fff; font-size: 11px; }
  .none { place-self: center; color: var(--ui-muted); font-size: 12px; }
  .dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #22c55e; vertical-align: middle; }
  b { font-weight: 700; }

  .win { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr); gap: 10px; align-items: center; }
  .win.centre { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1.4fr) minmax(0, 1fr); }
  .hero { display: grid; justify-items: center; gap: 3px; min-width: 0; }
  .disc { width: 54px; height: 54px; border-radius: 50%; border: 3px solid #fff; background: #2a2570; display: grid; place-items: center; overflow: hidden; }
  .disc img { width: 40px; height: 40px; object-fit: contain; }
  .wn { font-size: 14px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .emb { width: 22px; height: 22px; object-fit: contain; }
  .hero small { color: #cbd5e1; font-size: 10.5px; }
  .board { display: grid; gap: 3px; min-width: 0; }
  .win.centre .board { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .brow { display: flex; align-items: center; gap: 5px; padding: 2px 6px; border-left: 4px solid var(--c); background: rgba(255,255,255,.1); border-radius: 3px; min-width: 0; }
  .brow .pos { font-style: normal; color: #cbd5e1; width: 10px; }
  .brow b { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .brow em { font-style: normal; color: #86efac; }
  .brow .tot { font-family: var(--ui-mono); }

  .mt { display: grid; gap: 5px; align-content: start; }
  .mt.grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .mt.row { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .mt.stack { grid-template-columns: minmax(0, 1fr); }
  .mt.focus { grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); }
  .mt.focus .mc.focus { grid-row: 1 / span 4; }
  .mc { display: grid; gap: 1px; padding: 4px 6px; border-radius: 5px; background: rgba(255,255,255,.12); min-width: 0; align-content: start; }
  .mc.live { box-shadow: inset 0 0 0 1px #22c55e; }
  .mc > b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .mr { display: flex; align-items: center; gap: 4px; min-width: 0; }
  .mr i { width: 3px; height: 9px; background: var(--c); border-radius: 1px; flex: none; }
  .mr .nm { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .mr em { font-style: normal; font-family: var(--ui-mono); }
  .wl { color: #86efac; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .more { position: absolute; right: 8px; bottom: 5px; color: #cbd5e1; font-size: 10.5px; }

  .br { display: flex; gap: 14px; align-items: center; justify-content: center; }
  .br .col { display: grid; gap: 5px; min-width: 0; }
  .node { display: grid; gap: 1px; padding: 4px 8px; border-radius: 5px; background: rgba(255,255,255,.92); color: #14213d; min-width: 74px; }
  .node.live { box-shadow: 0 0 0 2px #22c55e; }
  .node small { font-weight: 500; color: #475569; }
  .node span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 110px; }
</style>
