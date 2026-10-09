// What the rundown rail does to the show: every command it sends, and the Undo that goes with each edit.
// Performance actions (select, GO, Back, Skip, Rewind) are not undoable; edits are, through act() / pushUndo() from ui.ts.
import type { Command, Cue, CueAction, CueStack, PresetScope, ShowState, TakeMode } from '../../../../../shared/types'
import { control, send } from '../../store'
import { act, currentState, editRundown, previewSnapshot, pushUndo, restoreCommand, stackPick, toast } from '../../ui'
import { addedIds, nextId, previewModified, restoreCueCommand, scopeRestore } from './model'

/** A keyboard move re-inserts the row, which drops focus: the cue whose grip should get focus back once the list has updated (see CueRow). */
export const focusAfterMove: { id: string | null } = { id: null }

// ---- finding what a command created ----
// Ids are handed out by the server, so Undo for "add" actions is recorded once the new state arrives: the new cue is the one the previous cue list did not have.

const claimed = new Set<string>()
/** Resolve with the first state from now on for which `probe` returns something (null after `ms` without one, for example when the command was rejected). */
function observe<T>(probe: (st: ShowState) => T | null, ms = 3000): Promise<T | null> {
  return new Promise((resolve) => {
    let done = false
    let unsub: (() => void) | null = null
    const finish = (v: T | null) => {
      if (done) return
      done = true
      clearTimeout(timer)
      queueMicrotask(() => unsub?.())
      resolve(v)
    }
    const timer = setTimeout(() => finish(null), ms)
    unsub = control.subscribe(($c) => {
      if (done) return
      const st = $c.payload?.state
      const hit = st ? probe(st) : null
      if (hit !== null) finish(hit)
    })
  })
}
/** The first id in `ids` that no other pending action has claimed (two quick taps must not both claim the same new entry). */
function claim(kind: string, ids: string[]): string | null {
  const id = ids.find((x) => !claimed.has(`${kind}:${x}`))
  if (id === undefined) return null
  claimed.add(`${kind}:${id}`)
  return id
}

// ---- performance (not undoable) ----

/** Send commands that load a cue's Look into Preview. When that throws away unsaved Preview changes, say so and offer Undo (restores Preview as it was). */
function loadIntoPreview(name: string, cmds: Command[]): void {
  const st = currentState()
  const snapshot = st && previewModified(st) ? previewSnapshot(st) : null
  for (const c of cmds) send(c)
  if (!snapshot) return
  pushUndo(`load ${name}`, [restoreCommand(snapshot)])
  toast(`Loaded “${name}” — unsaved Preview changes discarded`, { undoable: true })
}
export const selectCue = (stackId: string, cue: Cue, name: string) => loadIntoPreview(name, [{ type: 'selectCue', stackId, cueId: cue.id }])
export const stepSelection = (stackId: string, delta: 1 | -1, name: string) => loadIntoPreview(name, [{ type: 'stepSelection', stackId, delta }])
export const goStack = (stackId: string) => send({ type: 'goStack', stackId })
/** Back to the start: nothing on air, standing by on the first cue with its Look in Preview (as the "then reset rundown" action does). */
export function rewind(stack: CueStack, firstName: string): void {
  const first = stack.cues[0]
  loadIntoPreview(firstName, [{ type: 'resetStack', id: stack.id }, ...(first ? [{ type: 'selectCue', stackId: stack.id, cueId: first.id } as Command] : [])])
}

// ---- cues ----

export function removeCue(stack: CueStack, index: number): void {
  const cue = stack.cues[index]
  if (!cue) return
  act(`remove cue ${index + 1}`, [{ type: 'removeCue', stackId: stack.id, cueId: cue.id }], [restoreCueCommand(stack.id, cue, index)], `Removed cue ${index + 1}`)
}

/** Move a cue to `to` (its final position in the list). */
export function moveCue(stack: CueStack, from: number, to: number): void {
  const cue = stack.cues[from]
  if (!cue || to < 0 || to >= stack.cues.length || to === from) return
  act('move cue', [{ type: 'moveCueTo', stackId: stack.id, cueId: cue.id, index: to }], [{ type: 'moveCueTo', stackId: stack.id, cueId: cue.id, index: from }], `Moved to cue ${to + 1}`)
}

/** Add a cue for an existing Look at `index` (a Look dropped from the library). Resolves with the new cue's id. */
export async function addCueFromLook(stackId: string, presetId: string, index: number, lookName: string): Promise<string | null> {
  const before = currentState()?.stacks.find((k) => k.id === stackId)?.cues ?? []
  const seen = observe((st) => claim('cue', addedIds(before, st.stacks.find((k) => k.id === stackId)?.cues ?? [])))
  send({ type: 'addCue', stackId, presetId, take: 'auto', index })
  const cueId = await seen
  if (cueId === null) return null
  pushUndo('add cue', [{ type: 'removeCue', stackId, cueId }])
  toast(`Added “${lookName}” as cue ${index + 1}`, { undoable: true })
  return cueId
}

