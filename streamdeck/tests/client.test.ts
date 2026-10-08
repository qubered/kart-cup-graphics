import { describe, expect, it } from 'vitest'
import { KartCupClient, normaliseBase, recallCommand, stepCommand, takeCommand } from '../src/client'

describe('commands', () => {
  it('recall maps take settings', () => {
    expect(recallCommand('preset-1', 'none')).toEqual({ type: 'recallPreset', id: 'preset-1' })
    expect(recallCommand('preset-1', undefined)).toEqual({ type: 'recallPreset', id: 'preset-1' })
    expect(recallCommand('preset-1', 'auto')).toEqual({ type: 'recallPreset', id: 'preset-1', take: 'auto' })
  })
  it('step maps direction and take', () => {
    expect(stepCommand('prev', 'cut')).toEqual({ type: 'stepCue', delta: -1, take: 'cut' })
    expect(stepCommand(undefined, 'none')).toEqual({ type: 'stepCue', delta: 1 })
  })
  it('take defaults to cut', () => {
    expect(takeCommand('auto')).toEqual({ type: 'take', mode: 'auto' })
    expect(takeCommand(undefined)).toEqual({ type: 'take', mode: 'cut' })
  })
  it('normalises the server url', () => {
    expect(normaliseBase('')).toBe('http://localhost:8080')
    expect(normaliseBase('192.168.1.20:8080/')).toBe('http://192.168.1.20:8080')
    expect(normaliseBase('https://x.test//')).toBe('https://x.test')
  })
})

describe('client', () => {
  it('posts commands and surfaces server errors', async () => {
    const calls: { url: string; body?: string }[] = []
    const fake = (async (url: string, init?: RequestInit) => {
      calls.push({ url, body: init?.body as string | undefined })
      return String(init?.body).includes('bad')
        ? new Response(JSON.stringify({ error: 'Unknown preset: bad' }), { status: 400 })
        : new Response('{"ok":true}', { status: 200 })
    }) as unknown as typeof fetch
    const c = new KartCupClient(() => 'http://h:1', fake)
    await c.command({ type: 'recallPreset', id: 'preset-1' })
    expect(calls[0]).toEqual({ url: 'http://h:1/api/command', body: '{"type":"recallPreset","id":"preset-1"}' })
    await expect(c.command({ type: 'recallPreset', id: 'bad' })).rejects.toThrow('Unknown preset: bad')
  })
})
