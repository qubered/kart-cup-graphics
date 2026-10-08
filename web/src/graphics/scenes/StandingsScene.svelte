<script lang="ts">
  import { flip } from 'svelte/animate'
  import type { SceneView, ViewModel } from '../../../../shared/types'
  import { fitText } from '../../lib/fit-text'
  import { STAGGER_MS, pop, overshoot } from '../motion'
  import Heading from '../Heading.svelte'
  import Medallion from '../Medallion.svelte'
  import Swap from '../Swap.svelte'

  type S = Extract<SceneView, { kind: 'standings' }>
  let { scene, view, enter = 0 }: { scene: S; view: ViewModel; enter?: number } = $props()

  /* Laid out in wide (3840×1152) pixels; HD scales the stage (rows fill the width) and keeps the proportions. */
  const wide = $derived(view.format === 'wide')
  const sc = $derived(wide ? 1 : 0.775)
  const tf = $derived(wide ? undefined : `translate(${960 - 1920 * sc}px, 0px) scale(${sc})`)
  const st = $derived(enter ? STAGGER_MS : 0)
  const SFX = ['th', 'st', 'nd', 'rd']
  const ord = (n: number) => (n >= 1 && n <= 3 ? SFX[n] : 'th')

  /* svelte's flip measures in screen pixels; the stage is scaled, so convert to stage pixels first. */
  type Rects = { from: DOMRect; to: DOMRect }
  const unscale = (r: DOMRect) => ({ left: r.left / sc, top: r.top / sc, width: r.width / sc, height: r.height / sc }) as DOMRect
  const sflip = (node: Element, r: Rects, p: { duration: number; easing: (t: number) => number }) =>
    flip(node, { from: unscale(r.from), to: unscale(r.to) }, p)
</script>

<div class="standings" class:wide class:hd={!wide}>
  <div class="stage" style:transform={tf}>
    <div class="hold" style="left:1920px;top:40px">
      <div in:pop|global={{ duration: enter }}>
        <Swap key="{view.headingLook}|{view.fonts.headings}|{view.headingUpright}" dur={enter}>
          <Heading text="STANDINGS" look={view.headingLook} font={view.fonts.headings} upright={view.headingUpright} size={110} />
        </Swap>
      </div>
    </div>
    {#each scene.rows as r, i (r.player.slot)}
      <div class="standing-row" class:first={r.position === 1} data-slot={r.player.slot}
        style:top="{250 + i * 214}px" style:--pc={r.player.colour} style:--pt={r.player.textColour} style:--d="{enter}ms"
        animate:sflip={{ duration: enter, easing: overshoot }}>
        <div class="inner" in:pop|global={{ duration: enter, delay: (i + 1) * st }}>
          <div class="bg"><div class="lead"></div></div>
          <Swap key={r.position} dur={enter}>
            <div class="pos" style:font-family={view.fonts.names}>{r.position}<sup>{ord(r.position)}</sup></div>
          </Swap>
          <div class="medal"><Medallion image={r.player.icon} size={180} stars dur={enter} /></div>
          <Swap key={r.player.name} dur={enter}>
            <div class="name" style:display="block" style:font-family={view.fonts.names} use:fitText={{ max: 1100, text: r.player.name }}><span>{r.player.name}</span></div>
          </Swap>
          <Swap key={r.player.character} dur={enter}>
            <div class="char" style:font-family={view.fonts.labels}>{r.player.character}</div>
          </Swap>
          <Swap key={r.lastRacePoints ?? 'none'} dur={enter}>
            {#if r.lastRacePoints !== null}<div class="delta" style:font-family={view.fonts.names}>+{r.lastRacePoints}</div>{/if}
          </Swap>
          <Swap key={r.total} dur={enter}>
            <div class="pts" style:font-family={view.fonts.names}>{r.total}<small>PTS</small></div>
          </Swap>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .standings { position: absolute; inset: 0; overflow: hidden; }
  .stage { position: absolute; left: 0; top: 0; width: 0; height: 0; transform-origin: 0 0; }
  .hold { position: absolute; width: max-content; translate: -50% 0; }
  .standing-row { position: absolute; left: 760px; width: 2320px; height: 172px; }
  .inner { position: absolute; inset: 0; }
  .bg { position: absolute; inset: 0; clip-path: polygon(40px 0, 100% 0, calc(100% - 40px) 100%, 0 100%); background: var(--row-dark); }
  .bg::before { content: ''; position: absolute; z-index: 1; left: 20px; top: 0; bottom: 0; width: 24px; background-color: var(--pc); transform: skewX(-13deg); transition: background-color var(--d); }
  .lead { position: absolute; inset: 0; background: var(--row-leader); opacity: 0; transition: opacity var(--d); }
  .first .lead { opacity: 1; }
  .pos { position: absolute; left: 80px; top: 0; height: 172px; width: 220px; display: flex; align-items: center; font: italic 900 110px/1 var(--font-name); color: #fff; transition: color var(--d); }
  .pos sup { font-size: 48px; margin-left: 4px; align-self: flex-start; margin-top: 36px; }
  .medal { position: absolute; left: 300px; top: -4px; width: 180px; height: 180px; }
  .name { position: absolute; left: 520px; top: 28px; width: 1100px; font-size: 84px; font-weight: 900; font-style: italic; line-height: 1; color: #fff; white-space: nowrap; overflow: hidden; transition: color var(--d); }
  .name > span { display: inline-block; white-space: nowrap; }
  .char { position: absolute; left: 524px; top: 122px; font-size: 30px; font-weight: 800; line-height: 1; letter-spacing: 8px; text-transform: uppercase; color: var(--mk-label-cyan); transition: color var(--d); }
  .delta {
    position: absolute; right: 420px; top: 50%; transform: translateY(-50%) skewX(-12deg); background: var(--pc); color: var(--pt);
    font: italic 900 52px/1 var(--font-name); padding: 12px 26px; border-radius: 10px; transition: background-color var(--d), color var(--d);
  }
  .pts { position: absolute; right: 90px; top: 0; height: 172px; display: flex; align-items: center; font: italic 900 120px/1 var(--font-name); color: #fff; transition: color var(--d); }
  .pts small { font-size: 40px; margin-left: 16px; letter-spacing: 4px; }
  .first .pos, .first .name, .first .pts { color: var(--row-leader-ink); }
  .first .char { color: var(--row-leader-sub); }
</style>
