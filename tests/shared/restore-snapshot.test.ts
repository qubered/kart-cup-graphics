import { describe, expect, it } from 'vitest'
import { indexCatalog } from '../../shared/catalog'
import { createDefaultState } from '../../shared/defaults'
import { clientMessageSchema } from '../../shared/protocol'
import { reduce } from '../../shared/reducer'
import { commandSchema, previewSnapshotSchema } from '../../shared/schema'
import { activeTournament } from '../../shared/tournament'
import type { Command, PreviewSnapshot, ShowState } from '../../shared/types'
import { fixtureCatalog } from '../fixtures/catalog'

const idx = indexCatalog(fixtureCatalog)
const ctx = { catalog: idx, now: 1000, random: () => 0 }
const run = (s: ShowState, ...cmds: Command[]) => cmds.reduce((a, c) => reduce(a, c, ctx), s)
const base = createDefaultState(idx, 0)
const T = (s: ShowState) => activeTournament(s)!

/** What the control UI captures before it loads a look into Preview. */
const previewOf = (s: ShowState): PreviewSnapshot => structuredClone({ draft: s.draft, layers: s.layers, armed: s.armed, transition: s.transition, mattify: s.settings.mattify, lastPreset: s.lastPreset })
const race = (raceNo: number, positions = [1, 2, 3, 4]) => ({ raceNo, trackId: 'water-park', positions })

/** A Preview that differs from the defaults in every part a snapshot covers. */
const distinctive = (s: ShowState) => run(s,
  { type: 'setLayers', outputId: 'wide', patch: { scene: 'standings', background: 'C' } }, { type: 'setLayers', outputId: 'pillars', patch: { scene: 'notice', noticeQr: true } },
  { type: 'arm', outputIds: ['wide', 'pillars'] }, { type: 'setTransition', speed: 'slow' }, { type: 'setMattify', on: true },
  { type: 'setEventText', patch: { title: 'FINALS', preTitle: 'PRE' } }, { type: 'setTypography', role: 'names', patch: { font: 'Saira' } },
  { type: 'setPlayer', index: 1, patch: { name: 'BOB', colour: 'pink' } }, { type: 'setRace', patch: { cupId: 'flower', raceIndex: 2 } },
  { type: 'saveResults', raceNo: 1, trackId: 'mario-circuit', positions: [2, 1, 3, 4] }, { type: 'setAdjustment', index: 3, value: 5 })

/** A look that changes everything when recalled with the widest scope. */
const otherLook = (s: ShowState) => {
  let t = run(createDefaultState(idx, 0), { type: 'setLayers', outputId: 'wide', patch: { scene: 'lineup', background: 'B' } }, { type: 'arm', outputIds: ['twins'] },
    { type: 'setTransition', speed: 'fast' }, { type: 'setEventText', patch: { title: 'OTHER' } }, { type: 'setPlayer', index: 0, patch: { name: 'ZED' } },
    { type: 'setRace', patch: { cupId: 'boomerang' } }, { type: 'saveResults', raceNo: 1, trackId: 'tour-bangkok-rush', positions: [4, 3, 2, 1] })
  t = run(t, { type: 'savePreset', name: 'Other', scope: { match: true, players: true, scores: true } })
  return { ...s, presets: [...s.presets, ...t.presets.map((p) => ({ ...p, id: 'preset-9' }))] }
}

