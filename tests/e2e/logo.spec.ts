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

test('title scene shows the logo top-right, clear of the track card, once per twin half', async ({ page }) => {
  await command({ type: 'setLayers', outputId: 'wide', patch: { background: 'A', scene: 'title', trackCard: true } })
  await command({ type: 'take', mode: 'cut', outputIds: ['wide'] })
  await page.goto('/out/wide'); await page.waitForSelector('body[data-ready]')
  const logo = (await page.locator('[data-layer=scene] .logo-mark svg').boundingBox())!
  const card = (await page.locator('.track-card').boundingBox())!
  expect(logo.x + logo.width).toBeGreaterThan(3700)           // top-right corner of the 3840 canvas
  expect(logo.x).toBeGreaterThan(card.x + card.width)         // not overlapping the track card
  await command({ type: 'take', mode: 'cut', outputIds: ['twins'] })
  await page.goto('/out/twins'); await page.waitForSelector('body[data-ready]')
  await command({ type: 'setLayers', outputId: 'twins', patch: { scene: 'title' } })
  await command({ type: 'take', mode: 'cut', outputIds: ['twins'] })
  await expect(page.locator('[data-layer=scene] .logo-mark svg')).toHaveCount(2)
})

test('Icon pattern background (B) includes the logo as one of its icons', async ({ page }) => {
  await command({ type: 'setLayers', outputId: 'wide', patch: { background: 'B' } })
  await command({ type: 'take', mode: 'cut', outputIds: ['wide'] })
  await page.goto('/out/wide'); await page.waitForSelector('body[data-ready]')
  expect(await page.locator('[data-bg=B] #pattern-tile use[href="#i-logo"]').count()).toBe(1)
  const symbol = await page.evaluate(() => document.querySelector('[data-bg=B] #i-logo')?.innerHTML ?? '')
  expect(symbol).toContain(LOGO_PATH.slice(0, 60))
})
