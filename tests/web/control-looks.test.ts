import { describe, expect, it } from 'vitest'
import { indexCatalog } from '../../shared/catalog'
import { createDefaultState } from '../../shared/defaults'
import { reduce } from '../../shared/reducer'
import type { Command, Layers, Preset, ShowState } from '../../shared/types'
import {
  cueCount, cueCounts, cuesOf, defaultSaveScope, deleteUndoCommands, groupPatch, groupsFromScope, isModified, layersKey, onAirLook, plural, scopeFromGroups, scopeSummary, suggestName, toggleGroup,
} from '../../web/src/control/live/centre/looks'
import { presetView, recalledDraft, sceneView, thumbOutput } from '../../web/src/control/live/centre/thumbs'
import {
  availableParts, availableScenes, hasSceneOptions, nextReveal, qrStyles, qrStyleSelected, revealLabel, scenePatch, togglePlayer,
} from '../../web/src/control/live/scene/scenes'
import { fixtureCatalog } from '../fixtures/catalog'

const idx = indexCatalog(fixtureCatalog)
const ctx = { catalog: idx, now: 1000, random: () => 0 }
const run = (s: ShowState, ...cmds: Command[]) => cmds.reduce((a, c) => reduce(a, c, ctx), s)
const base = createDefaultState(idx, 0)

/** A show with a saved look "A" (a line-up on Wide, Wide + Twins armed) that is also the loaded look. */
const withLook = (scope?: Partial<Preset['scope']>) => run(base,
  { type: 'setLayers', outputId: 'wide', patch: { scene: 'lineup' } }, { type: 'arm', outputIds: ['wide', 'twins'] },
  { type: 'setPlayer', index: 0, patch: { name: 'SAM' } },
  { type: 'savePreset', name: 'A', ...(scope ? { scope } : {}) })
const look = (s: ShowState) => s.presets[0]

