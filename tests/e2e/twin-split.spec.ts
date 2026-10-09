import { expect, test } from '@playwright/test'
import { command, resetShow, state, openSetup } from './helpers'

test.beforeEach(resetShow)

const TWIN_L3 = { setLayers: { type: 'setLayers', outputId: 'twins', patch: { background: 'B', trackCard: true, lowerThirds: { on: true, players: [0, 1, 2, 3] } } } } as const

async function takeTwins() {
  await command(TWIN_L3.setLayers as never)
  await command({ type: 'take', mode: 'cut', outputIds: ['twins'] })
}
const xs = (page: import('@playwright/test').Page, sel: string) =>
  page.locator(sel).evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().x)))

test('left half is a 960x1152 crop showing P1 and P2', async ({ page }) => {
  await takeTwins()
  await page.setViewportSize({ width: 960, height: 1152 })
  await page.goto('/out/twins/left'); await page.waitForSelector('body[data-ready]')
  const crop = await page.locator('.crop[data-part=left]').boundingBox()
  expect(crop).toMatchObject({ x: 0, y: 0, width: 960, height: 1152 })
  // Same canvas coordinates as the full page: slots 0 and 1 at x 40 / 490 are inside the half.
  expect((await xs(page, '.lower-third')).slice(0, 2)).toEqual([40, 490])
  await expect(page.locator('.track-card').first()).toBeVisible()
})

test('right half is shifted by half a canvas: P3 and P4 land at 40 and 490', async ({ page }) => {
  await takeTwins()
  await page.setViewportSize({ width: 960, height: 1152 })
  await page.goto('/out/twins/right'); await page.waitForSelector('body[data-ready]')
  expect(await page.locator('.crop[data-part=right]').boundingBox()).toMatchObject({ width: 960, height: 1152 })
  expect((await xs(page, '.lower-third')).slice(2, 4)).toEqual([40, 490])
})

test('full /out/twins is unchanged (1920 wide)', async ({ page }) => {
  await takeTwins()
  await page.goto('/out/twins'); await page.waitForSelector('body[data-ready]')
  expect(await page.locator('.crop[data-part=full]').boundingBox()).toMatchObject({ width: 1920, height: 1152 })
  expect(await xs(page, '.lower-third')).toEqual([40, 490, 1000, 1450])
})

test('halves count separately in presence and light up the twins output', async ({ page, context }) => {
  const left = await context.newPage(); await left.goto('/out/twins/left'); await left.waitForSelector('body[data-ready]')
  await page.goto('/control')
  const twinsLed = page.locator('[data-output-tab=twins] .led')
  await expect(twinsLed).toHaveClass(/partial/)
  const right = await context.newPage(); await right.goto('/out/twins/right'); await right.waitForSelector('body[data-ready]')
  await expect(twinsLed).toHaveClass(/\bon\b/)
  await openSetup(page, 'Outputs')
  await expect(page.locator('[data-output-row=twins] [data-clients]')).toContainText('L 1 · R 1')
  await expect(page.locator('[data-output-row=twins] [data-half-url=left] code')).toContainText('/out/twins/left')
  await expect(page.locator('[data-output-row=twins] [data-half-url=right] code')).toContainText('/out/twins/right')
})

test('superwide composes left twin | wide | right twin on one 5760x1152 page', async ({ page }) => {
  await command({ type: 'setLayers', outputId: 'wide', patch: { background: 'B', scene: 'title' } })
  await command({ type: 'setLayers', outputId: 'twins', patch: { background: 'A', trackCard: true, lowerThirds: { on: true, players: [0, 1, 2, 3] } } })
  await command({ type: 'take', mode: 'cut', outputIds: ['wide', 'twins'] })
  await page.setViewportSize({ width: 5760, height: 1152 })
  await page.goto('/out/superwide'); await page.waitForSelector('body[data-ready]')
  expect(await page.locator('#superwide').boundingBox()).toMatchObject({ x: 0, y: 0, width: 5760, height: 1152 })
  const boxes = await page.locator('.box').evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.width)] }))
  expect(boxes).toEqual([[0, 960], [960, 3840], [4800, 960]])
  // wide in the middle, twins on the outsides
  await expect(page.locator('[data-box=wide] [data-bg=B]')).toBeVisible()
  await expect(page.locator('[data-box=left] [data-bg=A]')).toBeVisible()
  await expect(page.locator('[data-box=right] [data-bg=A]')).toBeVisible()
  expect((await xs(page, '[data-box=left] .lower-third')).slice(0, 2)).toEqual([40, 490])
  expect((await xs(page, '[data-box=right] .lower-third')).slice(2, 4)).toEqual([4800 + 40, 4800 + 490])
  await expect(page.locator('[data-box=wide] .title-lockup')).toBeVisible()
  expect(await page.evaluate(() => document.querySelectorAll('[id=canvas]').length)).toBe(0)
})

