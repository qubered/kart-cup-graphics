import { test, expect, type Page } from '@playwright/test'
import { command, resetShow } from './helpers'

test.beforeEach(resetShow)

const OUTPUTS = [
  { id: 'wide', vp: [3840, 1152] },
  { id: 'stream', vp: [1920, 1080] },
  { id: 'twins', vp: [1920, 1152] },
] as const

const TRACKS = ['mario-kart-stadium', 'water-park', 'sweet-sweet-canyon', 'thwomp-ruins']

/** Scene title selector: headings (`.heading`) or the event-title lockup (`.title-lockup`). */
const SCENES: { scene: string; sel: string; patch?: Record<string, unknown> }[] = [
  { scene: 'title', sel: '.title-lockup' },
  { scene: 'lineup', sel: '.heading' },
  { scene: 'nextRace', sel: '.heading' },
  { scene: 'standings', sel: '.heading' },
  { scene: 'winner', sel: '.heading' },
  { scene: 'raceWin', sel: '.heading' },
  { scene: 'cupWin', sel: '.heading' },
  { scene: 'bracket', sel: '.heading' },
  { scene: 'matches', sel: '.heading' },
  { scene: 'qr', sel: '.title-lockup', patch: { qrStyle: 'title' } },
]

async function seed() {
  await command({ type: 'createTournament', name: 'Test Cup', template: 'bracket' })
  for (let i = 0; i < 3; i++) await command({ type: 'saveResults', raceNo: i + 1, trackId: TRACKS[i], positions: [1, 2, 3, 4] } as never)
}

async function centres(page: Page, sel: string) {
  return page.locator(`[data-layer=scene] ${sel}`).evaluateAll((els) => els.map((e) => {
    const r = e.getBoundingClientRect()
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width }
  }).filter((r) => r.w > 0))
}

/** Hero-left / text-right layouts: the heading is centred in its own column by design, not on the canvas. */
const SPLIT = new Set(['nextRace', 'winner', 'raceWin', 'cupWin'])
/** Twins render only the title scene (per half); other scenes show no heading on that canvas. */
const TWIN_SCENES = new Set(['title'])

for (const o of OUTPUTS)
  for (const s of SCENES.filter((s) => !(o.id === 'twins' && !TWIN_SCENES.has(s.scene)) && !(SPLIT.has(s.scene) && o.id !== 'stream' || (o.id === 'stream' && ['nextRace', 'raceWin', 'cupWin'].includes(s.scene)))))
    test(`title centred: ${o.id} ${s.scene}`, async ({ page }) => {
      await seed()
      await page.setViewportSize({ width: o.vp[0], height: o.vp[1] })
      await command({ type: 'setLayers', outputId: o.id, patch: { background: 'B', scene: s.scene, trackCard: false, lowerThirds: { on: false, players: [] }, ...s.patch } } as never)
      await command({ type: 'take', mode: 'cut', outputIds: [o.id] })
      await page.goto(`/out/${o.id}`); await page.waitForSelector('body[data-ready]'); await page.waitForTimeout(600)
      const found = await centres(page, s.sel)
      expect(found.length, 'title element present').toBeGreaterThan(0)
      // Twins render one scene per 960 px half; every other output has a single title on the full canvas.
      const expected = o.id === 'twins' && s.scene === 'title' ? [480, 1440] : [o.vp[0] / 2]
      if (o.id === 'twins' && s.scene === 'title') expect(found.map((f) => Math.round(f.cx))).toEqual(expected.map(Math.round))
      else for (const f of found) expect(Math.abs(f.cx - expected[0]), `cx ${f.cx}`).toBeLessThanOrEqual(2)
    })
