// Pure helpers for the rundown rail: no Svelte, no store access. Unit-tested in tests/web/rundown-rail.test.ts.
import type { Command, Cue, CueAction, CueScopePatch, CueStack, Preset, PresetScope, SceneId, ShowState, TakeMode } from '../../../../../shared/types'

// ---- standby, position, row flags ----

/** Standby index: the selected cue, else the one after the one on air, else the first. May equal cues.length (nothing left to fire).
 *  Same rule as the server's goStack, so the NEXT tag always marks the cue GO would fire. */
export function standbyIndex(k: CueStack): number {
  const sel = k.cues.findIndex((c) => c.id === k.selected)
  return sel !== -1 ? sel : k.cues.findIndex((c) => c.id === k.current) + 1
}
export const currentIndex = (k: CueStack): number => k.cues.findIndex((c) => c.id === k.current)

/** "4/9": the standby cue's position (at the end of the rundown, the last cue's). 0/0 when empty. */
export function railPosition(k: CueStack): { pos: number; total: number } {
  const total = k.cues.length
  return { pos: total ? Math.min(standbyIndex(k) + 1, total) : 0, total }
}

export interface RowFlags { onAir: boolean; next: boolean; done: boolean }
/** What a row should show: ON AIR (red), NEXT (green) and whether it is already behind us (dimmed). */
export function rowFlags(k: CueStack, index: number): RowFlags {
  const cue = k.cues[index]
  return { onAir: !!cue && cue.id === k.current, next: index === standbyIndex(k), done: index < currentIndex(k) }
}

// ---- take and "after" ----

export type TakeValue = 'cut' | 'auto' | 'none'
export const TAKES: { value: TakeValue; label: string }[] = [{ value: 'cut', label: 'Cut' }, { value: 'auto', label: 'Auto' }, { value: 'none', label: 'Recall only' }]
export const takeValue = (t: TakeMode | null): TakeValue => t ?? 'none'
export const takeFromValue = (v: string): TakeMode | null => (v === 'cut' || v === 'auto' ? v : null)
/** The pill on a row: CUT / AUTO / RECALL (take null = recall only, take by hand). */
export const takeLabel = (t: TakeMode | null): string => (t === 'cut' ? 'CUT' : t === 'auto' ? 'AUTO' : 'RECALL')

export const AFTERS: { value: '' | CueAction; label: string }[] = [
  { value: '', label: 'Nothing' }, { value: 'nextRace', label: 'Then next race' }, { value: 'nextMatch', label: 'Then next match' }, { value: 'resetStack', label: 'Then reset rundown' },
]
export const afterFromValue = (v: string): CueAction | null => (v === 'nextRace' || v === 'nextMatch' || v === 'resetStack' ? v : null)
/** The "↳ then next race" hint under a row's name. */
export const afterHint = (a: CueAction | undefined): string => (a ? `↳ ${(AFTERS.find((x) => x.value === a)?.label ?? '').toLowerCase()}` : '')

// ---- recall options ----

export const SCOPE_KEYS: { key: keyof PresetScope; label: string }[] = [
  { key: 'layers', label: 'Layers' }, { key: 'armed', label: 'Arming' }, { key: 'style', label: 'Event style' }, { key: 'match', label: 'Race' },
  { key: 'players', label: 'Players' }, { key: 'scores', label: 'Scores' }, { key: 'transition', label: 'Speed' }, { key: 'mattify', label: 'Mattify' },
]
/** The 8 recall flags as the 4 groups the save form uses. */
const SCOPE_GROUPS: { label: string; keys: (keyof PresetScope)[] }[] = [
  { label: 'Look', keys: ['layers', 'style', 'transition', 'mattify'] },
  { label: 'Outputs armed', keys: ['armed'] },
  { label: 'Race & players', keys: ['match', 'players'] },
  { label: 'Scores', keys: ['scores'] },
]
const NO_SCOPE: PresetScope = { layers: false, armed: false, style: false, match: false, players: false, scores: false, transition: false, mattify: false }

/** What a cue really recalls: its Look's scope with the cue's own overrides on top. */
export const effectiveScope = (preset: Preset | undefined, cue: Pick<Cue, 'scope'>): PresetScope => ({ ...(preset?.scope ?? NO_SCOPE), ...cue.scope })
export const hasScopeOverride = (cue: Pick<Cue, 'scope'>): boolean => !!cue.scope && Object.keys(cue.scope).length > 0

/** "look + outputs armed". Adds "(custom)" when the cue overrides its Look or the flags do not form whole groups. */
export function recallSummary(eff: PresetScope, overridden: boolean): string {
  const whole = SCOPE_GROUPS.filter((g) => g.keys.every((k) => eff[k]))
  const covered = new Set(whole.flatMap((g) => g.keys))
  const partial = SCOPE_KEYS.some(({ key }) => eff[key] && !covered.has(key))
  return (whole.map((g) => g.label.toLowerCase()).join(' + ') || 'nothing') + (partial || overridden ? ' (custom)' : '')
}

/** A recall chip cycles: inherit the Look's setting, force on, force off, inherit again. The result is the `updateCue` patch value (null = inherit). */
export const nextScopeOverride = (own: boolean | undefined): boolean | null => (own === undefined ? true : own ? false : null)
/** The patch that puts one scope override back the way it was (null = it was inherited). */
export const scopeRestore = (cue: Pick<Cue, 'scope'>, key: keyof PresetScope): CueScopePatch => ({ [key]: cue.scope?.[key] ?? null })
/** An `addCue` scope patch that reproduces a cue's override (used to undo a remove). */
export const scopeAsPatch = (scope: Partial<PresetScope> | undefined): CueScopePatch | undefined => (scope && Object.keys(scope).length ? { ...scope } : undefined)

