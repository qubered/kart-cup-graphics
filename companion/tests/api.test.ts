import { describe, expect, it } from 'vitest'
import { overwritePresetCommand, savePresetCommand, armCommand, baseUrl, cueActionCommand, cueKey, cueState, KartCupApi, recallCommand, resolveOnOff, splitCueKey, stepSelectionCommand, cueActionStandalone, matchSetOf, setActiveMatchCommand, showSceneCommand, splitWinCommands, summarizeTournament, tournamentVars, type RawTournament, takeCommand, type StackInfo } from '../src/api.js'

const stacks: StackInfo[] = [{ id: 'stack-1', name: 'Show', current: 'cue-1', selected: 'cue-2', cues: [] }]

describe('commands', () => {
  it('recall maps take', () => {
    expect(recallCommand('preset-1', 'none')).toEqual({ type: 'recallPreset', id: 'preset-1' })
    expect(recallCommand('preset-1', 'auto')).toEqual({ type: 'recallPreset', id: 'preset-1', take: 'auto' })
  })
  it('selection, take', () => {
    expect(stepSelectionCommand('stack-1', 'prev')).toEqual({ type: 'stepSelection', stackId: 'stack-1', delta: -1 })
    expect(stepSelectionCommand('stack-1', undefined)).toEqual({ type: 'stepSelection', stackId: 'stack-1', delta: 1 })
    expect(takeCommand('auto')).toEqual({ type: 'take', mode: 'auto' })
    expect(takeCommand(undefined)).toEqual({ type: 'take', mode: 'cut' })
  })
  it('cue keys round-trip', () => {
    expect(splitCueKey(cueKey('stack-1', 'cue-2'))).toEqual({ stackId: 'stack-1', cueId: 'cue-2' })
    expect(splitCueKey('')).toBeNull()
    expect(cueActionCommand('fireCue', 'stack-1|cue-2')).toEqual({ type: 'fireCue', stackId: 'stack-1', cueId: 'cue-2' })
    expect(cueActionCommand('selectCue', 'bad')).toBeNull()
  })
  it('cue state is pgm / pvw / none', () => {
    expect(cueState(stacks, 'stack-1|cue-1')).toBe('pgm')
    expect(cueState(stacks, 'stack-1|cue-2')).toBe('pvw')
    expect(cueState(stacks, 'stack-1|cue-3')).toBe('')
    expect(cueState(stacks, 'gone|cue-1')).toBe('')
  })
  it('arm and toggles', () => {
    expect(armCommand(['wide'], 'twins', 'toggle')).toEqual({ type: 'arm', outputIds: ['wide', 'twins'] })
    expect(armCommand(['wide', 'twins'], 'wide', 'toggle')).toEqual({ type: 'arm', outputIds: ['twins'] })
    expect(armCommand(['wide'], 'wide', 'on')).toEqual({ type: 'arm', outputIds: ['wide'] })
    expect(resolveOnOff('off', true)).toBe(false); expect(resolveOnOff('toggle', false)).toBe(true)
  })
  it('save / overwrite from PVW or PGM', () => {
    expect(savePresetCommand(' Look ', 'pgm')).toEqual({ type: 'savePreset', name: 'Look', from: 'pgm' })
    expect(savePresetCommand('', undefined)).toEqual({ type: 'savePreset', name: 'New preset', from: 'pvw' })
    expect(overwritePresetCommand('preset-1', 'pgm')).toEqual({ type: 'updatePreset', id: 'preset-1', from: 'pgm' })
  })
  it('builds the server url', () => {
    expect(baseUrl('', undefined)).toBe('http://127.0.0.1')
    expect(baseUrl('192.168.1.20', 8080)).toBe('http://192.168.1.20:8080')
    expect(baseUrl('http://host:9000/', 8080)).toBe('http://host:9000')
  })
})

describe('api', () => {
  it('posts commands and surfaces server errors', async () => {
    const calls: { url: string; body?: string }[] = []
    const fake = (async (url: string, init?: RequestInit) => {
      calls.push({ url, body: init?.body as string | undefined })
      return String(init?.body).includes('bad') ? new Response(JSON.stringify({ error: 'Unknown cue stack: bad' }), { status: 400 }) : new Response('{"ok":true}')
    }) as unknown as typeof fetch
    const api = new KartCupApi(() => 'http://h:1', fake)
    await api.command({ type: 'goStack', stackId: 'stack-1' })
    expect(calls[0]).toEqual({ url: 'http://h:1/api/command', body: '{"type":"goStack","stackId":"stack-1"}' })
    await expect(api.command({ type: 'goStack', stackId: 'bad' })).rejects.toThrow('Unknown cue stack: bad')
  })
})

describe('tournament', () => {
  const player = (name: string) => ({ name })
  const t: RawTournament = {
    id: 't1', name: 'Cup', activeMatchId: 'm1',
    matches: [
      { id: 'm1', label: 'Semi 1', round: 0, status: 'live', winnerOverride: null, data: { players: ['A', 'B'].map(player), scores: { races: [{ positions: [2, 1] }], adjustments: [0, 0] } } },
      { id: 'm2', label: 'Semi 2', round: 0, status: 'pending', winnerOverride: null, data: { players: ['C', 'D'].map(player), scores: { races: [], adjustments: [0, 0] } } },
      { id: 'm3', label: 'Final', round: 1, status: 'done', winnerOverride: 0, data: { players: ['A', 'D'].map(player), scores: { races: [{ positions: [2, 1] }], adjustments: [0, 0] } } },
    ],
  }
  it('summarises winners (computed, none, override) and variables', () => {
    const info = summarizeTournament(t)!
    expect(info.matches.map((m) => m.winner)).toEqual(['B', '', 'A'])
    expect(tournamentVars(info)).toEqual({ tournament_name: 'Cup', active_match_label: 'Semi 1', active_match_status: 'live', active_match_winner: 'B' })
    expect(tournamentVars(null).active_match_label).toBe('')
  })
  it('match commands', () => {
    expect(setActiveMatchCommand('m2')).toEqual({ type: 'setActiveMatch', matchId: 'm2' })
    expect(setActiveMatchCommand('')).toBeNull()
  })
  it('show scene commands carry the right layer fields', () => {
    expect(showSceneCommand('wide', 'raceWin', { part: 'hero', matchRef: 'previous' })).toEqual({ type: 'setLayers', outputId: 'wide', patch: { scene: 'raceWin', part: 'hero', matchRef: 'previous' } })
    expect(showSceneCommand('wide', 'cupWin', { matchRef: 'm3' }).patch).toEqual({ scene: 'cupWin', part: 'full', matchRef: { matchId: 'm3' } })
    expect(showSceneCommand('wide', 'bracket').patch).toEqual({ scene: 'bracket' })
    expect(showSceneCommand('twin', 'matches', { matches: 'round:0', range: '3-4' }).patch).toEqual({ scene: 'matches', matchSet: { rounds: [0], range: [2, 3] } })
    expect(matchSetOf('all', '')).toEqual({})
  })
  it('split win and cue actions', () => {
    expect(splitWinCommands('cupWin', 'a', 'b', 'active').map((c) => (c.patch as { part: string }).part)).toEqual(['hero', 'board'])
    expect(cueActionStandalone('nextMatch', 's')).toEqual({ type: 'nextMatch' })
    expect(cueActionStandalone('resetStack', 's')).toEqual({ type: 'resetStack', id: 's' })
    expect(cueActionStandalone('nextRace', 's')).toEqual({ type: 'stepRace', delta: 1 })
    expect(cueActionStandalone('bogus', 's')).toBeNull()
  })
})
