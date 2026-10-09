import { test, expect, type Page } from '@playwright/test'
import { command, resetShow, state } from './helpers'

// The divider between the monitors and the Looks library, and the Side by side / Stacked switch: drag, keys, remembered.

test.beforeEach(resetShow)

const pane = (page: Page) => page.locator('[data-monitors-pane]')
const split = (page: Page) => page.locator('[data-splitter]')
const height = async (page: Page) => (await pane(page).boundingBox())!.height
const looksTop = async (page: Page) => (await page.locator('[data-library]').boundingBox())!.y
const pv = (page: Page) => page.locator('[data-monitor=preview]').boundingBox().then((b) => b!)
const pg = (page: Page) => page.locator('[data-monitor=program]').boundingBox().then((b) => b!)

async function fresh(page: Page) {
  await page.goto('/control')
  await page.evaluate(() => { localStorage.removeItem('kcg.control.monitorsHeight'); localStorage.removeItem('kcg.control.monitorsStacked') })
  await page.reload()
}
async function drag(page: Page, dy: number) {
  const b = (await split(page).boundingBox())!
  const x = b.x + b.width / 2, y = b.y + b.height / 2
  await page.mouse.move(x, y); await page.mouse.down()
  await page.mouse.move(x, y + dy / 2, { steps: 4 }); await page.mouse.move(x, y + dy, { steps: 4 })
  await page.mouse.up()
}

test('dragging up gives the Looks library the room, down gives it back but never past the full-width monitors; remembered', async ({ page }) => {
  await fresh(page)
  const h0 = await height(page), l0 = await looksTop(page)
  await drag(page, -70)
  const h1 = await height(page)
  expect(h1).toBeLessThan(h0 - 50)
  expect(await looksTop(page)).toBeLessThan(l0 - 50)
  const a = await pv(page), b = await pg(page)
  expect(Math.abs(a.y - b.y)).toBeLessThan(2) // still side by side
  expect(a.width).toBeGreaterThan(200)
  await page.reload()
  expect(Math.abs((await height(page)) - h1)).toBeLessThan(2)
  await drag(page, 600)
  expect(Math.abs((await height(page)) - h0)).toBeLessThan(2) // no blank space below the monitors
})

test('Stacked puts Preview above Program as big as the column allows, Side by side goes back', async ({ page }) => {
  await fresh(page)
  const h0 = await height(page)
  await page.locator('[data-arrange=stack]').click()
  const a = await pv(page), b = await pg(page)
  expect(b.y).toBeGreaterThan(a.y + a.height - 2)
  expect(await height(page)).toBeGreaterThan(h0 + 100)
  expect(a.width).toBeGreaterThan(900)
  expect((await page.locator('[data-library]').boundingBox())!.height).toBeGreaterThanOrEqual(140)
  await page.reload()
  expect((await pg(page)).y).toBeGreaterThan((await pv(page)).y + 100) // remembered
  await page.locator('[data-arrange=side]').click()
  const c = await pv(page), d = await pg(page)
  expect(Math.abs(c.y - d.y)).toBeLessThan(2)
  expect(Math.abs((await height(page)) - h0)).toBeLessThan(2)
})

test('stacked monitors shrink with the divider and the Looks library always keeps room', async ({ page }) => {
  await fresh(page)
  await page.locator('[data-arrange=stack]').click()
  const w0 = (await pv(page)).width
  await drag(page, -150)
  expect((await pv(page)).width).toBeLessThan(w0 - 100)
  await drag(page, 2000)
  expect((await page.locator('[data-library]').boundingBox())!.height).toBeGreaterThanOrEqual(140)
})

test('keys: arrows resize, Home and End jump, Esc resets; the divider swallows only those keys', async ({ page }) => {
  await fresh(page)
  const auto = await height(page)
  await split(page).focus()
  await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowUp')
  const h1 = await height(page)
  expect(h1).toBeLessThan(auto - 30)
  await page.keyboard.press('Shift+ArrowDown')
  expect(await height(page)).toBeGreaterThan(h1 + 30)
  await page.keyboard.press('Home')
  expect(await height(page)).toBeLessThan(140)
  await page.keyboard.press('End')
  expect(Math.abs((await height(page)) - auto)).toBeLessThan(2)
  await page.keyboard.press('ArrowUp'); await page.keyboard.press('Escape')
  expect(Math.abs((await height(page)) - auto)).toBeLessThan(2)
})

test('Space and Enter still work for the show while the divider has focus', async ({ page }) => {
  await command({ type: 'arm', outputIds: ['wide'] })
  await command({ type: 'setLayers', outputId: 'wide', patch: { scene: 'standings' } })
  await page.goto('/control')
  await split(page).focus()
  await page.keyboard.press('Enter')
  await expect.poll(async () => (await state()).program.wide?.view?.scene?.kind).toBe('standings')
})

test('resizing never changes the show', async ({ page }) => {
  await page.goto('/control')
  const snap = async () => { const s = await state(); return JSON.stringify({ d: s.draft, l: s.layers, p: s.presets, a: s.armed, st: s.stacks }) }
  const before = await snap()
  await drag(page, -80)
  await split(page).focus(); await page.keyboard.press('ArrowUp')
  await page.locator('[data-arrange=stack]').click()
  expect(await snap()).toBe(before)
})
