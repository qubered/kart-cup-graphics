import { test, expect } from '@playwright/test'
import { command, resetShow } from './helpers'

test.beforeEach(resetShow)

test('background C shows watermark and sticker text fits', async ({ page }) => {
  await page.setViewportSize({ width: 3840, height: 1152 }); await command({ type: 'setLayers', outputId: 'wide', patch: { background: 'C' } }); await command({ type: 'take', mode: 'cut', outputIds: ['wide'] })
  await page.goto('/out/wide'); await page.waitForSelector('body[data-ready]')
  await page.evaluate(() => document.fonts.ready)
  await expect(page.locator('[data-bg=C]')).toContainText('MARIO KART')
  // Every sticker text fits its box: shrink to 60%, then compress with textLength.
  await expect.poll(() => page.locator('[data-bg=C] svg.sheet text[data-max]').evaluateAll(els =>
    els.filter(e => (e as SVGTextElement).getBBox().width > +(e.getAttribute('data-max') as string) + 1).length)).toBe(0)
  expect(await page.locator('[data-bg=C] svg.sheet text[data-max]').count()).toBeGreaterThan(0)
})
