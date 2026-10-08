import { test, expect } from '@playwright/test'
import { command } from './helpers'

test('multiview shows tiles and amber hold state', async ({ page }) => {
  await command({ type: 'resetShow' })
  await command({ type: 'hold', on: false })
  await page.goto('/multiview')
  await expect(page.getByText('WIDE · PROGRAM')).toBeVisible()
  await expect(page.getByText('WIDE · PREVIEW')).toBeVisible()
  await command({ type: 'hold', on: true })
  const tiles = page.locator('[data-tile]')
  const n = await tiles.count()
  expect(n).toBeGreaterThanOrEqual(7)
  await expect(page.locator('[data-tile].hold')).toHaveCount(n)
  await command({ type: 'hold', on: false })
  await expect(page.locator('[data-tile].hold')).toHaveCount(0)
})
