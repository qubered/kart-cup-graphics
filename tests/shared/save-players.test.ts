import { describe, expect, it } from 'vitest'
import { indexCatalog } from '../../shared/catalog'
import { createDefaultState } from '../../shared/defaults'
import { reduce } from '../../shared/reducer'
import type { Command, ShowState } from '../../shared/types'
import { fixtureCatalog } from '../fixtures/catalog'

const idx = indexCatalog(fixtureCatalog)
const ctx = { catalog: idx, now: 1000, random: () => 0 }
const run = (s: ShowState, ...cmds: Command[]) => cmds.reduce((a, c) => reduce(a, c, ctx), s)

describe('savePlayers', () => {
  const live = run(createDefaultState(idx, 0),
    { type: 'setLayers', outputId: 'wide', patch: { scene: 'standings', lowerThirds: { on: true, players: [0, 1] } } } as Command,
    { type: 'arm', outputIds: ['wide'] }, { type: 'take', mode: 'cut' })

  it('keeps Program as taken while a player is edited', () => {
    const s = run(live, { type: 'setPlayer', index: 0, patch: { name: 'SAM' } })
    expect(s.program.wide.view.lowerThirds[0].name).toBe('Player 1')
  })
  it('puts the edit on air in place, without a Take, and leaves the on-air race alone', () => {
    const s = run(live, { type: 'setPlayer', index: 0, patch: { name: 'SAM' } }, { type: 'setRace', patch: { raceNo: 3 } }, { type: 'savePlayers' })
    const v = s.program.wide.view
    expect(v.lowerThirds[0].name).toBe('SAM')
    expect(v.scene?.kind === 'standings' && v.scene.rows.some((r) => r.player.name === 'SAM')).toBe(true)
    expect(s.program.wide.draft?.race).toEqual(live.program.wide.draft.race)
    expect(s.program.wide.takenAt).toBe(live.program.wide.takenAt)
  })
})