test('superwide counts as a full connection for wide and twins', async ({ page, context }) => {
  const sw = await context.newPage(); await sw.setViewportSize({ width: 5760, height: 1152 })
  await sw.goto('/out/superwide'); await sw.waitForSelector('body[data-ready]')
  await page.goto('/control')
  await expect(page.locator('[data-output-tab=wide] .led')).toHaveClass(/\bon\b/)
  await expect(page.locator('[data-output-tab=twins] .led')).toHaveClass(/\bon\b/)
  expect((await state()).outputs.map(o => o.id)).toContain('twins')
})

// Regression: z-indexes inside a layer must never paint above later layers.
/** Which layer/overlay holds the topmost real content at (x, y), ignoring the FTB overlay and empty layer containers. */
async function topLayer(page: import('@playwright/test').Page, x: number, y: number): Promise<string> {
  await page.addStyleTag({ content: '* { pointer-events: auto !important }' })
  return page.evaluate(([px, py]) => {
    const el = document.elementsFromPoint(px, py).find(e => !e.closest('[data-overlay=ftb]') && !e.hasAttribute('data-layer') && e.id !== 'canvas' && !e.classList.contains('canvas') && !e.classList.contains('crop'))
    const host = el?.closest('[data-overlay], [data-layer]')
    return host?.getAttribute('data-overlay') ?? host?.getAttribute('data-layer') ?? 'none'
  }, [x, y])
}

test('HOLD covers scene content on wide', async ({ page }) => {
  await command({ type: 'setLayers', outputId: 'wide', patch: { background: 'B', scene: 'lineup' } })
  await command({ type: 'take', mode: 'cut', outputIds: ['wide'] })
  await page.goto('/out/wide'); await page.waitForSelector('body[data-ready]')
  await command({ type: 'hold', on: true })
  await expect(page.locator('[data-overlay=hold]')).toBeVisible()
  // The lineup medallions sit around x 540-1100, y 90-400.
  for (const [x, y] of [[550, 250], [1150, 250], [1700, 250]]) expect(await topLayer(page, x, y)).toBe('hold')
})

test('background C logo plate and karts stay below the scene', async ({ page }) => {
  await command({ type: 'saveResults', raceNo: 1, trackId: 'mario-kart-stadium', positions: [1, 2, 3, 4] })
  await command({ type: 'setLayers', outputId: 'wide', patch: { background: 'C', scene: 'standings' } })
  await command({ type: 'take', mode: 'cut', outputIds: ['wide'] })
  await page.goto('/out/wide'); await page.waitForSelector('body[data-ready]')
  const plate = (await page.locator('[data-bg=C] .logo').boundingBox())!
  const row4 = (await page.locator('.standing-row').nth(3).boundingBox())!
  const x = Math.max(plate.x, row4.x) + 40
  const y = Math.max(plate.y, row4.y) + 10
  // The point must lie inside both the plate and the 4th row, otherwise the test proves nothing.
  expect(y).toBeLessThan(Math.min(plate.y + plate.height, row4.y + row4.height))
  expect(await topLayer(page, x, y)).toBe('scene')
})

// ---- Scenes on the twin canvas: nothing important may straddle the seam at x = 960 ----

