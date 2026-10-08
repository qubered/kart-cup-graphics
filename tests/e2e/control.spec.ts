import { test, expect } from '@playwright/test'
import { state, resetShow } from './helpers'

test.beforeEach(resetShow)

test('layer change is pending until AUTO', async ({ page }) => {
  await page.goto('/control')
  await page.getByRole('button', { name: 'B · Icons' }).click()
  await expect(page.locator('[data-output-tab=wide] [data-pending]')).toBeVisible()
  await page.locator('[data-arm=wide]').click()
  await page.getByRole('button', { name: /^AUTO/ }).click()
  await expect.poll(async () => (await state()).program.wide.view.background?.id).toBe('B')
  await expect(page.locator('[data-output-tab=wide] [data-pending]')).toHaveCount(0)
})

test('HOLD from master bar', async ({ page }) => {
  await page.goto('/control')
  await page.getByRole('button', { name: /^HOLD/ }).click()
  await expect.poll(async () => (await state()).overlay.hold.on).toBe(true)
})

test('keyboard: arm with 1 then Enter cuts', async ({ page }) => {
  await page.goto('/control')
  await expect(page.locator('[data-output-tab=wide]')).toBeVisible()
  await page.keyboard.press('1')
  await expect.poll(async () => (await state()).armed).toEqual(['wide'])
  await page.keyboard.press('Enter')
  await expect.poll(async () => (await state()).program.wide.mode).toBe('cut')
})

test('twin output offers only None and Title scenes', async ({ page }) => {
  await page.goto('/control')
  await page.locator('[data-output-tab=twins]').click()
  await expect(page.getByRole('button', { name: 'Title', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Standings' })).toHaveCount(0)
})

