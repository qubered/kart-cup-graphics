import { get } from 'svelte/store'
import { beforeEach, describe, expect, it } from 'vitest'
import { closeNewForm, openGraphics, openLibrary, openOverview, openRound, pickMatch, roundOfPage, setNewTemplate, tourNav } from '../../web/src/control/tournament/nav'

beforeEach(() => tourNav.set({ page: 'overview', matchId: null, newTemplate: null }))

describe('tournament workspace navigation', () => {
  it('opens the pages of the outline', () => {
    openGraphics()
    expect(get(tourNav).page).toBe('graphics')
    openRound(2)
    expect(get(tourNav).page).toBe('round:2')
    openOverview()
    expect(get(tourNav).page).toBe('overview')
  })
  it('a round page keeps the match tab unless one is given; null starts over from the live match', () => {
    pickMatch('match-3')
    openRound(0)
    expect(get(tourNav).matchId).toBe('match-3')
    openRound(1, 'match-5')
    expect(get(tourNav).matchId).toBe('match-5')
    openRound(1, null)
    expect(get(tourNav).matchId).toBeNull()
  })
  it('the library can open with the New tournament form and close it again', () => {
    openLibrary('empty')
    expect(get(tourNav)).toMatchObject({ page: 'lib', newTemplate: 'empty' })
    setNewTemplate('bracket')
    expect(get(tourNav).newTemplate).toBe('bracket')
    closeNewForm()
    expect(get(tourNav)).toMatchObject({ page: 'lib', newTemplate: null })
    openLibrary()
    expect(get(tourNav).newTemplate).toBeNull()
  })
  it('reads the round of a round page', () => {
    expect(roundOfPage('round:3')).toBe(3)
    expect(roundOfPage('round:0')).toBe(0)
    expect(roundOfPage('overview')).toBeNull()
    expect(roundOfPage('lib')).toBeNull()
  })
})
