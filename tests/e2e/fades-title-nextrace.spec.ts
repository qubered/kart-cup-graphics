import { test, expect } from '@playwright/test'
import { command, resetShow } from './helpers'

test.beforeEach(resetShow)

async function onAir(page: import('@playwright/test').Page, scene: 'nextRace' | 'title') {
  await command({ type: 'setLayers', outputId: 'wide', patch: { background: 'A', scene } })
  await command({ type: 'take', mode: 'cut', outputIds: ['wide'] })
  await page.goto('/out/wide'); await page.waitForSelector('body[data-ready]'); await page.waitForTimeout(300)
}

for (const mode of ['auto', 'cut'] as const)
  test(`nextRace track change ${mode === 'auto' ? 'crossfades' : 'cuts'}`, async ({ page }) => {
    await onAir(page, 'nextRace')
    const heading = page.locator('[data-layer=scene] .nr-track .swap-item')
    const old = (await page.locator('[data-layer=scene] .nr-track .heading').first().textContent())!.trim()
    await command({ type: 'setTransition', speed: 'slow' })
    await command({ type: 'stepRace', delta: 1 })
    await command({ type: 'take', mode, outputIds: ['wide'] })
    if (mode === 'auto') {
      await expect(heading).toHaveCount(2, { timeout: 1500 })
      await expect(page.locator('[data-layer=scene] .nr-image .swap-item')).toHaveCount(2)
      await expect(heading).toHaveCount(1, { timeout: 5000 })
    } else {
      await expect(heading).toHaveCount(1)
      await page.waitForTimeout(100)
      await expect(heading).toHaveCount(1)
    }
    expect((await page.locator('[data-layer=scene] .nr-track .heading').first().textContent())!.trim()).not.toBe(old)
  })

for (const mode of ['auto', 'cut'] as const)
  test(`title text change ${mode === 'auto' ? 'crossfades' : 'cuts'}`, async ({ page }) => {
    await onAir(page, 'title')
    await command({ type: 'setTransition', speed: 'slow' })
    await command({ type: 'setEventText', patch: { title: 'BRAND NEW CUP' } })
    await command({ type: 'take', mode, outputIds: ['wide'] })
    const lock = page.locator('[data-layer=scene] .title-lockup')
    if (mode === 'auto') {
      await expect(lock).toHaveCount(2, { timeout: 1500 })
      await expect(lock).toHaveCount(1, { timeout: 5000 })
    } else {
      await expect(lock).toHaveCount(1)
      await page.waitForTimeout(100)
      await expect(lock).toHaveCount(1)
    }
    await expect(lock).toContainText('BRAND NEW CUP')
  })
