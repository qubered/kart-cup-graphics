<script lang="ts">
  // "What comes back when this look is recalled": 4 group switches, and "Advanced" to pick from all 8 parts.
  // Used by the Save form (stacked) and by the library's Recalls editor (a row of four). It only reports the new scope.
  import type { PresetScope } from '../../../../../shared/types'
  import { GROUPS, groupsFromScope, SCOPE_PARTS, toggleGroup, type GroupKey } from './looks'

  interface Props {
    scope: PresetScope
    onchange: (scope: PresetScope) => void
    /** `row`: four switches side by side (Recalls editor). `stack`: one per line (Save form). */
    layout?: 'row' | 'stack'
    /** A tournament is active: race, players and scores come from the active match and are never recalled. */
    tournament?: boolean
  }
  let { scope, onchange, layout = 'stack', tournament = false }: Props = $props()

  let advanced = $state(false)
  const groups = $derived(groupsFromScope(scope))
  const flipPart = (key: keyof PresetScope) => onchange({ ...scope, [key]: !scope[key] })
  const hint = (g: { key: GroupKey; hint: string }) => (tournament && (g.key === 'race' || g.key === 'scores') ? 'Not recalled while a tournament is active' : g.hint)
</script>

<div class="ro" class:row={layout === 'row'}>
  <div class="groups">
    {#each GROUPS as g (g.key)}
      <button type="button" class="u-tgl" class:on={groups[g.key]} data-group={g.key} aria-pressed={groups[g.key]} onclick={() => onchange(toggleGroup(scope, g.key))}>
        <span class="u-tt"><b>{g.label}</b><small>{hint(g)}</small></span><span class="u-sw"></span>
      </button>
    {/each}
  </div>
  <button type="button" class="u-link adv" data-advanced aria-expanded={advanced} onclick={() => (advanced = !advanced)}>
    {advanced ? 'Hide advanced ▴' : 'Advanced: choose from all 8 parts ›'}
  </button>
  {#if advanced}
    <div class="chips">
      {#each SCOPE_PARTS as p (p.key)}
        <button type="button" class="u-chip" class:on={scope[p.key]} data-scope={p.key} aria-pressed={scope[p.key]} title={p.hint} onclick={() => flipPart(p.key)}>{p.label}</button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .ro { display: grid; gap: 8px; }
  .groups { display: grid; gap: 8px; }
  .row .groups { grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); }
  .row .u-tgl { min-height: 56px; padding: 0 10px; }
  .adv { min-height: 44px; display: inline-flex; align-items: center; width: max-content; }
  .chips { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
  .chips .u-chip { height: 44px; padding: 0 6px; }
</style>
