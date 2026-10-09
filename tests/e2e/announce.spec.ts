import { test, expect } from '@playwright/test'
import { command, resetShow } from './helpers'

test.beforeEach(resetShow)

async function show(outputId: string, patch: Record<string, unknown>) {
  await command({ type: 'setLayers', outputId, patch: { background: 'none', scene: 'announce', ...patch } })
  await command({ type: 'take', mode: 'cut', outputIds: [outputId] })
}

test('wide announce: heading, name, subtitle and character of the chosen player on a player-coloured field', async ({ page }) => {
  await page.setViewportSize({ width: 3840, height: 1152 })
  await command({ type: 'setPlayer', index: 1, patch: { name: 'Priya', subtitle: 'Lead Engineer · Platform Group', colour: 'purple' } })
  await show('wide', { announceSlot: 1 })
  await page.goto('/out/wide'); await page.waitForSelector('body[data-ready]')
  const scene = page.locator('[data-layer=scene]')
  await expect(scene).toContainText('PLAYER 2'); await expect(scene).toContainText('Priya')
  await expect(page.locator('[data-announce-subtitle]')).toHaveText('Lead Engineer · Platform Group')
  await expect(page.locator('[data-announce-hero]')).toHaveCount(1)
  const pc = await page.locator('[data-announce="1"]').evaluate((e) => (e as HTMLElement).style.getPropertyValue('--pc').trim())
  expect(pc).toBe('#8b5cf6')
  // the hero stays between the flag bands (147 px each at 1152)
  const b = await page.locator('[data-announce-hero]').boundingBox()
  expect(b!.y).toBeGreaterThanOrEqual(147); expect(b!.y + b!.height).toBeLessThanOrEqual(1152 - 147)
})

test('no subtitle: the subtitle line is not drawn', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await show('stream', { announceSlot: 0 })
  await page.goto('/out/stream'); await page.waitForSelector('body[data-ready]')
  await expect(page.locator('[data-layer=scene]')).toContainText('PLAYER 1')
  await expect(page.locator('[data-announce-subtitle]')).toHaveCount(0)
})

test('twin announce repeats the hero in each 960 half', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1152 })
  await command({ type: 'setPlayer', index: 2, patch: { subtitle: 'Producer · Events' } })
  await show('twins', { announceSlot: 2 })
  await page.goto('/out/twins'); await page.waitForSelector('body[data-ready]')
  const heroes = page.locator('[data-announce-hero]')
  await expect(heroes).toHaveCount(2)
  const [a, b] = [await heroes.nth(0).boundingBox(), await heroes.nth(1).boundingBox()]
  expect(a!.x + a!.width).toBeLessThanOrEqual(960); expect(b!.x).toBeGreaterThanOrEqual(960)
})

test('switching player on air changes the scene to the new player', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await command({ type: 'setPlayer', index: 3, patch: { name: 'Alex' } })
  await show('stream', { announceSlot: 0 })
  await page.goto('/out/stream'); await page.waitForSelector('body[data-ready]')
  await expect(page.locator('[data-announce="0"]')).toHaveCount(1)
  await command({ type: 'setLayers', outputId: 'stream', patch: { announceSlot: 3 } })
  await command({ type: 'take', mode: 'auto', outputIds: ['stream'] })
  await expect(page.locator('[data-announce="3"]')).toContainText('Alex')
  await expect(page.locator('[data-announce="0"]')).toHaveCount(0)
})

test('bare: player colour and flags with no player card, and back', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await command({ type: 'setPlayer', index: 1, patch: { name: 'Priya', colour: 'purple' } })
  await show('stream', { announceSlot: 1, announceBare: true })
  await page.goto('/out/stream'); await page.waitForSelector('body[data-ready]')
  await expect(page.locator('[data-announce="1"]')).toHaveCount(1)
  await expect(page.locator('[data-announce-hero]')).toHaveCount(0)
  await expect(page.locator('[data-layer=scene]')).not.toContainText('Priya')
  const pc = await page.locator('[data-announce="1"]').evaluate((e) => (e as HTMLElement).style.getPropertyValue('--pc').trim())
  expect(pc).toBe('#8b5cf6')
  await command({ type: 'setLayers', outputId: 'stream', patch: { announceBare: false } })
  await command({ type: 'take', mode: 'cut', outputIds: ['stream'] })
  await expect(page.locator('[data-announce-hero]')).toHaveCount(1)
  await expect(page.locator('[data-layer=scene]')).toContainText('Priya')
})
