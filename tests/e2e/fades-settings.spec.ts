import { test, expect, type Page } from '@playwright/test'
import { command, resetShow } from './helpers'
import type { Layers } from '../../shared/types'

test.beforeEach(resetShow)

/** Puts `patch` on air as a CUT on the wide output and opens it. */
async function onAir(page: Page, patch: Partial<Layers>) {
  await page.setViewportSize({ width: 3840, height: 1152 })
  await command({ type: 'setLayers', outputId: 'wide', patch: { background: 'B', trackCard: false, lowerThirds: { on: false, players: [] }, ...patch } })
  await command({ type: 'take', mode: 'cut', outputIds: ['wide'] })
  await page.goto('/out/wide'); await page.waitForSelector('body[data-ready]'); await page.waitForTimeout(300)
}
const take = async (mode: 'auto' | 'cut') => {
  await command({ type: 'setTransition', speed: 'slow' })
  await command({ type: 'take', mode, outputIds: ['wide'] })
}
const wraps = (page: Page) => page.locator('[data-layer=scene] .scene-wrap')

/** Changing a scene setting crossfades two scene wrappers on AUTO and swaps them with no overlap on CUT. */
async function expectFade(page: Page, change: () => Promise<unknown>, settle: () => Promise<unknown>) {
  await change(); await take('auto')
  await expect(wraps(page)).toHaveCount(2, { timeout: 1500 })
  await expect(wraps(page)).toHaveCount(1, { timeout: 5000 })
  await settle()
  await page.waitForTimeout(100)
  await expect(wraps(page)).toHaveCount(1)
}

test('title: logo placement crossfades on AUTO', async ({ page }) => {
  await onAir(page, { scene: 'title', logo: 'corner' })
  await expectFade(page, () => command({ type: 'setLayers', outputId: 'wide', patch: { logo: 'off' } }),
    async () => { await expect(page.locator('[data-layer=scene] .logo-mark')).toHaveCount(0) })
})

test('title: logo placement changes instantly on CUT', async ({ page }) => {
  await onAir(page, { scene: 'title', logo: 'corner' })
  await command({ type: 'setLayers', outputId: 'wide', patch: { logo: 'title' } })
  await take('cut')
  await page.waitForTimeout(80)
  await expect(wraps(page)).toHaveCount(1)
})

test('title style change crossfades the lockup on AUTO', async ({ page }) => {
  await onAir(page, { scene: 'title' })
  await command({ type: 'setTypography', role: 'eventTitle', patch: { style: 'classic' } })
  await take('auto')
  const lock = page.locator('[data-layer=scene] .title-lockup')
  await expect(lock).toHaveCount(2, { timeout: 1500 })
  await expect(lock).toHaveCount(1, { timeout: 5000 })
  await expect(lock).toHaveAttribute('data-style', 'classic')
})

test('notice: QR toggle crossfades on AUTO', async ({ page }) => {
  await onAir(page, { scene: 'notice', noticeQr: false })
  await expectFade(page, () => command({ type: 'setLayers', outputId: 'wide', patch: { noticeQr: true } }),
    async () => { await expect(page.locator('[data-layer=scene] .codes')).toHaveCount(1) })
})

test('QR scene: style change crossfades on AUTO', async ({ page }) => {
  await onAir(page, { scene: 'qr', qrStyle: 'center' })
  await expectFade(page, () => command({ type: 'setLayers', outputId: 'wide', patch: { qrStyle: 'sides' } }),
    async () => { await expect(page.locator('[data-layer=scene] .title-lockup')).toHaveCount(0) })
})

test('win screen: layout and block toggles crossfade on AUTO', async ({ page }) => {
  await command({ type: 'saveResults', raceNo: 1, trackId: 'mario-kart-stadium', positions: [1, 2, 3, 4] })
  await command({ type: 'createTournament', name: 'E2E', template: 'empty' })
  await onAir(page, { scene: 'raceWin' })
  await expectFade(page, () => command({ type: 'setWinScreenConfig', patch: { blocks: { racePoints: false } } }), async () => {})
  await expectFade(page, () => command({ type: 'setWinScreenConfig', patch: { layout: 'heroCentre' } }), async () => {})
})

test('matches layout and bracket options crossfade on AUTO', async ({ page }) => {
  await command({ type: 'createTournament', name: 'Test Cup', template: 'bracket' })
  await onAir(page, { scene: 'matches' })
  await expectFade(page, () => command({ type: 'setMatchesSceneConfig', patch: { layout: 'row' } }),
    async () => { await expect(page.locator('[data-layer=scene] .matches')).toHaveAttribute('data-layout', 'row') })
  await command({ type: 'setLayers', outputId: 'wide', patch: { scene: 'bracket' } })
  await take('cut')
  await expectFade(page, () => command({ type: 'setBracketConfig', patch: { showScores: false } }), async () => {})
})

test('background C watermark and Mattify on B crossfade on AUTO', async ({ page }) => {
  await onAir(page, { scene: 'title', background: 'C' })
  const bg = page.locator('[data-layer=background]')
  await command({ type: 'setEventText', patch: { watermark: 'NEW WATERMARK' } })
  await take('auto')
  await expect(bg).toHaveCount(2, { timeout: 1500 })
  await expect(bg).toHaveCount(1, { timeout: 5000 })
})

test('HOLD fades in and out instead of popping', async ({ page }) => {
  await onAir(page, { scene: 'title' })
  await command({ type: 'hold', on: true })
  const hold = page.locator('[data-overlay=hold]')
  await expect(hold).toHaveCount(1)
  const op = await hold.evaluate(e => Number(getComputedStyle(e).opacity))
  expect(op).toBeLessThan(1)
  await expect.poll(() => hold.evaluate(e => Number(getComputedStyle(e).opacity))).toBe(1)
  await command({ type: 'hold', on: false })
  await expect(hold).toHaveCount(1)                       // still fading out
  await expect(hold).toHaveCount(0, { timeout: 3000 })
})
