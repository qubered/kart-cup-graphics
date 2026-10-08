<script lang="ts">
  import type { MatchesView, ViewModel } from '../../../../shared/types'
  import { STAGGER_MS, pop } from '../motion'
  import Heading from '../Heading.svelte'
  import Swap from '../Swap.svelte'
  import MatchCard from './matches/MatchCard.svelte'
  import MatchStrip from './matches/MatchStrip.svelte'
  import { headingSpec, layoutMatches } from './matches/layout'

  let { scene, view, enter = 0 }: { scene: MatchesView; view: ViewModel; enter?: number } = $props()

  const st = $derived(enter ? STAGGER_MS : 0)
  const head = $derived(headingSpec(view.canvas))
  const slots = $derived(layoutMatches(scene.layout, scene.cards.length, view.canvas, Math.max(0, scene.cards.findIndex((c) => c.id === scene.focusId))))
  const showPending = $derived(scene.config.pendingScores === 'zeros')
</script>

<div class="matches" data-layout={scene.layout} data-detail={scene.detail} data-format={view.format}>
  {#each head.xs as hx (hx)}
    <div class="hold" style:left="{hx}px" style:top="{head.top}px">
      <div in:pop|global={{ duration: enter }}>
        <Swap key="{view.headingLook}|{view.fonts.headings}|{view.headingUpright}" dur={enter}>
          <Heading text="MATCHES" look={view.headingLook} font={view.fonts.headings} upright={view.headingUpright} size={head.size} />
        </Swap>
      </div>
    </div>
  {/each}
  {#each slots as s, i (`${scene.cards[s.index]?.id}:${s.mirror ? 1 : 0}`)}
    {@const card = scene.cards[s.index]}
    {#if card}
      <div class="slot" style:left="{s.x}px" style:top="{s.y}px" style:width="{s.w}px" style:height="{s.h}px">
        <div class="pop" in:pop|global={{ duration: enter, delay: (i + 1) * st }}>
          {#if s.orient === 'strip'}
            <MatchStrip {card} {view} detail={scene.detail} w={s.w} h={s.h} {showPending} liveMarker={scene.config.liveMarker} {enter} />
          {:else}
            <MatchCard {card} {view} detail={scene.detail} orient={s.orient} w={s.w} h={s.h} {showPending} liveMarker={scene.config.liveMarker} focus={s.focus} {enter} />
          {/if}
        </div>
      </div>
    {/if}
  {/each}
</div>

<style>
  .matches { position: absolute; inset: 0; overflow: hidden; }
  .hold { position: absolute; width: max-content; transform: translateX(-50%); }
  .slot { position: absolute; }
  .pop { position: absolute; inset: 0; }
</style>
