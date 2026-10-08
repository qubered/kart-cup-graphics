import { test, expect } from '@playwright/test'
import { command, state, resetShow } from './helpers'

test.beforeEach(resetShow)

test('save a design, change it, recall it from the Presets tab', async ({ page }) => {
  await command({ type: 'setLayers', outputId: 'wide', patch: { scene: 'lineup' } })
  await command({ type: 'arm', outputIds: ['wide', 'twins'] })
  await page.goto('/control')
  await page.getByRole('tab', { name: 'Presets' }).click()
  await page.locator('input[name=presetName]').fill('Lineup look')
  await page.getByRole('button', { name: 'Save preset' }).click()
  await expect(page.locator('[data-preset=preset-1]')).toContainText('Lineup look')

  await command({ type: 'setLayers', outputId: 'wide', patch: { scene: 'none' } })
  await command({ type: 'arm', outputIds: [] })
  await page.locator('[data-preset=preset-1] [data-recall-cut]').click()
  await expect.poll(async () => (await state()).layers.wide.scene).toBe('lineup')
  const s = await state()
  expect(s.armed).toEqual(['wide', 'twins'])
  expect(s.program.wide.view.scene?.kind).toBe('lineup')
})
