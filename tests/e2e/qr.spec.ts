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

test('long text shrinks to stay inside its box', async ({ page }) => {
  await command({ type: 'setQr', patch: { text: 'Lorem ipsum dolor sit amet. '.repeat(30).trim() } })
  for (const [out, w] of [['wide', 3840], ['twins', 1920], ['pillars', 1920]] as const) {
    await command({ type: 'setLayers', outputId: out, patch: { scene: 'qr', qrStyle: 'sides' } })
    await command({ type: 'take', mode: 'cut', outputIds: [out] })
    await page.setViewportSize({ width: w, height: 1152 })
    await page.goto(`/out/${out}`)
    await expect(page.locator('.panel').first()).toBeVisible()
    const hs = await page.locator('.panel').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))
    const max = out === 'pillars' ? 780 : out === 'twins' ? 780 : 700
    for (const h of hs) expect(h).toBeLessThanOrEqual(max + 1)
    await page.locator('#canvas').screenshot({ path: `test-results/qr-long-${out}.png` })
  }
})

for (const [out, w] of [['wide', 3840], ['pillars', 1920]] as const) {
  test(`notice with QR codes on ${out}`, async ({ page }) => {
    await command({ type: 'setLayers', outputId: out, patch: { background: 'A', scene: 'notice', noticeQr: true } })
    await command({ type: 'take', mode: 'cut', outputIds: [out] })
    await page.setViewportSize({ width: w, height: out === 'wide' ? 1152 : 1080 })
    await page.goto(`/out/${out}`)
    const scene = page.locator('[data-layer=scene]')
    await expect(scene.locator('svg[aria-label="QR code"]')).toHaveCount(2)
    await expect(scene).toContainText('NOTICE BOARD')
    await page.waitForTimeout(300)
    await page.locator('#canvas').screenshot({ path: `test-results/notice-qr-${out}.png` })
  })
}

test('notice without QR codes still shows just the text, in the kart box', async ({ page }) => {
  await command({ type: 'setLayers', outputId: 'wide', patch: { background: 'A', scene: 'notice', noticeQr: false } })
  await command({ type: 'take', mode: 'cut', outputIds: ['wide'] })
  await page.setViewportSize({ width: 3840, height: 1152 })
  await page.goto('/out/wide')
  await expect(page.locator('[data-layer=scene] .kart-box')).toHaveCount(1)
  await expect(page.locator('[data-layer=scene] svg[aria-label="QR code"]')).toHaveCount(0)
  await page.waitForTimeout(300)
  await page.locator('#canvas').screenshot({ path: 'test-results/notice-wide.png' })
})
