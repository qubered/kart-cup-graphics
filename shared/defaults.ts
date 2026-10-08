import type { CatalogIndex } from './catalog'
import { deriveView } from './view'
import type { Layers, OutputConfig, ProgramFrame, ShowData, ShowState } from './types'

export const EMPTY_LAYERS: Layers = {
  background: 'none', scene: 'none', trackCard: false, lowerThirds: { on: false, players: [0, 1, 2, 3] },
}

const noMargin = () => ({ top: 0, right: 0, bottom: 0, left: 0 })
export const DEFAULT_OUTPUTS: OutputConfig[] = [
  { id: 'wide', name: 'Wide', format: 'wide', safeArea: noMargin(), graphicsScale: 1 },
  { id: 'twins', name: 'Twins', format: 'twin', safeArea: noMargin(), graphicsScale: 1 },
  { id: 'stream', name: 'Stream', format: 'hd', safeArea: noMargin(), graphicsScale: 1 },
  { id: 'pillars', name: 'Pillars', format: 'hd', safeArea: noMargin(), graphicsScale: 1 },
]

export function emptyLayers(): Layers {
  return { ...EMPTY_LAYERS, lowerThirds: { on: false, players: [...EMPTY_LAYERS.lowerThirds.players] } }
}

export function createDefaultShowData(catalog: CatalogIndex): ShowData {
  return {
    event: { preTitle: '', title: 'KART CUP', titleAccent: '2026', watermark: 'MARIO KART', holdMessage: 'BACK SHORTLY' },
    typography: {
      eventTitle: { font: 'Mario Kart F2', style: 'chrome' },
      headings: { font: 'Exo 2', look: 'classic' },
      names: { font: 'Rubik' },
      labels: { font: 'Rubik' },
    },
    players: [
      { name: 'Player 1', characterId: 'mario', colour: 'red' },
      { name: 'Player 2', characterId: 'luigi', colour: 'blue' },
      { name: 'Player 3', characterId: 'peach', colour: 'green' },
      { name: 'Player 4', characterId: 'yoshi', colour: 'yellow' },
    ],
    race: { mode: 'cup', cupId: 'mushroom', raceIndex: 0, trackId: catalog.cup('mushroom')?.tracks[0] ?? '' },
    scores: { races: [], adjustments: [0, 0, 0, 0] },
  }
}

export function createDefaultLayers(): Record<string, Layers> {
  const l = (p: Partial<Layers>): Layers => ({ ...emptyLayers(), ...p })
  return {
    wide: l({ background: 'A', scene: 'title' }),
    twins: l({ trackCard: true, lowerThirds: { on: true, players: [0, 1, 2, 3] } }),
    stream: l({ trackCard: true, lowerThirds: { on: true, players: [0, 1] } }),
    pillars: l({ background: 'B' }),
  }
}

export function emptyProgram(draft: ShowData, outputs: OutputConfig[], catalog: CatalogIndex, now: number, speed: ProgramFrame['speed'] = 'normal'): Record<string, ProgramFrame> {
  const program: Record<string, ProgramFrame> = {}
  for (const o of outputs) program[o.id] = { view: deriveView(draft, emptyLayers(), o, catalog), mode: 'cut', speed, takenAt: now }
  return program
}

export function createDefaultState(catalog: CatalogIndex, now: number): ShowState {
  const draft = createDefaultShowData(catalog)
  const outputs = DEFAULT_OUTPUTS.map((o) => ({ ...o, safeArea: { ...o.safeArea } }))
  return {
    draft, outputs, layers: createDefaultLayers(),
    program: emptyProgram(draft, outputs, catalog, now),
    overlay: { hold: { on: false, message: 'BACK SHORTLY' }, ftb: false },
    transition: 'normal', armed: [],
    clocks: { onAirSince: null }, uploadedFonts: [],
  }
}
