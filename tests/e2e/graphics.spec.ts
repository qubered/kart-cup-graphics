import { test, expect } from '@playwright/test'
import { command, resetShow } from './helpers'

test.beforeEach(resetShow)

test('twin lower thirds at fixed slots with player colours', async ({ page }) => {
  await command({ type: 'resetShow' }); await page.goto('/out/twins')
  await command({ type: 'arm', outputIds: ['twins'] }); await command({ type: 'take', mode: 'cut' })
  await page.waitForSelector('.lower-third')
  const xs = await page.locator('.lower-third').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().x - document.getElementById('canvas')!.getBoundingClientRect().x)))
  expect(xs).toEqual([40, 490, 1000, 1450]); await expect(page.locator('.track-card')).toHaveCount(2); await expect(page.locator('.track-card').first()).toContainText('RACE 1 / 4')
})

// Review Focus 1: long text never overflows
test('long names and track names fit', async ({ page }) => {
  await command({ type: 'setPlayer', index: 0, patch: { name: 'ALEXANDRIA-ROSE FEATHERSTONE' } })
  await command({ type: 'setRace', patch: { mode: 'track', trackId: 'tour-singapore-speedway' } }); await command({ type: 'take', mode: 'cut', outputIds: ['twins'] }); await page.goto('/out/twins'); await page.waitForSelector('body[data-ready]')
  for (const sel of ['.lower-third[data-slot="0"] .name', '.track-card .track-name']) expect(await page.locator(sel).first().evaluate(e => e.firstElementChild!.getBoundingClientRect().width <= e.getBoundingClientRect().width + 1)).toBe(true)
  expect(await page.locator('.lower-third[data-slot="0"] .name').evaluate(e => parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(26) // 60% floor of 44px
})

test('on-air rename updates without remount', async ({ page }) => {
  await command({ type: 'take', mode: 'cut', outputIds: ['twins'] }); await page.goto('/out/twins'); await page.waitForSelector('body[data-ready]'); const h = await page.locator('.lower-third[data-slot="1"]').elementHandle()
  await command({ type: 'setPlayer', index: 1, patch: { name: 'PRIYA' } }); await command({ type: 'take', mode: 'auto', outputIds: ['twins'] })
  await expect(page.locator('.lower-third[data-slot="1"]')).toContainText('PRIYA'); expect(await h!.evaluate(e => e.isConnected)).toBe(true)
})

test('title lockup chrome by default, classic switchable', async ({ page }) => {
  await command({ type: 'take', mode: 'cut', outputIds: ['wide'] }); await page.goto('/out/wide'); await expect(page.locator('.title-lockup[data-style=chrome]')).toBeVisible()
  await command({ type: 'setTypography', role: 'eventTitle', patch: { style: 'classic' } }); await command({ type: 'take', mode: 'cut', outputIds: ['wide'] }); await expect(page.locator('.title-lockup[data-style=classic]')).toBeVisible()
})

test('visual: twin + hd snapshots', async ({ page }) => {
  await command({ type: 'take', mode: 'cut', outputIds: ['twins', 'stream'] })
  await page.goto('/out/twins'); await page.waitForSelector('body[data-ready]'); await expect(page.locator('#canvas')).toHaveScreenshot('twin-l3.png', { maxDiffPixelRatio: 0.01 })
  await page.goto('/out/stream'); await page.waitForSelector('body[data-ready]'); await expect(page.locator('#canvas')).toHaveScreenshot('hd-l3.png', { maxDiffPixelRatio: 0.01 })
})