/** Save Preview as a new Look and add a cue for it, in one step. Undo removes both. Resolves with the new cue's id. */
export async function addCueFromPreview(stackId: string, name: string): Promise<string | null> {
  const st0 = currentState()
  const cuesBefore = st0?.stacks.find((k) => k.id === stackId)?.cues ?? []
  const looksBefore = st0?.presets ?? []
  const seen = observe((st) => {
    const cue = claim('cue', addedIds(cuesBefore, st.stacks.find((k) => k.id === stackId)?.cues ?? []))
    return cue === null ? null : { cue, preset: addedIds(looksBefore, st.presets)[0] ?? null, at: (st.stacks.find((k) => k.id === stackId)?.cues.findIndex((c) => c.id === cue) ?? 0) + 1 }
  })
  send({ type: 'addCueFromPreview', stackId, name, take: 'auto' })
  const hit = await seen
  if (!hit) return null
  // Removing the new Look removes its cue with it; the explicit removeCue keeps the order obvious.
  pushUndo('add cue', [{ type: 'removeCue', stackId, cueId: hit.cue }, ...(hit.preset ? [{ type: 'deletePreset', id: hit.preset } as Command] : [])])
  toast(`Added cue ${hit.at} · saved as look “${name}”`, { undoable: true })
  return hit.cue
}

/** Give a cue its own copy of its Look (the shared one stays as it is for the other cues). */
export async function makeUnique(stack: CueStack, cue: Cue, n: number): Promise<void> {
  const looksBefore = currentState()?.presets ?? []
  const seen = observe((st) => claim('preset', addedIds(looksBefore, st.presets)))
  send({ type: 'makeCuePresetUnique', stackId: stack.id, cueId: cue.id })
  const copy = await seen
  if (copy === null) return
  pushUndo('make unique', [{ type: 'updateCue', stackId: stack.id, cueId: cue.id, presetId: cue.presetId }, { type: 'deletePreset', id: copy }])
  const name = currentState()?.presets.find((p) => p.id === copy)?.name ?? 'its own look'
  toast(`Cue ${n} now has its own look “${name}”`, { undoable: true })
}

// ---- cue settings (each is undoable with the inverse updateCue) ----

export function setCueLook(stack: CueStack, cue: Cue, n: number, presetId: string, lookName: string): void {
  if (presetId === cue.presetId) return
  act('change look', [{ type: 'updateCue', stackId: stack.id, cueId: cue.id, presetId }], [{ type: 'updateCue', stackId: stack.id, cueId: cue.id, presetId: cue.presetId }], `Cue ${n} now plays “${lookName}”`)
}
export function setCueTake(stack: CueStack, cue: Cue, n: number, take: TakeMode | null, label: string): void {
  if (take === cue.take) return
  act('change take', [{ type: 'updateCue', stackId: stack.id, cueId: cue.id, take }], [{ type: 'updateCue', stackId: stack.id, cueId: cue.id, take: cue.take }], `Cue ${n} take: ${label}`)
}
export function setCueAfter(stack: CueStack, cue: Cue, n: number, action: CueAction | null, label: string): void {
  if ((action ?? undefined) === cue.action) return
  act('change after', [{ type: 'updateCue', stackId: stack.id, cueId: cue.id, action }], [{ type: 'updateCue', stackId: stack.id, cueId: cue.id, action: cue.action ?? null }], `Cue ${n} after: ${label}`)
}
export function setCueScope(stack: CueStack, cue: Cue, n: number, key: keyof PresetScope, value: boolean | null, label: string): void {
  act('cue recall', [{ type: 'updateCue', stackId: stack.id, cueId: cue.id, scope: { [key]: value } }], [{ type: 'updateCue', stackId: stack.id, cueId: cue.id, scope: scopeRestore(cue, key) }], `Cue ${n} recall: ${label}`)
}

// ---- rundowns ----

/** Create a rundown, show it, and open Edit so it can be filled. Undo deletes it again. */
export async function newRundown(name: string): Promise<void> {
  const before = currentState()?.stacks ?? []
  const seen = observe((st) => claim('stack', addedIds(before, st.stacks)))
  send({ type: 'createStack', name })
  const id = await seen
  if (id === null) return
  stackPick.set(id)
  editRundown.set(true)
  pushUndo('new rundown', [{ type: 'deleteStack', id }])
  toast('New rundown — add cues from Preview or the Looks library', { undoable: true })
}

export function renameRundown(stack: CueStack, name: string): void {
  const next = name.trim()
  if (!next || next === stack.name) return
  act('rename rundown', [{ type: 'renameStack', id: stack.id, name: next }], [{ type: 'renameStack', id: stack.id, name: stack.name }], `Renamed to “${next}”`)
}

/** Delete a rundown. Undo builds it again (same name and cues, at the end of the list; progress is not kept). */
export function deleteRundown(stack: CueStack, all: CueStack[]): void {
  const rest = all.filter((k) => k.id !== stack.id)
  if (!rest.length) return
  const newId = nextId('stack', rest.map((k) => k.id))
  const rebuild: Command[] = [
    { type: 'createStack', name: stack.name },
    ...stack.cues.map((c, i): Command => restoreCueCommand(newId, c, i)),
  ]
  stackPick.set(rest[0].id)
  act('delete rundown', [{ type: 'deleteStack', id: stack.id }], rebuild, `Deleted rundown “${stack.name}”`)
}