// ---- Looks (presets) ----

/** How many cues, across every rundown, play this Look. */
export const usedByCount = (st: Pick<ShowState, 'stacks'>, presetId: string): number => st.stacks.reduce((n, k) => n + k.cues.filter((c) => c.presetId === presetId).length, 0)

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const ka = Object.keys(a), kb = Object.keys(b)
  return ka.length === kb.length && ka.every((k) => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
}

/** The Look Preview was last loaded from or saved as (`lastPreset`), if it still exists. */
export const loadedPreset = (st: Pick<ShowState, 'lastPreset' | 'presets'>): Preset | undefined => (st.lastPreset ? st.presets.find((p) => p.id === st.lastPreset) : undefined)

/** Has Preview been changed since that Look was loaded? Compares the parts the Look recalls (layers per output, arming); with no loaded Look there is nothing to compare, so false. */
export function previewModified(st: Pick<ShowState, 'lastPreset' | 'presets' | 'layers' | 'armed' | 'outputs'>): boolean {
  const p = loadedPreset(st)
  if (!p) return false
  // Outputs the show no longer has are ignored, as a recall ignores them.
  const known = (id: string) => st.outputs.some((o) => o.id === id)
  if (p.scope.layers && Object.keys(p.layers).filter(known).some((id) => !deepEqual(st.layers[id], p.layers[id]))) return true
  if (p.scope.armed && !deepEqual(p.armed.filter(known).sort(), st.armed.filter(known).sort())) return true
  return false
}

const SCENE_LABEL: Record<SceneId, string> = {
  none: 'None', title: 'Title', lineup: 'Line-up', announce: 'Announce', nextRace: 'Next race', standings: 'Standings', winner: 'Winner',
  raceWin: 'Race win', cupWin: 'Cup win', bracket: 'Bracket', matches: 'Matches', notice: 'Notice', qr: 'QR codes',
}
const NAME_MAX = 100

/** A name for the Look "Add cue from Preview" will save: the scene's label ("Race win — hero"), or the loaded Look's name with a number when Preview has been
 *  changed from it. Never one that is already taken ("Standings", "Standings 2", ...). */
export function suggestLookName(st: Pick<ShowState, 'lastPreset' | 'presets' | 'layers' | 'armed' | 'outputs'>, outputId?: string): string {
  const loaded = loadedPreset(st)
  const l = st.layers[outputId && st.layers[outputId] ? outputId : (st.outputs[0]?.id ?? '')]
  let base: string
  if (loaded && previewModified(st)) base = loaded.name.replace(/ \d+$/, '')
  else if (!l) base = 'New look'
  else if (l.scene === 'none') base = l.background === 'none' ? 'Overlays only' : 'Holding'
  else if (l.scene === 'raceWin' || l.scene === 'cupWin') base = `${SCENE_LABEL[l.scene]} — ${l.part ?? 'full'}`
  else base = SCENE_LABEL[l.scene] ?? 'New look'
  const taken = new Set(st.presets.map((p) => p.name))
  let name = base.slice(0, NAME_MAX)
  for (let n = 2; taken.has(name); n++) { const suffix = ` ${n}`; name = `${base.slice(0, NAME_MAX - suffix.length)}${suffix}` }
  return name
}

/** "Rundown 2", "Rundown 3" ...: the first name not used by an existing rundown. */
export function nextRundownName(stacks: Pick<CueStack, 'name'>[]): string {
  const taken = new Set(stacks.map((k) => k.name))
  for (let n = stacks.length + 1; ; n++) if (!taken.has(`Rundown ${n}`)) return `Rundown ${n}`
}

// ---- reordering ----

/** Where a cue ends up when dropped at insertion slot `dropIndex` of the list it is in (the slot counts the cue itself: 0 = top, n = bottom).
 *  Dropping it right where it is (slot `from` or `from + 1`) is a no-op: the result equals `from`. */
export const dropDestination = (from: number, dropIndex: number): number => (dropIndex > from ? dropIndex - 1 : dropIndex)

/** Which entries are new: the ids in `after` that `before` did not have, in order. Used to find the cue or Look a command just created. */
export function addedIds(before: { id: string }[], after: { id: string }[]): string[] {
  const had = new Set(before.map((x) => x.id))
  return after.filter((x) => !had.has(x.id)).map((x) => x.id)
}

/** The id the server will give the next `<prefix>-<n>` entry (one more than the highest in use), so a rebuild can address a stack it is about to create. */
export function nextId(prefix: string, ids: string[]): string {
  const re = new RegExp(`^${prefix}-(\\d+)$`)
  return `${prefix}-${ids.reduce((m, id) => Math.max(m, Number(re.exec(id)?.[1] ?? 0)), 0) + 1}`
}

/** The `addCue` that puts a removed cue back at its place with the same Look, take, action and recall overrides. */
export function restoreCueCommand(stackId: string, cue: Cue, index: number): Command {
  return { type: 'addCue', stackId, presetId: cue.presetId, take: cue.take, index, ...(cue.action ? { action: cue.action } : {}), ...(scopeAsPatch(cue.scope) ? { scope: scopeAsPatch(cue.scope) } : {}) }
}
