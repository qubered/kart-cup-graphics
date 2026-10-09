import type { SceneView } from '../../../shared/types'

/**
 * Structural signature of a scene: everything that changes its LAYOUT or which parts exist (layout/mode, block toggles,
 * options, logo placement, QR style...) but not the data inside it (names, points, tracks: `Swap` crossfades those in place).
 * SceneLayer keys the scene on `kind|variant`, so changing a setting crossfades the old scene into the new one instead of popping.
 */
export function sceneVariant(scene: SceneView): string {
  switch (scene.kind) {
    case 'title': return scene.logo
    case 'nextRace': return `${scene.single}|${!!scene.trackName}`
    case 'raceWin':
    case 'cupWin': return `${JSON.stringify(scene.config)}|${scene.part}|${scene.races.length > 0}|${scene.rows.length}`
    case 'matches': return `${JSON.stringify(scene.config)}|${scene.layout}|${scene.detail}|${scene.cards.length}`
    case 'bracket': return `${JSON.stringify(scene.config)}|${scene.rounds.map((r) => r.nodes.length).join(',')}`
    case 'announce': return String(scene.player.slot) // another player = another colour: crossfade the whole scene
    case 'notice': return String(!!scene.qr)
    case 'qr': return scene.style
    default: return ''
  }
}
