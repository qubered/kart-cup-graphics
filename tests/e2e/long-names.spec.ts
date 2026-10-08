import { test, expect, type Page } from '@playwright/test'
import type { SceneId } from '../../shared/types'
import { command, resetShow } from './helpers'

test.beforeEach(resetShow)

const LONG = [
  'Maximilian-Alexander Featherstonehaugh-Wolfeschlegelstein',
  'Bartholomew Montgomery Fitzgerald-Worthington III',
  'Supercalifragilisticexpialidocious_Pneumonoultramicroscopic',
  'Wolfeschlegelsteinhausenbergerdorff Vanderbilt-Rockefeller',
]
const CHARS = ['mario', 'luigi', 'peach', 'yoshi']
const TRACKS = ['mario-kart-stadium', 'water-park', 'sweet-sweet-canyon', 'thwomp-ruins']

type Fmt = { id: 'wide' | 'stream' | 'twins'; vp: [number, number] }
const FORMATS: Fmt[] = [{ id: 'stream', vp: [1920, 1080] }, { id: 'wide', vp: [3840, 1152] }, { id: 'twins', vp: [1920, 1152] }]

async function seed() {
  await command({ type: 'createTournament', name: 'An Extremely Long Tournament Name For Testing', template: 'bracket' })
  for (let i = 0; i < 4; i++) {
    await command({ type: 'updateMatch', matchId: `match-${i + 1}`, patch: { players: LONG.map((name, s) => ({ name, characterId: CHARS[(s + i) % 4] })) } })
  }
  for (const [i, name] of LONG.entries()) await command({ type: 'setPlayer', index: i as 0 | 1 | 2 | 3, patch: { name, characterId: CHARS[i] } })
  await command({ type: 'setEventText', patch: { preTitle: 'The Extraordinarily Long Pre-Title', title: 'SUPERCALIFRAGILISTIC KART CHAMPIONSHIP', titleAccent: 'GRAND FINALE EXTRAVAGANZA' } })
  const positions = [[1, 2, 3, 4], [2, 1, 4, 3], [3, 2, 1, 4], [4, 3, 2, 1]]
  for (const [i, trackId] of TRACKS.entries()) {
    await command({ type: 'saveResults', raceNo: i + 1, trackId, positions: positions[i] })
    await command({ type: 'setMatchResults', matchId: 'match-1', races: TRACKS.map((t, k) => ({ raceNo: k + 1, trackId: t, positions: positions[k] })) })
  }
  await command({ type: 'setActiveMatch', matchId: 'match-1' })
}

/** Text-bearing elements of the output that spill out of the canvas, out of a clipping ancestor, or out of their own clipped box. */
function offenders(page: Page, vp: [number, number]) {
  return page.evaluate((vp) => {
    const bad: string[] = []
    const roots = Array.from(document.querySelectorAll('[data-layer=scene], [data-layer=trackcard], [data-layer=lowerthirds]'))
    const seen = new Set<Element>()
    for (const root of roots) for (const el of Array.from(root.querySelectorAll('*'))) {
      if (seen.has(el)) continue
      seen.add(el)
      if (!Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent!.trim())) continue
      if (el.closest('.rays, [aria-hidden=true]')) continue
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      const id = `${el.tagName.toLowerCase()}.${(el as HTMLElement).className} "${el.textContent!.trim().slice(0, 30)}"`
      if (r.left < -1 || r.top < -1 || r.right > vp[0] + 1 || r.bottom > vp[1] + 1) bad.push(`canvas: ${id}`)
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        const cs = getComputedStyle(a)
        if (cs.overflow === 'visible' && cs.overflowX === 'visible') continue
        const ar = a.getBoundingClientRect()
        if (ar.width && (r.left < ar.left - 1.5 || r.right > ar.right + 1.5)) bad.push(`clipped by ${a.tagName.toLowerCase()}.${a.className}: ${id}`)
        break
      }
      const cs = getComputedStyle(el)
      if (cs.overflow !== 'visible' && el.scrollWidth > el.clientWidth + 1 && cs.textOverflow !== 'ellipsis') bad.push(`scrollWidth: ${id}`)
    }
    return bad
  }, vp)
}

async function show(page: Page, f: Fmt, scene: SceneId, opts: { lowerThirds?: boolean; trackCard?: boolean; part?: 'full' | 'hero' | 'board' } = {}) {
  await command({ type: 'setLayers', outputId: f.id, patch: { background: 'B', scene, part: opts.part ?? 'full', trackCard: !!opts.trackCard, lowerThirds: { on: !!opts.lowerThirds, players: [0, 1, 2, 3] } } })
  await command({ type: 'take', mode: 'cut', outputIds: [f.id] })
  await page.setViewportSize({ width: f.vp[0], height: f.vp[1] })
  await page.goto(`/out/${f.id}`); await page.waitForSelector('body[data-ready]'); await page.waitForTimeout(700)
}

const SCENES: { name: string; scene: SceneId; lowerThirds?: boolean; trackCard?: boolean; part?: 'full' | 'hero' | 'board' }[] = [
  { name: 'lower thirds + track card', scene: 'none', lowerThirds: true, trackCard: true },
  { name: 'title', scene: 'title' },
  { name: 'lineup', scene: 'lineup' },
  { name: 'standings', scene: 'standings' },
  { name: 'winner', scene: 'winner' },
  { name: 'nextRace', scene: 'nextRace' },
  { name: 'raceWin', scene: 'raceWin' },
  { name: 'cupWin', scene: 'cupWin' },
  { name: 'bracket', scene: 'bracket' },
  { name: 'matches', scene: 'matches' },
]

for (const f of FORMATS)
  for (const s of SCENES)
    test(`long names fit: ${f.id} ${s.name}`, async ({ page }) => {
      await seed()
      await show(page, f, s.scene, s)
      expect(await offenders(page, f.vp)).toEqual([])
    })
