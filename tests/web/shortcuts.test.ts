import { describe, it, expect } from 'vitest'
import { shortcutCommand } from '../../web/src/control/shortcuts'

const s = { outputs: ['wide', 'twins', 'stream', 'pillars'], armed: ['wide'], hold: false, ftb: false }
const k = (key: string, targetTag = 'BODY', shiftKey = false) => ({ key, shiftKey, targetTag })

describe('shortcutCommand', () => {
  it('space and enter take', () => {
    expect(shortcutCommand(k(' '), s)).toEqual({ type: 'take', mode: 'auto' })
    expect(shortcutCommand(k('Enter'), s)).toEqual({ type: 'take', mode: 'cut' })
    expect(shortcutCommand(k(' ', 'INPUT'), s)).toBeNull()
  })
  it('number keys toggle arming', () => {
    expect(shortcutCommand(k('2'), s)).toEqual({ type: 'arm', outputIds: ['wide', 'twins'] })
    expect(shortcutCommand(k('1'), s)).toEqual({ type: 'arm', outputIds: [] })
    expect(shortcutCommand(k('9'), s)).toBeNull()
  })
  it('g fires GO on the current rundown, but not in Edit mode or in inputs', () => {
    expect(shortcutCommand(k('g'), { ...s, goStackId: 'stack-1' })).toEqual({ type: 'goStack', stackId: 'stack-1' })
    expect(shortcutCommand(k('G'), { ...s, goStackId: 'stack-1' })).toEqual({ type: 'goStack', stackId: 'stack-1' })
    expect(shortcutCommand(k('g'), s)).toBeNull()
    expect(shortcutCommand(k('g'), { ...s, goStackId: null })).toBeNull()
    expect(shortcutCommand(k('g', 'INPUT'), { ...s, goStackId: 'stack-1' })).toBeNull()
  })
  it('hold ignored in inputs', () => {
    expect(shortcutCommand(k('h'), s)).toEqual({ type: 'hold', on: true })
    expect(shortcutCommand(k('h', 'INPUT'), s)).toBeNull()
    expect(shortcutCommand(k('h'), { ...s, hold: true })).toEqual({ type: 'hold', on: false })
  })
  it('emergency shortcuts work in text fields', () => {
    expect(shortcutCommand(k('Escape', 'INPUT', true), s)).toEqual({ type: 'clear' })
    expect(shortcutCommand(k('B', 'TEXTAREA', true), s)).toEqual({ type: 'ftb', on: true })
    expect(shortcutCommand(k('B', 'SELECT', true), { ...s, ftb: true })).toEqual({ type: 'ftb', on: false })
    expect(shortcutCommand(k('Escape'), s)).toBeNull()
  })
})
