// Plain TS contracts shared by server and web. schema.ts zod schemas must conform to these.
import type { Catalog } from './catalog'
export type ColourId = 'red' | 'blue' | 'green' | 'yellow' | 'pink' | 'orange' | 'purple' | 'cyan'
export type OutputFormat = 'wide' | 'twin' | 'hd'
export type BackgroundId = 'A' | 'B' | 'C' | 'none'
export type SceneId = 'none' | 'title' | 'lineup' | 'nextRace' | 'standings' | 'winner'
export type TransitionSpeed = 'fast' | 'normal' | 'slow'
export type TakeMode = 'cut' | 'auto'
export interface SafeArea { top: number; right: number; bottom: number; left: number }
export interface OutputConfig { id: string; name: string; format: OutputFormat; safeArea: SafeArea; graphicsScale: number }
export interface Player { name: string; characterId: string; colour: ColourId }
export interface RaceState { mode: 'cup' | 'track'; cupId: string; raceIndex: 0 | 1 | 2 | 3; trackId: string }
export interface RaceResult { raceNo: number; trackId: string; positions: number[] }
export interface EventText { preTitle: string; title: string; titleAccent: string; watermark: string; holdMessage: string }
export interface Typography {
  eventTitle: { font: string; style: 'chrome' | 'classic' }
  headings: { font: string; look: 'chrome' | 'classic' | 'plain' }
  names: { font: string }
  labels: { font: string }
}
export interface ShowData {
  event: EventText; typography: Typography; players: Player[]; race: RaceState
  scores: { races: RaceResult[]; adjustments: number[] }
}
export interface Layers { background: BackgroundId; scene: SceneId; trackCard: boolean; lowerThirds: { on: boolean; players: number[] } }

export interface FontStacks { eventTitle: string; headings: string; names: string; labels: string }
export interface TitleView { preTitle: string; title: string; accent: string }
export interface PlayerView { slot: number; name: string; character: string; icon: string; art: string; colour: string; textColour: string }
export interface TrackCardView { raceLabel: string; cupName: string; cupEmblem: string; trackName: string }
export type SceneView =
  | { kind: 'title'; title: TitleView }
  | { kind: 'lineup'; players: PlayerView[] }
  | { kind: 'nextRace'; raceLabel: string; cupName: string; cupEmblem: string; trackName: string; trackImage: string; cupTracks: { name: string; thumb: string; current: boolean }[] }
  | { kind: 'standings'; rows: { position: number; player: PlayerView; total: number; lastRacePoints: number | null }[]; footer: string }
  | { kind: 'winner'; player: PlayerView; total: number }
export interface ViewModel {
  format: OutputFormat; canvas: { w: number; h: number }; safeArea: SafeArea; graphicsScale: number
  fonts: FontStacks; headingLook: 'chrome' | 'classic' | 'plain'; headingUpright: boolean; eventTitleStyle: 'chrome' | 'classic'
  background: { id: Exclude<BackgroundId, 'none'>; watermark: string; title: TitleView } | null
  scene: SceneView | null; trackCard: TrackCardView | null; lowerThirds: PlayerView[]
}
export interface ProgramFrame { view: ViewModel; mode: TakeMode; speed: TransitionSpeed; takenAt: number }
export interface ShowState {
  draft: ShowData; outputs: OutputConfig[]; layers: Record<string, Layers>; program: Record<string, ProgramFrame>
  overlay: { hold: { on: boolean; message: string }; ftb: boolean }
  transition: TransitionSpeed; armed: string[]
  clocks: { onAirSince: number | null }
  uploadedFonts: { family: string; file: string }[]
  /** App-wide switches (not part of an exported show). Applied instantly, with no Take. */
  settings: { mattify: boolean }
}
export interface ShowFile { draft: ShowData; outputs: OutputConfig[]; layers: Record<string, Layers>; transition: TransitionSpeed }

export type Command =
  | { type: 'setPlayer'; index: 0 | 1 | 2 | 3; patch: Partial<Player> }
  | { type: 'setRace'; patch: Partial<RaceState> }
  | { type: 'stepRace'; delta: 1 | -1 }
  | { type: 'randomRace' }
  | { type: 'saveResults'; raceNo: number; trackId: string; positions: number[] }
  | { type: 'setAdjustment'; index: 0 | 1 | 2 | 3; value: number }
  | { type: 'setEventText'; patch: Partial<EventText> }
  | { type: 'setTypography'; role: 'eventTitle' | 'headings' | 'names' | 'labels'; patch: { font?: string; style?: 'chrome' | 'classic'; look?: 'chrome' | 'classic' | 'plain' } }
  | { type: 'setLayers'; outputId: string; patch: Partial<Layers> }
  | { type: 'arm'; outputIds: string[] }
  | { type: 'take'; mode: TakeMode; outputIds?: string[] }
  | { type: 'setTransition'; speed: TransitionSpeed }
  | { type: 'hold'; on: boolean; message?: string }
  | { type: 'clear' }
  | { type: 'ftb'; on: boolean }
  | { type: 'addOutput'; output: OutputConfig }
  | { type: 'updateOutput'; id: string; patch: Partial<Omit<OutputConfig, 'id'>> }
  | { type: 'removeOutput'; id: string }
  | { type: 'importShow'; file: ShowFile }
  | { type: 'resetScores' } | { type: 'resetShow' } | { type: 'resetOnAirClock' }
  | { type: 'registerFont'; family: string; file: string }
  | { type: 'setMattify'; on: boolean }

export type { Catalog }
