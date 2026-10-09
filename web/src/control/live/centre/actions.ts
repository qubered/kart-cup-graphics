// Operations on looks (saved presets) for the Live page. Every one is undoable: it sends commands, remembers the commands that put
// things back (see ui.ts act / pushUndo) and confirms with a toast. A load goes to Preview only, never to air.
import { get } from 'svelte/store'
import { control, send } from '../../store'
import { act, activeStack, currentState, previewSnapshot, pushUndo, restoreCommand, toast } from '../../ui'
import type { Command, Cue, Preset, PresetScope, ShowState, TakeMode } from '../../../../../shared/types'
import { cuesOf, cueWord, deleteUndoCommands, isModified } from './looks'

/** Resolve with the first server state (from now on) that satisfies `pred`, or null after `ms`. Call it BEFORE sending the command. */
function nextState(pred: (st: ShowState) => boolean, ms = 4000): Promise<ShowState | null> {
  return new Promise((resolve) => {
    let done = false
    let unsub: (() => void) | null = null
    const finish = (s: ShowState | null) => {
      if (done) return
      done = true
      clearTimeout(timer)
      unsub?.()
      resolve(s)
    }
    const timer = setTimeout(() => finish(null), ms)
    unsub = control.subscribe((c) => {
      const s = c.payload?.state
      if (s && pred(s)) finish(s)
    })
    if (done) unsub()
  })
}
const presetIds = (st: ShowState) => new Set(st.presets.map((p) => p.id))
const cueIds = (st: ShowState) => new Set(st.stacks.flatMap((k) => k.cues.map((c) => c.id)))
const newPreset = (st: ShowState, before: Set<string>): Preset | undefined => st.presets.find((p) => !before.has(p.id))
const newCue = (st: ShowState, stackId: string, presetId: string, before: Set<string>): Cue | undefined =>
  st.stacks.find((k) => k.id === stackId)?.cues.find((c) => c.presetId === presetId && !before.has(c.id))

const presetOf = (st: ShowState | undefined, id: string | null | undefined): Preset | undefined => (id ? st?.presets.find((p) => p.id === id) : undefined)

/** Load a look into Preview (recall without a take). Undo puts Preview back exactly as it was. */
export function loadLook(id: string): void {
  const st = currentState()
  const p = presetOf(st, id)
  if (!st || !p) return
  const loaded = presetOf(st, st.lastPreset)
  const discards = !!loaded && isModified(loaded, st)
  act(`load “${p.name}”`, [{ type: 'recallPreset', id }], [restoreCommand(previewSnapshot(st))],
    `Loaded “${p.name}” into Preview${discards ? ' — unsaved Preview changes replaced' : ''}`)
}

/** ↺ Revert: load the look Preview was based on again, discarding the changes. */
export function revertToLook(): void {
  const st = currentState()
  const p = presetOf(st, st?.lastPreset)
  if (!st || !p) return
  act(`revert to “${p.name}”`, [{ type: 'recallPreset', id: p.id }], [restoreCommand(previewSnapshot(st))], `Preview reverted to “${p.name}”`)
}

/** Overwrite a look with what Preview shows now. Undo puts the old look back. */
export function updateLook(id: string): void {
  const st = currentState()
  const p = presetOf(st, id)
  if (!st || !p) return
  const n = cuesOf(st.stacks, id).length
  act(`update “${p.name}”`, [{ type: 'updatePreset', id, from: 'pvw' }], [{ type: 'setPreset', preset: structuredClone(p) }],
    `Updated “${p.name}”${n ? ` — used by ${cueWord(n)}` : ''}`)
}

export function renameLook(id: string, name: string): void {
  const st = currentState()
  const p = presetOf(st, id)
  const next = name.trim().slice(0, 100)
  if (!st || !p || !next || next === p.name) return
  act(`rename “${p.name}”`, [{ type: 'updatePreset', id, name: next }], [{ type: 'updatePreset', id, name: p.name }], `Renamed “${p.name}” to “${next}”`)
}

export async function duplicateLook(id: string): Promise<void> {
  const st = currentState()
  const p = presetOf(st, id)
  if (!st || !p) return
  const before = presetIds(st)
  const wait = nextState((s) => !!newPreset(s, before))
  send({ type: 'duplicatePreset', id })
  const s = await wait
  const copy = s && newPreset(s, before)
  if (!copy) return toast('Could not duplicate the look', { kind: 'error' })
  pushUndo(`duplicate “${p.name}”`, [{ type: 'deletePreset', id: copy.id }])
  toast(`Duplicated “${p.name}” as “${copy.name}”`, { undoable: true })
}