type P = import('@playwright/test').Page
const SEAM = 960
const TNAMES = [['MARIO MAN', 'LUIGI LAD', 'PEACH PRO', 'YOSHI YEAH'], ['ALEXANDRIA-ROSE FEATHERSTONE', 'BOB', 'CAT', 'DAVE'], ['EVE', 'FRANK', 'GRACE', 'HEIDI'], ['IVAN', 'JUDY', 'KEN', 'LIZ']]
const TCHARS = ['mario', 'luigi', 'peach', 'yoshi']
const TTRACKS = ['mario-kart-stadium', 'water-park', 'sweet-sweet-canyon', 'thwomp-ruins']
const trace = (raceNo: number, positions: number[]) => ({ raceNo, trackId: TTRACKS[raceNo - 1], positions })

async function seedTournament() {
  await command({ type: 'createTournament', name: 'Test Cup', template: 'bracket' })
  for (let i = 0; i < 4; i++)
    await command({ type: 'updateMatch', matchId: `match-${i + 1}`, patch: { players: TNAMES[i].map((name, s) => ({ name, characterId: TCHARS[(s + i) % 4] })) } })
  await command({ type: 'setMatchResults', matchId: 'match-1', races: [trace(1, [1, 2, 3, 4]), trace(2, [2, 1, 4, 3]), trace(3, [1, 3, 2, 4])] })
  await command({ type: 'setActiveMatch', matchId: 'match-1' })
  for (const [i, [trackId, positions]] of ([['mario-kart-stadium', [1, 2, 3, 4]], ['water-park', [2, 1, 4, 3]], ['tour-singapore-speedway', [3, 2, 1, 4]]] as [string, number[]][]).entries())
    await command({ type: 'saveResults', raceNo: i + 1, trackId, positions })
}

async function showTwin(page: P, patch: Record<string, unknown>, url = '/out/twins') {
  await command({ type: 'setLayers', outputId: 'twins', patch: { background: 'B', trackCard: false, lowerThirds: { on: false, players: [] }, ...patch } } as never)
  await command({ type: 'take', mode: 'cut', outputIds: ['twins'] })
  await page.setViewportSize(url.endsWith('twins') ? { width: 1920, height: 1152 } : { width: 960, height: 1152 })
  await page.goto(url); await page.waitForSelector('body[data-ready]'); await page.waitForTimeout(400)
}

/** Visible scene elements whose box crosses the seam. Full-canvas containers, the connector svg (its paths are checked) and clipped decoration are ignored. */
const crossing = (page: P) => page.evaluate((seam) => {
  const out: string[] = []
  for (const e of document.querySelectorAll('[data-layer=scene] *')) {
    const r = e.getBoundingClientRect()
    if (r.width === 0 || r.height === 0 || r.width >= 1900) continue
    if (e.closest('.rays, .confetti') || e.classList.contains('lines')) continue
    if (r.left < seam - 1 && r.right > seam + 1) out.push(`${e.tagName}.${(e as HTMLElement).className?.toString?.().slice(0, 40)} ${Math.round(r.left)}-${Math.round(r.right)}`)
  }
  return out
}, SEAM)

/** Count of elements matching `sel` whose box is (at least partly) inside the page's 960 px viewport. */
const inView = (page: P, sel: string) => page.locator(sel).evaluateAll((els) => els.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > 0 && r.left < 960 }).length)

type Case = { name: string; patch: Record<string, unknown>; cfg?: Record<string, unknown>; sel: string }
const TWIN_CASES: Case[] = [
  { name: 'bracket', patch: { scene: 'bracket' }, sel: '[data-layer=scene] .node' },
  ...(['grid', 'row', 'stack', 'focus'] as const).flatMap((layout) =>
    (['full', 'compact', 'winner'] as const).map((detail) => ({
      name: `matches ${layout} ${detail}`, patch: { scene: 'matches', matchSet: { rounds: [0] } }, cfg: { layout, detail: { twin: detail } }, sel: '[data-layer=scene] [data-match]',
    }))),
  { name: 'matches one card', patch: { scene: 'matches', matchSet: { ids: ['match-1'] } }, cfg: { layout: 'grid' }, sel: '[data-layer=scene] [data-match]' },
  { name: 'matches five cards', patch: { scene: 'matches' }, cfg: { layout: 'grid' }, sel: '[data-layer=scene] [data-match]' },
  { name: 'matches range 1-2', patch: { scene: 'matches', matchSet: { range: [0, 1] } }, cfg: { layout: 'row' }, sel: '[data-layer=scene] [data-match]' },
  { name: 'raceWin hero', patch: { scene: 'raceWin', part: 'hero' }, sel: '[data-win-hero]' },
  { name: 'raceWin board', patch: { scene: 'raceWin', part: 'board' }, sel: '[data-win-board]' },
  { name: 'cupWin hero', patch: { scene: 'cupWin', part: 'hero' }, sel: '[data-win-hero]' },
  { name: 'cupWin board', patch: { scene: 'cupWin', part: 'board' }, sel: '[data-win-board]' },
  { name: 'title', patch: { scene: 'title' }, sel: '[data-layer=scene] .title-lockup' },
  { name: 'qr', patch: { scene: 'qr' }, sel: '[data-layer=scene] .panel' },
]

