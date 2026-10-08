import { test, expect } from '@playwright/test'
import { command, resetShow } from './helpers'

test.beforeEach(async () => { await resetShow() })

const CASES: [string, string, string, number][] = [
  ['wide', 'center', 'wide', 2], ['wide', 'title', 'wide', 2], ['wide', 'sides', 'wide', 2],
  ['twins', 'center', 'twins', 2], ['pillars', 'center', 'pillars', 2], ['pillars', 'title', 'pillars', 2],
]

for (const [out, style, path, codes] of CASES) {
  test(`QR scene on ${out} (${style}) shows ${codes} labelled codes and the text`, async ({ page }) => {
    await command({ type: 'setLayers', outputId: out, patch: { background: out === 'pillars' ? 'B' : 'A', scene: 'qr', qrStyle: style as 'center' } })
    await command({ type: 'take', mode: 'cut', outputIds: [out] })
    await page.setViewportSize({ width: out === 'wide' ? 3840 : 1920, height: 1152 })
    await page.goto(`/out/${path}`)
    const scene = page.locator('[data-layer=scene]')
    await expect(scene.locator('svg[aria-label="QR code"]')).toHaveCount(style === 'center' && out === 'twins' ? 2 : codes)
    await expect(scene).toContainText('External')
    await expect(scene).toContainText('Internal')
    await expect(scene).toContainText('donation')
    if (style === 'title') await expect(scene.locator('.title-lockup')).toHaveCount(1)
    await page.waitForTimeout(300)
    await page.locator('#canvas').screenshot({ path: `test-results/qr-${out}-${style}.png` })
  })
}

test('edit QR text and links on the Text & Fonts tab', async ({ page }) => {
  await page.goto('/control')
  await page.getByRole('tab', { name: 'Text & Fonts' }).click()
  await page.locator('input[name=qrLabel0]').fill('Public')
  await page.locator('input[name=qrUrl1]').fill('https://internal.test/donate')
  await page.locator('textarea[name=qrText]').fill('Scan to donate')
  await expect.poll(async () => (await (await import('./helpers')).state()).draft.qr).toEqual({
    text: 'Scan to donate',
    items: [{ label: 'Public', url: 'https://example.com/external' }, { label: 'Internal', url: 'https://internal.test/donate' }],
  })
})
