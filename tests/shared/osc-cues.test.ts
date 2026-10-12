import { describe, expect, it } from 'vitest'
import { indexCatalog } from '../../shared/catalog'
import { createDefaultState } from '../../shared/defaults'
import { encodeOsc, formatOscLine, parseOscLine } from '../../shared/osc'
import { reduce } from '../../shared/reducer'
import { commandSchema, showStateSchema } from '../../shared/schema'
import type { Command, OscCue, ShowState } from '../../shared/types'
import { fixtureCatalog } from '../fixtures/catalog'

const idx = indexCatalog(fixtureCatalog)
const sent: OscCue[] = []
const ctx = { catalog: idx, now: 1000, random: () => 0, onOsc: (o: OscCue) => { sent.push(o) } }
const run = (s: ShowState, ...cmds: Command[]) => cmds.reduce((a, c) => reduce(a, c, ctx), s)
const go = (a: string): OscCue => ({ host: '10.0.0.5', port: 8000, messages: [{ address: '/cmd', args: [`Go+ Sequence ${a}`] }] })

const stack = () => run(createDefaultState(idx, 0),
  { type: 'createStack', name: 'Show' },
  { type: 'addCueFromPreview', stackId: 'stack-1', name: 'P1', take: 'cut' },
  { type: 'addOscCue', stackId: 'stack-1', osc: go('1') },
  { type: 'addOscCue', stackId: 'stack-1', osc: go('2') },
  { type: 'addCueFromPreview', stackId: 'stack-1', name: 'P2', take: 'cut' })

describe('OSC encoding', () => {
  it('encodes address, type tags and padded arguments', () => {
    const b = encodeOsc({ address: '/cmd', args: ['Go', 3, 0.5, true] })
    expect(new TextDecoder().decode(b.slice(0, 4))).toBe('/cmd')
    expect(new TextDecoder().decode(b.slice(8, 13))).toBe(',sifT')
    expect(b.length % 4).toBe(0)
    const v = new DataView(b.buffer)
    expect(v.getInt32(b.length - 8)).toBe(3); expect(v.getFloat32(b.length - 4)).toBe(0.5)
  })
  it('round-trips the one-line form', () => {
    const m = parseOscLine('/cmd "Go+ Sequence 1" 3 0.5 true "7"')
    expect(m).toEqual({ address: '/cmd', args: ['Go+ Sequence 1', 3, 0.5, true, '7'] })
    expect(parseOscLine(formatOscLine(m!))).toEqual(m)
    expect(parseOscLine('cmd 1')).toBeNull()
  })
})

describe('OSC cues', () => {
  it('auto-follow the cue before them, in order, and stop at the next Look', () => {
    sent.length = 0
    const s = run(stack(), { type: 'fireCue', stackId: 'stack-1', cueId: 'cue-1' })
    expect(sent).toEqual([go('1'), go('2')])
    expect(s.stacks[0].current).toBe('cue-3')
    expect(s.stacks[0].selected).toBe('cue-4') // standing by on the next Look
  })
  it('fire on GO when they are the standby cue, and are skipped when stood by', () => {
    sent.length = 0
    const s = run(stack(), { type: 'selectCue', stackId: 'stack-1', cueId: 'cue-2' })
    expect(sent).toEqual([])
    expect(s.stacks[0].selected).toBe('cue-2')
    run(s, { type: 'goStack', stackId: 'stack-1' })
    expect(sent).toEqual([go('1'), go('2')])
  })
  it('can be edited, and validate', () => {
    const s = run(stack(), { type: 'updateCue', stackId: 'stack-1', cueId: 'cue-2', osc: go('9') })
    expect(s.stacks[0].cues[1].osc).toEqual(go('9'))
    expect(commandSchema.safeParse({ type: 'addOscCue', stackId: 's', osc: { host: 'x', port: 0, messages: [] } }).success).toBe(false)
    expect(commandSchema.safeParse({ type: 'addOscCue', stackId: 's', osc: { host: 'x', port: 1, messages: [{ address: 'cmd', args: [] }] } }).success).toBe(false)
    expect(showStateSchema.safeParse(JSON.parse(JSON.stringify(s))).success).toBe(true)
  })
})
