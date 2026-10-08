// Plain TS contracts shared by server and web. schema.ts zod schemas must conform to these.
import type { Catalog } from './catalog'
export type ColourId = 'red' | 'blue' | 'green' | 'yellow' | 'pink' | 'orange' | 'purple' | 'cyan'
export type OutputFormat = 'wide' | 'twin' | 'hd'
export type BackgroundId = 'A' | 'B' | 'C' | 'none'
export type SceneId = 'none' | 'title' | 'lineup' | 'nextRace' | 'standings' | 'winner' | 'notice'
export type LogoMode = 'off' | 'corner' | 'title'
export type TransitionSpeed = 'fast' | 'normal' | 'slow'
export type TakeMode = 'cut' | 'auto'
export interface SafeArea { top: number; right: number; bottom: number; left: number }
export interface OutputConfig { id: string; name: string; format: OutputFormat; safeArea: SafeArea; graphicsScale: number }
export interface Player { name: string; characterId: string; colour: ColourId }
export interface RaceState { mode: 'cup' | 'track'; cupId: string; raceIndex: 0 | 1 | 2 | 3; trackId: string; raceNo: number; raceTotal: number }
export interface RaceResult { raceNo: number; trackId: string; positions: number[] }
export interface EventText { preTitle: string; title: string; titleAccent: string; watermark: string; holdMessage: string }
export interface Typography {
  eventTitle: { font: string; style: 'chrome' | 'classic' }
  headings: { font: string; look: 'chrome' | 'classic' | 'plain' }
  names: { font: string }
  labels: { font: string }
}
/** One styled stretch of notice-board text. font = a family name (as in the font lists); size is px on a 1080-tall canvas. Absent = the board default. */
export interface NoticeRun { text: string; bold?: boolean; italic?: boolean; underline?: boolean; color?: string; font?: string; size?: number }
export interface NoticeBlock { align: 'left' | 'center' | 'right'; runs: NoticeRun[] }
/** The notice board's rich text: paragraphs of styled runs (a newline inside a run is a line break). */
export interface NoticeDoc { blocks: NoticeBlock[] }
export interface ShowData {
  event: EventText; typography: Typography; players: Player[]; race: RaceState; notice: NoticeDoc
  scores: { races: RaceResult[]; adjustments: number[] }
}
/** `lineupShown`: how many line-up cards are revealed (1-4); absent = all four. */
export interface Layers { background: BackgroundId; scene: SceneId; trackCard: boolean; lowerThirds: { on: boolean; players: number[] }; lineupShown?: number
  /** Where the logo sits on the title scene. Absent = 'corner'. */
  logo?: LogoMode }

export interface FontStacks { eventTitle: string; headings: string; names: string; labels: string }
export interface TitleView { preTitle: string; title: string; accent: string }
export interface PlayerView { slot: number; name: string; character: string; icon: string; art: string; colour: string; textColour: string }
export interface TrackCardView { raceLabel: string; cupName: string; cupEmblem: string; trackName: string }
export type SceneView =
  | { kind: 'title'; title: TitleView; logo: LogoMode }
  | { kind: 'lineup'; players: PlayerView[] }
  | { kind: 'nextRace'; raceLabel: string; cupName: string; cupEmblem: string; trackName: string; trackImage: string; single: boolean; cupTracks: { name: string; thumb: string; current: boolean }[] }
  | { kind: 'standings'; rows: { position: number; player: PlayerView; total: number; lastRacePoints: number | null }[] }
  | { kind: 'winner'; player: PlayerView; total: number }
  | { kind: 'notice'; doc: NoticeDoc }
export interface ViewModel {
  format: OutputFormat; canvas: { w: number; h: number }; safeArea: SafeArea; graphicsScale: number
  fonts: FontStacks; headingLook: 'chrome' | 'classic' | 'plain'; headingUpright: boolean; eventTitleStyle: 'chrome' | 'classic'
  background: { id: Exclude<BackgroundId, 'none'>; watermark: string; title: TitleView } | null
  scene: SceneView | null; trackCard: TrackCardView | null; lowerThirds: PlayerView[]
}
/** layers/draft: what was taken (so "save from PGM" can snapshot it). Absent on frames that predate this. */
export interface ProgramFrame { view: ViewModel; mode: TakeMode; speed: TransitionSpeed; takenAt: number; layers?: Layers; draft?: ShowData }
/** Where a preset snapshot is read from: PVW = the draft being built, PGM = what is on air. */
export type PresetSource = 'pvw' | 'pgm'
/** What a recall applies. A preset always captures everything; scope picks which parts it restores.
 *  show = event text, typography and race. players = the four players (name, character, colour). scores = results and adjustments (off by default: recalling would overwrite live scores). */