describe('isModified', () => {
  it('is false for a look just saved from Preview', () => {
    const s = withLook()
    expect(isModified(look(s), s)).toBe(false)
  })

  it('sees a scene, background or overlay change on any screen, and clears when it is put back', () => {
    const s = withLook()
    expect(isModified(look(s), run(s, { type: 'setLayers', outputId: 'wide', patch: { scene: 'standings' } }))).toBe(true)
    expect(isModified(look(s), run(s, { type: 'setLayers', outputId: 'stream', patch: { background: 'C' } }))).toBe(true)
    expect(isModified(look(s), run(s, { type: 'setLayers', outputId: 'pillars', patch: { trackCard: true } }))).toBe(true)
    const there = run(s, { type: 'setLayers', outputId: 'wide', patch: { scene: 'standings' } })
    expect(isModified(look(s), run(there, { type: 'setLayers', outputId: 'wide', patch: { scene: 'lineup' } }))).toBe(false)
  })

  it('ignores what the scene does not use and unset-vs-default values', () => {
    const s = withLook()
    // a line-up shows all four cards whether lineupShown is absent or 4
    expect(isModified(look(s), run(s, { type: 'setLayers', outputId: 'wide', patch: { lineupShown: 4 } }))).toBe(false)
    expect(isModified(look(s), run(s, { type: 'setLayers', outputId: 'wide', patch: { lineupShown: 2 } }))).toBe(true)
    // a leftover win-screen part on a scene that has no part
    expect(isModified(look(s), run(s, { type: 'setLayers', outputId: 'stream', patch: { part: 'hero', qrStyle: 'sides' } }))).toBe(false)
    // lower-third players only matter while lower thirds are on (Stream has them on, [0, 1])
    expect(isModified(look(s), run(s, { type: 'setLayers', outputId: 'pillars', patch: { lowerThirds: { on: false, players: [3] } } }))).toBe(false)
    expect(isModified(look(s), run(s, { type: 'setLayers', outputId: 'stream', patch: { lowerThirds: { on: true, players: [3, 0] } } }))).toBe(true)
  })

  it('compares the armed set as a set, and ignores outputs that do not exist', () => {
    const s = withLook()
    expect(isModified(look(s), run(s, { type: 'arm', outputIds: ['twins', 'wide'] }))).toBe(false)
    expect(isModified(look(s), run(s, { type: 'arm', outputIds: ['wide'] }))).toBe(true)
    expect(isModified(look(s), run(s, { type: 'arm', outputIds: [] }))).toBe(true)
  })

  it('only counts the parts in the look own recall scope', () => {
    const s = withLook({ layers: false, armed: false, style: false, transition: false, mattify: false, match: false, players: false, scores: false })
    const messy = run(s, { type: 'setLayers', outputId: 'wide', patch: { scene: 'standings' } }, { type: 'arm', outputIds: [] },
      { type: 'setEventText', patch: { title: 'OTHER' } }, { type: 'setTransition', speed: 'slow' }, { type: 'setMattify', on: true }, { type: 'setPlayer', index: 0, patch: { name: 'X' } })
    expect(isModified(look(s), messy)).toBe(false)
    // each part, switched on alone, notices its own change and nothing else
    const only = (key: keyof Preset['scope']) => ({ ...look(s), scope: { ...look(s).scope, [key]: true } })
    expect(isModified(only('layers'), messy)).toBe(true)
    expect(isModified(only('armed'), messy)).toBe(true)
    expect(isModified(only('style'), messy)).toBe(true)
    expect(isModified(only('transition'), messy)).toBe(true)
    expect(isModified(only('mattify'), messy)).toBe(true)
    expect(isModified(only('players'), messy)).toBe(true)
    expect(isModified(only('scores'), messy)).toBe(false)
    expect(isModified(only('match'), messy)).toBe(false)
    const raced = run(s, { type: 'saveResults', raceNo: 1, trackId: 'mario-kart-stadium', positions: [1, 2, 3, 4] }, { type: 'setRace', patch: { raceNo: 2 } })
    expect(isModified(only('scores'), raced)).toBe(true)
    expect(isModified(only('match'), raced)).toBe(true)
  })

  it('does not count race, players or scores while a tournament is active (a recall never touches them)', () => {
    const s = withLook({ match: true, players: true, scores: true })
    const t = run(s, { type: 'createTournament', name: 'T' }, { type: 'setPlayer', index: 1, patch: { name: 'NEW' } })
    expect(isModified(look(s), run(s, { type: 'setPlayer', index: 1, patch: { name: 'NEW' } }))).toBe(true)
    expect(isModified(look(s), t)).toBe(false)
    // layers still count
    expect(isModified(look(s), run(t, { type: 'setLayers', outputId: 'wide', patch: { scene: 'none' } }))).toBe(true)
  })

  it('skips outputs the look has no layers for, as a recall does', () => {
    const s = withLook()
    const added = run(s, { type: 'addOutput', output: { id: 'extra', name: 'Extra', format: 'hd', safeArea: { top: 0, right: 0, bottom: 0, left: 0 }, graphicsScale: 1 } },
      { type: 'setLayers', outputId: 'extra', patch: { scene: 'title' } })
    expect(isModified(look(s), added)).toBe(false)
  })

  it('reverting (a recall of the look) always clears it', () => {
    const s = withLook({ match: true, players: true, scores: true })
    const messy = run(s, { type: 'setLayers', outputId: 'wide', patch: { scene: 'notice', noticeQr: true } }, { type: 'arm', outputIds: ['pillars'] },
      { type: 'setPlayer', index: 0, patch: { name: 'Z' } }, { type: 'setTransition', speed: 'fast' }, { type: 'setEventText', patch: { watermark: 'HI' } })
    expect(isModified(look(s), messy)).toBe(true)
    expect(isModified(look(s), run(messy, { type: 'recallPreset', id: 'preset-1' }))).toBe(false)
  })
})

