import { test, expect, type Page } from '@playwright/test'
import { command, resetShow, state } from './helpers'

// The divider between the monitors and the Looks library: drag, keys, double-click, remembered.

test.beforeEach(resetShow)

const pane = (page: Page) => page.locator('[data-monitors-pane]')
const split = (page: Page) => page.locator('[data-splitter]')
const height = async (page: Page) => (await pane(page).boundingBox())!.height
const looksTop = async (page: Page) => (await page.locator('[data-library]').boundingBox())!.y

async function drag(page: Page, dy: number) {
  const b = (await split(page).boundingBox())!
  const x = b.x + b.width / 2, y = b.y + b.height / 2
  await page.mouse.move(x, y); await page.mouse.down()
  await page.mouse.move(x, y + dy / 2, { steps: 4 }); await page.mouse.move(x, y + dy, { steps: 4 })
  await page.mouse.up()
}

test('dragging the divider down makes the monitors bigger and the Looks library smaller, and it is remembered', async ({ page }) => {
  await page.goto('/control'); await page.evaluate(() => localStorage.removeItem('kcg.control.monitorsHeight'))
  await page.reload()
  const h0 = await height(page), l0 = await looksTop(page)
  await drag(page, 120)
  const h1 = await height(page)
  expect(h1).toBeGreaterThan(h0 + 100)
  expect(await looksTop(page)).toBeGreaterThan(l0 + 100)
  await page.reload()
  expect(Math.abs((await height(page)) - h1)).toBeLessThan(2)
})

test('dragging up shrinks the monitors, which stay in proportion and side by side', async ({ page }) => {
  await page.goto('/control'); await page.evaluate(() => localStorage.removeItem('kcg.control.monitorsHeight'))
  await page.reload()
  const h0 = await height(page)
  await drag(page, -60)
  expect(await height(page)).toBeLessThan(h0 - 40)
  const pv = (await page.locator('[data-monitor=preview]').boundingBox())!, pg = (await page.locator('[data-monitor=program]').boundingBox())!
  expect(Math.abs(pv.y - pg.y)).toBeLessThan(2)
  expect(pv.width).toBeGreaterThan(200)
})

test('a tall pane stacks the wide monitors, a short one puts them side by side again', async ({ page }) => {
  await page.goto('/control'); await page.evaluate(() => localStorage.removeItem('kcg.control.monitorsHeight'))
  await page.reload()
  await drag(page, 400)
  const pv = (await page.locator('[data-monitor=preview]').boundingBox())!, pg = (await page.locator('[data-monitor=program]').boundingBox())!
  expect(pg.y).toBeGreaterThan(pv.y + pv.height - 2)
  await split(page).dblclick()
  const a = (await page.locator('[data-monitor=preview]').boundingBox())!, b = (await page.locator('[data-monitor=program]').boundingBox())!
  expect(Math.abs(a.y - b.y)).toBeLessThan(2)
})

test('the Looks library always keeps room, whatever the drag', async ({ page }) => {
  await page.goto('/control'); await page.evaluate(() => localStorage.removeItem('kcg.control.monitorsHeight'))
  await page.reload()
  await drag(page, 2000)
  const looks = (await page.locator('[data-library]').boundingBox())!
  expect(looks.height).toBeGreaterThanOrEqual(140)
})

test('keys: arrows resize, Home and End jump, Esc resets to automatic; Enter is not swallowed', async ({ page }) => {
  await page.goto('/control'); await page.evaluate(() => localStorage.removeItem('kcg.control.monitorsHeight'))
  await page.reload()
  const auto = await height(page)
  await split(page).focus()
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown')
  const h1 = await height(page)
  expect(h1).toBeGreaterThan(auto + 30)
  await page.keyboard.press('Shift+ArrowUp')
  expect(await height(page)).toBeLessThan(h1 - 30)
  await page.keyboard.press('Home')
  expect(await height(page)).toBeLessThan(140)
  await page.keyboard.press('End')
  expect(await height(page)).toBeGreaterThan(auto)
  await page.keyboard.press('Escape')
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
  await drag(page, 80)
  await split(page).focus(); await page.keyboard.press('ArrowDown')
  expect(await snap()).toBe(before)
})
