import { expect, test, type Page } from '@playwright/test'
import { command, resetShow } from './helpers'

test.beforeEach(resetShow)

/** Twins output on air with the default lower thirds + track card, taken as a CUT. */
async function onAir(page: Page) {
  await command({ type: 'take', mode: 'cut', outputIds: ['twins'] })
  await page.goto('/out/twins'); await page.waitForSelector('body[data-ready]')
}
async function autoTake() {
  await command({ type: 'setTransition', speed: 'slow' })   // 900 ms enter, so there is time to observe the overlap
  await command({ type: 'take', mode: 'auto', outputIds: ['twins'] })
}

test('character change: new headshot bounces in while the old one fades out', async ({ page }) => {
  await onAir(page)
  await command({ type: 'setPlayer', index: 0, patch: { characterId: 'bowser' } })
  await autoTake()
  const medal = page.locator('.lower-third[data-slot="0"] .medallion .flip')
  await expect(medal).toHaveCount(2)                                   // old fading out + new coming in
  const anims = await page.evaluate(() => document.getAnimations()
    .filter(a => (a.effect as KeyframeEffect | null)?.target?.closest?.('.lower-third[data-slot="0"] .medallion'))
    .map(a => (a.effect as KeyframeEffect).getKeyframes().map(k => String(k.transform ?? '')).join('|')))
  expect(anims.some(t => /scale/.test(t))).toBe(true)                  // the bounce is a scale transform
  await expect(medal).toHaveCount(1, { timeout: 4000 })
  await expect(page.locator('.lower-third[data-slot="0"] .medallion img')).toHaveAttribute('src', '/assets/characters/bowser.png')
})

test('every character shows its headshot icon, never full-body art (Peach, Bowser)', async ({ page }) => {
  await command({ type: 'setPlayer', index: 0, patch: { characterId: 'peach' } })
  await command({ type: 'setPlayer', index: 1, patch: { characterId: 'bowser' } })
  await onAir(page)
  await expect(page.locator('.lower-third[data-slot="0"] .medallion img')).toHaveAttribute('src', '/assets/characters/peach.png')
  await expect(page.locator('.lower-third[data-slot="1"] .medallion img')).toHaveAttribute('src', '/assets/characters/bowser.png')
})

test('name, character label, colour and track card text all crossfade on AUTO', async ({ page }) => {
  await onAir(page)
  await command({ type: 'setPlayer', index: 1, patch: { name: 'PRIYA', colour: 'pink' } })
  await command({ type: 'stepRace', delta: 1 })
  await autoTake()
  const lt = page.locator('.lower-third[data-slot="1"]')
  await expect(lt.locator('.name')).toHaveCount(2)                     // "Player 2" fading out, "PRIYA" in
  await expect(lt.locator('.chip')).toHaveCount(2)                     // colour change
  await expect(lt.locator('.stripe')).toHaveCount(2)
  const tc = page.locator('.track-card').first()
  await expect(tc.locator('.track-name')).toHaveCount(2)               // Mario Kart Stadium -> Water Park
  await expect(tc.locator('.race')).toHaveCount(2)                     // RACE 1 / 4 -> RACE 2 / 4
  await expect(lt.locator('.name')).toHaveCount(1, { timeout: 4000 })
  await expect(lt.locator('.name')).toContainText('PRIYA')
  await expect(tc.locator('.track-name')).toHaveCount(1)
  await expect(tc.locator('.track-name')).toContainText('Water Park')
})

test('a CUT take changes everything instantly, with no overlap', async ({ page }) => {
  await onAir(page)
  await command({ type: 'setPlayer', index: 0, patch: { name: 'SAM', characterId: 'bowser' } })
  await command({ type: 'stepRace', delta: 1 })
  await command({ type: 'take', mode: 'cut', outputIds: ['twins'] })
  await expect(page.locator('.lower-third[data-slot="0"] .name')).toContainText('SAM')
  expect(await page.locator('.lower-third[data-slot="0"] .name').count()).toBe(1)
  expect(await page.locator('.lower-third[data-slot="0"] .medallion .flip').count()).toBe(1)
  expect(await page.locator('.track-card').first().locator('.track-name').count()).toBe(1)
})