describe('layersKey', () => {
  const lay = (over: Partial<Layers>): Layers => ({ background: 'A', scene: 'none', trackCard: false, lowerThirds: { on: false, players: [] }, ...over })
  it('is the same for layers that draw the same picture', () => {
    expect(layersKey(lay({ scene: 'standings', part: 'hero' }))).toBe(layersKey(lay({ scene: 'standings' })))
    expect(layersKey(lay({ scene: 'raceWin' }))).toBe(layersKey(lay({ scene: 'raceWin', part: 'full', matchRef: 'active' })))
    expect(layersKey(lay({ scene: 'matches', matchSet: { rounds: [], ids: [] } }))).toBe(layersKey(lay({ scene: 'matches' })))
    expect(layersKey(lay({ lowerThirds: { on: true, players: [1, 0, 1] } }))).toBe(layersKey(lay({ lowerThirds: { on: true, players: [0, 1] } })))
  })
  it('differs when the picture does', () => {
    expect(layersKey(lay({ scene: 'raceWin', part: 'hero' }))).not.toBe(layersKey(lay({ scene: 'raceWin' })))
    expect(layersKey(lay({ scene: 'raceWin', matchRef: 'previous' }))).not.toBe(layersKey(lay({ scene: 'raceWin' })))
    expect(layersKey(lay({ scene: 'matches', matchSet: { rounds: [1] } }))).not.toBe(layersKey(lay({ scene: 'matches' })))
    expect(layersKey(lay({ scene: 'title', logo: 'off' }))).not.toBe(layersKey(lay({ scene: 'title' })))
    expect(layersKey(lay({ scene: 'notice', noticeQr: true }))).not.toBe(layersKey(lay({ scene: 'notice' })))
  })
})

describe('recall groups', () => {
  it('the default for a new look: Look and Outputs armed on, Race & players and Scores off', () => {
    expect(defaultSaveScope()).toEqual({ layers: true, armed: true, style: true, match: false, players: false, scores: false, transition: true, mattify: true })
    expect(groupsFromScope(defaultSaveScope())).toEqual({ look: true, outputs: true, race: false, scores: false })
  })
  it('groups and the 8 parts round-trip', () => {
    for (const look of [true, false]) for (const outputs of [true, false]) for (const race of [true, false]) for (const scores of [true, false]) {
      const g = { look, outputs, race, scores }
      expect(groupsFromScope(scopeFromGroups(g))).toEqual(g)
    }
  })
  it('a group is on only when every part in it is', () => {
    expect(groupsFromScope({ ...defaultSaveScope(), mattify: false }).look).toBe(false)
    expect(groupsFromScope({ ...defaultSaveScope(), match: true }).race).toBe(false)
    expect(groupsFromScope({ ...defaultSaveScope(), match: true, players: true }).race).toBe(true)
  })
  it('a group patch holds only that group parts, so quick taps on different groups cannot clobber each other', () => {
    expect(groupPatch(defaultSaveScope(), 'look')).toEqual({ layers: false, style: false, transition: false, mattify: false })
    expect(groupPatch(defaultSaveScope(), 'race')).toEqual({ match: true, players: true })
    expect(groupPatch(defaultSaveScope(), 'scores')).toEqual({ scores: true })
    expect(groupPatch(defaultSaveScope(), 'outputs')).toEqual({ armed: false })
  })
  it('toggling a group flips all its parts and returns the whole scope', () => {
    const off = toggleGroup(defaultSaveScope(), 'look')
    expect(off).toEqual({ ...defaultSaveScope(), layers: false, style: false, transition: false, mattify: false })
    expect(toggleGroup(off, 'look')).toEqual(defaultSaveScope())
    expect(toggleGroup({ ...defaultSaveScope(), mattify: false }, 'look').mattify).toBe(true) // partly on turns fully on
    expect(toggleGroup(defaultSaveScope(), 'race')).toMatchObject({ match: true, players: true })
    expect(Object.keys(toggleGroup(defaultSaveScope(), 'scores'))).toHaveLength(8)
  })
  it('summarises in words', () => {
    expect(scopeSummary(defaultSaveScope())).toBe('look + outputs armed')
    expect(scopeSummary({ ...defaultSaveScope(), layers: false })).toBe('outputs armed (custom)')
    expect(scopeSummary(scopeFromGroups({ look: false, outputs: false, race: false, scores: false }))).toBe('nothing')
  })
})

