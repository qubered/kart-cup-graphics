import { expect, test } from '@playwright/test'
import { command, resetShow } from './helpers'

test.beforeEach(resetShow)

test('Sky background crests keep the clock, not the logo', async ({ page }) => {
  await command({ type: 'take', mode: 'cut', outputIds: ['wide'] })
  await page.goto('/out/wide'); await page.waitForSelector('body[data-ready]')
  const crest = await page.evaluate(() => document.querySelector('#i-crest')?.innerHTML ?? '')
  expect(crest).toContain('r="80"')                          // the clock face
  expect(crest).toContain('M200 205 L238 228')               // the clock hands
  expect(await page.locator('[data-bg=A] .crest use[href="#i-crest"]').count()).toBe(2)
})

test('HOLD shows the logo, once per twin half', async ({ page }) => {
  await page.goto('/out/wide'); await page.waitForSelector('body[data-ready]')
  await command({ type: 'hold', on: true })
  await expect(page.locator('[data-overlay=hold] .hold-logo img')).toHaveCount(1)
  const box = (await page.locator('[data-overlay=hold] .hold-logo img').boundingBox())!
  expect(box.width).toBeGreaterThanOrEqual(150)               // big enough to read on the 3840 wall
  await page.goto('/out/twins'); await page.waitForSelector('body[data-ready]')
  await expect(page.locator('[data-overlay=hold] .hold-logo img')).toHaveCount(2)
})

test('title scene shows the logo top-right, clear of the track card, once per twin half', async ({ page }) => {
  await command({ type: 'setLayers', outputId: 'wide', patch: { background: 'A', scene: 'title', trackCard: true } })
  await command({ type: 'take', mode: 'cut', outputIds: ['wide'] })
  await page.goto('/out/wide'); await page.waitForSelector('body[data-ready]')
  const logo = (await page.locator('[data-layer=scene] .logo-mark img').boundingBox())!
  const card = (await page.locator('.track-card').boundingBox())!
  expect(logo.x + logo.width).toBeGreaterThan(3700)           // top-right corner of the 3840 canvas
  expect(logo.x).toBeGreaterThan(card.x + card.width)         // not overlapping the track card
  await command({ type: 'take', mode: 'cut', outputIds: ['twins'] })
  await page.goto('/out/twins'); await page.waitForSelector('body[data-ready]')
  await command({ type: 'setLayers', outputId: 'twins', patch: { scene: 'title' } })
  await command({ type: 'take', mode: 'cut', outputIds: ['twins'] })
  await expect(page.locator('[data-layer=scene] .logo-mark img')).toHaveCount(2)
})

test('Icon pattern background (B) uses the tire icon, not the logo', async ({ page }) => {
  await command({ type: 'setLayers', outputId: 'wide', patch: { background: 'B' } })
  await command({ type: 'take', mode: 'cut', outputIds: ['wide'] })
  await page.goto('/out/wide'); await page.waitForSelector('body[data-ready]')
  expect(await page.locator('[data-bg=B] #pattern-tile use[href="#i-tire"]').count()).toBe(1)
  expect(await page.locator('[data-bg=B] #pattern-tile use[href="#i-logo"]').count()).toBe(0)
})

test('uploaded logo replaces the default logo, and can sit in the title block or be switched off', async ({ page, request }) => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
  const up = await request.put('/api/logo', { data: png, headers: { 'content-type': 'image/png' } })
  expect(up.ok()).toBe(true)
  const bad = await request.put('/api/logo', { data: Buffer.from('nope'), headers: { 'content-type': 'image/png' } })
  expect(bad.status()).toBe(400)
  await command({ type: 'setLayers', outputId: 'wide', patch: { background: 'A', scene: 'title', logo: 'title' } })
  await command({ type: 'take', mode: 'cut', outputIds: ['wide'] })
  await page.goto('/out/wide'); await page.waitForSelector('body[data-ready]')
  await expect(page.locator('[data-layer=scene] .title-lockup .blk-logo img')).toHaveCount(1)
  await expect(page.locator('[data-layer=scene] .logo-mark')).toHaveCount(0)
  await command({ type: 'setLayers', outputId: 'wide', patch: { logo: 'off' } })
  await command({ type: 'take', mode: 'cut', outputIds: ['wide'] })
  await expect(page.locator('[data-layer=scene] .blk-logo, [data-layer=scene] .logo-mark')).toHaveCount(0)
  expect((await request.delete('/api/logo')).ok()).toBe(true)
})
