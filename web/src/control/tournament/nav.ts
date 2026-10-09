// Where the Tournament workspace is: which page of the outline is open and which match tab. Client-only, kept at module level so
// it survives switching to another top-level page and back. Nothing here is show state.
import { writable } from 'svelte/store'

export type TourPage = 'overview' | 'lib' | 'graphics' | `round:${number}`
export type Template = 'bracket' | 'empty'
export interface TourNav {
  page: TourPage
  /** The match tab selected on a round page. Falls back to the live match, then the first match, when it is not in the round. */
  matchId: string | null
  /** Library: the "New tournament" form is open with this template (null = closed). */
  newTemplate: Template | null
}

export const tourNav = writable<TourNav>({ page: 'overview', matchId: null, newTemplate: null })

export const openOverview = () => tourNav.update((n) => ({ ...n, page: 'overview' }))
export const openGraphics = () => tourNav.update((n) => ({ ...n, page: 'graphics' }))
/** Open the tournament library, optionally with the New tournament form open. */
export const openLibrary = (newTemplate: Template | null = null) => tourNav.update((n) => ({ ...n, page: 'lib', newTemplate }))
export const closeNewForm = () => tourNav.update((n) => ({ ...n, newTemplate: null }))
export const setNewTemplate = (newTemplate: Template) => tourNav.update((n) => ({ ...n, newTemplate }))
/** Open a round page. `matchId` selects a match tab; leave it out to keep the current pick, or pass null to start from the live match. */
export const openRound = (round: number, matchId?: string | null) =>
  tourNav.update((n) => ({ ...n, page: `round:${round}`, matchId: matchId === undefined ? n.matchId : matchId }))
export const pickMatch = (matchId: string | null) => tourNav.update((n) => ({ ...n, matchId }))

/** The round of a `round:n` page, else null. */
export function roundOfPage(page: TourPage): number | null {
  return page.startsWith('round:') ? Number(page.slice(6)) : null
}