describe('cues using a look', () => {
  const s = run(base,
    { type: 'savePreset', name: 'A' }, { type: 'savePreset', name: 'B' },
    { type: 'createStack', name: 'One' }, { type: 'createStack', name: 'Two' },
    { type: 'addCue', stackId: 'stack-1', presetId: 'preset-1', take: 'cut' },
    { type: 'addCue', stackId: 'stack-1', presetId: 'preset-2', take: null },
    { type: 'addCue', stackId: 'stack-1', presetId: 'preset-1', take: 'auto', action: 'nextRace', scope: { scores: true } },
    { type: 'addCue', stackId: 'stack-2', presetId: 'preset-1', take: 'auto' })
  it('counts across every rundown', () => {
    expect(cueCount(s.stacks, 'preset-1')).toBe(3)
    expect(cueCount(s.stacks, 'preset-2')).toBe(1)
    expect(cueCount(s.stacks, 'nope')).toBe(0)
    expect([...cueCounts(s.stacks)]).toEqual([['preset-1', 3], ['preset-2', 1]])
    expect(cuesOf(s.stacks, 'preset-1').map((r) => [r.stackId, r.index])).toEqual([['stack-1', 0], ['stack-1', 2], ['stack-2', 0]])
  })
  it('pluralises', () => {
    expect([plural(0, 'cue'), plural(1, 'cue'), plural(2, 'cue')]).toEqual(['0 cues', '1 cue', '2 cues'])
  })

  it('undoing a delete puts the look back at its position and every cue back at its position with its options', () => {
    const p1 = s.presets[0]
    const refs = cuesOf(s.stacks, 'preset-1')
    const deleted = run(s, { type: 'deletePreset', id: 'preset-1' })
    expect(deleted.presets.map((p) => p.id)).toEqual(['preset-2'])
    expect(deleted.stacks.map((k) => k.cues.length)).toEqual([1, 0])
    const restored = run(deleted, ...deleteUndoCommands(structuredClone(p1), 0, refs))
    expect(restored.presets).toEqual(s.presets)
    const shape = (st: ShowState) => st.stacks.map((k) => k.cues.map(({ presetId, take, action, scope }) => ({ presetId, take, action, scope })))
    expect(shape(restored)).toEqual(shape(s))
    // new cue ids (a cue id never repeats), none lost
    expect(restored.stacks[0].cues).toHaveLength(3)
    expect(restored.stacks[1].cues).toHaveLength(1)
  })
  it('restores a look nothing uses with just the look', () => {
    const cmds = deleteUndoCommands(s.presets[1], 1, [])
    expect(cmds).toEqual([{ type: 'setPreset', preset: s.presets[1], index: 1 }])
  })
})

describe('suggestName', () => {
  const layers = (o: Record<string, Partial<Layers>>): Record<string, Layers> =>
    Object.fromEntries(Object.entries(o).map(([id, p]) => [id, { background: 'none', scene: 'none', trackCard: false, lowerThirds: { on: false, players: [] }, ...p } as Layers]))
  const outs = base.outputs
  it('uses the scene label of the screen being looked at', () => {
    expect(suggestName(layers({ wide: { scene: 'standings' } }), outs, 'wide', [])).toBe('Standings')
    expect(suggestName(layers({ wide: { scene: 'standings' }, twins: { scene: 'title' } }), outs, 'twins', [])).toBe('Title')
    expect(suggestName(layers({ wide: { scene: 'qr' } }), outs, 'wide', [])).toBe('QR codes')
  })
  it('names win screens with their part', () => {
    expect(suggestName(layers({ wide: { scene: 'raceWin', part: 'hero' } }), outs, 'wide', [])).toBe('Race win — hero')
    expect(suggestName(layers({ wide: { scene: 'cupWin' } }), outs, 'wide', [])).toBe('Cup win — full')
  })
  it('falls back to another screen with a scene, then to what is showing', () => {
    expect(suggestName(layers({ wide: { scene: 'none' }, stream: { scene: 'lineup' } }), outs, 'wide', [])).toBe('Line-up')
    expect(suggestName(layers({ wide: { background: 'A' } }), outs, 'wide', [])).toBe('Holding')
    expect(suggestName(layers({ wide: { trackCard: true } }), outs, 'wide', [])).toBe('Overlays only')
    expect(suggestName(layers({ wide: {} }), outs, 'wide', [])).toBe('Blank')
    expect(suggestName({}, [], '', [])).toBe('New look')
  })
  it('numbers a name that is taken', () => {
    expect(suggestName(layers({ wide: { scene: 'standings' } }), outs, 'wide', ['Standings'])).toBe('Standings 2')
    expect(suggestName(layers({ wide: { scene: 'standings' } }), outs, 'wide', ['Standings', 'Standings 2'])).toBe('Standings 3')
  })
})

