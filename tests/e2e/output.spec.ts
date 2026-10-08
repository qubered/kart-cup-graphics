import { test, expect } from '@playwright/test'
import { command, resetShow } from './helpers'

test.beforeEach(resetShow)

test('no background = transparent page', async ({ page }) => {
  await command({ type: 'resetShow' }); await page.goto('/out/wide'); await page.waitForSelector('body[data-ready]')
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgba(0, 0, 0, 0)')
  await expect(page.locator('[data-layer=background]')).toHaveCount(0)
})

test('take shows background A', async ({ page }) => {
  await page.goto('/out/wide'); await command({ type: 'arm', outputIds: ['wide'] }); await command({ type: 'take', mode: 'cut' })
  await expect(page.locator('[data-bg=A]')).toBeVisible()
})

// Review Focus 3: reload mid-show renders Program instantly
test('reload renders current program with no enter animation', async ({ page }) => {
  await command({ type: 'take', mode: 'auto', outputIds: ['wide'] }); await page.goto('/out/wide'); await page.reload(); await page.waitForSelector('body[data-ready]')
  expect(await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && (a.effect as KeyframeEffect).target?.closest('[data-layer=scene]')).length)).toBe(0)
  await expect(page.locator('[data-layer=scene]')).toHaveCSS('opacity', '1')
})

test('hold covers twin halves', async ({ page }) => {
  await page.goto('/out/twins'); await command({ type: 'hold', on: true })
  await expect(page.locator('[data-overlay=hold] .hold-half')).toHaveCount(2)
  await expect(page.locator('[data-overlay=hold]')).toContainText('BACK SHORTLY')
  await command({ type: 'hold', on: false }); await expect(page.locator('[data-overlay=hold]')).toHaveCount(0)
})

// Review Focus 4: unknown output id
test('unknown output stays blank then renders when created', async ({ page }) => {
  await page.goto('/out/lobby'); await page.waitForTimeout(500); expect(await page.locator('#canvas *').count()).toBe(0)
  await command({ type: 'addOutput', output: { id: 'lobby', name: 'Lobby', format: 'hd', safeArea: { top: 0, right: 0, bottom: 0, left: 0 }, graphicsScale: 1 } })
  await command({ type: 'setLayers', outputId: 'lobby', patch: { background: 'B' } })
  await command({ type: 'take', mode: 'cut', outputIds: ['lobby'] }); await expect(page.locator('[data-bg=B]')).toBeVisible()
})

test('debug panel only with ?debug=1', async ({ page }) => {
  await page.goto('/out/wide'); await expect(page.locator('[data-debug]')).toHaveCount(0)
  await page.goto('/out/wide?debug=1'); await expect(page.locator('[data-debug]')).toBeVisible()
})
