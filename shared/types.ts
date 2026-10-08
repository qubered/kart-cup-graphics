// Plain TS contracts shared by server and web. schema.ts zod schemas must conform to these.
import type { Catalog } from './catalog'
export type ColourId = 'red' | 'blue' | 'green' | 'yellow' | 'pink' | 'orange' | 'purple' | 'cyan'
export type OutputFormat = 'wide' | 'twin' | 'hd'
export type BackgroundId = 'A' | 'B' | 'C' | 'none'
export type SceneId = 'none' | 'title' | 'lineup' | 'nextRace' | 'standings' | 'winner' | 'notice' | 'qr' | 'raceWin' | 'cupWin' | 'bracket' | 'matches'
export type LogoMode = 'off' | 'corner' | 'title'
/** QR scene layout. wide: centre = both codes + text in the middle; title = title in the middle, a code + text either side; sides = same without the title (background shows through). hd: centre = codes + text; title = title above, codes + text below (sides = centre). Twins always show one code + text per half. */
export type QrStyle = 'center' | 'title' | 'sides'
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
/** One QR code: the label under it and the link it opens. */
export interface QrItem { label: string; url: string }
/** The QR scene's content: two codes (each its own link) and the text shown with them. A newline in `text` is a line break. */
export interface QrData { text: string; items: [QrItem, QrItem] }
export interface ShowData {
  event: EventText; typography: Typography; players: Player[]; race: RaceState; notice: NoticeDoc; qr: QrData
  scores: { races: RaceResult[]; adjustments: number[] }
}
/** Which match a raceWin/cupWin scene reads: the active match, the one before it, or an explicit match id. Default 'active'. */
export type MatchRef = 'active' | 'previous' | { matchId: string }
/** Which matches the matches scene shows. Empty/absent fields mean "all". `rounds` filters by Match.round, `ids` by id, `range` is a [from, to] (0-based, inclusive) slice of the result. */
export interface MatchSet { rounds?: number[]; ids?: string[]; range?: [number, number] }
/** Which part of a win screen an output shows: both (full), the winner hero only, or the scoreboard only. */
export type ScenePart = 'full' | 'hero' | 'board'
/** `lineupShown`: how many line-up cards are revealed (1-4); absent = all four.
 *  `part`: raceWin/cupWin only (default full). `matchRef`: raceWin/cupWin source match (default active). `matchSet`: matches scene selection (default all). */
export interface Layers {
  background: BackgroundId; scene: SceneId; trackCard: boolean; lowerThirds: { on: boolean; players: number[] }; lineupShown?: number
  part?: ScenePart; matchRef?: MatchRef; matchSet?: MatchSet
  /** Where the logo sits on the title scene. Absent = 'corner'. */
  logo?: LogoMode
  /** Layout of the QR scene. Absent = 'center'. */
  qrStyle?: QrStyle
}

// ---- tournaments ----
export type MatchStatus = 'pending' | 'live' | 'done'
export interface SlotSource { matchId: string; auto: boolean }
export interface Match {
  id: string
  label: string
  /** 0 = semis, 1 = final (any number of rounds works). */
  round: number
  /** players, race and scores. The ACTIVE match's live copy is `ShowState.draft` (mirrored here after every command); event text and typography are show-wide and ignored here. */
  data: ShowData
  status: MatchStatus
  /** Slot index of a hand-picked winner, null = computed from standings(). */
  winnerOverride: number | null
  /** Per player slot: take the winner of that match (auto true), or null/auto false = a hand-set player. */
  slotSources?: (SlotSource | null)[]
}
export interface WinScreenConfig {
  /** heroLeft = hero left, board right. heroCentre = hero centre with the board as a strip below. */
  layout: 'heroLeft' | 'heroCentre'
  blocks: { hero: boolean; board: boolean; cupEmblem: boolean; trackName: boolean; racePoints: boolean }
}
export type MatchesLayout = 'grid' | 'row' | 'stack' | 'focus'
export type MatchesDetail = 'full' | 'compact' | 'winner'
export interface MatchesSceneConfig {
  layout: MatchesLayout
  detail: Record<OutputFormat, MatchesDetail>
  /** Pending (no results yet) matches: show 0s or hide the scores. */
  pendingScores: 'zeros' | 'hide'
  liveMarker: boolean
}
export interface BracketConfig { showScores: boolean; showStatus: boolean }
export interface Tournament {
  id: string; name: string
  matches: Match[]
  activeMatchId: string
  winScreen: WinScreenConfig
  matchesScene: MatchesSceneConfig
  bracket: BracketConfig
}