for (const c of TWIN_CASES)
  test(`twin scene "${c.name}": seam is clean and each half renders its own content`, async ({ page }) => {
    await seedTournament()
    if (c.cfg) await command({ type: 'setMatchesSceneConfig', patch: c.cfg } as never)
    await showTwin(page, c.patch)
    await page.screenshot({ path: `${process.env.TWIN_SHOTS ?? 'test-results/twin-shots'}/${c.name.replace(/\W+/g, '-')}.png` })
    expect(await crossing(page), 'elements straddling x=960').toEqual([])
    // connector paths may touch the seam but never cross it
    const paths = await page.locator('[data-layer=scene] svg.lines path').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [r.left, r.right] }))
    for (const [l, r] of paths) expect(l < SEAM - 1 && r > SEAM + 1).toBe(false)
    expect(await page.locator(c.sel).count()).toBeGreaterThan(0)
    for (const part of ['left', 'right'] as const) {
      await showTwin(page, c.patch, `/out/twins/${part}`)
      expect(await inView(page, c.sel), `${part} half shows content`).toBeGreaterThan(0)
      await page.screenshot({ path: `${process.env.TWIN_SHOTS ?? 'test-results/twin-shots'}/${c.name.replace(/\W+/g, '-')}-${part}.png` })
    }
  })

test('twin bracket connectors meet at the seam; hero and board mirror into both halves', async ({ page }) => {
  await seedTournament()
  await showTwin(page, { scene: 'bracket' })
  const nodes = await page.locator('[data-layer=scene] .node').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right)] }))
  expect(nodes.filter(([, r]) => r <= SEAM)).toHaveLength(4) // semis left
  expect(nodes.filter(([l]) => l >= SEAM)).toHaveLength(1) // final right
  await showTwin(page, { scene: 'raceWin', part: 'hero' })
  const heroes = await page.locator('[data-win-hero]').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().x + e.getBoundingClientRect().width / 2)))
  expect(heroes).toHaveLength(2)
  expect(heroes[1] - heroes[0]).toBe(960)
})

for (const bg of ['A', 'B', 'C'] as const)
  test(`twin background ${bg}: each half is a self-contained crop`, async ({ page }) => {
    await showTwin(page, { background: bg, scene: 'none', trackCard: true, lowerThirds: { on: true, players: [0, 1, 2, 3] } })
    await page.screenshot({ path: `${process.env.TWIN_SHOTS ?? 'test-results/twin-shots'}/bg-${bg}.png` })
    // track cards and lower thirds are per-half: none of them crosses the seam
    const bad = await page.locator('.track-card, .lower-third').evaluateAll((els, seam) => els.filter((e) => { const r = e.getBoundingClientRect(); return r.left < seam - 1 && r.right > seam + 1 }).length, SEAM)
    expect(bad).toBe(0)
    for (const part of ['left', 'right'] as const) {
      await showTwin(page, { background: bg, scene: 'none', trackCard: true, lowerThirds: { on: true, players: [0, 1, 2, 3] } }, `/out/twins/${part}`)
      await expect(page.locator(`[data-bg=${bg}]`)).toBeVisible()
      expect(await inView(page, '.track-card')).toBe(1)
      expect(await inView(page, '.lower-third')).toBe(2)
    }
  })
