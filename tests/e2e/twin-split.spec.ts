import { expect, test } from '@playwright/test'
import { command, resetShow, state } from './helpers'

test.beforeEach(resetShow)

const TWIN_L3 = { setLayers: { type: 'setLayers', outputId: 'twins', patch: { background: 'B', trackCard: true, lowerThirds: { on: true, players: [0, 1, 2, 3] } } } } as const

async function takeTwins() {
  await command(TWIN_L3.setLayers as never)
  await command({ type: 'take', mode: 'cut', outputIds: ['twins'] })
}
const xs = (page: import('@playwright/test').Page, sel: string) =>
  page.locator(sel).evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().x)))

test('left half is a 960x1152 crop showing P1 and P2', async ({ page }) => {
  await takeTwins()
  await page.setViewportSize({ width: 960, height: 1152 })
  await page.goto('/out/twins/left'); await page.waitForSelector('body[data-ready]')
  const crop = await page.locator('.crop[data-part=left]').boundingBox()
  expect(crop).toMatchObject({ x: 0, y: 0, width: 960, height: 1152 })
  // Same canvas coordinates as the full page: slots 0 and 1 at x 40 / 490 are inside the half.
  expect((await xs(page, '.lower-third')).slice(0, 2)).toEqual([40, 490])
  await expect(page.locator('.track-card').first()).toBeVisible()
})

test('right half is shifted by half a canvas: P3 and P4 land at 40 and 490', async ({ page }) => {
  await takeTwins()
  await page.setViewportSize({ width: 960, height: 1152 })
  await page.goto('/out/twins/right'); await page.waitForSelector('body[data-ready]')
  expect(await page.locator('.crop[data-part=right]').boundingBox()).toMatchObject({ width: 960, height: 1152 })
  expect((await xs(page, '.lower-third')).slice(2, 4)).toEqual([40, 490])
})

test('full /out/twins is unchanged (1920 wide)', async ({ page }) => {
  await takeTwins()
  await page.goto('/out/twins'); await page.waitForSelector('body[data-ready]')
  expect(await page.locator('.crop[data-part=full]').boundingBox()).toMatchObject({ width: 1920, height: 1152 })
  expect(await xs(page, '.lower-third')).toEqual([40, 490, 1000, 1450])
})

test('halves count separately in presence and light up the twins output', async ({ page, context }) => {
  const left = await context.newPage(); await left.goto('/out/twins/left'); await left.waitForSelector('body[data-ready]')
  await page.goto('/control')
  const twinsLed = page.locator('[data-output-tab=twins] .led')
  await expect(twinsLed).toHaveClass(/partial/)
  const right = await context.newPage(); await right.goto('/out/twins/right'); await right.waitForSelector('body[data-ready]')
  await expect(twinsLed).toHaveClass(/\bon\b/)
  await page.getByRole('tab', { name: 'Outputs' }).click()
  await expect(page.locator('[data-output-row=twins] [data-clients]')).toContainText('L 1 · R 1')
  await expect(page.locator('[data-output-row=twins] [data-half-url=left] code')).toContainText('/out/twins/left')
  await expect(page.locator('[data-output-row=twins] [data-half-url=right] code')).toContainText('/out/twins/right')
})

