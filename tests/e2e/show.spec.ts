import { test, expect, type Page } from '@playwright/test'
import { command, openPage, state } from './helpers'

test.beforeEach(async () => { await command({ type: 'resetShow' }) })

const place = (page: Page, slot: number, n: number) => page.locator(`[data-player="${slot}"] [data-place="${n}"]`)
/** Tap one finishing place per player: order[slot] = place. */
async function tapRace(page: Page, order: number[]) {
  for (const [slot, n] of order.entries()) await place(page, slot, n).click()
}
const races = async () => (await state()).draft.scores.races
const total = (page: Page, slot: number) => page.locator(`[data-sb-row="${slot}"] [data-total]`)
async function openRace(page: Page) {
  await page.goto('/control')
  await openPage(page, 'race')
  await expect(page.locator('[data-pad]')).toBeVisible()
}
/** A bracket tournament; the first match is live. Returns its id. */
async function newTournament(name: string): Promise<string> {
  await command({ type: 'createTournament', name, template: 'bracket' })
  const s = await state()
  return s.tournaments.find((t) => t.id === s.activeTournamentId)!.activeMatchId
}

test('edit a player without going on air', async ({ page }) => {
  await openRace(page)
  const name = page.locator('[data-player="0"] input[name=name]')
  await name.fill('SAM')
  await name.press('Enter')
  await page.locator('[data-player="0"] [data-character]').click()
  await page.keyboard.type('yosh')
  await page.keyboard.press('Enter')
  await page.locator('[data-player="1"] [data-colour-chip]').click()
  await page.locator('[data-colour="purple"]').click()
  await expect.poll(async () => (await state()).draft.players[0]).toMatchObject({ name: 'SAM', characterId: 'yoshi' })
  await expect.poll(async () => (await state()).draft.players[1].colour).toBe('purple')
  expect((await state()).program.twins.view.lowerThirds).toEqual([])
  // the pad shows the edit as waiting for a Take only when an output has something to compare with
  await expect(name).toHaveValue('SAM')
})

test('a name is saved shortly after typing stops, and typing never fires the show shortcuts', async ({ page }) => {
  await openRace(page)
  const before = await state()
  const name = page.locator('[data-player="2"] input[name=name]')
  await name.click()
  await name.fill('')
  // Space, H, G and the number keys are show shortcuts; Shift+B fades to black. None of them may fire from a name field.
  await page.keyboard.type('a g h 1 2 ')
  await page.keyboard.press('Shift+B')
  await page.keyboard.press('Enter')
  await expect.poll(async () => (await state()).draft.players[2].name).toBe('a g h 1 2 B')
  const s = await state()
  expect(s.program.wide.takenAt).toBe(before.program.wide.takenAt)
  expect(s.overlay).toEqual(before.overlay)
  expect(s.armed).toEqual(before.armed)
  // Escape puts the saved name back
  await name.click()
  await page.keyboard.type('zzz')
  await page.keyboard.press('Escape')
  await expect(name).toHaveValue('a g h 1 2 B')
  expect((await state()).draft.players[2].name).toBe('a g h 1 2 B')
})

test('tapping a taken place moves it, never duplicates', async ({ page }) => {
  await openRace(page)
  await place(page, 0, 1).click()
  await place(page, 1, 1).click()
  await expect(place(page, 1, 1)).toHaveAttribute('aria-pressed', 'true')
  await expect(place(page, 0, 1)).toHaveAttribute('aria-pressed', 'false')
  // the other player's button shows who holds it
  await expect(place(page, 0, 1)).toHaveClass(/taken/)
  // half a race is not saved: the scoreboard and any on-air standings never show it
  expect(await races()).toEqual([])
  await expect(page.locator('[data-status=partial]')).toContainText('1 of 4 placed')
  // re-tapping a player's own place clears it
  await place(page, 1, 1).click()
  await expect(place(page, 1, 1)).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('[data-status=empty]')).toBeVisible()
  // never more than one holder per place, whatever is tapped
  for (const [slot, n] of [[0, 2], [1, 2], [2, 2], [3, 3], [0, 3]] as const) await place(page, slot, n).click()
  for (const n of [1, 2, 3, 4]) {
    const holders = await page.locator(`[data-place="${n}"][aria-pressed="true"]`).count()
    expect(holders).toBeLessThanOrEqual(1)
  }
})