describe('onAirLook', () => {
  const cut = (s: ShowState) => run(s, { type: 'take', mode: 'cut' })
  it('is the look whose layers equal what Program was taken with', () => {
    let s = run(base, { type: 'arm', outputIds: ['wide', 'twins', 'stream', 'pillars'] }, { type: 'setLayers', outputId: 'wide', patch: { scene: 'lineup' } }, { type: 'savePreset', name: 'Lineup' },
      { type: 'setLayers', outputId: 'wide', patch: { scene: 'standings' } }, { type: 'savePreset', name: 'Standings' })
    expect(onAirLook(s.presets, s.outputs, s.program, s.lastPreset)).toBeNull()
    s = cut(s)
    expect(onAirLook(s.presets, s.outputs, s.program, s.lastPreset)).toBe('preset-2')
    // Preview moves on, Program stays
    s = run(s, { type: 'recallPreset', id: 'preset-1' })
    expect(onAirLook(s.presets, s.outputs, s.program, s.lastPreset)).toBe('preset-2')
    s = cut(s)
    expect(onAirLook(s.presets, s.outputs, s.program, s.lastPreset)).toBe('preset-1')
  })
  it('compares the screens the look arms: the others keep their old frame', () => {
    let s = run(base, { type: 'arm', outputIds: ['wide'] }, { type: 'setLayers', outputId: 'wide', patch: { scene: 'lineup' } }, { type: 'savePreset', name: 'L' })
    s = cut(s) // only Wide is taken
    // Twins, Stream and Pillars differ from their (never taken) frames, but the look does not arm them
    expect(onAirLook(s.presets, s.outputs, s.program, null)).toBe('preset-1')
    // a look that also arms Twins is not fully on air: Twins was never taken and its layers differ from that frame
    s = run(s, { type: 'arm', outputIds: ['wide', 'twins'] }, { type: 'savePreset', name: 'LT' })
    expect(onAirLook(s.presets, s.outputs, s.program, null)).toBe('preset-1')
    expect(onAirLook(s.presets.slice(1), s.outputs, s.program, null)).toBeNull()
    s = cut(s)
    expect(onAirLook(s.presets.slice(1), s.outputs, s.program, null)).toBe('preset-2')
  })
  it('prefers the loaded look when several draw the same picture, and ignores looks that do not recall layers', () => {
    let s = run(base, { type: 'arm', outputIds: ['wide', 'twins', 'stream', 'pillars'] }, { type: 'setLayers', outputId: 'wide', patch: { scene: 'lineup' } }, { type: 'savePreset', name: 'A' }, { type: 'savePreset', name: 'B' })
    s = cut(s)
    expect(onAirLook(s.presets, s.outputs, s.program, 'preset-2')).toBe('preset-2')
    expect(onAirLook(s.presets, s.outputs, s.program, null)).toBe('preset-1')
    const noLayers = s.presets.map((p) => ({ ...p, scope: { ...p.scope, layers: false } }))
    expect(onAirLook(noLayers, s.outputs, s.program, null)).toBeNull()
  })
})

describe('thumbnail models', () => {
  const s = run(base, { type: 'setPlayer', index: 0, patch: { name: 'SAM' } }, { type: 'setLayers', outputId: 'wide', patch: { scene: 'lineup', background: 'B' } },
    { type: 'savePreset', name: 'A', scope: { players: false, style: true } }, { type: 'setPlayer', index: 0, patch: { name: 'LIVE' } })
  it('draws a look from the data a recall would leave in Preview', () => {
    // players are not in the look's scope, so the tile shows today's player
    expect(recalledDraft(s.presets[0], s.draft, null).players[0].name).toBe('LIVE')
    const inScope = { ...s.presets[0], scope: { ...s.presets[0].scope, players: true } }
    expect(recalledDraft(inScope, s.draft, null).players[0].name).toBe('SAM')
    expect(recalledDraft(inScope, s.draft, { id: 't' } as never).players[0].name).toBe('LIVE') // a tournament supplies the players
  })
  it('derives a real view model from the look layers (Wide first)', () => {
    expect(thumbOutput(s.outputs)?.id).toBe('wide')
    const v = presetView(s.presets[0], s, idx, null)
    expect(v?.scene?.kind).toBe('lineup')
    expect(v?.background?.id).toBe('B')
    expect(presetView(s.presets[0], s, null, null)).toBeNull()
  })
  it('draws a scene tile from the current Preview with only the scene swapped', () => {
    const wide = s.outputs.find((o) => o.id === 'wide')!
    const twins = s.outputs.find((o) => o.id === 'twins')!
    expect(sceneView('standings', s.layers.wide, wide, s.draft, idx, null)?.scene?.kind).toBe('standings')
    expect(sceneView('none', s.layers.wide, wide, s.draft, idx, null)?.background).toBeNull()
    expect(sceneView('title', { ...s.layers.wide, trackCard: true }, wide, s.draft, idx, null)?.trackCard).toBeNull()
    // a twin shows a win screen as a hero or a board half, so its tile is drawn as the hero
    expect(sceneView('raceWin', s.layers.twins, twins, s.draft, idx, null)?.scene?.kind).toBe('raceWin')
  })
})

