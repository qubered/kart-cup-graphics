import { test, expect } from '@playwright/test'
import { command, resetShow } from './helpers'

test.beforeEach(resetShow)

for (const [scene, text] of [['lineup', 'THE RACERS'], ['nextRace', 'NEXT RACE'], ['standings', 'STANDINGS'], ['winner', 'WINNER']] as const)
  test(`wide ${scene}`, async ({ page }) => {
    await page.setViewportSize({ width: 3840, height: 1152 }); await command({ type: 'setLayers', outputId: 'wide', patch: { background: 'B', scene } }); await command({ type: 'take', mode: 'cut', outputIds: ['wide'] }); await page.goto('/out/wide'); await expect(page.locator('[data-layer=scene]')).toContainText(text)
    await page.waitForSelector('body[data-ready]')
  })

test('standings re-sort keeps rows', async ({ page }) => {
  await command({ type: 'saveResults', raceNo: 1, trackId: 'mario-kart-stadium', positions: [1, 2, 3, 4] })
  await command({ type: 'setLayers', outputId: 'wide', patch: { background: 'B', scene: 'standings' } }); await command({ type: 'take', mode: 'cut', outputIds: ['wide'] })
  await page.goto('/out/wide'); await page.waitForSelector('body[data-ready]'); const row = await page.locator('.standing-row[data-slot="3"]').elementHandle()
  await command({ type: 'saveResults', raceNo: 2, trackId: 'water-park', positions: [4, 3, 2, 1] })
  await command({ type: 'take', mode: 'auto', outputIds: ['wide'] })
  await expect(page.locator('.standing-row').first()).toHaveAttribute('data-slot', '3'); expect(await row!.evaluate(e => e.isConnected)).toBe(true); await expect(page.locator('.standing-row.first')).toHaveCount(2)
})

test('hd scenes stay inside 1920×1080', async ({ page }) => {
  for (const scene of ['lineup', 'nextRace', 'standings', 'winner'] as const) {
    await command({ type: 'setLayers', outputId: 'stream', patch: { background: 'B', scene } }); await command({ type: 'take', mode: 'cut', outputIds: ['stream'] })
    await page.goto('/out/stream'); await page.waitForSelector('body[data-ready]'); await page.waitForTimeout(200)
    if (scene === 'winner') continue // confetti falls past the canvas edge by design
    const out = await page.locator('[data-layer=scene] *').evaluateAll(els => els.filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > 1920 + 1 || r.bottom > 1080 + 1) }).length); expect(out, scene).toBe(0)
  }
})

test('long name fits standings row', async ({ page }) => {
  await command({ type: 'setPlayer', index: 0, patch: { name: 'ALEXANDRIA-ROSE FEATHERSTONE' } })
  await command({ type: 'setLayers', outputId: 'wide', patch: { scene: 'standings' } }); await command({ type: 'take', mode: 'cut', outputIds: ['wide'] }); await page.goto('/out/wide'); await page.waitForSelector('body[data-ready]')
  expect(await page.locator('.standing-row .name').first().evaluate(e => e.firstElementChild!.getBoundingClientRect().width <= e.getBoundingClientRect().width + 1)).toBe(true)
})

for (const [id, vp] of [['wide', [3840, 1152]], ['stream', [1920, 1080]]] as const)
  for (const scene of ['lineup', 'nextRace', 'standings', 'winner'] as const)
    test(`visual: ${id} ${scene}`, async ({ page }) => {
      await page.setViewportSize({ width: vp[0], height: vp[1] })
      await command({ type: 'saveResults', raceNo: 1, trackId: 'mario-kart-stadium', positions: [1, 2, 3, 4] })
      await command({ type: 'setLayers', outputId: id, patch: { background: 'B', scene, trackCard: false, lowerThirds: { on: false, players: [] } } })
      await command({ type: 'take', mode: 'cut', outputIds: [id] })
      await page.goto(`/out/${id}`); await page.waitForSelector('body[data-ready]'); await page.waitForTimeout(500)
      await expect(page.locator('#canvas')).toHaveScreenshot(`${id}-${scene}.png`, { maxDiffPixelRatio: 0.02, animations: 'disabled', mask: [page.locator('.confetti')] })
    })
