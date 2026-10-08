import { expect, test } from '@playwright/test'
import { command, resetShow } from './helpers'
import { LOGO_PATH } from '../../web/src/graphics/logo'

test.beforeEach(resetShow)

test('Sky background crests carry the logo instead of the clock', async ({ page }) => {
  await command({ type: 'take', mode: 'cut', outputIds: ['wide'] })
  await page.goto('/out/wide'); await page.waitForSelector('body[data-ready]')
  const crest = await page.evaluate(() => document.querySelector('#i-crest')?.innerHTML ?? '')
  expect(crest).toContain(LOGO_PATH.slice(0, 60))
  expect(crest).not.toContain('r="80"')                      // the clock face
  expect(crest).not.toContain('M200 205 L238 228')           // the clock hands
  expect(await page.locator('[data-bg=A] .crest use[href="#i-crest"]').count()).toBe(2)
})

test('HOLD shows the logo, once per twin half', async ({ page }) => {
  await page.goto('/out/wide'); await page.waitForSelector('body[data-ready]')
  await command({ type: 'hold', on: true })
  await expect(page.locator('[data-overlay=hold] .hold-logo svg')).toHaveCount(1)
  const box = (await page.locator('[data-overlay=hold] .hold-logo svg').boundingBox())!
  expect(box.width).toBeGreaterThanOrEqual(150)               // big enough to read on the 3840 wall
  await page.goto('/out/twins'); await page.waitForSelector('body[data-ready]')
  await expect(page.locator('[data-overlay=hold] .hold-logo svg')).toHaveCount(2)
})
