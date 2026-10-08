<script lang="ts">
  import { flip } from 'svelte/animate'
  import type { SceneView, ViewModel } from '../../../../shared/types'
  import { fitText } from '../../lib/fit-text'
  import { STAGGER_MS, pop, overshoot } from '../motion'
  import Heading from '../Heading.svelte'
  import Medallion from '../Medallion.svelte'

  type S = Extract<SceneView, { kind: 'standings' }>
  let { scene, view, enter = 0 }: { scene: S; view: ViewModel; enter?: number } = $props()

  const wide = $derived(view.format === 'wide')
  const K = $derived(wide
    ? { rw: 2100, rh: 150, gap: 22, head: 150, hy: 50, ry: 280, med: 124, nm: 74, nmw: 760, pos: 96, pts: 50, tot: 92, ch: 28, foot: 40 }
    : { rw: 1500, rh: 128, gap: 16, head: 100, hy: 44, ry: 200, med: 106, nm: 56, nmw: 500, pos: 76, pts: 40, tot: 72, ch: 22, foot: 30 })
  const st = $derived(enter ? STAGGER_MS : 0)
</script>

<div class="standings" class:wide class:hd={!wide}>
  <div class="head" style:top="{K.hy}px" in:pop|global={{ duration: enter }}>
    <Heading text="STANDINGS" look={view.headingLook} font={view.fonts.headings} upright={view.headingUpright} size={K.head} />
  </div>
  <div class="rows" style:top="{K.ry}px" style:width="{K.rw}px" style:gap="{K.gap}px">
    {#each scene.rows as r, i (r.player.slot)}
      <div class="standing-row" class:first={r.position === 1} data-slot={r.player.slot}
        style:height="{K.rh}px" style:--c={r.player.colour}
        animate:flip={{ duration: enter, easing: overshoot }}>
        <div class="inner" in:pop|global={{ duration: enter, delay: (i + 1) * st }}>
          <div class="edge"></div>
          <span class="pos" style:font-family={view.fonts.names} style:font-size="{K.pos}px">{r.position}</span>
          <Medallion image={r.player.art || r.player.icon} size={K.med} dur={enter} />
          <div class="who">
            <span class="name" style:font-family={view.fonts.names} style:font-size="{K.nm}px" style:max-width="{K.nmw}px"
              use:fitText={{ max: K.nmw, text: r.player.name + K.nm }}>{r.player.name}</span>
            <span class="char" style:font-family={view.fonts.labels} style:font-size="{K.ch}px">{r.player.character}</span>
          </div>
          <div class="pts-slot">
            {#if r.lastRacePoints !== null}
              <span class="gain" style:font-family={view.fonts.labels} style:font-size="{K.pts}px"><span>+{r.lastRacePoints}</span></span>
            {/if}
          </div>
          <div class="total">
            <span class="num" style:font-family={view.fonts.names} style:font-size="{K.tot}px">{r.total}</span>
            <span class="unit" style:font-family={view.fonts.labels} style:font-size="{K.ch}px">PTS</span>
          </div>
        </div>
      </div>
    {/each}
  </div>
  <div class="footer" style:bottom="{wide ? 70 : 60}px" style:font-family={view.fonts.labels} style:font-size="{K.foot}px">{scene.footer}</div>
</div>

<style>
  .standings { position: absolute; inset: 0; }
  .head { position: absolute; left: 0; right: 0; text-align: center; }
  .rows { position: absolute; left: 50%; margin-left: calc(var(--w, 0px)); transform: translateX(-50%); display: flex; flex-direction: column; }
  .standing-row { position: relative; }
  .inner {
    position: absolute; inset: 0; display: flex; align-items: center; gap: 22px; padding: 0 40px 0 36px;
    background: linear-gradient(180deg, rgba(20, 62, 108, 0.86), rgba(9, 28, 52, 0.9));
    clip-path: polygon(0 0, 100% 0, calc(100% - 44px) 100%, 0 100%);
    color: #fff;
  }
  .edge { position: absolute; left: 0; top: 0; bottom: 0; width: 20px; background: var(--c); }
  .pos { width: 1.1em; text-align: center; font-weight: 900; font-style: italic; flex: none; margin-left: 14px; text-shadow: 0 4px 0 rgba(0, 0, 0, 0.3); }
  .who { display: flex; flex-direction: column; align-items: flex-start; flex: 1; min-width: 0; }
  .name { white-space: nowrap; overflow: hidden; padding-right: 0.1em; line-height: 1.12; font-weight: 900; font-style: italic; text-shadow: 0 4px 0 rgba(0, 0, 0, 0.3); }
  .char { font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #aee9ff; white-space: nowrap; }
  .pts-slot { width: 3.6em; flex: none; display: flex; justify-content: flex-end; font-size: 40px; }
  .gain {
    display: inline-block; padding: 0.06em 0.45em; background: #22b14c; color: #fff; font-weight: 800; transform: skewX(-12deg);
    box-shadow: 0 4px 0 rgba(0, 0, 0, 0.3);
  }
  .gain span { display: block; transform: skewX(12deg); }
  .total { display: flex; align-items: baseline; gap: 12px; min-width: 3.2em; justify-content: flex-end; flex: none; }
  .num { font-weight: 900; font-style: italic; line-height: 1; text-shadow: 0 4px 0 rgba(0, 0, 0, 0.3); }
  .unit { font-weight: 800; letter-spacing: 0.1em; color: #aee9ff; }

  .first .inner { background: linear-gradient(180deg, #fff27a, #ffeb02 55%, #fede01); color: #281c03; }
  .first .name, .first .num, .first .pos { text-shadow: none; }
  .first .char, .first .unit { color: #5a4300; }
  .first .gain { background: #281c03; color: #fff27a; }

  .footer {
    position: absolute; left: 0; right: 0; text-align: center; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase;
    color: #fff; text-shadow: 0 3px 0 rgba(0, 0, 0, 0.35);
  }
</style>
