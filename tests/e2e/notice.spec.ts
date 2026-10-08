import { test, expect } from '@playwright/test'
import { command, state, resetShow } from './helpers'

test.beforeEach(async () => { await resetShow() })

test('type and format notice text in the editor, take it to air', async ({ page }) => {
  await page.goto('/control')
  await page.getByRole('tab', { name: 'Text & Fonts' }).click()
  const surface = page.getByRole('textbox', { name: 'Notice board text' })
  await surface.click()
  await page.keyboard.press('Control+a')
  await page.keyboard.type('Doors open at 7')
  await page.keyboard.press('Control+a')
  await page.getByRole('button', { name: 'Italic' }).click()
  await page.getByRole('button', { name: 'Align right' }).click()
  await page.getByRole('button', { name: 'Colour #ffd21f' }).click()
  await page.locator('select[name=noticeSize]').selectOption('96')
  await expect.poll(async () => JSON.stringify((await state()).draft.notice)).toContain('Doors open at 7')
  const doc = (await state()).draft.notice
  expect(doc.blocks[0].align).toBe('right')
  expect(doc.blocks[0].runs[0]).toMatchObject({ text: 'Doors open at 7', italic: true, color: '#ffd21f', size: 96 })

  await command({ type: 'setLayers', outputId: 'wide', patch: { scene: 'notice' } })
  await command({ type: 'take', mode: 'cut', outputIds: ['wide'] })
  await page.goto('/out/wide')
  await expect(page.locator('[data-layer=scene]')).toContainText('Doors open at 7')
})