export interface PresetScope { layers: boolean; armed: boolean; show: boolean; players: boolean; scores: boolean; transition: boolean; mattify: boolean }
/** A saved snapshot of the show: every output's layers, arming, show data, scores, transition speed and Mattify. */
export interface Preset {
  id: string; name: string; scope: PresetScope
  layers: Record<string, Layers>; armed: string[]
  draft: ShowData; transition: TransitionSpeed; mattify: boolean
}
/** One step in a stack: recall a preset, then cut/auto it to air (take: null = recall only, take by hand). The same preset may appear in many cues. */
export interface Cue { id: string; presetId: string; take: TakeMode | null; scope?: Partial<PresetScope> }
/** Patch for a cue's scope override: true/false forces that part on/off for this cue, null goes back to inheriting the preset's scope. */
export type CueScopePatch = { [K in keyof PresetScope]?: boolean | null }
/** An ordered, user-built list of cues. current = on air (last fired). selected = standby: its design is loaded into Preview and GO fires it.
 *  With nothing selected, GO fires the cue after current (or the first). */
export interface CueStack { id: string; name: string; cues: Cue[]; current: string | null; selected: string | null }
export interface ShowState {
  draft: ShowData; outputs: OutputConfig[]; layers: Record<string, Layers>; program: Record<string, ProgramFrame>
  overlay: { hold: { on: boolean; message: string }; ftb: boolean }
  transition: TransitionSpeed; armed: string[]
  clocks: { onAirSince: number | null }
  uploadedFonts: { family: string; file: string }[]
  presets: Preset[]; lastPreset: string | null; stacks: CueStack[]
  /** App-wide switches (not part of an exported show). Applied instantly, with no Take. */
  settings: { mattify: boolean; /** URL of the uploaded logo (normalised PNG); absent = the built-in roundel. */ logo?: string }
}
export interface ShowFile { draft: ShowData; outputs: OutputConfig[]; layers: Record<string, Layers>; transition: TransitionSpeed; presets: Preset[]; stacks: CueStack[] }

export type Command =
  | { type: 'setPlayer'; index: 0 | 1 | 2 | 3; patch: Partial<Player> }
  | { type: 'setRace'; patch: Partial<RaceState> }
  | { type: 'stepRace'; delta: 1 | -1 }
  | { type: 'randomRace' }
  | { type: 'saveResults'; raceNo: number; trackId: string; positions: number[]; adjustments?: number[] }
  | { type: 'setAdjustment'; index: 0 | 1 | 2 | 3; value: number }
  | { type: 'setEventText'; patch: Partial<EventText> }
  | { type: 'setNotice'; doc: NoticeDoc }
  | { type: 'setTypography'; role: 'eventTitle' | 'headings' | 'names' | 'labels'; patch: { font?: string; style?: 'chrome' | 'classic'; look?: 'chrome' | 'classic' | 'plain' } }
  | { type: 'setLayers'; outputId: string; patch: Partial<Layers> }
  | { type: 'savePreset'; name: string; from?: PresetSource; scope?: Partial<PresetScope> }
  | { type: 'updatePreset'; id: string; name?: string; from?: PresetSource; scope?: Partial<PresetScope> }
  | { type: 'deletePreset'; id: string }
  | { type: 'recallPreset'; id: string; take?: TakeMode }
  | { type: 'createStack'; name: string }
  | { type: 'renameStack'; id: string; name: string }
  | { type: 'deleteStack'; id: string }
  | { type: 'resetStack'; id: string }
  | { type: 'addCue'; stackId: string; presetId: string; take: TakeMode | null; index?: number; scope?: CueScopePatch }
  | { type: 'updateCue'; stackId: string; cueId: string; presetId?: string; take?: TakeMode | null; scope?: CueScopePatch }
  | { type: 'removeCue'; stackId: string; cueId: string }
  | { type: 'moveCue'; stackId: string; cueId: string; delta: 1 | -1 }
  | { type: 'selectCue'; stackId: string; cueId: string }
  | { type: 'stepSelection'; stackId: string; delta: 1 | -1 }
  | { type: 'goStack'; stackId: string }
  | { type: 'fireCue'; stackId: string; cueId: string }
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
  | { type: 'setLogo'; url: string | null }

export type { Catalog }
