// Models for the schematic thumbnails (Looks library tiles and the scene picker). Pure: the real view derivation
// (`deriveView`) supplies names, colours, standings, matches... so a thumbnail always agrees with what the graphics would show.
import type { CatalogIndex } from '../../../../../shared/catalog'
import { deriveView } from '../../../../../shared/view'
import type { Layers, OutputConfig, Preset, ShowData, ShowState, Tournament, ViewModel } from '../../../../../shared/types'

/** The screen a Look tile is drawn for: the Wide output when there is one, else the first. */
export const thumbOutput = (outputs: OutputConfig[]): OutputConfig | undefined => outputs.find((o) => o.format === 'wide') ?? outputs[0]

/**
 * The show data Preview would hold after recalling this look: the parts in the look's scope come from the look, everything else
 * stays as it is now (and race / players / scores are never recalled while a tournament is active).
 */
export function recalledDraft(preset: Preset, live: ShowData, tournament: Tournament | null): ShowData {
  const sc = preset.scope
  const p = preset.draft
  return {
    ...live,
    ...(sc.style ? { event: p.event, typography: p.typography, notice: p.notice, qr: p.qr } : {}),
    ...(sc.match && !tournament ? { race: p.race } : {}),
    ...(sc.players && !tournament ? { players: p.players } : {}),
    ...(sc.scores && !tournament ? { scores: p.scores } : {}),
  }
}

/** A Look tile's picture. Null until the catalog has loaded or when the look has no usable screen. */
export function presetView(preset: Preset, st: Pick<ShowState, 'draft' | 'layers' | 'outputs'>, catalog: CatalogIndex | null, tournament: Tournament | null): ViewModel | null {
  const out = thumbOutput(st.outputs)
  if (!out || !catalog) return null
  const layers = preset.layers[out.id] ?? st.layers[out.id]
  return layers ? deriveView(recalledDraft(preset, st.draft, tournament), layers, out, catalog, tournament) : null
}

/** A scene tile's picture: the screen's current Preview with just the scene swapped (no track card or lower thirds, no background for "None"). */
export function sceneView(sceneId: Layers['scene'], layers: Layers, out: OutputConfig, draft: ShowData, catalog: CatalogIndex | null, tournament: Tournament | null): ViewModel | null {
  if (!catalog) return null
  const part = sceneId === 'raceWin' || sceneId === 'cupWin' ? (out.format === 'twin' ? 'hero' : layers.part) : layers.part
  const probe: Layers = {
    ...layers, scene: sceneId, ...(part ? { part } : {}), background: sceneId === 'none' ? 'none' : layers.background,
    trackCard: false, lowerThirds: { on: false, players: layers.lowerThirds.players },
  }
  return deriveView(draft, probe, out, catalog, tournament)
}
