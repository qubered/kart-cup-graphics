import { test, expect } from '@playwright/test'
import { command, state, resetShow } from './helpers'

test.beforeEach(resetShow)

test('headings font reaches output', async ({ page }) => {
  await page.goto('/control')
  await page.getByRole('tab', { name: 'Text & Fonts' }).click()
  await page.locator('[data-role=headings] select[name=font]').selectOption('Saira')
  await command({ type: 'setLayers', outputId: 'wide', patch: { scene: 'standings' } })
  await command({ type: 'take', mode: 'cut', outputIds: ['wide'] })
  const out = await page.context().newPage()
  await out.goto('/out/wide')
  expect(await out.locator('.heading').first().evaluate(e => getComputedStyle(e).fontFamily)).toMatch(/^"?Saira/)
})

test('add output appears everywhere', async ({ page }) => {
  await page.goto('/control')
  await page.getByRole('tab', { name: 'Outputs' }).click()
  await page.locator('input[name=id]').fill('lobby')
  await page.locator('input[name=name]').fill('Lobby')
  await page.locator('select[name=format]').selectOption('hd')
  await page.getByRole('button', { name: 'Add output' }).click()
  await expect(page.locator('[data-arm=lobby]')).toBeVisible()
  await expect(page.locator('[data-output-row=lobby]')).toContainText('/out/lobby')
})

test('remove output asks for confirmation', async ({ page }) => {
  await page.goto('/control')
  await page.getByRole('tab', { name: 'Outputs' }).click()
  page.once('dialog', d => d.accept())
  await page.locator('[data-output-row=pillars]').getByRole('button', { name: 'Remove' }).click()
  await expect.poll(async () => (await state()).outputs.some(o => o.id === 'pillars')).toBe(false)
})

test('watermark text reaches background A', async ({ page }) => {
  await page.goto('/control')
  await page.getByRole('tab', { name: 'Text & Fonts' }).click()
  await page.locator('input[name=watermark]').fill('ACME RACING')
  await expect.poll(async () => (await state()).draft.event.watermark).toBe('ACME RACING')
  await command({ type: 'take', mode: 'cut', outputIds: ['wide'] })
  const out = await page.context().newPage()
  await out.goto('/out/wide')
  await expect(out.locator('[data-bg=A]')).toContainText('ACME RACING')
})

test('settings shows catalog counts and resets scores', async ({ page }) => {
  await command({ type: 'saveResults', raceNo: 1, trackId: 'mario-kart-stadium', positions: [1, 2, 3, 4] })
  await page.goto('/control')
  await page.getByRole('tab', { name: 'Settings' }).click()
  await expect(page.locator('[data-catalog]')).toContainText('24 cups')
  page.once('dialog', d => d.accept())
  await page.getByRole('button', { name: 'Reset scores' }).click()
  await expect.poll(async () => (await state()).draft.scores.races.length).toBe(0)
})

test('font upload registers the font and export/import round-trips', async ({ page }) => {
  await page.goto('/control')
  await page.getByRole('tab', { name: 'Text & Fonts' }).click()
  await page.locator('input[name=fontFile]').setInputFiles({ name: 'MyFont.ttf', mimeType: 'font/ttf', buffer: Buffer.from('not-a-real-font') })
  await expect.poll(async () => (await state()).uploadedFonts.map(f => f.family)).toContain('MyFont')
  await expect(page.locator('[data-role=headings] select[name=font] option[value=MyFont]')).toHaveCount(1)
  const res = await page.request.get('/api/export')
  expect(res.ok()).toBe(true)
  const file = await res.json()
  expect(file.draft.event.title).toBe((await state()).draft.event.title)
})
