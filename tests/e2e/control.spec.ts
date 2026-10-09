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

test('a scene change shows the pending badge on its output tab only, and AUTO clears it', async ({ page }) => {
  await page.goto('/control')
  await page.locator('[data-output-tab=twins]').click()
  await page.getByRole('button', { name: 'Title', exact: true }).click()
  await expect(page.locator('[data-output-tab=twins] [data-pending]')).toBeVisible()
  await expect.poll(async () => (await state()).layers.twins.scene).toBe('title')
  await page.locator('[data-arm=twins]').click()
  await page.getByRole('button', { name: /^AUTO/ }).click()
  await expect.poll(async () => (await state()).program.twins.view.scene?.kind).toBe('title')
  await expect(page.locator('[data-output-tab=twins] [data-pending]')).toHaveCount(0)
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

test('twin output offers only the scenes a twin can show', async ({ page }) => {
  await page.goto('/control')
  await page.locator('[data-output-tab=twins]').click()
  await expect(page.getByRole('button', { name: 'Title', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Standings' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Line-up' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Notice', exact: true })).toHaveCount(0)
  // hero / board halves of the win screens and the QR codes are offered; the full-width ones are not
  await expect(page.getByRole('button', { name: 'Race win', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'QR codes', exact: true })).toBeVisible()
})
