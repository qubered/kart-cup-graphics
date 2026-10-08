import { test, expect } from '@playwright/test'
import type { ScenePart, WinScreenConfig } from '../../shared/types'
import { command, resetShow } from './helpers'

test.beforeEach(resetShow)

type Fmt = { id: 'wide' | 'twins' | 'stream'; vp: [number, number] }
const WIDE: Fmt = { id: 'wide', vp: [3840, 1152] }
const HD: Fmt = { id: 'stream', vp: [1920, 1080] }
const TWIN: Fmt = { id: 'twins', vp: [1920, 1152] }

type Off = (keyof WinScreenConfig['blocks'])[]

async function seed() {
  const races: [string, number[]][] = [
    ['mario-kart-stadium', [1, 2, 3, 4]], ['water-park', [2, 1, 4, 3]], ['tour-singapore-speedway', [3, 2, 1, 4]],
  ]
  for (const [i, [trackId, positions]] of races.entries()) await command({ type: 'saveResults', raceNo: i + 1, trackId, positions })
}

async function show(page: import('@playwright/test').Page, f: Fmt, scene: 'raceWin' | 'cupWin', part: ScenePart, off: Off, layout: WinScreenConfig['layout'] = 'heroLeft') {
  await seed()
  const blocks = Object.fromEntries(off.map((k) => [k, false]))
  await command({ type: 'createTournament', name: 'E2E', template: 'empty' })
  await command({ type: 'setWinScreenConfig', patch: { layout, blocks } })
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

const CASES: { name: string; f: Fmt; part: ScenePart; off: Off; layout?: WinScreenConfig['layout'] }[] = [
  // Wide: every toggle individually, plus the emblem+track pair (hero meta empty / board header gone).
  { name: 'wide-no-hero', f: WIDE, part: 'full', off: ['hero'] },
  { name: 'wide-no-board', f: WIDE, part: 'full', off: ['board'] },
  { name: 'wide-no-emblem', f: WIDE, part: 'full', off: ['cupEmblem'] },
  { name: 'wide-no-track', f: WIDE, part: 'full', off: ['trackName'] },
  { name: 'wide-no-points', f: WIDE, part: 'full', off: ['racePoints'] },
  { name: 'wide-no-meta', f: WIDE, part: 'full', off: ['cupEmblem', 'trackName'] },
  { name: 'wide-no-hero-no-emblem', f: WIDE, part: 'full', off: ['hero', 'cupEmblem'] },
  { name: 'wide-no-hero-no-meta', f: WIDE, part: 'full', off: ['hero', 'cupEmblem', 'trackName'] },
  { name: 'wide-centre-no-points', f: WIDE, part: 'full', off: ['racePoints'], layout: 'heroCentre' },
  { name: 'wide-centre-no-meta', f: WIDE, part: 'full', off: ['cupEmblem', 'trackName'], layout: 'heroCentre' },
  // HD: representative subset.
  { name: 'hd-no-hero', f: HD, part: 'full', off: ['hero'] },
  { name: 'hd-no-board', f: HD, part: 'full', off: ['board'] },
  { name: 'hd-no-points', f: HD, part: 'full', off: ['racePoints'] },
  { name: 'hd-no-meta', f: HD, part: 'full', off: ['cupEmblem', 'trackName'] },
  { name: 'hd-centre-no-points', f: HD, part: 'full', off: ['racePoints'], layout: 'heroCentre' },
  // Twin parts.
  { name: 'twin-hero-no-meta', f: TWIN, part: 'hero', off: ['cupEmblem', 'trackName'] },
  { name: 'twin-hero-no-points', f: TWIN, part: 'hero', off: ['racePoints'] },
  { name: 'twin-board-no-points', f: TWIN, part: 'board', off: ['racePoints'] },
  { name: 'twin-board-no-meta', f: TWIN, part: 'board', off: ['cupEmblem', 'trackName'] },
]

for (const scene of ['raceWin', 'cupWin'] as const)
  for (const c of CASES)
    test(`blocks: ${scene} ${c.name}`, async ({ page }) => {
      await show(page, c.f, scene, c.part, c.off, c.layout)
      expect(await insideCanvas(page, c.f)).toBe(0)
      await expect(page.locator('#canvas')).toHaveScreenshot(`${scene}-${c.name}.png`, { maxDiffPixelRatio: 0.02, animations: 'disabled' })
    })
