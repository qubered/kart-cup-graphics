// Pure helpers for the per-screen scene editor (no Svelte, no store) so they can be unit tested.
import { isSceneSupported } from '../../../../../shared/view'
import type { BackgroundId, Layers, LogoMode, OutputFormat, QrStyle, SceneId, ScenePart } from '../../../../../shared/types'

export const SCENES: { id: SceneId; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'title', label: 'Title' },
  { id: 'lineup', label: 'Line-up' },
  { id: 'nextRace', label: 'Next race' },
  { id: 'standings', label: 'Standings' },
  { id: 'winner', label: 'Winner' },
  { id: 'raceWin', label: 'Race win' },
  { id: 'cupWin', label: 'Cup win' },
  { id: 'bracket', label: 'Bracket' },
  { id: 'matches', label: 'Matches' },
  { id: 'notice', label: 'Notice' },
  { id: 'qr', label: 'QR codes' },
]
export const sceneLabel = (id: SceneId): string => SCENES.find((s) => s.id === id)?.label ?? id

/** `label` is the accessible name (existing specs and the Companion docs use it); `letter` / `word` are the two lines on the button. */
export const BACKGROUNDS: { id: BackgroundId; label: string; letter: string; word: string }[] = [
  { id: 'A', label: 'A · Sky', letter: 'A', word: 'Sky' },
  { id: 'B', label: 'B · Icons', letter: 'B', word: 'Icons' },
  { id: 'C', label: 'C · Stickers', letter: 'C', word: 'Stickers' },
  { id: 'none', label: 'None', letter: 'None', word: '' },
]
export const backgroundLabel = (id: BackgroundId): string => BACKGROUNDS.find((b) => b.id === id)?.label ?? id

export const PARTS: { id: ScenePart; label: string }[] = [{ id: 'full', label: 'Full' }, { id: 'hero', label: 'Hero' }, { id: 'board', label: 'Board' }]
export const LOGO_MODES: { id: LogoMode; label: string }[] = [{ id: 'off', label: 'Off' }, { id: 'corner', label: 'Corner' }, { id: 'title', label: 'In title' }]

export const isWinScene = (scene: SceneId | undefined): boolean => scene === 'raceWin' || scene === 'cupWin'

/** The scenes a format offers, in menu order. Bracket and matches need a tournament, so they are hidden without one.
 *  Win screens are probed with the hero part: a twin can show a hero or a board half, never the full screen. */
export function availableScenes(format: OutputFormat, hasTournament: boolean): { id: SceneId; label: string }[] {
  return SCENES.filter((s) => isSceneSupported(format, s.id, isWinScene(s.id) ? 'hero' : 'full') && (hasTournament || (s.id !== 'bracket' && s.id !== 'matches')))
}

/** The parts a win screen can show on this format. */
export function availableParts(format: OutputFormat, scene: SceneId): { id: ScenePart; label: string }[] {
  return PARTS.filter((p) => isSceneSupported(format, scene, p.id))
}

/** The patch that selects a scene. A win screen on a format that cannot show the current part (a twin never shows "full")
 *  also picks the first part it can, so choosing the scene never leaves Preview blank. */
export function scenePatch(format: OutputFormat, layers: Pick<Layers, 'part'>, scene: SceneId): Partial<Layers> {
  if (isWinScene(scene) && !isSceneSupported(format, scene, layers.part ?? 'full')) {
    const part = availableParts(format, scene)[0]
    if (part) return { scene, part: part.id }
  }
  return { scene }
}

/** QR layouts offered per format (twins always show one code per half). */
export function qrStyles(format: OutputFormat): [QrStyle, string][] {
  return format === 'wide' ? [['center', 'Centre'], ['title', 'Title + sides'], ['sides', 'Sides']]
    : format === 'hd' ? [['center', 'QR only'], ['title', 'Title + QR']] : []
}
/** Is this QR layout the one `layers` selects? On HD the "sides" layout is drawn as the centre one. */
export function qrStyleSelected(format: OutputFormat, layers: Pick<Layers, 'qrStyle'>, style: QrStyle): boolean {
  const cur = layers.qrStyle ?? 'center'
  return cur === style || (style === 'center' && format === 'hd' && cur === 'sides')
}

/** Does the scene have options of its own (reveal, QR layout, part, matches set, logo...)? Otherwise the editor says so. */
export function hasSceneOptions(scene: SceneId, format: OutputFormat, hasTournament: boolean): boolean {
  switch (scene) {
    case 'lineup': case 'notice': case 'title': case 'raceWin': case 'cupWin': return true
    case 'qr': return qrStyles(format).length > 0
    case 'matches': return hasTournament
    default: return false
  }
}

/** Line-up reveal choices: how many cards are shown (4 = all). */
export const REVEAL_STEPS = [0, 1, 2, 3, 4]
export const revealLabel = (n: number): string => (n === 4 ? 'All' : n === 0 ? 'None' : n === 1 ? 'P1' : `P1–${n}`)
export const nextReveal = (layers: Pick<Layers, 'lineupShown'>): number => Math.min(4, (layers.lineupShown ?? 4) + 1)

/** Toggle one player in the lower-thirds selection, keeping the list sorted. */
export function togglePlayer(players: number[], i: number): number[] {
  return players.includes(i) ? players.filter((x) => x !== i) : [...players, i].sort((a, b) => a - b)
}
