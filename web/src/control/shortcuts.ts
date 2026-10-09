import type { Command } from '../../../shared/types'

export interface ShortcutKey { key: string; shiftKey: boolean; targetTag: string }
/** goStackId: the rundown G fires. Null/absent while the rundown is in Edit mode (GO is locked) or none exists. */
export interface ShortcutState { outputs: string[]; armed: string[]; hold: boolean; ftb: boolean; goStackId?: string | null }

const TEXT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])
/** Fields where capital letters are typed text: Shift+B must never fade the outputs to black from inside one. */
const TYPED_TAGS = new Set(['INPUT', 'TEXTAREA'])

export function shortcutCommand(e: ShortcutKey, s: ShortcutState): Command | null {
  const typing = TEXT_TAGS.has(e.targetTag.toUpperCase())
  // Emergency shortcuts work everywhere.
  if (e.shiftKey && e.key === 'Escape') return { type: 'clear' }
  if (e.shiftKey && (e.key === 'B' || e.key === 'b') && !TYPED_TAGS.has(e.targetTag.toUpperCase())) return { type: 'ftb', on: !s.ftb }
  if (typing || e.shiftKey) return null
  if (e.key === ' ') return { type: 'take', mode: 'auto' }
  if (e.key === 'Enter') return { type: 'take', mode: 'cut' }
  if (e.key === 'h' || e.key === 'H') return { type: 'hold', on: !s.hold }
  if (e.key === 'g' || e.key === 'G') return s.goStackId ? { type: 'goStack', stackId: s.goStackId } : null
  if (/^[1-9]$/.test(e.key)) {
    const id = s.outputs[Number(e.key) - 1]
    if (!id) return null
    const armed = s.armed.includes(id) ? s.armed.filter((x) => x !== id) : [...s.armed, id]
    return { type: 'arm', outputIds: armed }
  }
  return null
}
