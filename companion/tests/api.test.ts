import { describe, expect, it } from 'vitest'
import { overwritePresetCommand, savePresetCommand, armCommand, baseUrl, cueActionCommand, cueKey, cueState, KartCupApi, recallCommand, resolveOnOff, splitCueKey, stepSelectionCommand, takeCommand, type StackInfo } from '../src/api.js'

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
