import { expect, test, type Page } from '@playwright/test'
import { command, resetShow, state } from './helpers'

test.beforeEach(resetShow)

async function takeIconBackground() {
  await command({ type: 'setLayers', outputId: 'wide', patch: { background: 'B' } })
  await command({ type: 'take', mode: 'cut', outputIds: ['wide'] })
}
const mush = (page: Page) => page.locator('[data-bg=B] #pattern-tile use[href="#i-mush"]')
const image = (page: Page) => page.locator('[data-bg=B] #pattern-tile image[data-mattify]')

test('off by default: the normal mushroom is shown', async ({ page }) => {
  await takeIconBackground()
  await page.goto('/out/wide'); await page.waitForSelector('body[data-ready]')
  await expect(mush(page)).toHaveCount(1)
  await expect(image(page)).toHaveCount(0)
})

test('Settings toggle turns Mattify on and off', async ({ page }) => {
  await page.goto('/control')
  await page.getByRole('tab', { name: 'Settings' }).click()
  const toggle = page.locator('input[name=mattify]')
  await expect(toggle).not.toBeChecked()
  await toggle.check()
  await expect.poll(async () => (await state()).settings.mattify).toBe(true)
  await expect(toggle).toBeChecked()
  await toggle.uncheck()
  await expect.poll(async () => (await state()).settings.mattify).toBe(false)
})

test('on: the custom image replaces the mushroom, live, with no Take', async ({ page }) => {
  await takeIconBackground()
  await page.goto('/out/wide'); await page.waitForSelector('body[data-ready]')
  await expect(mush(page)).toHaveCount(1)
  await command({ type: 'setMattify', on: true })           // no take
  await expect(image(page)).toHaveCount(1)
  await expect(mush(page)).toHaveCount(0)
  expect(await image(page).getAttribute('href')).toBe('/assets/mattify/mushroom.png')
  // the image really loads
  expect(await page.evaluate(async () => (await fetch('/assets/mattify/mushroom.png')).status)).toBe(200)
  await command({ type: 'setMattify', on: false })
  await expect(mush(page)).toHaveCount(1)
  await expect(image(page)).toHaveCount(0)
})

test('a page loaded while Mattify is on shows the image on its first frame', async ({ page }) => {
  await command({ type: 'setMattify', on: true })
  await takeIconBackground()
  await page.goto('/out/wide'); await page.waitForSelector('body[data-ready]')
  await expect(image(page)).toHaveCount(1)
  // preloaded: the browser has already decoded it by the time the page is ready
  const loaded = await page.evaluate(() => performance.getEntriesByType('resource').some(e => e.name.endsWith('/assets/mattify/mushroom.png')))
  expect(loaded).toBe(true)
})

test('Mattify does not change the other backgrounds, and survives a show reset', async ({ page }) => {
  await command({ type: 'setMattify', on: true })
  await command({ type: 'resetShow' })
  expect((await state()).settings.mattify).toBe(true)
  await command({ type: 'take', mode: 'cut', outputIds: ['wide'] })      // default wide = background A
  await page.goto('/out/wide'); await page.waitForSelector('body[data-ready]')
  await expect(page.locator('[data-bg=A]')).toBeVisible()
  expect(await page.locator('image[data-mattify]').count()).toBe(0)
})
