import { test, expect, type Page } from '@playwright/test'
import { command, resetShow } from './helpers'
import type { MatchesDetail, MatchesLayout, MatchSet } from '../../shared/types'

test.beforeEach(resetShow)

const NAMES = [
  ['MARIO MAN', 'LUIGI LAD', 'PEACH PRO', 'YOSHI YEAH'],
  ['ALEXANDRIA-ROSE FEATHERSTONE', 'BOB', 'CAT', 'DAVE'],
  ['EVE', 'FRANK', 'GRACE', 'HEIDI'],
  ['IVAN', 'JUDY', 'KEN', 'LIZ'],
]
const CHARS = ['mario', 'luigi', 'peach', 'yoshi']
const TRACKS = ['mario-kart-stadium', 'water-park', 'sweet-sweet-canyon', 'thwomp-ruins']
const race = (raceNo: number, positions: number[]) => ({ raceNo, trackId: TRACKS[raceNo - 1], positions })

/** 4 semis + final: semi 1 done, semi 2 live (2 races), semi 3 pending, semi 4 done by a hand-picked winner. */
async function seed() {
  await command({ type: 'createTournament', name: 'Test Cup', template: 'bracket' })
  for (let i = 0; i < 4; i++) {
    await command({
      type: 'updateMatch', matchId: `match-${i + 1}`,
      patch: { players: NAMES[i].map((name, s) => ({ name, characterId: CHARS[(s + i) % 4] })) },
    })
  }
  await command({ type: 'setMatchResults', matchId: 'match-1', races: [race(1, [1, 2, 3, 4]), race(2, [2, 1, 4, 3]), race(3, [1, 3, 2, 4]), race(4, [1, 2, 4, 3])] })
  await command({ type: 'setMatchResults', matchId: 'match-4', races: [race(1, [3, 4, 1, 2]), race(2, [4, 3, 2, 1]), race(3, [2, 1, 3, 4]), race(4, [3, 4, 2, 1])] })
  await command({ type: 'setWinnerOverride', matchId: 'match-4', slot: 0 })
  await command({ type: 'setActiveMatch', matchId: 'match-2' })
  await command({ type: 'setMatchResults', matchId: 'match-2', races: [race(1, [4, 1, 2, 3]), race(2, [3, 1, 4, 2])] })
}

const FORMATS = [
  { name: 'wide', output: 'wide', w: 3840, h: 1152 },
  { name: 'hd', output: 'stream', w: 1920, h: 1080 },
  { name: 'twin', output: 'twins', w: 1920, h: 1152 },
] as const
const LAYOUTS: MatchesLayout[] = ['grid', 'row', 'stack', 'focus']
const DETAILS: MatchesDetail[] = ['full', 'compact', 'winner']

async function show(page: Page, f: (typeof FORMATS)[number], scene: 'matches' | 'bracket', matchSet?: MatchSet) {
  await page.setViewportSize({ width: f.w, height: f.h })
  await command({ type: 'setLayers', outputId: f.output, patch: { background: 'B', scene, trackCard: false, lowerThirds: { on: false, players: [] }, matchSet } })
  await command({ type: 'take', mode: 'cut', outputIds: [f.output] })
  await page.goto(`/out/${f.output}`); await page.waitForSelector('body[data-ready]'); await page.waitForTimeout(500)
}

/** Everything the scene draws stays inside the canvas and no name is clipped. */
async function expectContained(page: Page, f: (typeof FORMATS)[number]) {
  const bad = await page.locator('[data-layer=scene] [data-match], [data-layer=scene] svg').evaluateAll((els, [w, h]) =>
    els.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.left < -1 || r.top < -1 || r.right > w + 1 || r.bottom > h + 1) }).length, [f.w, f.h])
  expect(bad).toBe(0)
  const clipped = await page.locator('[data-layer=scene] .name > span, [data-layer=scene] .wname > span, [data-layer=scene] .hname > span').evaluateAll((spans) =>
    spans.filter((s) => { const p = s.parentElement!; return s.getBoundingClientRect().width > p.getBoundingClientRect().width + 1 }).map((s) => s.textContent + ' ' + s.getBoundingClientRect().width + ' ' + s.parentElement!.getBoundingClientRect().width))
  expect(clipped).toEqual([])
}

