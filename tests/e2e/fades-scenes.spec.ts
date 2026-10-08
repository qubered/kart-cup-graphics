import { test, expect, type Page } from '@playwright/test'
import { command, resetShow } from './helpers'

test.beforeEach(resetShow)

async function onAir(page: Page, scene: 'standings' | 'lineup' | 'winner') {
  await page.setViewportSize({ width: 3840, height: 1152 })
  await command({ type: 'setLayers', outputId: 'wide', patch: { background: 'B', scene } })
  await command({ type: 'take', mode: 'cut', outputIds: ['wide'] })
  await page.goto('/out/wide'); await page.waitForSelector('body[data-ready]')
}

/** Counts of elements matching `sel` whose text is exactly `text`, sampled for ~600ms; returns the max. */
const maxBoth = (page: Page, a: string, b: string, ms = 600) =>
  page.evaluate(([x, y, t]) => new Promise<number>(res => {
    let max = 0; const end = performance.now() + (t as number)
    const tick = () => {
      const txt = document.body.textContent ?? ''
      if (txt.includes(x as string) && txt.includes(y as string)) max = 2
      if (performance.now() < end) requestAnimationFrame(tick); else res(max)
    }
    tick()
  }), [a, b, ms] as const)

const saveR2 = () => command({ type: 'saveResults', raceNo: 2, trackId: 'water-park', positions: [4, 3, 2, 1] })

test('standings total points crossfade on AUTO', async ({ page }) => {
  await command({ type: 'saveResults', raceNo: 1, trackId: 'mario-kart-stadium', positions: [1, 2, 3, 4] })
  await onAir(page, 'standings')
  const pts = page.locator('.standing-row[data-slot="0"] .pts')
  await expect(pts).toHaveCount(1)
  const old = (await pts.textContent())!.replace('PTS', '')
  await command({ type: 'setTransition', speed: 'slow' })
  await saveR2()
  await command({ type: 'take', mode: 'auto', outputIds: ['wide'] })
  await expect(page.locator('.standing-row[data-slot="0"] .pts')).toHaveCount(2)
  await page.waitForTimeout(1800)
  await expect(page.locator('.standing-row[data-slot="0"] .pts')).toHaveCount(1)
  expect((await page.locator('.standing-row[data-slot="0"] .pts').textContent())!.replace('PTS', '')).not.toBe(old)
  await expect(page.locator('.standing-row[data-slot="0"] [data-swap] .swap-item').first()).toBeAttached()
})

test('standings total points never overlap on CUT', async ({ page }) => {
  await command({ type: 'saveResults', raceNo: 1, trackId: 'mario-kart-stadium', positions: [1, 2, 3, 4] })
  await onAir(page, 'standings')
  await saveR2()
  await command({ type: 'take', mode: 'cut', outputIds: ['wide'] })
  await page.waitForTimeout(100)
  for (let i = 0; i < 4; i++) await expect(page.locator(`.standing-row[data-slot="${i}"] .pts`)).toHaveCount(1)
})

test('standings leader background fades via opacity layer, rows stay mounted', async ({ page }) => {
  await command({ type: 'saveResults', raceNo: 1, trackId: 'mario-kart-stadium', positions: [1, 2, 3, 4] })
  await onAir(page, 'standings')
  const row = await page.locator('.standing-row[data-slot="3"]').elementHandle()
  await command({ type: 'setTransition', speed: 'slow' })
  await saveR2()
  await command({ type: 'take', mode: 'auto', outputIds: ['wide'] })
  await expect(page.locator('.standing-row[data-slot="3"]')).toHaveClass(/first/)
  await page.waitForTimeout(300)
  const op = await page.locator('.standing-row[data-slot="3"] .lead').evaluate(e => Number(getComputedStyle(e).opacity))
  expect(op).toBeGreaterThan(0); expect(op).toBeLessThan(1)
  expect(await row!.evaluate(e => e.isConnected)).toBe(true)
})

test('standings name changes crossfade on AUTO, not on CUT', async ({ page }) => {
  await onAir(page, 'standings')
  const nm = page.locator('.standing-row[data-slot="0"] .name')
  const old = (await nm.textContent())!
  await command({ type: 'setTransition', speed: 'slow' })
  await command({ type: 'setPlayer', index: 0, patch: { name: 'ZEBEDEE' } })
  await command({ type: 'take', mode: 'auto', outputIds: ['wide'] })
  await expect(nm).toHaveCount(2)
  await expect(page.locator('.standing-row[data-slot="0"]')).toContainText(old)
  await expect(page.locator('.standing-row[data-slot="0"]')).toContainText('ZEBEDEE')
  await page.waitForTimeout(1800)
  await expect(nm).toHaveCount(1); await expect(nm).toHaveText('ZEBEDEE')
  await command({ type: 'setPlayer', index: 0, patch: { name: 'QUICKSILVER' } })
  await command({ type: 'take', mode: 'cut', outputIds: ['wide'] })
  await expect(nm).toHaveText('QUICKSILVER'); expect(await maxBoth(page, 'ZEBEDEE', 'QUICKSILVER', 400)).toBe(0)
  await expect(nm).toHaveCount(1)
})

test('lineup name crossfades on AUTO, instant on CUT', async ({ page }) => {
  await onAir(page, 'lineup')
  const card = page.locator('.lineup-card').first()
  const old = (await card.locator('.name').textContent())!
  await command({ type: 'setTransition', speed: 'slow' })
  await command({ type: 'setPlayer', index: 0, patch: { name: 'ZEBEDEE' } })
  await command({ type: 'take', mode: 'auto', outputIds: ['wide'] })
  await expect(card.locator('.name')).toHaveCount(2)
  await expect(card).toContainText(old); await expect(card).toContainText('ZEBEDEE')
  await page.waitForTimeout(1800)
  await expect(card.locator('.name')).toHaveCount(1)
  await command({ type: 'setPlayer', index: 0, patch: { name: 'QUICKSILVER' } })
  await command({ type: 'take', mode: 'cut', outputIds: ['wide'] })
  await expect(card.locator('.name')).toHaveText('QUICKSILVER'); await expect(card.locator('.name')).toHaveCount(1)
})

test('winner points crossfade on AUTO, instant on CUT', async ({ page }) => {
  await command({ type: 'saveResults', raceNo: 1, trackId: 'mario-kart-stadium', positions: [1, 2, 3, 4] })
  await onAir(page, 'winner')
  const pts = page.locator('.winner .pts')
  await expect(pts).toHaveCount(1)
  await command({ type: 'setTransition', speed: 'slow' })
  await saveR2()
  await command({ type: 'take', mode: 'auto', outputIds: ['wide'] })
  await expect(pts).toHaveCount(2)
  await page.waitForTimeout(1800)
  await expect(pts).toHaveCount(1)
  await command({ type: 'saveResults', raceNo: 3, trackId: 'water-park', positions: [1, 2, 3, 4] })
  await command({ type: 'take', mode: 'cut', outputIds: ['wide'] })
  await page.waitForTimeout(100)
  await expect(pts).toHaveCount(1)
})
