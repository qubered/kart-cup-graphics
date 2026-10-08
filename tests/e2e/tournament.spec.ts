import { test, expect } from '@playwright/test'
import { command, state, resetShow } from './helpers'

test.beforeEach(async () => {
  await resetShow()
  const s = await state()
  for (const t of s.tournaments) await command({ type: 'deleteTournament', id: t.id })
})

test('empty state shows a create button and nothing else changes', async ({ page }) => {
  await page.goto('/control')
  await page.getByRole('tab', { name: 'Tournament' }).click()
  await expect(page.locator('[data-empty]')).toBeVisible()
  await expect(page.locator('[data-match]')).toHaveCount(0)
  // bracket / matches scenes are not offered without a tournament
  await expect(page.getByRole('button', { name: 'Bracket', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Show' })).toHaveCount(0)
})

test('create tournament, edit a match, switch active match, edit results', async ({ page }) => {
  await page.goto('/control')
  await page.getByRole('tab', { name: 'Tournament' }).click()
  await page.locator('input[name=tournamentName]').fill('Cup Night')
  await page.getByRole('button', { name: 'Create tournament' }).click()
  await expect(page.locator('[data-match]')).toHaveCount(5)
  await expect(page.locator('[data-match=match-1]')).toHaveClass(/active/)

  // edit a NON-active match (match-2) without touching the active one
  await page.locator('[data-edit-match=match-2]').click()
  const setup = page.locator('[data-setup=match-2]')
  await setup.locator('input[name=matchLabel]').fill('Semi B')
  await setup.locator('[data-match-player="0"] input[name=name]').fill('ZED')
  await expect.poll(async () => {
    const t = (await state()).tournaments[0]
    return [t.matches[1].label, t.matches[1].data.players[0].name, t.activeMatchId]
  }).toEqual(['Semi B', 'ZED', 'match-1'])
  expect((await state()).draft.players[0].name).not.toBe('ZED')

  // results for the non-active match
  const results = page.locator('[data-results=match-2]')
  await results.locator('[data-add-race]').click()
  await results.locator('[data-race-row="1"] [data-pos="0"]').selectOption('1')
  await results.locator('[data-race-row="1"] [data-pos="1"]').selectOption('2')
  await expect(results.locator('[data-total="0"]')).toHaveText('15')
  await expect(results.locator('[data-total="1"]')).toHaveText('12')
  await results.locator('[data-adj="1"]').fill('5')
  await results.locator('[data-adj="1"]').blur()
  await expect(results.locator('[data-total="1"]')).toHaveText('17')
  await expect.poll(async () => (await state()).tournaments[0].matches[1].data.scores.adjustments[1]).toBe(5)

  // winner override and slot sources
  await setup.locator('select[name=winnerOverride]').selectOption('2')
  await expect.poll(async () => (await state()).tournaments[0].matches[1].winnerOverride).toBe(2)
  await page.locator('[data-edit-match=match-5]').click()
  await page.locator('[data-setup=match-5] [data-slot-source="0"]').selectOption('match-2')
  await expect.poll(async () => (await state()).tournaments[0].matches[4].slotSources?.[0]).toEqual({ matchId: 'match-2', auto: true })

  // make match-2 active: the draft now carries its data
  await page.locator('[data-make-active=match-2]').click()
  await expect.poll(async () => (await state()).tournaments[0].activeMatchId).toBe('match-2')
  expect((await state()).draft.players[0].name).toBe('ZED')
  await expect(page.locator('[data-match=match-2]')).toHaveClass(/active/)

  // go to next match
  await page.locator('[data-next-match]').click()
  await expect.poll(async () => (await state()).tournaments[0].activeMatchId).toBe('match-3')

  // a config panel writes through
  await page.locator('[data-win-block=cupEmblem]').click()
  await expect.poll(async () => (await state()).tournaments[0].winScreen.blocks.cupEmblem).toBe(false)
})

test('duplicate a tournament, with and without scores', async ({ page }) => {
  await command({ type: 'createTournament', name: 'Orig' })
  await command({ type: 'setMatchResults', matchId: 'match-1', races: [{ raceNo: 1, trackId: 'rainbow-road', positions: [1, 2, 3, 4] }] })
  await page.goto('/control')
  await page.getByRole('tab', { name: 'Tournament' }).click()
  await page.locator('[data-tournament=tournament-1] [data-duplicate]').click()
  await expect.poll(async () => (await state()).tournaments.length).toBe(2)
  let s = await state()
  expect(s.activeTournamentId).toBe('tournament-2')
  expect(s.tournaments[1].name).toBe('Orig (copy)')
  expect(s.tournaments[1].matches[0].data.scores.races).toHaveLength(1)
  await page.locator('[data-tournament=tournament-1] [data-duplicate-clear]').click()
  await expect.poll(async () => (await state()).tournaments.length).toBe(3)
  s = await state()
  expect(s.activeTournamentId).toBe('tournament-3')
  expect(s.tournaments[2].matches[0].data.scores.races).toHaveLength(0)
  expect(s.tournaments[0].matches[0].data.scores.races).toHaveLength(1)
})

test('scene controls: cup win part, split across outputs, matches set; cue action', async ({ page }) => {
  await command({ type: 'createTournament', name: 'T' })
  await page.goto('/control')
  await page.getByRole('button', { name: 'Cup win' }).click()
  await page.locator('[data-part=hero]').click()
  await expect.poll(async () => (await state()).layers.wide.part).toBe('hero')
  await page.locator('select[name=matchRef]').selectOption('previous')
  await expect.poll(async () => (await state()).layers.wide.matchRef).toBe('previous')
  await page.locator('[data-split]').click()
  await expect.poll(async () => (await state()).layers.twins.part).toBe('board')
  expect((await state()).layers.twins.scene).toBe('cupWin')
  await page.getByRole('button', { name: 'Matches', exact: true }).click()
  await page.locator('[data-set-round="0"]').click()
  await expect.poll(async () => (await state()).layers.wide.matchSet).toEqual({ rounds: [0] })

  await command({ type: 'savePreset', name: 'Look' })
  await command({ type: 'createStack', name: 'Run' })
  await command({ type: 'addCue', stackId: 'stack-1', presetId: 'preset-1', take: null })
  await page.getByRole('tab', { name: 'Cues' }).click()
  await page.locator('[data-cue=cue-1] select[name=cueAction]').selectOption('nextMatch')
  await expect.poll(async () => (await state()).stacks[0].cues[0].action).toBe('nextMatch')
})
