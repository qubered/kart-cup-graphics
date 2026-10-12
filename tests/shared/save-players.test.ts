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
  it('keeps the on-air players when scores refresh the scene before Save', () => {
    const s = run(live, { type: 'setPlayer', index: 0, patch: { name: 'SAM' } }, { type: 'saveResults', raceNo: 1, trackId: 'x', positions: [1, 2, 3, 4] })
    const v = s.program.wide.view
    expect(v.scene?.kind === 'standings' && v.scene.rows.some((r) => r.player.name === 'SAM')).toBe(false)
    expect(v.scene?.kind === 'standings' && v.scene.rows.some((r) => r.total > 0)).toBe(true)
  })
  it('puts the edit on air in place, without a Take', () => {
    const s = run(live, { type: 'setPlayer', index: 0, patch: { name: 'SAM' } }, { type: 'setRace', patch: { raceNo: 3 } }, { type: 'savePlayers' })
    const v = s.program.wide.view
    expect(v.lowerThirds[0].name).toBe('SAM')
    expect(v.scene?.kind === 'standings' && v.scene.rows.some((r) => r.player.name === 'SAM')).toBe(true)
    expect(s.program.wide.draft?.race.raceNo).toBe(3)
    expect(s.program.wide.takenAt).toBe(live.program.wide.takenAt)
  })
})

describe('Take with unsaved player edits', () => {
  const base = run(createDefaultState(idx, 0),
    { type: 'setLayers', outputId: 'wide', patch: { scene: 'announce', lowerThirds: { on: true, players: [0] } } } as Command,
    { type: 'arm', outputIds: ['wide'] }, { type: 'take', mode: 'cut' })
  const edited = run(base, { type: 'setPlayer', index: 0, patch: { name: 'SAM' } },
    { type: 'setLayers', outputId: 'wide', patch: { scene: 'standings' } } as Command, { type: 'take', mode: 'cut' })

  it('shows the saved names, not the edit', () => {
    const v = edited.program.wide.view
    expect(v.lowerThirds[0].name).toBe('Player 1')
    expect(v.scene?.kind === 'standings' && v.scene.rows.some((r) => r.player.name === 'SAM')).toBe(false)
  })
  it('shows the edit once saved', () => {
    const s = run(edited, { type: 'savePlayers' })
    expect(s.program.wide.view.lowerThirds[0].name).toBe('SAM')
    expect(run(s, { type: 'take', mode: 'cut' }).program.wide.view.lowerThirds[0].name).toBe('SAM')
  })
})

describe('unsaved player edits stay off every scene', () => {
  const scenes = ['title', 'lineup', 'announce', 'nextRace', 'standings', 'winner', 'raceWin', 'cupWin', 'matches', 'bracket', 'notice', 'qr'] as const
  const viaRace = (): Command => ({ type: 'setPlayer', index: 0, patch: { name: 'ZZSAM' } })
  const viaTournament = (id: string): Command => ({ type: 'updateMatch', matchId: id, patch: { players: [{ name: 'ZZSAM' }, null, null, null] } })
  for (const [label, edit] of [['race screen', viaRace], ['tournament menu', viaTournament]] as const) {
    it(`${label}: every scene and the lower thirds keep the saved names until Save`, () => {
      let s = run(createDefaultState(idx, 0), { type: 'createTournament', name: 'T' } as Command, { type: 'arm', outputIds: ['wide'] }, { type: 'take', mode: 'cut' })
      const id = s.tournaments[0].activeMatchId
      s = run(s, edit === viaRace ? viaRace() : viaTournament(id))
      for (const scene of scenes) {
        const t = run(s, { type: 'setLayers', outputId: 'wide', patch: { scene, lowerThirds: { on: true, players: [0, 1, 2, 3] } } } as Command, { type: 'take', mode: 'cut' })
        expect(JSON.stringify(t.program.wide.view), scene).not.toContain('ZZSAM')
      }
      const saved = run(s, { type: 'savePlayers' }, { type: 'setLayers', outputId: 'wide', patch: { scene: 'lineup' } } as Command, { type: 'take', mode: 'cut' })
      expect(JSON.stringify(saved.program.wide.view)).toContain('ZZSAM')
    })
  }
})
