<script lang="ts">
  // Tournament workspace: an outline on the left (switcher, Overview, one entry per round, Graphics) and one focused page on the right.
  // It owns setup (matches, rounds, players, maps, graphics config) and switching the live match. Live race and result entry is the Race page.
  import { control } from '../store'
  import { activeTournament, liveMatches } from '../../../../shared/tournament'
  import { roundNumbers, validateTournament } from '../tournament'
  import { pickMatch, roundOfPage, tourNav, type TourPage } from './nav'
  import Graphics from './Graphics.svelte'
  import Library from './Library.svelte'
  import Outline from './Outline.svelte'
  import Overview from './Overview.svelte'
  import RoundPage from './RoundPage.svelte'

  const show = $derived($control.payload?.state)
  const catalog = $derived($control.catalog)
  const t = $derived(show ? activeTournament(show) : null)
  /** Every match, with the live one read from the draft. */
  const matches = $derived(t && show ? liveMatches(t, show.draft) : [])
  const rounds = $derived(roundNumbers(matches))
  const ready = $derived(validateTournament(matches, catalog ?? undefined))
  /** The page to show: the stored one, unless it no longer exists (no tournament, a removed round). */
  const page = $derived.by<TourPage>(() => {
    if (!t) return 'lib'
    const p = $tourNav.page
    const r = roundOfPage(p)
    return r !== null && !rounds.includes(r) ? 'overview' : p
  })
  const round = $derived(roundOfPage(page))

  // Match ids repeat across tournaments (match-1 ...), so a tab picked in one must not carry over to another.
  let lastId: string | null = null
  $effect(() => {
    const id = t?.id ?? null
    if (id !== lastId) {
      lastId = id
      pickMatch(null)
    }
  })
</script>

{#if show && catalog}
  <div class="tour">
    <Outline {show} {t} {matches} {ready} {page} />
    <section class="u-panel body" aria-label="Tournament page" data-tour-page={page}>
      {#if page === 'lib'}
        <Library {show} />
      {:else if t && page === 'graphics'}
        <Graphics {show} {t} {catalog} />
      {:else if t && round !== null}
        {#key `${t.id}:${round}`}
          <RoundPage {t} {matches} {catalog} {round} {ready} />
        {/key}
      {:else if t}
        <Overview {show} {t} {matches} {ready} />
      {/if}
    </section>
  </div>
{:else}
  <div class="loading">Loading…</div>
{/if}

<style>
  .tour { display: grid; grid-template-columns: 270px minmax(0, 1fr); gap: 14px; padding: 12px 14px; height: 100%; min-height: 0; }
  .body { min-width: 0; }
  .loading { color: var(--ui-muted); padding: 16px; }
</style>