/** Delete a look and the cues that use it. Undo restores the look at its old position and a cue for each removed one (new ids). */
export function deleteLook(id: string): void {
  const st = currentState()
  const p = presetOf(st, id)
  if (!st || !p) return
  const refs = cuesOf(st.stacks, id)
  const n = refs.length
  act(`delete “${p.name}” — restored the look${n ? ` and ${cueWord(n)}` : ''}`,
    [{ type: 'deletePreset', id }], deleteUndoCommands(structuredClone(p), st.presets.indexOf(p), refs),
    `Deleted “${p.name}”${n ? ` and ${cueWord(n)}` : ''}`)
}

/** Append a look to a rundown as a cue (default Take: auto). */
export async function addLookAsCue(id: string, take: TakeMode | null = 'auto'): Promise<void> {
  const st = currentState()
  const p = presetOf(st, id)
  const stack = get(activeStack)
  if (!st || !p || !stack) return toast('There is no rundown to add a cue to', { kind: 'error' })
  const before = cueIds(st)
  const wait = nextState((s) => !!newCue(s, stack.id, id, before))
  send({ type: 'addCue', stackId: stack.id, presetId: id, take })
  const s = await wait
  const cue = s && newCue(s, stack.id, id, before)
  if (!s || !cue) return toast('Could not add the cue', { kind: 'error' })
  const at = (s.stacks.find((k) => k.id === stack.id)?.cues.findIndex((c) => c.id === cue.id) ?? 0) + 1
  pushUndo(`add cue ${at}`, [{ type: 'removeCue', stackId: stack.id, cueId: cue.id }])
  toast(`Added “${p.name}” as cue ${at} of “${stack.name}”`, { undoable: true })
}

/** Change what a recall of this look restores (just the parts in `patch`). Quiet: the switch itself shows the change; undo with Ctrl/Cmd+Z. */
export function setLookScope(id: string, patch: Partial<PresetScope>): void {
  const p = presetOf(currentState(), id)
  if (!p) return
  const back = Object.fromEntries(Object.keys(patch).map((k) => [k, p.scope[k as keyof PresetScope]]))
  send({ type: 'updatePreset', id, scope: patch })
  pushUndo(`recall options of “${p.name}”`, [{ type: 'updatePreset', id, scope: back }])
}

export interface SaveRequest {
  name: string
  from: 'pvw' | 'pgm'
  /** The full 8-key scope (the server's own default differs, so it is always sent explicitly). */
  scope: PresetScope
  /** Also add the new look to a rundown as a cue. */
  cue: { stackId: string; take: TakeMode | null } | null
}

/**
 * Save as a new look, optionally adding a cue for it. From Preview with a cue this is one command (addCueFromPreview); from On air the
 * look is saved first and the cue added once its id is known. Resolves true when it worked. Undo removes the cue and deletes the look.
 */
export async function saveLook(req: SaveRequest): Promise<boolean> {
  const st = currentState()
  if (!st) return false
  const name = req.name.trim().slice(0, 100)
  const before = presetIds(st)
  const cuesBefore = cueIds(st)
  const stack = req.cue ? st.stacks.find((k) => k.id === req.cue!.stackId) : undefined
  const wait = nextState((s) => !!newPreset(s, before))
  if (req.cue && req.from === 'pvw') send({ type: 'addCueFromPreview', stackId: req.cue.stackId, name, take: req.cue.take, scope: req.scope })
  else send({ type: 'savePreset', name, from: req.from, scope: req.scope })
  const s = await wait
  const preset = s && newPreset(s, before)
  if (!s || !preset) { toast('Could not save the look', { kind: 'error' }); return false }
  const undo: Command[] = []
  let cueNo = 0
  if (req.cue) {
    let after: ShowState | null = s
    let cue = newCue(s, req.cue.stackId, preset.id, cuesBefore)
    if (!cue) {
      const cueWait = nextState((x) => !!newCue(x, req.cue!.stackId, preset.id, cuesBefore))
      send({ type: 'addCue', stackId: req.cue.stackId, presetId: preset.id, take: req.cue.take })
      after = await cueWait
      cue = after ? newCue(after, req.cue.stackId, preset.id, cuesBefore) : undefined
    }
    if (cue && after) {
      undo.push({ type: 'removeCue', stackId: req.cue.stackId, cueId: cue.id })
      cueNo = (after.stacks.find((k) => k.id === req.cue!.stackId)?.cues.findIndex((c) => c.id === cue!.id) ?? 0) + 1
    }
  }
  undo.push({ type: 'deletePreset', id: preset.id })
  pushUndo(`save “${preset.name}”`, undo)
  toast(`Saved look “${preset.name}”${cueNo && stack ? ` and added it as cue ${cueNo} of “${stack.name}”` : ''}`, { undoable: true })
  return true
}