export interface FontStacks { eventTitle: string; headings: string; names: string; labels: string }
export interface TitleView { preTitle: string; title: string; accent: string }
/** One scoreboard row. racePoints is per saved race (same order as `races`); total includes adjustments. */
export interface BoardRow { position: number; player: PlayerView; total: number; racePoints: number[]; lastRacePoints: number | null; adjustment: number; winner: boolean }
export interface BoardRace { raceNo: number; trackName: string }
interface WinBase {
  /** Resolved match (relative refs are resolved when the view is derived, so an on-air win screen does not move when the active match changes). */
  matchId: string; matchLabel: string
  part: ScenePart; config: WinScreenConfig
  winner: PlayerView; rows: BoardRow[]; races: BoardRace[]
  cupName: string; cupEmblem: string
  /** True when the match has no saved results yet: the winner is only a placeholder (leader of an empty table). */
  empty: boolean
}
/** Winner of ONE race (the latest saved race of the match) with running totals up to and including that race. */
export interface RaceWinView extends WinBase { kind: 'raceWin'; raceNo: number | null; raceLabel: string; trackName: string; racePoints: number }
/** Winner of a whole match. `overridden` = the winner was set by hand. */
export interface CupWinView extends WinBase { kind: 'cupWin'; total: number; overridden: boolean }
export interface MatchCardView {
  id: string; label: string; round: number; status: MatchStatus; live: boolean
  cupName: string; cupEmblem: string
  /** False while the match has no results: pendingScores 'hide' tells the scene to hide totals. */
  hasResults: boolean
  rows: BoardRow[]; races: BoardRace[]
  /** Null until the match has results or a winner override. */
  winner: PlayerView | null
}
export interface MatchesView { kind: 'matches'; config: MatchesSceneConfig; detail: MatchesDetail; layout: MatchesLayout; matchIds: string[]; cards: MatchCardView[]; focusId: string | null }
export interface BracketSlot { player: PlayerView; total: number; winner: boolean; fromMatchId: string | null }
export interface BracketNode { matchId: string; label: string; status: MatchStatus; live: boolean; hasResults: boolean; slots: BracketSlot[]; winner: PlayerView | null; overridden: boolean }
export interface BracketRound { round: number; nodes: BracketNode[] }
export interface BracketView { kind: 'bracket'; config: BracketConfig; rounds: BracketRound[]; tournamentName: string }
export interface PlayerView { slot: number; name: string; character: string; icon: string; art: string; colour: string; textColour: string }
export interface TrackCardView { raceLabel: string; cupName: string; cupEmblem: string; trackName: string }
export type SceneView =
  | { kind: 'title'; title: TitleView; logo: LogoMode }
  | { kind: 'lineup'; players: PlayerView[] }
  | { kind: 'nextRace'; raceLabel: string; cupName: string; cupEmblem: string; trackName: string; trackImage: string; single: boolean; cupTracks: { name: string; thumb: string; current: boolean }[] }
  | { kind: 'standings'; rows: { position: number; player: PlayerView; total: number; lastRacePoints: number | null }[] }
  | { kind: 'winner'; player: PlayerView; total: number }
  | RaceWinView | CupWinView | BracketView | MatchesView
  | { kind: 'notice'; doc: NoticeDoc }
  | { kind: 'qr'; style: QrStyle; title: TitleView; text: string; items: QrItem[] }
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
 *  style = event text and typography (show-wide). match = the race (cup, track, race number). players = the four players (name, character, colour). scores = results and adjustments (off by default: recalling would overwrite live scores).
 *  While a tournament is active, `match`, `players` and `scores` are never recalled whatever the scope says. */
