import { describe, expect, it } from 'vitest'
import { indexCatalog } from '../../shared/catalog'
import { createDefaultState, EMPTY_LAYERS } from '../../shared/defaults'
import { deriveView } from '../../shared/view'
import { fixtureCatalog } from '../fixtures/catalog'

const idx = indexCatalog(fixtureCatalog)
const st = createDefaultState(idx, 0)
const twin = st.outputs[1], hd = st.outputs[2]
const on = { ...EMPTY_LAYERS, lowerThirds: { on: true, players: [2, 0] } }

describe('deriveView', () => {
  it('lower thirds slots', () => {
    expect(deriveView(st.draft, on, twin, idx).lowerThirds.map((p) => p.slot)).toEqual([0, 1, 2, 3])
    expect(deriveView(st.draft, on, hd, idx).lowerThirds.map((p) => p.slot)).toEqual([0, 2])
  })
  it('unsupported scene is null', () => {
    expect(deriveView(st.draft, { ...EMPTY_LAYERS, scene: 'standings' }, twin, idx).scene).toBeNull()
    expect(deriveView(st.draft, { ...EMPTY_LAYERS, scene: 'title' }, twin, idx).scene?.kind).toBe('title')
  })
  it('track card cup mode', () => {
    const d2 = { ...st.draft, race: { ...st.draft.race, raceIndex: 1 as const, raceNo: 2 } }
    expect(deriveView(d2, { ...EMPTY_LAYERS, trackCard: true }, twin, idx).trackCard).toMatchObject({
      raceLabel: 'RACE 2 / 4', trackName: 'Water Park', cupName: 'Mushroom Cup', cupEmblem: '/assets/cups/mushroom.png',
    })
  })
  it('track mode label and cup from track', () => {
    const d3 = {
      ...st.draft, race: { ...st.draft.race, mode: 'track' as const, trackId: 'tour-singapore-speedway' },
      scores: { races: [{ raceNo: 1, trackId: 'water-park', positions: [1, 2, 3, 4] }, { raceNo: 2, trackId: 'water-park', positions: [1, 2, 3, 4] }], adjustments: [0, 0, 0, 0] },
    }
    expect(deriveView(d3, { ...EMPTY_LAYERS, trackCard: true }, hd, idx).trackCard).toMatchObject({
      raceLabel: 'RACE 1 / 4', trackName: 'Tour Singapore Speedway', cupName: 'Boomerang Cup',
    })
  })
  it('player view and fonts', () => {
    const p4 = deriveView(st.draft, { ...EMPTY_LAYERS, lowerThirds: { on: true, players: [3] } }, hd, idx).lowerThirds[0]
    expect(p4).toMatchObject({ name: 'Player 4', character: 'Yoshi', colour: '#ffc400', textColour: '#14213d', icon: '/assets/characters/yoshi.png' })
    const v = deriveView(st.draft, EMPTY_LAYERS, hd, idx)
    expect(v.fonts.eventTitle).toBe('"MK F2","Lexend Zetta",sans-serif')
    expect(v.canvas).toEqual({ w: 1920, h: 1080 })
    expect(v.headingUpright).toBe(false)
  })
  it('unknown character never throws', () => {
    const bad = { ...st.draft, players: st.draft.players.map((p, i) => (i ? p : { ...p, characterId: 'ghost' })) }
    expect(deriveView(bad, { ...EMPTY_LAYERS, lowerThirds: { on: true, players: [0] } }, hd, idx).lowerThirds[0]).toMatchObject({ icon: '', character: '?' })
    const badRace = { ...st.draft, race: { ...st.draft.race, cupId: 'nope' } }
    const v = deriveView(badRace, { ...EMPTY_LAYERS, trackCard: true, scene: 'nextRace' }, hd, idx)
    expect(v.trackCard).toMatchObject({ cupName: '?', cupEmblem: '', trackName: '?' })
  })
  it('standings, winner, nextRace', () => {
    const d = { ...st.draft, scores: { races: [{ raceNo: 1, trackId: 'mario-kart-stadium', positions: [2, 1, 3, 4] }], adjustments: [0, 0, 0, 0] } }
    const s = deriveView(d, { ...EMPTY_LAYERS, scene: 'standings' }, hd, idx).scene
    expect(s).toMatchObject({ kind: 'standings', footer: 'AFTER RACE 1 · MUSHROOM CUP' })
    if (s?.kind === 'standings') expect(s.rows[0].player.slot).toBe(1)
    const w = deriveView(d, { ...EMPTY_LAYERS, scene: 'winner' }, hd, idx).scene
    expect(w).toMatchObject({ kind: 'winner', total: 15 })
    const n = deriveView(st.draft, { ...EMPTY_LAYERS, scene: 'nextRace' }, hd, idx).scene
    expect(n).toMatchObject({ kind: 'nextRace', trackName: 'Mario Kart Stadium', trackImage: '/assets/tracks/mario-kart-stadium-large.jpg' })
    if (n?.kind === 'nextRace') expect(n.cupTracks.map((t) => t.current)).toEqual([true, false, false, false])
  })
})
