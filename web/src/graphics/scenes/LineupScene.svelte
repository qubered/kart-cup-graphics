<script lang="ts">
  import type { SceneView, ViewModel } from '../../../../shared/types'
  import { fitText } from '../../lib/fit-text'
  import { STAGGER_MS, pop } from '../motion'
  import Heading from '../Heading.svelte'
  import Medallion from '../Medallion.svelte'
  import Swap from '../Swap.svelte'

  type S = Extract<SceneView, { kind: 'lineup' }>
  let { scene, view, enter = 0 }: { scene: S; view: ViewModel; enter?: number } = $props()

  /* Laid out in wide (3840×1152) pixels; HD scales the whole stage with the same parts and proportions. */
  const wide = $derived(view.format === 'wide')
  const sc = $derived(wide ? 1 : 0.54)
  const tf = $derived(wide ? undefined : `translate(${960 - 1920 * sc}px, 150px) scale(${sc})`)
  const st = $derived(enter ? STAGGER_MS : 0)
</script>

<div class="lineup" class:wide class:hd={!wide}>
  <div class="stage" style:transform={tf}>
    <div class="hold" style="left:1920px;top:{scene.players.length ? 50 : 480}px" data-testid="lineup-hold">
      <div in:pop|global={{ duration: enter }}>
        <Swap key="{view.headingLook}|{view.fonts.headings}|{view.headingUpright}" dur={enter}>
          <Heading text="THE RACERS" look={view.headingLook} font={view.fonts.headings} upright={view.headingUpright} size={120} />
        </Swap>
      </div>
    </div>
    {#each scene.players as p, i (p.slot)}
      <div class="lineup-card" style:left="{240 + i * 860}px" style:--pc={p.colour} style:--pt={p.textColour} style:--d="{enter}ms"
        in:pop|global={{ duration: enter, delay: (i + 1) * st }}>
        <div class="panel"><div class="chk"></div></div>
        <div class="medal"><Medallion image={p.icon} size={420} stars dur={enter} /></div>
        <div class="info">
          <span class="pchip" style:font-family={view.fonts.names}>P{p.slot + 1}</span>
          <Swap key={p.name} dur={enter} block>
            <div class="name" style:display="block" style:font-family={view.fonts.names} use:fitText={{ max: 740, lines: 2, text: p.name }}><span>{p.name}</span></div>
          </Swap>
          <Swap key={p.character} dur={enter} block>
            <div class="char" style:font-family={view.fonts.labels}>{p.character}</div>
          </Swap>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .lineup { position: absolute; inset: 0; overflow: hidden; }
  .stage { position: absolute; left: 0; top: 0; width: 0; height: 0; transform-origin: 0 0; }
  .hold { position: absolute; width: max-content; translate: -50% 0; }
  .lineup-card { position: absolute; top: 250px; width: 780px; height: 860px; }
  .panel {
    position: absolute; left: 0; right: 0; top: 210px; bottom: 0; background: var(--mk-bar);
    clip-path: polygon(0 0, 100% 0, 100% calc(100% - 70px), calc(100% - 70px) 100%, 0 100%);
  }
  .panel::before { content: ''; position: absolute; left: 0; right: 0; top: 0; height: 16px; background-color: var(--pc); transition: background-color var(--d); }
  .chk {
    position: absolute; right: 0; bottom: 0; width: 300px; height: 200px; background-size: 36px 36px;
    background-image: conic-gradient(rgba(255, 255, 255, 0.16) 25%, transparent 0 50%, rgba(255, 255, 255, 0.16) 0 75%, transparent 0);
    -webkit-mask-image: linear-gradient(to right, transparent, #000 80%);
  }
  .medal { position: absolute; left: 180px; top: 0; width: 420px; height: 420px; z-index: 2; }
  .info { position: absolute; left: 0; right: 0; top: 450px; text-align: center; z-index: 2; }
  .pchip {
    display: inline-block; background-color: var(--pc); color: var(--pt); transition: background-color var(--d), color var(--d); font: italic 900 46px/1 var(--font-name); padding: 10px 30px 8px;
    border-radius: 10px; transform: skewX(-12deg); box-shadow: 0 5px 0 rgba(0, 0, 0, 0.35);
  }
  .name { width: 740px; margin: 26px auto 0; font-size: 112px; font-weight: 900; font-style: italic; line-height: 1.05; color: #fff; white-space: nowrap; overflow: hidden; }
  .name > span { display: inline-block; white-space: nowrap; }
  .char { font-size: 40px; font-weight: 800; line-height: 1; color: var(--mk-label-cyan); letter-spacing: 10px; text-transform: uppercase; margin-top: 14px; }
</style>