test('results save as you tap: the scoreboard updates and a correction moves places', async ({ page }) => {
  await openRace(page)
  await tapRace(page, [2, 1, 4, 3])
  await expect.poll(races).toEqual([{ raceNo: 1, trackId: 'mario-kart-stadium', positions: [2, 1, 4, 3] }])
  await expect(page.locator('[data-status=saved]')).toBeVisible()
  await expect(page.locator('[data-race-tile="0"]')).toHaveAttribute('data-state', 'done')
  // 1st P2 (15), 2nd P1 (12), 3rd P4 (10), 4th P3 (9)
  await expect(total(page, 0)).toHaveText('12')
  await expect(total(page, 1)).toHaveText('15')
  await expect(page.locator('[data-scoreboard] [data-sb-row]').first()).toHaveAttribute('data-sb-row', '1')
  await expect(page.locator('[data-scoreboard] [data-race-count]')).toHaveText('1 of 4 races')
  // swap 1st/2nd: moving P1 to 1st takes it from P2, the race is incomplete until P2 gets 2nd, and the saved result stays until then
  await place(page, 0, 1).click()
  await expect(page.locator('[data-status=partial]')).toContainText('not saved yet')
  await expect(place(page, 0, 1)).toHaveClass(/staged/)
  expect((await races())[0].positions).toEqual([2, 1, 4, 3])
  await expect(total(page, 1)).toHaveText('15')
  await place(page, 1, 2).click()
  await expect.poll(async () => (await races())[0].positions).toEqual([1, 2, 4, 3])
  await expect(total(page, 0)).toHaveText('15')
  await expect(place(page, 0, 1)).not.toHaveClass(/staged/)
  // an unsaved entry survives leaving the page
  await place(page, 3, 3).click()
  await openPage(page, 'live')
  await openPage(page, 'race')
  await expect(page.locator('[data-status=partial]')).toContainText('not saved yet')
  await page.locator('[data-revert]').click()
  await expect(place(page, 3, 3)).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('[data-status=saved]')).toBeVisible()
})

test('a result saved elsewhere with a duplicate shows the warning and can be repaired', async ({ page }) => {
  await command({ type: 'saveResults', raceNo: 1, trackId: 'mario-kart-stadium', positions: [1, 1, 3, 0] })
  await openRace(page)
  await expect(page.getByText('Duplicate position: 1')).toBeVisible()
  await expect(page.locator('[data-race-tile="0"]')).toHaveAttribute('data-state', 'partial')
  // P2 leaves 1st for 2nd (P1 keeps it), P4 takes 4th: now every place is held once and the race saves
  await place(page, 1, 2).click()
  await expect(page.getByText('Duplicate position: 1')).toHaveCount(0)
  await place(page, 3, 4).click()
  await expect.poll(async () => (await races())[0].positions).toEqual([1, 2, 3, 4])
  await expect(page.getByText('Duplicate position: 1')).toHaveCount(0)
})

test('adjustments: stepper and typed value', async ({ page }) => {
  await openRace(page)
  await page.locator('[data-player="0"] [data-adj="1"]').click()
  await expect.poll(async () => (await state()).draft.scores.adjustments[0]).toBe(1)
  await page.locator('[data-player="0"] [data-adj="-1"]').click()
  await page.locator('[data-player="0"] [data-adj="-1"]').click()
  await expect.poll(async () => (await state()).draft.scores.adjustments[0]).toBe(-1)
  const typed = page.locator('[data-player="1"] [data-adj-value]')
  await typed.fill('5')
  await typed.press('Tab')
  await expect.poll(async () => (await state()).draft.scores.adjustments[1]).toBe(5)
  await expect(total(page, 1)).toHaveText('5')
  await expect(page.locator('[data-sb-row="1"]')).toContainText('+5')
})

