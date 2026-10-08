import { test, expect } from '@playwright/test'
import type { ScenePart, WinScreenConfig } from '../../shared/types'
import { command, resetShow } from './helpers'

test.beforeEach(resetShow)

type Fmt = { id: 'wide' | 'twins' | 'stream'; vp: [number, number] }
const WIDE: Fmt = { id: 'wide', vp: [3840, 1152] }
const HD: Fmt = { id: 'stream', vp: [1920, 1080] }
const TWIN: Fmt = { id: 'twins', vp: [1920, 1152] }

/** Four saved races, so the board has several per-race columns and the last race has a clear winner (slot 2). */
async function seed() {
  const races: [string, number[]][] = [
    ['mario-kart-stadium', [1, 2, 3, 4]], ['water-park', [2, 1, 4, 3]], ['tour-singapore-speedway', [3, 2, 1, 4]],
  ]
  for (const [i, [trackId, positions]] of races.entries()) await command({ type: 'saveResults', raceNo: i + 1, trackId, positions })
}

async function show(page: import('@playwright/test').Page, f: Fmt, scene: 'raceWin' | 'cupWin', part: ScenePart, layout: WinScreenConfig['layout'] = 'heroLeft') {
  await seed()
  if (layout !== 'heroLeft') {
    await command({ type: 'createTournament', name: 'E2E', template: 'empty' })
    await command({ type: 'setWinScreenConfig', patch: { layout } })
  }
  await page.setViewportSize({ width: f.vp[0], height: f.vp[1] })
  await command({ type: 'setLayers', outputId: f.id, patch: { background: 'B', scene, part, trackCard: false, lowerThirds: { on: false, players: [] } } })
  await command({ type: 'take', mode: 'cut', outputIds: [f.id] })
  await page.goto(`/out/${f.id}`); await page.waitForSelector('body[data-ready]'); await page.waitForTimeout(500)
}

const insideCanvas = (page: import('@playwright/test').Page, f: Fmt) =>
  page.locator('[data-layer=scene] *').evaluateAll((els, vp) => els.filter((e) => {
    const r = e.getBoundingClientRect()
    return r.width > 0 && !e.closest('.rays') && (r.left < -1 || r.top < -1 || r.right > vp[0] + 1 || r.bottom > vp[1] + 1)
  }).length, f.vp)

const CASES: { name: string; f: Fmt; part: ScenePart; layout?: WinScreenConfig['layout'] }[] = [
  { name: 'wide-full', f: WIDE, part: 'full' },
  { name: 'wide-centre', f: WIDE, part: 'full', layout: 'heroCentre' },
  { name: 'wide-hero', f: WIDE, part: 'hero' },
  { name: 'wide-board', f: WIDE, part: 'board' },
  { name: 'hd-full', f: HD, part: 'full' },
  { name: 'hd-centre', f: HD, part: 'full', layout: 'heroCentre' },
  { name: 'twin-hero', f: TWIN, part: 'hero' },
  { name: 'twin-board', f: TWIN, part: 'board' },
]

for (const scene of ['raceWin', 'cupWin'] as const)
  for (const c of CASES)
    test(`visual: ${scene} ${c.name}`, async ({ page }) => {
      await show(page, c.f, scene, c.part, c.layout)
      expect(await insideCanvas(page, c.f)).toBe(0)
      await expect(page.locator('#canvas')).toHaveScreenshot(`${scene}-${c.name}.png`, { maxDiffPixelRatio: 0.02, animations: 'disabled' })
    })

test('parts render only their block', async ({ page }) => {
  await show(page, WIDE, 'raceWin', 'hero')
  await expect(page.locator('[data-win-hero]')).toHaveCount(1); await expect(page.locator('[data-win-board]')).toHaveCount(0)
  await command({ type: 'setLayers', outputId: 'wide', patch: { part: 'board' } }); await command({ type: 'take', mode: 'cut', outputIds: ['wide'] })
  await expect(page.locator('[data-win-board]')).toHaveCount(1); await expect(page.locator('[data-win-hero]')).toHaveCount(0)
  await expect(page.locator('[data-layer=scene]')).toContainText('R3')
})

test('long names stay inside hero and board', async ({ page }) => {
  await command({ type: 'setPlayer', index: 2, patch: { name: 'ALEXANDRIA-ROSE FEATHERSTONE' } })
  await show(page, HD, 'raceWin', 'full')
  expect(await insideCanvas(page, HD)).toBe(0)
  for (const sel of ['[data-win-hero] .name', '[data-win-board] .name']) {
    expect(await page.locator(sel).evaluateAll((els) => els.every((e) => e.firstElementChild!.getBoundingClientRect().width <= e.getBoundingClientRect().width + 1))).toBe(true)
  }
})