for (const f of FORMATS)
  for (const layout of LAYOUTS)
    for (const detail of DETAILS)
      test(`visual: ${f.name} matches ${layout} ${detail}`, async ({ page }) => {
        await seed()
        await command({ type: 'setMatchesSceneConfig', patch: { layout, detail: { [f.name]: detail } } })
        await show(page, f, 'matches', { rounds: [0] })
        await expect(page.locator('[data-layer=scene] [data-match]')).toHaveCount(4)
        await expectContained(page, f)
        await expect(page.locator('#canvas')).toHaveScreenshot(`matches-${f.name}-${layout}-${detail}.png`, { maxDiffPixelRatio: 0.02, animations: 'disabled' })
      })

for (const f of FORMATS) {
  test(`visual: ${f.name} bracket`, async ({ page }) => {
    await seed()
    await show(page, f, 'bracket')
    await expect(page.locator('[data-layer=scene] .node')).toHaveCount(5)
    await expectContained(page, f)
    await expect(page.locator('#canvas')).toHaveScreenshot(`bracket-${f.name}.png`, { maxDiffPixelRatio: 0.02, animations: 'disabled' })
  })

  test(`visual: ${f.name} matches all five hidden pending scores`, async ({ page }) => {
    await seed()
    await command({ type: 'setMatchesSceneConfig', patch: { layout: 'grid', pendingScores: 'hide', liveMarker: false, detail: { [f.name]: 'full' } } })
    await show(page, f, 'matches')
    await expect(page.locator('[data-layer=scene] [data-match]')).toHaveCount(5)
    await expect(page.locator('[data-layer=scene] .live')).toHaveCount(0)
    await expectContained(page, f)
    await expect(page.locator('#canvas')).toHaveScreenshot(`matches-${f.name}-five-hide.png`, { maxDiffPixelRatio: 0.02, animations: 'disabled' })
  })
}

test('range selector: twin shows semis 1-2 or 3-4', async ({ page }) => {
  await seed()
  await command({ type: 'setMatchesSceneConfig', patch: { layout: 'row' } })
  await show(page, FORMATS[2], 'matches', { range: [0, 1] })
  await expect(page.locator('[data-layer=scene] [data-match]')).toHaveCount(2)
  await expect(page.locator('[data-layer=scene] [data-match]').first()).toHaveAttribute('data-match', 'match-1')
  await expectContained(page, FORMATS[2])
  await expect(page.locator('#canvas')).toHaveScreenshot('matches-twin-range-1-2.png', { maxDiffPixelRatio: 0.02, animations: 'disabled' })
  await show(page, FORMATS[2], 'matches', { range: [2, 3] })
  await expect(page.locator('[data-layer=scene] [data-match]').first()).toHaveAttribute('data-match', 'match-3')
  await expect(page.locator('#canvas')).toHaveScreenshot('matches-twin-range-3-4.png', { maxDiffPixelRatio: 0.02, animations: 'disabled' })
})

test('live marker only on the active match; overridden winner highlighted like a computed one', async ({ page }) => {
  await seed()
  await show(page, FORMATS[0], 'matches', { rounds: [0] })
  await expect(page.locator('[data-layer=scene] .is-live')).toHaveCount(1)
  await expect(page.locator('[data-match=match-2]')).toHaveClass(/is-live/)
  for (const id of ['match-1', 'match-4']) await expect(page.locator(`[data-match=${id}] .prow.first`)).toHaveCount(1)
  await expect(page.locator('[data-match=match-3] .prow.first')).toHaveCount(0)
})