test('next race: disabled until the race is complete, then steps to the next map, with Undo', async ({ page }) => {
  await openRace(page)
  await expect(page.locator('[data-next-race]')).toBeDisabled()
  await tapRace(page, [1, 2, 3, 4])
  await expect(page.locator('[data-next-race]')).toBeEnabled()
  await expect(page.locator('[data-next-race]')).toContainText('Water Park')
  await page.locator('[data-next-race]').click()
  await expect.poll(async () => (await state()).draft.race).toMatchObject({ raceIndex: 1, trackId: 'water-park', raceNo: 2 })
  await expect(page.locator('[data-race-tile="1"]')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('[data-toast]')).toContainText('Race 2 of 4 · Water Park')
  await expect(page.locator('[data-next-race]')).toBeDisabled()
  await page.locator('[data-undo]').last().click()
  await expect.poll(async () => (await state()).draft.race.raceIndex).toBe(0)
  // the small steppers move without a result, and stop at the ends
  await expect(page.getByRole('button', { name: 'Race back' })).toBeDisabled()
  await page.getByRole('button', { name: 'Race forward' }).click()
  await expect.poll(async () => (await state()).draft.race.raceIndex).toBe(1)
  // a tile makes that race live
  await page.locator('[data-race-tile="3"]').click()
  await expect.poll(async () => (await state()).draft.race.raceIndex).toBe(3)
  await expect(page.getByRole('button', { name: 'Race forward' })).toBeDisabled()
  await expect(page.locator('[data-next-race]')).toContainText('Complete the race to finish the match')
})

test('change the map for the live race and go back to the cup order', async ({ page }) => {
  await openRace(page)
  await page.locator('[data-race-tile="2"]').click()
  await expect(page.locator('[data-map-reset]')).toHaveCount(0)
  await page.locator('[data-map-select]').selectOption('toad-harbor')
  await expect.poll(async () => (await state()).draft.race).toMatchObject({ raceIndex: 2, trackId: 'toad-harbor', trackOverrides: [null, null, 'toad-harbor', null] })
  await expect(page.locator('[data-race-tile="2"]')).toContainText('Toad Harbor')
  await expect(page.locator('[data-toast]')).toContainText('Race 3 is now on Toad Harbor')
  await page.locator('[data-map-reset]').click()
  await expect.poll(async () => (await state()).draft.race.trackId).toBe('sweet-sweet-canyon')
  expect((await state()).draft.race.trackOverrides).toBeUndefined()
  await expect(page.locator('[data-map-reset]')).toHaveCount(0)
  // Undo of the reset puts the hand-picked map back
  await page.locator('[data-undo]').last().click()
  await expect.poll(async () => (await state()).draft.race.trackOverrides).toEqual([null, null, 'toad-harbor', null])
})

test('a saved race follows its map', async ({ page }) => {
  await openRace(page)
  await tapRace(page, [1, 2, 3, 4])
  await expect.poll(races).toHaveLength(1)
  await page.locator('[data-map-select]').selectOption('shy-guy-falls')
  await expect.poll(async () => (await races())[0].trackId).toBe('shy-guy-falls')
  await page.locator('[data-undo]').last().click()
  await expect.poll(async () => (await races())[0].trackId).toBe('mario-kart-stadium')
  expect((await state()).draft.race.trackOverrides).toBeUndefined()
})

test('race settings: random race and cup change ask before they throw work away', async ({ page }) => {
  await openRace(page)
  await page.locator('[data-race-settings] summary').click()
  // no hand-picked maps yet: a new cup applies at once
  await page.locator('[data-cup-select]').selectOption('flower')
  await expect.poll(async () => (await state()).draft.race).toMatchObject({ cupId: 'flower', raceIndex: 0, trackId: 'mario-circuit' })
  // with a hand-picked map the change waits for a second tap
  await page.locator('[data-map-select]').selectOption('toad-harbor')
  await page.locator('[data-race-tile="1"]').click()
  await expect(page.locator('[data-race-tile="1"]')).toHaveAttribute('aria-pressed', 'true')
  await page.locator('[data-map-select]').selectOption('water-park')
  await expect.poll(async () => (await state()).draft.race.trackOverrides).toEqual(['toad-harbor', 'water-park', null, null])
  await page.locator('[data-cup-select]').selectOption('mushroom')
  await expect(page.locator('[data-cup-confirm]')).toBeVisible()
  expect((await state()).draft.race.cupId).toBe('flower')
  await page.locator('[data-cup-confirm]').click()
  await expect.poll(async () => (await state()).draft.race).toMatchObject({ cupId: 'mushroom', raceIndex: 0 })
  expect((await state()).draft.race.trackOverrides).toBeUndefined()
  // random race: two taps once there is progress to lose
  await tapRace(page, [1, 2, 3, 4])
  await expect.poll(races).toHaveLength(1)
  await page.locator('[data-random-race]').click()
  await expect(page.locator('[data-random-race]')).toContainText('Tap again')
  expect((await state()).draft.race.cupId).toBe('mushroom')
  await page.locator('[data-random-race]').click()
  await expect.poll(async () => (await state()).draft.race.raceIndex).toBe(0)
})

