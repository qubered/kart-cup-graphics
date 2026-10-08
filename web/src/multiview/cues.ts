import type { CueStack, Preset } from '../../../shared/types'

export interface CueRow { id: string; n: number; name: string; take: 'cut' | 'auto' | null; status: 'pgm' | 'pvw' | '' }
export interface CueWindow { rows: CueRow[]; before: number; after: number }

/** The slice of a stack to show in `max` rows: kept around the standby (or on-air) cue so the next cues are always visible. */
export function cueWindow(stack: CueStack, presets: Preset[], max: number): CueWindow {
  const len = stack.cues.length
  const size = Math.max(1, Math.min(max, len))
  const anchor = Math.max(0, stack.cues.findIndex((c) => c.id === (stack.selected ?? stack.current)))
  const start = Math.max(0, Math.min(anchor - 1, len - size))
  const rows = stack.cues.slice(start, start + size).map((c, i): CueRow => ({
    id: c.id, n: start + i + 1, name: presets.find((p) => p.id === c.presetId)?.name ?? '?', take: c.take,
    status: c.id === stack.current ? 'pgm' : c.id === stack.selected ? 'pvw' : '',
  }))
  return { rows, before: start, after: len - start - rows.length }
}
