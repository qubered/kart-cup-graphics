import type { ViewModel } from './types'

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

/** One count each for background, scene, trackCard, the fonts/looks group, and each differing lower-third slot. */
export function countPendingChanges(draft: ViewModel, program: ViewModel | undefined): number {
  let n = 0
  if (!program) {
    if (draft.background) n++
    if (draft.scene) n++
    if (draft.trackCard) n++
    return n + draft.lowerThirds.length
  }
  if (!same(draft.background, program.background)) n++
  if (!same(draft.scene, program.scene)) n++
  if (!same(draft.trackCard, program.trackCard)) n++
  const fontGroup = (v: ViewModel) => [v.fonts, v.headingLook, v.headingUpright, v.eventTitleStyle]
  if (!same(fontGroup(draft), fontGroup(program))) n++
  const slots = new Set([...draft.lowerThirds.map((p) => p.slot), ...program.lowerThirds.map((p) => p.slot)])
  for (const s of slots) {
    if (!same(draft.lowerThirds.find((p) => p.slot === s), program.lowerThirds.find((p) => p.slot === s))) n++
  }
  return n
}