test('single-track mode: race number, track, results and next race', async ({ page }) => {
  await command({ type: 'setRace', patch: { mode: 'track', trackId: 'water-park', raceNo: 1, raceTotal: 2 } })
  await openRace(page)
  await expect(page.locator('[data-map-select]')).toHaveValue('water-park')
  await expect(page.locator('[data-race-tile]')).toHaveCount(2)
  await tapRace(page, [3, 1, 2, 4])
  await expect.poll(races).toEqual([{ raceNo: 1, trackId: 'water-park', positions: [3, 1, 2, 4] }])
  await page.locator('[data-next-race]').click()
  await expect.poll(async () => (await state()).draft.race).toMatchObject({ mode: 'track', raceNo: 2, raceTotal: 2, trackId: 'water-park' })
  await page.locator('[data-map-select]').selectOption('toad-harbor')
  await expect.poll(async () => (await state()).draft.race.trackId).toBe('toad-harbor')
  await tapRace(page, [1, 2, 3, 4])
  await expect.poll(async () => (await races()).map((r) => [r.raceNo, r.trackId])).toEqual([[1, 'water-park'], [2, 'toad-harbor']])
  await expect(page.locator('[data-winner]')).toBeVisible()
  // one more race grows the total instead of showing "race 3 of 2"
  await page.locator('[data-next-race]').click()
  await expect.poll(async () => (await state()).draft.race).toMatchObject({ raceNo: 3, raceTotal: 3 })
  await expect(page.locator('[data-winner]')).toHaveCount(0)
  // the race number and total can be typed
  await page.getByLabel('Races in total').fill('5')
  await page.getByLabel('Races in total').press('Tab')
  await expect.poll(async () => (await state()).draft.race.raceTotal).toBe(5)
})

test('clear this race takes two taps and Undo brings it back (free play)', async ({ page }) => {
  await command({ type: 'saveResults', raceNo: 1, trackId: 'mario-kart-stadium', positions: [1, 2, 3, 4], adjustments: [0, 0, 2, 0] })
  await command({ type: 'setRace', patch: { raceIndex: 1 } })
  await openRace(page)
  await tapRace(page, [2, 1, 3, 4])
  await expect.poll(async () => (await races()).length).toBe(2)
  const clear = page.locator('[data-clear-race]')
  await clear.click()
  await expect(clear).toContainText('Tap again to clear race 2')
  expect(await races()).toHaveLength(2)
  await clear.click()
  await expect.poll(async () => (await races()).map((r) => r.raceNo)).toEqual([1])
  expect((await state()).draft.scores.adjustments).toEqual([0, 0, 2, 0])
  await expect(page.locator('[data-race-tile="1"]')).toHaveAttribute('data-state', 'upcoming')
  await expect(page.locator('[data-toast]')).toContainText('Cleared race 2')
  await page.locator('[data-undo]').last().click()
  await expect.poll(async () => (await races()).map((r) => r.raceNo)).toEqual([1, 2])
  expect((await races())[1].positions).toEqual([2, 1, 3, 4])
  expect((await state()).draft.scores.adjustments).toEqual([0, 0, 2, 0])
})

test('clearing an unsaved entry needs no confirmation', async ({ page }) => {
  await openRace(page)
  await place(page, 0, 1).click()
  await place(page, 1, 2).click()
  await expect(page.locator('[data-clear-race]')).toBeEnabled()
  await page.locator('[data-clear-race]').click()
  await expect(page.locator('[data-status=empty]')).toBeVisible()
  await expect(page.locator('[data-clear-race]')).toBeDisabled()
})