export interface PresetScope { layers: boolean; armed: boolean; style: boolean; match: boolean; players: boolean; scores: boolean; transition: boolean; mattify: boolean }
/** A saved snapshot of the show: every output's layers, arming, show data, scores, transition speed and Mattify. */
export interface Preset {
  id: string; name: string; scope: PresetScope
  layers: Record<string, Layers>; armed: string[]
  draft: ShowData; transition: TransitionSpeed; mattify: boolean
}
/** One step in a stack: recall a preset, then cut/auto it to air (take: null = recall only, take by hand). The same preset may appear in many cues. */
export type CueAction = 'nextRace' | 'nextMatch' | 'resetStack'
export interface Cue { id: string; presetId: string; take: TakeMode | null; scope?: Partial<PresetScope>; /** Runs after the cue fires: advance the race, advance the match (and reset the stacks), or reset this stack. */ action?: CueAction }
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
  tournaments: Tournament[]; activeTournamentId: string | null
  /** App-wide switches (not part of an exported show). Applied instantly, with no Take. */
  settings: { mattify: boolean; /** URL of the uploaded logo (normalised PNG); absent = the built-in roundel. */ logo?: string }
}
export interface ShowFile { draft: ShowData; outputs: OutputConfig[]; layers: Record<string, Layers>; transition: TransitionSpeed; presets: Preset[]; stacks: CueStack[]; tournaments: Tournament[] }

/** Edit any match's setup. `players` entries are patched per slot (hand-editing a slot that auto-fills turns auto off for it). */
export interface MatchPatch { label?: string; round?: number; players?: (Partial<Player> | null)[]; race?: Partial<RaceState> }
export interface WinScreenConfigPatch { layout?: WinScreenConfig['layout']; blocks?: Partial<WinScreenConfig['blocks']> }
export interface MatchesSceneConfigPatch { layout?: MatchesLayout; detail?: Partial<Record<OutputFormat, MatchesDetail>>; pendingScores?: 'zeros' | 'hide'; liveMarker?: boolean }

export type Command =
  | { type: 'setPlayer'; index: 0 | 1 | 2 | 3; patch: Partial<Player> }
  | { type: 'setRace'; patch: Partial<RaceState> }
  | { type: 'stepRace'; delta: 1 | -1 }
  | { type: 'randomRace' }
  | { type: 'saveResults'; raceNo: number; trackId: string; positions: number[]; adjustments?: number[] }
  | { type: 'setAdjustment'; index: 0 | 1 | 2 | 3; value: number }
  | { type: 'setEventText'; patch: Partial<EventText> }
  | { type: 'setNotice'; doc: NoticeDoc }
  | { type: 'setQr'; patch: { text?: string; items?: [QrItem, QrItem] } }
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
  | { type: 'addCue'; stackId: string; presetId: string; take: TakeMode | null; index?: number; scope?: CueScopePatch; action?: CueAction }
  | { type: 'updateCue'; stackId: string; cueId: string; presetId?: string; take?: TakeMode | null; scope?: CueScopePatch; action?: CueAction | null }
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
  // tournaments. All except create/load/rename/delete act on the active tournament.
  | { type: 'createTournament'; name: string; template?: 'bracket' | 'empty' }
  | { type: 'loadTournament'; id: string | null }
  | { type: 'renameTournament'; id: string; name: string }
  | { type: 'deleteTournament'; id: string }
  /** Deep copy with fresh tournament and match ids; the copy becomes active. resetScores clears races/adjustments/statuses/overrides but keeps players, cups and labels. */
  | { type: 'duplicateTournament'; id: string; name?: string; resetScores?: boolean }
  | { type: 'addMatch'; label?: string; round?: number }
  | { type: 'updateMatch'; matchId: string; patch: MatchPatch }
  | { type: 'removeMatch'; matchId: string }
  | { type: 'setActiveMatch'; matchId: string }
  | { type: 'nextMatch' }
  | { type: 'setMatchResults'; matchId: string; races?: RaceResult[]; adjustments?: number[] }
  | { type: 'setWinnerOverride'; matchId: string; slot: 0 | 1 | 2 | 3 | null }
  | { type: 'setSlotSource'; matchId: string; slot: 0 | 1 | 2 | 3; source: SlotSource | null }
  | { type: 'setWinScreenConfig'; patch: WinScreenConfigPatch }
  | { type: 'setMatchesSceneConfig'; patch: MatchesSceneConfigPatch }
  | { type: 'setBracketConfig'; patch: Partial<BracketConfig> }
  | { type: 'setLogo'; url: string | null }

export type { Catalog }
