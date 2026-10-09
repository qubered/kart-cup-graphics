// Client-only UI state for the overhauled control page: current page, rundown pick, Run/Edit lock, toasts and Undo.
// Nothing here is show state: that lives on the server (see store.ts).
import { derived, get, writable } from 'svelte/store'
import type { Command, CueStack, PreviewSnapshot, ShowState } from '../../../shared/types'
import { control, send } from './store'

export type Page = 'live' | 'race' | 'tour' | 'setup'
export const PAGES: { id: Page; label: string }[] = [
  { id: 'live', label: 'Live' },
  { id: 'race', label: 'Race' },
  { id: 'tour', label: 'Tournament' },
  { id: 'setup', label: 'Setup' },
]

function safeStorage(): Storage | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage } catch { return null }
}
function pageFromHash(): Page {
  const h = typeof location === 'undefined' ? '' : location.hash.replace(/^#\/?/, '')
  return PAGES.some((p) => p.id === h) ? (h as Page) : 'live'
}

/** The page on screen. Mirrored to the URL hash (#/race) so a reload or a second window opens the same page. */
export const page = writable<Page>(pageFromHash())
page.subscribe((p) => {
  if (typeof history !== 'undefined' && location.hash !== `#/${p}`) history.replaceState(null, '', `#/${p}`)
})
if (typeof window !== 'undefined') window.addEventListener('hashchange', () => page.set(pageFromHash()))
export const goto = (p: Page) => page.set(p)

/** Run / Edit lock on the rundown: Run can only fire cues; Edit allows add, remove, reorder and per-cue settings (GO is locked). */
export const editRundown = writable(false)

const STACK_KEY = 'kcg.control.rundown'
/** Which rundown (cue stack) the Live page shows. Falls back to the first one when the pick no longer exists. */
export const stackPick = writable<string | null>(safeStorage()?.getItem(STACK_KEY) ?? null)
stackPick.subscribe((id) => { try { if (id) safeStorage()?.setItem(STACK_KEY, id) } catch { /* private mode */ } })
export function pickStack(st: Pick<ShowState, 'stacks'> | undefined, id: string | null): CueStack | undefined {
  return st?.stacks.find((s) => s.id === id) ?? st?.stacks[0]
}
/** The rundown shown on the Live page (also the one the G shortcut fires). */
export const activeStack = derived([control, stackPick], ([$c, $p]) => pickStack($c.payload?.state, $p))

// ---- toasts ----
export interface Toast { id: number; message: string; kind: 'info' | 'error'; undoable: boolean }
export const toasts = writable<Toast[]>([])
let toastId = 0
/** Show a toast top-right. `undoable` adds an Undo button (runs the last undo entry). Auto-dismisses. */
export function toast(message: string, opts: { undoable?: boolean; kind?: 'info' | 'error'; ms?: number } = {}): void {
  const t: Toast = { id: ++toastId, message, kind: opts.kind ?? 'info', undoable: !!opts.undoable }
  toasts.update((l) => [...l.slice(-3), t])
  setTimeout(() => dismissToast(t.id), opts.ms ?? (opts.undoable ? 7000 : 4000))
}
export const dismissToast = (id: number) => toasts.update((l) => l.filter((t) => t.id !== id))

// ---- undo ----
// Every undoable action sends its commands and records the commands that put things back. Undo replays them.
// Undo is for the operator's own edits (loads into Preview, saves, overwrites, deletes, cue edits), never for takes.
interface UndoEntry { label: string; commands: Command[] }
const undoStack: UndoEntry[] = []
export const undoDepth = writable(0)
const MAX_UNDO = 30

export function pushUndo(label: string, commands: Command[]): void {
  undoStack.push({ label, commands })
  if (undoStack.length > MAX_UNDO) undoStack.shift()
  undoDepth.set(undoStack.length)
}
/** Replay the most recent undo entry. Returns false when there is nothing to undo. */
export function undo(): boolean {
  const e = undoStack.pop()
  undoDepth.set(undoStack.length)
  if (!e) { toast('Nothing to undo'); return false }
  for (const c of e.commands) send(c)
  toast(`Undid: ${e.label}`)
  return true
}
/** Send `commands`, remember `undoCommands` for Undo, and confirm with a toast (with an Undo button). */
export function act(label: string, commands: Command[], undoCommands: Command[], message?: string): void {
  for (const c of commands) send(c)
  pushUndo(label, undoCommands)
  toast(message ?? label, { undoable: true })
}

/** Everything on the Preview side of the show (what a load / recall changes). Use with the `restoreSnapshot` command to undo it. */
export function previewSnapshot(st: ShowState): PreviewSnapshot {
  return { draft: st.draft, layers: st.layers, armed: st.armed, transition: st.transition, mattify: st.settings.mattify, lastPreset: st.lastPreset }
}
export const restoreCommand = (snapshot: PreviewSnapshot): Command => ({ type: 'restoreSnapshot', snapshot })
/** The current show state (or undefined before the first payload). Convenience for non-component code. */
export const currentState = (): ShowState | undefined => get(control).payload?.state
