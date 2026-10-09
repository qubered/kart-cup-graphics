// Pure helpers for the Looks library (saved presets): modified detection, recall groups, cue counts, names, undo plans.
// No Svelte and no store, so they can be unit tested. In the UI a "look" is a Preset (API, Companion and saved files keep `preset`).
import { activeTournament } from '../../../../../shared/tournament'
import type { Command, Cue, CueStack, Layers, MatchSet, OutputConfig, Preset, PresetScope, ProgramFrame, ShowData, ShowState } from '../../../../../shared/types'
import { isWinScene, sceneLabel } from '../scene/scenes'

export const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`

// ---- recall options: 8 parts, grouped into 4 toggles ----

export type ScopeKey = keyof PresetScope
export const SCOPE_PARTS: { key: ScopeKey; label: string; hint: string }[] = [
  { key: 'layers', label: 'Layers', hint: 'Background, scene and overlays on every screen' },
  { key: 'armed', label: 'Arming', hint: 'Which outputs are armed' },
  { key: 'style', label: 'Event style', hint: 'Event text, fonts, notice and QR content' },
  { key: 'match', label: 'Race', hint: 'Cup, track and race number' },
  { key: 'players', label: 'Players', hint: 'Names, characters and colours' },
  { key: 'scores', label: 'Scores', hint: 'Results and adjustments' },
  { key: 'transition', label: 'Speed', hint: 'Fast / normal / slow' },
  { key: 'mattify', label: 'Mattify', hint: 'The matte icon background switch' },
]

export type GroupKey = 'look' | 'outputs' | 'race' | 'scores'
export interface ScopeGroup { key: GroupKey; label: string; hint: string; keys: ScopeKey[] }
export const GROUPS: ScopeGroup[] = [
  { key: 'look', label: 'Look', hint: 'Scene, background, overlays, text, speed', keys: ['layers', 'style', 'transition', 'mattify'] },
  { key: 'outputs', label: 'Outputs armed', hint: 'Which outputs a Take goes to', keys: ['armed'] },
  { key: 'race', label: 'Race & players', hint: 'Cup, track, names, characters', keys: ['match', 'players'] },
  { key: 'scores', label: 'Scores', hint: 'Recall would overwrite live scores', keys: ['scores'] },
]
export type GroupState = Record<GroupKey, boolean>

/** A group is on when every part in it is. */
export const groupsFromScope = (scope: PresetScope): GroupState =>
  Object.fromEntries(GROUPS.map((g) => [g.key, g.keys.every((k) => scope[k])])) as GroupState
/** The full 8-key scope for a set of groups (a part is on when any group that holds it is on). */
export const scopeFromGroups = (groups: GroupState): PresetScope =>
  Object.fromEntries(SCOPE_PARTS.map(({ key }) => [key, GROUPS.some((g) => g.keys.includes(key) && groups[g.key])])) as unknown as PresetScope

/** The patch that flips one group: every part in it goes on, or (when it was fully on) off. Only that group's parts, so two quick taps never undo each other. */
export function groupPatch(scope: PresetScope, group: GroupKey): Partial<PresetScope> {
  const g = GROUPS.find((x) => x.key === group)!
  const on = !g.keys.every((k) => scope[k])
  return Object.fromEntries(g.keys.map((k) => [k, on]))
}
/** `scope` with one group flipped (the whole scope). */
export const toggleGroup = (scope: PresetScope, group: GroupKey): PresetScope => ({ ...scope, ...groupPatch(scope, group) })
/** "look + outputs armed (custom)": what a recall restores, in words. */
export function scopeSummary(scope: PresetScope): string {
  const g = groupsFromScope(scope)
  const on = GROUPS.filter((x) => g[x.key]).map((x) => x.label.toLowerCase())
  const extra = SCOPE_PARTS.filter(({ key }) => scope[key] && !GROUPS.some((x) => g[x.key] && x.keys.includes(key))).length
  return (on.join(' + ') || 'nothing') + (extra ? ' (custom)' : '')
}

// ---- modified detection ----

/** The part of a Preview state `isModified` reads. */
export type PreviewState = Pick<ShowState, 'draft' | 'layers' | 'armed' | 'transition' | 'settings' | 'outputs' | 'tournaments' | 'activeTournamentId'>

/** Stable JSON: object keys sorted, undefined dropped. Used only to compare. */
function canon(v: unknown): string {
  return JSON.stringify(v, (_k, val: unknown) =>
    val && typeof val === 'object' && !Array.isArray(val)
      ? Object.fromEntries(Object.entries(val).filter(([, x]) => x !== undefined).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : val)
}
const sortedUnique = (a: number[]) => [...new Set(a)].sort((x, y) => x - y)
function setKey(s: MatchSet | undefined): MatchSet {
  const o: MatchSet = {}
  if (s?.rounds?.length) o.rounds = sortedUnique(s.rounds)
  if (s?.ids?.length) o.ids = [...s.ids].sort()
  if (s?.range) o.range = s.range
  return o
}

/** What a screen's layers look like, ignoring what the chosen scene does not use (a leftover "part" on the Standings scene,
 *  unset vs default values, lower-third players while lower thirds are off). Two layers with the same key draw the same picture. */
export function layersKey(l: Layers): string {
  const base: Record<string, unknown> = {
    background: l.background, scene: l.scene, trackCard: l.trackCard,
    lowerThirds: l.lowerThirds.on ? { on: true, players: sortedUnique(l.lowerThirds.players) } : { on: false },
  }
  switch (l.scene) {
    case 'lineup': base.lineupShown = l.lineupShown ?? 4; break
    case 'announce': base.announceSlot = l.announceSlot ?? 0; base.announceBare = !!l.announceBare; break
    case 'title': base.logo = l.logo ?? 'corner'; break
    case 'notice': base.noticeQr = !!l.noticeQr; break
    case 'qr': base.qrStyle = l.qrStyle ?? 'center'; break
    case 'raceWin': case 'cupWin': base.part = l.part ?? 'full'; base.matchRef = l.matchRef ?? 'active'; break
    case 'matches': base.matchSet = setKey(l.matchSet); break
    default: break
  }
  return canon(base)
}

const style = (d: ShowData) => canon([d.event, d.typography, d.notice, d.qr])
const race = (d: ShowData) => canon({ ...d.race, trackOverrides: d.race.trackOverrides?.some((t) => t) ? d.race.trackOverrides : undefined })

/**
 * Does Preview differ from this look in a way a recall of it would change? Only the parts in the look's own recall scope count:
 * layers per output (outputs the look has no layers for are skipped, as a recall skips them), the armed set, style / speed / Mattify,
 * and race / players / scores, which are ignored while a tournament is active (the active match supplies them, a recall never touches them).
 */
export function isModified(preset: Preset, st: PreviewState): boolean {
  const sc = preset.scope
  if (sc.layers) {
    for (const o of st.outputs) {
      const saved = preset.layers[o.id]
      const cur = st.layers[o.id]
      if (saved && cur && layersKey(saved) !== layersKey(cur)) return true
    }
  }
  if (sc.armed) {
    const known = (ids: string[]) => sortedStrings(ids.filter((id) => st.outputs.some((o) => o.id === id)))
    if (canon(known(preset.armed)) !== canon(known(st.armed))) return true
  }
  if (sc.style && style(preset.draft) !== style(st.draft)) return true
  if (sc.transition && preset.transition !== st.transition) return true
  if (sc.mattify && preset.mattify !== st.settings.mattify) return true
  if (!activeTournament(st)) {
    if (sc.match && race(preset.draft) !== race(st.draft)) return true
    if (sc.players && canon(preset.draft.players) !== canon(st.draft.players)) return true
    if (sc.scores && canon(preset.draft.scores) !== canon(st.draft.scores)) return true
  }
  return false
}
const sortedStrings = (a: string[]) => [...new Set(a)].sort()

// ---- cues that use a look ----

export interface CueRef { stackId: string; index: number; cue: Cue }
/** Every cue (in every rundown) that recalls this look, with its position. */
export const cuesOf = (stacks: CueStack[], presetId: string): CueRef[] =>
  stacks.flatMap((k) => k.cues.flatMap((cue, index) => (cue.presetId === presetId ? [{ stackId: k.id, index, cue }] : [])))
export const cueCount = (stacks: CueStack[], presetId: string): number => cuesOf(stacks, presetId).length
/** Cue count per look, for the whole library in one pass. */
export function cueCounts(stacks: CueStack[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const k of stacks) for (const c of k.cues) m.set(c.presetId, (m.get(c.presetId) ?? 0) + 1)
  return m
}
export const cueWord = (n: number): string => plural(n, 'cue')

/**
 * Commands that put a deleted look back: the look at its old position, then one `addCue` per removed cue at its old index with its
 * Take / After / recall override. Cues come back with new ids, and a rundown's on-air / standby marker on a removed cue is not restored.
 */
export function deleteUndoCommands(preset: Preset, index: number, refs: CueRef[]): Command[] {
  const cmds: Command[] = [{ type: 'setPreset', preset, index }]
  // Ascending per rundown: re-inserting each cue at its old index rebuilds the original order.
  const ordered = [...refs].sort((a, b) => (a.stackId === b.stackId ? a.index - b.index : a.stackId < b.stackId ? -1 : 1))
  for (const r of ordered) {
    cmds.push({
      type: 'addCue', stackId: r.stackId, presetId: preset.id, take: r.cue.take, index: r.index,
      ...(r.cue.scope && Object.keys(r.cue.scope).length ? { scope: { ...r.cue.scope } } : {}),
      ...(r.cue.action ? { action: r.cue.action } : {}),
    })
  }
  return cmds
}

// ---- names ----

/**
 * A name for a new look from what Preview shows: the scene's label ("Standings"), "Race win — hero" for a win screen. The screen
 * looked at (`selectedId`) decides; when it shows no scene, the first screen that does. A name already taken gets " 2", " 3"...
 */
export function suggestName(layers: Record<string, Layers>, outputs: OutputConfig[], selectedId: string, existing: string[]): string {
  const primary = outputs.find((o) => o.id === selectedId) ?? outputs[0]
  const own = primary ? layers[primary.id] : undefined
  const withScene = outputs.map((o) => layers[o.id]).find((l) => l && l.scene !== 'none')
  const l = own && own.scene !== 'none' ? own : (withScene ?? own)
  const all = outputs.map((o) => layers[o.id]).filter((x): x is Layers => !!x)
  let base = 'New look'
  if (l) {
    if (isWinScene(l.scene)) base = `${sceneLabel(l.scene)} — ${l.part ?? 'full'}`
    else if (l.scene !== 'none') base = sceneLabel(l.scene)
    else if (all.some((x) => x.background !== 'none')) base = 'Holding'
    else if (all.some((x) => x.trackCard || x.lowerThirds.on)) base = 'Overlays only'
    else base = 'Blank'
  }
  let name = base
  for (let n = 2; existing.includes(name); n++) name = `${base} ${n}`
  return name
}

// ---- on air ----

function matchesProgram(p: Preset, outputs: OutputConfig[], program: Record<string, ProgramFrame>): boolean {
  if (!p.scope.layers) return false
  // The screens a Take of this look goes to: the ones it arms (all of them when it arms none).
  const targets = outputs.filter((o) => p.armed.includes(o.id))
  let compared = 0
  for (const o of targets.length ? targets : outputs) {
    const saved = p.layers[o.id]
    const live = program[o.id]?.layers
    if (!saved || !live) continue
    compared++
    if (layersKey(saved) !== layersKey(live)) return false
  }
  return compared > 0
}
/**
 * The look that is on air: the one whose layers equal what Program was taken with, on every screen the look arms (all screens when it
 * arms none). A look that does not recall layers never counts. Server state does not record "last taken look", so this is derived
 * from the taken frames (cheap: a few small comparisons per look); when several looks draw the same picture the loaded one wins,
 * else the first in the library.
 */
export function onAirLook(presets: Preset[], outputs: OutputConfig[], program: Record<string, ProgramFrame>, lastPreset: string | null): string | null {
  const hits = presets.filter((p) => matchesProgram(p, outputs, program))
  return (hits.find((p) => p.id === lastPreset) ?? hits[0])?.id ?? null
}
