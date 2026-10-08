import { expect, test, type Page } from '@playwright/test'
import sharp from 'sharp'
import { command, resetShow } from './helpers'

test.beforeEach(resetShow)

async function takeTwinLowerThirds() {
  await command({ type: 'setLayers', outputId: 'twins', patch: { lowerThirds: { on: true, players: [0, 1, 2, 3] } } })
  await command({ type: 'take', mode: 'cut', outputIds: ['twins'] })
}

/** RGBA of the given page pixels, from a real screenshot (alpha is kept with omitBackground). */
async function pixels(page: Page, pts: [number, number][]): Promise<number[][]> {
  const png = await page.screenshot({ omitBackground: true })
  const { data, info } = await sharp(png).raw().ensureAlpha().toBuffer({ resolveWithObject: true })
  return pts.map(([x, y]) => { const i = (y * info.width + x) * 4; return [data[i], data[i + 1], data[i + 2], data[i + 3]] })
}

const EMPTY: [number, number] = [5, 5]            // nothing is drawn here
const BAR: [number, number] = [240, 1022]         // inside player 1's lower-third bar (twin canvas)

test('plain page stays transparent (no cut & fill params)', async ({ page }) => {
  await takeTwinLowerThirds()
  await page.goto('/out/twins'); await page.waitForSelector('body[data-ready]')
  const [empty, bar] = await pixels(page, [EMPTY, BAR])
  expect(empty[3]).toBe(0)
  expect(bar[3]).toBeGreaterThan(200)
})

test('fill = graphics over opaque black', async ({ page }) => {
  await takeTwinLowerThirds()
  await page.goto('/out/twins?fill=1'); await page.waitForSelector('body[data-ready]')
  const [empty, bar] = await pixels(page, [EMPTY, BAR])
  expect(empty).toEqual([0, 0, 0, 255])
  expect(bar[3]).toBe(255)
  expect(bar[0] + bar[1] + bar[2]).toBeGreaterThan(30)   // the navy bar, not black
  expect(Math.min(bar[0], bar[1], bar[2])).toBeLessThan(200) // and not white
})

test('key = white where the graphics are opaque, black elsewhere', async ({ page }) => {
  await takeTwinLowerThirds()
  await page.goto('/out/twins?key=1'); await page.waitForSelector('body[data-ready]')
  const [empty, bar] = await pixels(page, [EMPTY, BAR])
  expect(empty).toEqual([0, 0, 0, 255])
  expect(bar.slice(0, 3).every(v => v >= 250)).toBe(true)
  expect(bar[3]).toBe(255)
})

test('key of an opaque background is solid white', async ({ page }) => {
  await command({ type: 'setLayers', outputId: 'twins', patch: { background: 'B' } })
  await command({ type: 'take', mode: 'cut', outputIds: ['twins'] })
  await page.goto('/out/twins?key=1'); await page.waitForSelector('body[data-ready]')
  const [a, b] = await pixels(page, [EMPTY, [900, 600]])
  expect(a.slice(0, 3).every(v => v >= 250)).toBe(true)
  expect(b.slice(0, 3).every(v => v >= 250)).toBe(true)
})

// The key of an opaque layer is flat white: animated art must not be rendered (and re-filtered) in key mode.
test('key mode renders backgrounds and HOLD as flat white, not animated art', async ({ page }) => {
  await command({ type: 'setLayers', outputId: 'wide', patch: { background: 'A' } })
  await command({ type: 'take', mode: 'cut', outputIds: ['wide'] })
  await page.goto('/out/wide?key=1'); await page.waitForSelector('body[data-ready]')
  await expect(page.locator('[data-bg=A]')).toBeVisible()
  expect(await page.locator('[data-bg=A] .bg-sky').count()).toBe(0)
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0)
  await command({ type: 'hold', on: true })
  await expect(page.locator('[data-overlay=hold]')).toBeVisible()
  expect(await page.locator('[data-overlay=hold] .hold-half, [data-overlay=hold] .bg-sky').count()).toBe(0)
  const [p] = await pixels(page, [[1900, 576]])
  expect(p.slice(0, 3).every(v => v >= 250)).toBe(true)
  // The fill keeps the real art.
  await page.goto('/out/wide?fill=1'); await page.waitForSelector('body[data-ready]')
  expect(await page.locator('[data-overlay=hold]').count()).toBe(1)
})

test('cut & fill work on the half pages and on the superwide', async ({ page }) => {
  await takeTwinLowerThirds()
  await page.setViewportSize({ width: 960, height: 1152 })
  await page.goto('/out/twins/right?key=1'); await page.waitForSelector('body[data-ready]')
  // Right half: P3's bar sits where P1's does on the left half.
  const [rEmpty, rBar] = await pixels(page, [EMPTY, BAR])
  expect(rEmpty).toEqual([0, 0, 0, 255])
  expect(rBar.slice(0, 3).every(v => v >= 250)).toBe(true)

  await page.setViewportSize({ width: 5760, height: 1152 })
  await page.goto('/out/superwide?key=1'); await page.waitForSelector('body[data-ready]')
  const [sEmpty, wideArea, rightBar] = await pixels(page, [EMPTY, [2800, 600], [4800 + 240, 1022]])
  expect(sEmpty).toEqual([0, 0, 0, 255])
  expect(wideArea).toEqual([0, 0, 0, 255])               // wide has nothing taken: black, not transparent
  expect(rightBar.slice(0, 3).every(v => v >= 250)).toBe(true)
})

test('Outputs tab lists fill and key URLs, including the halves and the superwide', async ({ page }) => {
  await page.goto('/control')
  await page.getByRole('tab', { name: 'Outputs' }).click()
  const row = page.locator('[data-output-row=twins]')
  await row.locator('summary').click()
  for (const u of ['/out/twins', '/out/twins/left', '/out/twins/right'])
    for (const q of ['fill', 'key']) await expect(row.locator('code', { hasText: `${u}?${q}=1` })).toBeVisible()
  const sw = page.locator('[data-cutfill=superwide]')
  await sw.locator('summary').click()
  await expect(sw.locator('code', { hasText: '/out/superwide?key=1' })).toBeVisible()
  await expect(sw.locator('code', { hasText: '/out/superwide?fill=1' })).toBeVisible()
})