test('winner and Next match in a tournament', async ({ page }) => {
  const first = await newTournament('Finals')
  await command({ type: 'setPlayer', index: 1, patch: { name: 'OMAR' } })
  await command({ type: 'saveResults', raceNo: 1, trackId: 'mario-kart-stadium', positions: [1, 2, 3, 4] })
  await command({ type: 'saveResults', raceNo: 2, trackId: 'water-park', positions: [2, 1, 4, 3] })
  await command({ type: 'saveResults', raceNo: 3, trackId: 'sweet-sweet-canyon', positions: [1, 2, 3, 4] })
  await command({ type: 'setRace', patch: { raceIndex: 3 } })
  await openRace(page)
  await expect(page.locator('[data-context]')).toContainText('Finals')
  await expect(page.locator('[data-context]')).toContainText('Semi 1')
  await expect(page.locator('[data-winner]')).toHaveCount(0)
  await expect(page.locator('[data-next-match]')).toHaveCount(0)
  await expect(page.locator('[data-leader-note]')).toContainText('after 3 of 4 races')
  await tapRace(page, [2, 1, 3, 4])
  // level on 54: the last race decides
  await expect(page.locator('[data-winner-name]')).toHaveText('OMAR')
  await expect(page.locator('[data-winner]')).toContainText('54 pts · tie broken by the last race')
  await expect(page.locator('[data-winner]')).toContainText('Semi 1 winner')
  await expect(page.locator('[data-next-match]')).toContainText('Semi 2')
  await expect(page.locator('[data-next-race]')).toContainText('That was the last race')
  await page.locator('[data-next-match]').click()
  await expect.poll(async () => { const s = await state(); return s.tournaments.find((t) => t.id === s.activeTournamentId)!.activeMatchId }).not.toBe(first)
  await expect(page.locator('[data-context]')).toContainText('Semi 2')
  await expect(page.locator('[data-winner]')).toHaveCount(0)
  await expect(page.locator('[data-toast]')).toContainText('Live match is now Semi 2')
  expect((await state()).draft.scores.races).toEqual([])
  // Undo goes back to the match with its results
  await page.locator('[data-undo]').last().click()
  await expect.poll(async () => { const s = await state(); return s.tournaments.find((t) => t.id === s.activeTournamentId)!.activeMatchId }).toBe(first)
  await expect(page.locator('[data-winner]')).toBeVisible()
})

test('clearing a race inside a tournament edits the live match', async ({ page }) => {
  await newTournament('Clear test')
  await command({ type: 'saveResults', raceNo: 1, trackId: 'mario-kart-stadium', positions: [1, 2, 3, 4] })
  await openRace(page)
  await expect(page.locator('[data-race-tile="0"]')).toHaveAttribute('data-state', 'done')
  await page.locator('[data-clear-race]').click()
  await page.locator('[data-clear-race]').click()
  await expect.poll(races).toEqual([])
  await expect(total(page, 0)).toHaveText('0')
})

test('free play shows the final standings without Next match', async ({ page }) => {
  await openRace(page)
  await expect(page.locator('[data-context]')).toContainText('Free play')
  for (let i = 0; i < 4; i++) {
    await tapRace(page, [i + 1, ((i + 1) % 4) + 1, ((i + 2) % 4) + 1, ((i + 3) % 4) + 1])
    await expect.poll(races).toHaveLength(i + 1)
    if (i < 3) await page.locator('[data-next-race]').click()
  }
  await expect(page.locator('[data-winner]')).toBeVisible()
  await expect(page.locator('[data-winner]')).toContainText('Final standings')
  await expect(page.locator('[data-next-match]')).toHaveCount(0)
  // every player held each place once, so all four are level on 46; P2 won the last race and that decides
  await expect(page.locator('[data-winner-name]')).toHaveText('Player 2')
  await expect(page.locator('[data-winner]')).toContainText('tie broken by the last race')
})

test('the page never touches graphics or the live match from a tile or a tap', async ({ page }) => {
  const first = await newTournament('Hands off')
  const before = await state()
  await openRace(page)
  await tapRace(page, [1, 2, 3, 4])
  await page.locator('[data-race-tile="2"]').click()
  await page.locator('[data-map-select]').selectOption('toad-harbor')
  const after = await state()
  expect(after.layers).toEqual(before.layers)
  expect(after.program).toEqual(before.program)
  expect(after.tournaments.find((t) => t.id === after.activeTournamentId)!.activeMatchId).toBe(first)
})
