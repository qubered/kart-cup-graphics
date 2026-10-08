import { test, expect } from '@playwright/test'
import { command, state } from './helpers'

test.beforeEach(async () => { await command({ type: 'resetShow' }) })

test('edit players without going on air', async ({ page }) => {
  await page.goto('/control')
  await page.locator('[data-player="0"] input[name=name]').fill('SAM')
  await page.locator('[data-player="0"] [data-character]').click()
  await page.keyboard.type('yosh')
  await page.keyboard.press('Enter')
  await expect.poll(async () => (await state()).draft.players[0]).toMatchObject({ name: 'SAM', characterId: 'yoshi' })
  expect((await state()).program.twins.view.lowerThirds).toEqual([])
})

// Review Focus 5: duplicate / missing positions save with a warning
test('results with a duplicate and a blank', async ({ page }) => {
  await page.goto('/control')
  for (const [i, v] of [[0, '1'], [1, '1'], [2, '3'], [3, '']] as const) await page.locator(`[data-result="${i}"] select`).selectOption(v)
  await expect(page.getByText('Duplicate position: 1')).toBeVisible()
  await page.getByRole('button', { name: 'Save results' }).click()
  await expect.poll(async () => (await state()).draft.scores.races[0]?.positions).toEqual([1, 1, 3, 0])
})

test('step race and edit totals', async ({ page }) => {
  await page.goto('/control')
  await page.getByRole('button', { name: 'Race forward' }).click()
  await expect.poll(async () => (await state()).draft.race.raceIndex).toBe(1)
  await page.getByLabel(/^Total /).nth(1).fill('5')
  await page.getByLabel(/^Total /).nth(1).blur()
  await page.getByRole('button', { name: 'Save results' }).click()
  await expect.poll(async () => (await state()).draft.scores.adjustments[1]).toBe(5)
})