describe('restoreSnapshot', () => {
  it('undoes a recall exactly, without a tournament', () => {
    const before = otherLook(distinctive(base))
    const snap = previewOf(before)
    const recalled = run(before, { type: 'recallPreset', id: 'preset-9' })
    // the recall really did replace every part
    expect(recalled.draft).not.toEqual(before.draft); expect(recalled.layers).not.toEqual(before.layers); expect(recalled.armed).toEqual(['twins'])
    expect(recalled.transition).toBe('fast'); expect(recalled.lastPreset).toBe('preset-9'); expect(recalled.settings.mattify).toBe(false); expect(before.settings.mattify).toBe(true)
    expect(recalled.draft.players[0].name).toBe('ZED'); expect(recalled.draft.scores.races[0].trackId).toBe('tour-bangkok-rush')
    const back = run(recalled, { type: 'restoreSnapshot', snapshot: snap })
    expect(back).toEqual(before)
    expect(previewOf(back)).toEqual(snap)
  })
  it('undoes a recall exactly, with a tournament active (and keeps the match in step)', () => {
    let before = distinctive(base)
    before = run(otherLook(before), { type: 'createTournament', name: 'T' }, { type: 'setActiveMatch', matchId: 'match-2' }, { type: 'setPlayer', index: 2, patch: { name: 'LIVE' } },
      { type: 'saveResults', raceNo: 1, trackId: 'water-park', positions: [3, 2, 1, 4] }, { type: 'setEventText', patch: { title: 'SEMI' } })
    const snap = previewOf(before)
    const recalled = run(before, { type: 'recallPreset', id: 'preset-9' })
    expect(recalled.layers).not.toEqual(before.layers); expect(recalled.draft.event.title).toBe('OTHER')
    expect(recalled.draft.players).toEqual(before.draft.players) // match data is never recalled in a tournament
    const back = run(recalled, { type: 'restoreSnapshot', snapshot: snap })
    expect(back).toEqual(before)
    expect(T(back).matches[1].data.players[2].name).toBe('LIVE'); expect(T(back).matches[1].data.scores.races).toHaveLength(1)
  })
  it('restores players, race and scores into the active match, and slot auto-fill still runs', () => {
    // Final (match-5) is active; semi 1's winner is slot 0 named ONE and fills the final's slot 0 automatically.
    let s = run(base, { type: 'createTournament', name: 'T' }, { type: 'updateMatch', matchId: 'match-1', patch: { players: [{ name: 'ONE' }] } },
      { type: 'setMatchResults', matchId: 'match-1', races: [race(1)] }, { type: 'setActiveMatch', matchId: 'match-5' })
    expect(s.draft.players[0].name).toBe('ONE')
    const snap = previewOf(s)
    snap.draft.players = snap.draft.players.map((p, i) => ({ ...p, name: i === 0 ? 'STALE' : i === 1 ? 'HAND' : p.name }))
    snap.draft.race = { ...snap.draft.race, cupId: 'flower', raceIndex: 3, trackId: 'shy-guy-falls', raceNo: 4 }
    snap.draft.scores = { races: [race(1, [4, 3, 2, 1])], adjustments: [0, 0, 7, 0] }
    s = run(s, { type: 'restoreSnapshot', snapshot: snap })
    const final = T(s).matches[4]
    // slot 1 follows source semi 2 (auto), which has no winner yet, so the restored name stays; slot 0 is refilled from semi 1
    expect(s.draft.players.map((p) => p.name)).toEqual(['ONE', 'HAND', 'Player 3', 'Player 4'])
    expect(final.data.players.map((p) => p.name)).toEqual(['ONE', 'HAND', 'Player 3', 'Player 4'])
    expect(final.data.race).toMatchObject({ cupId: 'flower', raceIndex: 3, raceNo: 4 })
    expect(final.data.scores).toEqual(s.draft.scores); expect(final.data.scores.adjustments).toEqual([0, 0, 7, 0])
    expect(final.status).toBe('live')
  })
  it('never touches Program or the clocks, and refreshes on-air scores like any score change', () => {
    let s = run(base, { type: 'setLayers', outputId: 'wide', patch: { scene: 'standings' } }, { type: 'arm', outputIds: ['wide'] }, { type: 'saveResults', raceNo: 1, trackId: 'water-park', positions: [1, 2, 3, 4] })
    s = run(s, { type: 'take', mode: 'cut' })
    const snap = previewOf(s)
    const scoresAtSnap = s.draft.scores
    s = run(s, { type: 'setAdjustment', index: 1, value: 40 }, { type: 'setLayers', outputId: 'wide', patch: { scene: 'none' } }, { type: 'setLayers', outputId: 'pillars', patch: { background: 'C' } })
    const program = s.program, clocks = s.clocks, overlay = s.overlay, outputs = s.outputs
    const back = run(s, { type: 'restoreSnapshot', snapshot: snap })
    expect(back.layers.wide.scene).toBe('standings'); expect(back.draft.scores).toEqual(scoresAtSnap)
    expect(back.program.wide.layers).toBe(program.wide.layers); expect(back.program.wide.takenAt).toBe(program.wide.takenAt)
    expect(back.program.wide.mode).toBe(program.wide.mode); expect(back.clocks).toBe(clocks); expect(back.overlay).toBe(overlay); expect(back.outputs).toBe(outputs)
    // the on-air standings scene is live, so it now shows the restored scores
    const scene = back.program.wide.view.scene
    expect(scene?.kind === 'standings' && scene.rows.map((r) => r.total)).toEqual([15, 12, 10, 9])
  })
  it('is lenient: unknown outputs are ignored, a missing output keeps its layers, a dangling lastPreset becomes null', () => {
    const s0 = run(base, { type: 'setLayers', outputId: 'stream', patch: { background: 'C' } }, { type: 'savePreset', name: 'P' })
    const snap = previewOf(s0)
    snap.layers.ghost = structuredClone(snap.layers.wide); snap.armed = ['wide', 'ghost', 'wide']
    delete snap.layers.stream
    snap.lastPreset = 'preset-77'
    snap.layers.wide.scene = 'qr'
    const s = run(s0, { type: 'restoreSnapshot', snapshot: snap })
    expect(s.layers.wide.scene).toBe('qr'); expect(s.layers.ghost).toBeUndefined(); expect(Object.keys(s.layers).sort()).toEqual(['pillars', 'stream', 'twins', 'wide'])
    expect(s.layers.stream).toEqual(s0.layers.stream)
    expect(s.armed).toEqual(['wide']); expect(s.lastPreset).toBeNull()
    expect(run(s0, { type: 'restoreSnapshot', snapshot: { ...previewOf(s0), lastPreset: 'preset-1' } }).lastPreset).toBe('preset-1')
  })
  it('takes a copy of the snapshot and drops stale stack standby marks (Preview is replaced)', () => {
    let s = run(base, { type: 'savePreset', name: 'P' }, { type: 'createStack', name: 'K' }, { type: 'addCue', stackId: 'stack-1', presetId: 'preset-1', take: 'cut' }, { type: 'selectCue', stackId: 'stack-1', cueId: 'cue-1' })
    expect(s.stacks[0].selected).toBe('cue-1')
    const snap = previewOf(s)
    s = run(s, { type: 'restoreSnapshot', snapshot: snap })
    snap.draft.players[0].name = 'mutated'; snap.layers.wide.scene = 'none'; snap.armed.push('x')
    expect(s.draft.players[0].name).toBe('Player 1'); expect(s.layers.wide.scene).toBe('title'); expect(s.armed).toEqual([])
    expect(s.stacks[0]).toMatchObject({ selected: null, current: null })
  })
  it('restores the draft whole: event text, typography, notice, QR', () => {
    const s0 = run(base, { type: 'setQr', patch: { text: 'SCAN' } }, { type: 'setNotice', doc: { blocks: [{ align: 'left', runs: [{ text: 'HI' }] }] } }, { type: 'setTypography', role: 'headings', patch: { look: 'plain' } })
    const snap = previewOf(s0)
    const s = run(run(s0, { type: 'resetShow' }), { type: 'restoreSnapshot', snapshot: snap })
    expect(s.draft).toEqual(s0.draft)
  })
  it('schema', () => {
    const snapshot = JSON.parse(JSON.stringify(previewOf(distinctive(base))))
    const parse = (sn: unknown) => commandSchema.safeParse({ type: 'restoreSnapshot', snapshot: sn })
    expect(parse(snapshot).success).toBe(true)
    expect(previewSnapshotSchema.safeParse({ ...snapshot, lastPreset: null }).success).toBe(true)
    expect(clientMessageSchema.safeParse({ type: 'command', command: { type: 'restoreSnapshot', snapshot } }).success).toBe(true)
    const mut = (f: (p: Record<string, any>) => void) => { const c = JSON.parse(JSON.stringify(snapshot)); f(c); return c }
    expect(parse(undefined).success).toBe(false); expect(parse({}).success).toBe(false); expect(parse('x').success).toBe(false)
    for (const f of ['draft', 'layers', 'armed', 'transition', 'mattify', 'lastPreset']) expect(parse(mut((p) => { delete p[f] })).success).toBe(false)
    expect(parse(mut((p) => { p.transition = 'instant' })).success).toBe(false)
    expect(parse(mut((p) => { p.mattify = 'yes' })).success).toBe(false)
    expect(parse(mut((p) => { p.armed = 'wide' })).success).toBe(false)
    expect(parse(mut((p) => { p.lastPreset = 4 })).success).toBe(false)
    expect(parse(mut((p) => { p.layers.wide.scene = 'bogus' })).success).toBe(false)
    expect(parse(mut((p) => { p.draft.players.length = 2 })).success).toBe(false)
    expect(parse(mut((p) => { p.draft.scores.adjustments = [1] })).success).toBe(false)
  })
})
