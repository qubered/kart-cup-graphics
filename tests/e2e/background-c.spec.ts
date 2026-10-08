import { test, expect } from '@playwright/test'
import { command, resetShow } from './helpers'

test.beforeEach(resetShow)

test('background C shows watermark and sticker text fits', async ({ page }) => {
  await page.setViewportSize({ width: 3840, height: 1152 }); await command({ type: 'setLayers', outputId: 'wide', patch: { background: 'C' } }); await command({ type: 'take', mode: 'cut', outputIds: ['wide'] })
  await page.goto('/out/wide'); await page.waitForSelector('body[data-ready]')
  await expect(page.locator('[data-bg=C]')).toContainText('MARIO KART')
  await page.waitForTimeout(300); await page.locator('#canvas').screenshot({ path: '/tmp/claude-0/shots/bg-c-wide.png' })
  const over = await page.locator('[data-sticker-text]').evaluateAll(els => els.filter(e => e.scrollWidth > e.clientWidth).length)
  expect(over).toBe(0)
})