test('superwide composes left twin | wide | right twin on one 5760x1152 page', async ({ page }) => {
  await command({ type: 'setLayers', outputId: 'wide', patch: { background: 'B', scene: 'title' } })
  await command({ type: 'setLayers', outputId: 'twins', patch: { background: 'A', trackCard: true, lowerThirds: { on: true, players: [0, 1, 2, 3] } } })
  await command({ type: 'take', mode: 'cut', outputIds: ['wide', 'twins'] })
  await page.setViewportSize({ width: 5760, height: 1152 })
  await page.goto('/out/superwide'); await page.waitForSelector('body[data-ready]')
  expect(await page.locator('#superwide').boundingBox()).toMatchObject({ x: 0, y: 0, width: 5760, height: 1152 })
  const boxes = await page.locator('.box').evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.width)] }))
  expect(boxes).toEqual([[0, 960], [960, 3840], [4800, 960]])
  // wide in the middle, twins on the outsides
  await expect(page.locator('[data-box=wide] [data-bg=B]')).toBeVisible()
  await expect(page.locator('[data-box=left] [data-bg=A]')).toBeVisible()
  await expect(page.locator('[data-box=right] [data-bg=A]')).toBeVisible()
  expect((await xs(page, '[data-box=left] .lower-third')).slice(0, 2)).toEqual([40, 490])
  expect((await xs(page, '[data-box=right] .lower-third')).slice(2, 4)).toEqual([4800 + 40, 4800 + 490])
  await expect(page.locator('[data-box=wide] .title-lockup')).toBeVisible()
  expect(await page.evaluate(() => document.querySelectorAll('[id=canvas]').length)).toBe(0)
})

test('superwide counts as a full connection for wide and twins', async ({ page, context }) => {
  const sw = await context.newPage(); await sw.setViewportSize({ width: 5760, height: 1152 })
  await sw.goto('/out/superwide'); await sw.waitForSelector('body[data-ready]')
  await page.goto('/control')
  await expect(page.locator('[data-output-tab=wide] .led')).toHaveClass(/\bon\b/)
  await expect(page.locator('[data-output-tab=twins] .led')).toHaveClass(/\bon\b/)
  expect((await state()).outputs.map(o => o.id)).toContain('twins')
})

// Regression: z-indexes inside a layer must never paint above later layers.
/** Which layer/overlay holds the topmost real content at (x, y), ignoring the FTB overlay and empty layer containers. */
async function topLayer(page: import('@playwright/test').Page, x: number, y: number): Promise<string> {
  await page.addStyleTag({ content: '* { pointer-events: auto !important }' })
  return page.evaluate(([px, py]) => {
    const el = document.elementsFromPoint(px, py).find(e => !e.closest('[data-overlay=ftb]') && !e.hasAttribute('data-layer') && e.id !== 'canvas' && !e.classList.contains('canvas') && !e.classList.contains('crop'))
    const host = el?.closest('[data-overlay], [data-layer]')
    return host?.getAttribute('data-overlay') ?? host?.getAttribute('data-layer') ?? 'none'
  }, [x, y])
}

test('HOLD covers scene content on wide', async ({ page }) => {
  await command({ type: 'setLayers', outputId: 'wide', patch: { background: 'B', scene: 'lineup' } })
  await command({ type: 'take', mode: 'cut', outputIds: ['wide'] })
  await page.goto('/out/wide'); await page.waitForSelector('body[data-ready]')
  await command({ type: 'hold', on: true })
  await expect(page.locator('[data-overlay=hold]')).toBeVisible()
  // The lineup medallions sit around x 540-1100, y 90-400.
  for (const [x, y] of [[550, 250], [1150, 250], [1700, 250]]) expect(await topLayer(page, x, y)).toBe('hold')
})

test('background C logo plate and karts stay below the scene', async ({ page }) => {
  await command({ type: 'saveResults', raceNo: 1, trackId: 'mario-kart-stadium', positions: [1, 2, 3, 4] })
  await command({ type: 'setLayers', outputId: 'wide', patch: { background: 'C', scene: 'standings' } })
  await command({ type: 'take', mode: 'cut', outputIds: ['wide'] })
  await page.goto('/out/wide'); await page.waitForSelector('body[data-ready]')
  const plate = (await page.locator('[data-bg=C] .logo').boundingBox())!
  const row4 = (await page.locator('.standing-row').nth(3).boundingBox())!
  const x = Math.max(plate.x, row4.x) + 40
  const y = Math.max(plate.y, row4.y) + 10
  // The point must lie inside both the plate and the 4th row, otherwise the test proves nothing.
  expect(y).toBeLessThan(Math.min(plate.y + plate.height, row4.y + row4.height))
  expect(await topLayer(page, x, y)).toBe('scene')
})
