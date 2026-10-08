import type { Presence } from '../../../shared/protocol'
import type { OutputFormat } from '../../../shared/types'

export type Light = 'on' | 'partial' | 'off'
type Entry = Presence[string] | undefined

/**
 * Connection state of an output. A twin output is fully on air when a full-canvas page is connected or both
 * halves are; with only one half connected it is `partial`.
 */
export function light(e: Entry, format: OutputFormat): Light {
  if (!e || e.program <= 0) return 'off'
  if (format !== 'twin') return 'on'
  const full = e.program - e.left - e.right
  if (full > 0 || (e.left > 0 && e.right > 0)) return 'on'
  return 'partial'
}

export function lightTitle(name: string, e: Entry, format: OutputFormat): string {
  if (!e) return `${name}: 0 program, 0 preview clients`
  const halves = format === 'twin' ? ` (left ${e.left}, right ${e.right})` : ''
  return `${name}: ${e.program} program${halves}, ${e.preview} preview clients`
}