describe('scene editor helpers', () => {
  it('offers each format the scenes it can show, bracket and matches only with a tournament', () => {
    const ids = (f: 'wide' | 'twin' | 'hd', t: boolean) => availableScenes(f, t).map((x) => x.id)
    expect(ids('wide', false)).toEqual(['none', 'title', 'lineup', 'nextRace', 'standings', 'winner', 'raceWin', 'cupWin', 'notice', 'qr'])
    expect(ids('wide', true)).toContain('bracket')
    expect(ids('wide', true)).toContain('matches')
    expect(ids('twin', false)).toEqual(['none', 'title', 'raceWin', 'cupWin', 'qr'])
    expect(ids('twin', true)).toEqual(['none', 'title', 'raceWin', 'cupWin', 'bracket', 'matches', 'qr'])
    expect(ids('hd', false)).toEqual(ids('wide', false))
  })
  it('offers a twin only the hero and board parts', () => {
    expect(availableParts('twin', 'raceWin').map((p) => p.id)).toEqual(['hero', 'board'])
    expect(availableParts('wide', 'cupWin').map((p) => p.id)).toEqual(['full', 'hero', 'board'])
  })
  it('selecting a win screen on a twin also picks a part it can show', () => {
    expect(scenePatch('twin', {}, 'raceWin')).toEqual({ scene: 'raceWin', part: 'hero' })
    expect(scenePatch('twin', { part: 'board' }, 'cupWin')).toEqual({ scene: 'cupWin' })
    expect(scenePatch('wide', {}, 'raceWin')).toEqual({ scene: 'raceWin' })
    expect(scenePatch('twin', {}, 'title')).toEqual({ scene: 'title' })
  })
  it('knows which scenes have options', () => {
    expect(hasSceneOptions('standings', 'wide', false)).toBe(false)
    expect(hasSceneOptions('lineup', 'wide', false)).toBe(true)
    expect(hasSceneOptions('qr', 'twin', false)).toBe(false)
    expect(hasSceneOptions('qr', 'hd', false)).toBe(true)
    expect(hasSceneOptions('matches', 'wide', false)).toBe(false)
    expect(hasSceneOptions('matches', 'wide', true)).toBe(true)
  })
  it('QR layouts per format; HD draws "sides" as the centre layout', () => {
    expect(qrStyles('wide').map(([s]) => s)).toEqual(['center', 'title', 'sides'])
    expect(qrStyles('hd').map(([s]) => s)).toEqual(['center', 'title'])
    expect(qrStyles('twin')).toEqual([])
    expect(qrStyleSelected('hd', { qrStyle: 'sides' }, 'center')).toBe(true)
    expect(qrStyleSelected('wide', { qrStyle: 'sides' }, 'center')).toBe(false)
    expect(qrStyleSelected('wide', {}, 'center')).toBe(true)
  })
  it('line-up reveal steps and lower-third players', () => {
    expect([0, 1, 2, 3, 4].map(revealLabel)).toEqual(['None', 'P1', 'P1–2', 'P1–3', 'All'])
    expect([nextReveal({}), nextReveal({ lineupShown: 1 }), nextReveal({ lineupShown: 3 })]).toEqual([4, 2, 4])
    expect(togglePlayer([0, 2], 1)).toEqual([0, 1, 2])
    expect(togglePlayer([0, 1, 2], 1)).toEqual([0, 2])
  })
})
