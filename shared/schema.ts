import { z } from 'zod'
import { DEFAULT_BRACKET, DEFAULT_MATCHES_SCENE, DEFAULT_WIN_SCREEN } from './tournament'
import type { BracketConfig, Command, Cue, CueStack, Layers, Match, MatchesSceneConfig, OutputConfig, Preset, PresetScope, ShowData, ShowFile, ShowState, Tournament, ViewModel, WinScreenConfig } from './types'

export const colourIdSchema = z.enum(['red', 'blue', 'green', 'yellow', 'pink', 'orange', 'purple', 'cyan'])
export const outputFormatSchema = z.enum(['wide', 'twin', 'hd'])
export const backgroundIdSchema = z.enum(['A', 'B', 'C', 'none'])
export const sceneIdSchema = z.enum(['none', 'title', 'lineup', 'nextRace', 'standings', 'winner', 'raceWin', 'cupWin', 'bracket', 'matches'])
export const transitionSpeedSchema = z.enum(['fast', 'normal', 'slow'])
export const takeModeSchema = z.enum(['cut', 'auto'])
export const slotSchema = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)])

const margin = z.number().finite().min(0)
export const safeAreaSchema = z.object({ top: margin, right: margin, bottom: margin, left: margin })
export const outputIdSchema = z.string().regex(/^[a-z0-9-]+$/, 'invalid output id').max(64)
export const outputConfigSchema: z.ZodType<OutputConfig> = z.object({
  id: outputIdSchema,
  name: z.string().max(100),
  format: outputFormatSchema,
  safeArea: safeAreaSchema,
  graphicsScale: z.number().finite().positive().max(10),
})

export const playerSchema = z.object({ name: z.string().max(200), characterId: z.string(), colour: colourIdSchema })
export const raceStateSchema = z.object({
  mode: z.enum(['cup', 'track']), cupId: z.string(), raceIndex: slotSchema, trackId: z.string(),
  raceNo: z.number().int().min(1).max(99).default(1), raceTotal: z.number().int().min(1).max(99).default(4),
})
export const raceResultSchema = z.object({
  raceNo: z.number().int().min(1),
  trackId: z.string(),
  positions: z.array(z.number().int().min(0).max(12)).length(4),
})
export const eventTextSchema = z.object({
  preTitle: z.string(), title: z.string(), titleAccent: z.string(), watermark: z.string(), holdMessage: z.string(),
})
export const typographySchema = z.object({
  eventTitle: z.object({ font: z.string(), style: z.enum(['chrome', 'classic']) }),
  headings: z.object({ font: z.string(), look: z.enum(['chrome', 'classic', 'plain']) }),
  names: z.object({ font: z.string() }),
  labels: z.object({ font: z.string() }),
})
export const showDataSchema: z.ZodType<ShowData, z.ZodTypeDef, unknown> = z.object({
  event: eventTextSchema,
  typography: typographySchema,
  players: z.array(playerSchema).length(4),
  race: raceStateSchema,
  scores: z.object({
    races: z.array(raceResultSchema),
    adjustments: z.array(z.number().finite()).length(4),
  }),
})
export const scenePartSchema = z.enum(['full', 'hero', 'board'])
const idStr = z.string().min(1).max(64)
export const matchRefSchema = z.union([z.enum(['active', 'previous']), z.object({ matchId: idStr })])
export const matchSetSchema = z.object({
  rounds: z.array(z.number().int().min(0).max(20)).max(21).optional(),
  ids: z.array(idStr).max(64).optional(),
  range: z.tuple([z.number().int().min(0).max(63), z.number().int().min(0).max(63)]).optional(),
})
const layersShape = {
  background: backgroundIdSchema,
  scene: sceneIdSchema,
  trackCard: z.boolean(),
  lowerThirds: z.object({ on: z.boolean(), players: z.array(slotSchema).max(4) }),
  lineupShown: z.number().int().min(1).max(4).optional(),
  part: scenePartSchema.optional(),
  matchRef: matchRefSchema.optional(),
  matchSet: matchSetSchema.optional(),
}
export const layersSchema: z.ZodType<Layers> = z.object(layersShape)

const SCOPE_KEYS = ['layers', 'armed', 'style', 'match', 'players', 'scores', 'transition', 'mattify'] as const
/** Scope objects saved before the `show` split: show -> style + match, and players (added later) defaults to show. An explicit new key wins. */
export function migrateScope(v: unknown): unknown {
  if (typeof v !== 'object' || v === null || !('show' in v)) return v
  const { show, ...rest } = v as Record<string, unknown>
  const out: Record<string, unknown> = { ...rest }
  if (typeof show === 'boolean') { out.style ??= show; out.match ??= show; out.players ??= show }
  else if (show === null) { /* legacy cue patch "inherit": nothing to set */ }
  return out
}
export const presetScopeSchema: z.ZodType<PresetScope, z.ZodTypeDef, unknown> = z.preprocess(
  migrateScope, z.object(Object.fromEntries(SCOPE_KEYS.map((k) => [k, z.boolean()]))),
) as unknown as z.ZodType<PresetScope, z.ZodTypeDef, unknown>
const partialScopeSchema = z.preprocess(migrateScope, z.object(Object.fromEntries(SCOPE_KEYS.map((k) => [k, z.boolean()]))).partial())
export const presetSchema: z.ZodType<Preset, z.ZodTypeDef, unknown> = z.object({
  id: z.string().min(1).max(64),
  name: z.string().max(100),
  scope: presetScopeSchema,
  layers: z.record(layersSchema),
  armed: z.array(z.string()),
  draft: showDataSchema,
  transition: transitionSpeedSchema,
  mattify: z.boolean(),
})

const cueScopeSchema = partialScopeSchema
const cueScopePatchSchema = z.preprocess(migrateScope, z.object(Object.fromEntries(SCOPE_KEYS.map((k) => [k, z.boolean().nullable()]))).partial())
const cueActionSchema = z.enum(['nextRace', 'nextMatch', 'resetStack'])
export const cueSchema: z.ZodType<Cue> = z.object({
  id: z.string().min(1).max(64), presetId: z.string().min(1).max(64), take: takeModeSchema.nullable(), scope: cueScopeSchema.optional(), action: cueActionSchema.optional(),
}) as unknown as z.ZodType<Cue>
export const cueStackSchema: z.ZodType<CueStack, z.ZodTypeDef, unknown> = z.object({
  id: z.string().min(1).max(64), name: z.string().max(100), cues: z.array(cueSchema), current: z.string().nullable(), selected: z.string().nullable().default(null),
})

// ---- tournaments ----
export const winScreenConfigSchema: z.ZodType<WinScreenConfig> = z.object({
  layout: z.enum(['heroLeft', 'heroCentre']),
  blocks: z.object({ hero: z.boolean(), board: z.boolean(), cupEmblem: z.boolean(), trackName: z.boolean(), racePoints: z.boolean() }),
})
const matchesLayoutSchema = z.enum(['grid', 'row', 'stack', 'focus'])
const matchesDetailSchema = z.enum(['full', 'compact', 'winner'])
export const matchesSceneConfigSchema: z.ZodType<MatchesSceneConfig> = z.object({
  layout: matchesLayoutSchema,
  detail: z.object({ wide: matchesDetailSchema, twin: matchesDetailSchema, hd: matchesDetailSchema }),
  pendingScores: z.enum(['zeros', 'hide']),
  liveMarker: z.boolean(),
})
export const bracketConfigSchema: z.ZodType<BracketConfig> = z.object({ showScores: z.boolean(), showStatus: z.boolean() })
const slotSourceSchema = z.object({ matchId: idStr, auto: z.boolean() })
export const matchSchema: z.ZodType<Match, z.ZodTypeDef, unknown> = z.object({
  id: idStr,
  label: z.string().max(100),
  round: z.number().int().min(0).max(20),
  data: showDataSchema,
  status: z.enum(['pending', 'live', 'done']).default('pending'),
  winnerOverride: slotSchema.nullable().default(null),
  slotSources: z.array(slotSourceSchema.nullable()).max(4).optional(),
})
export const tournamentSchema: z.ZodType<Tournament, z.ZodTypeDef, unknown> = z.object({
  id: idStr,
  name: z.string().max(100),
  matches: z.array(matchSchema).max(64),
  activeMatchId: idStr,
  winScreen: winScreenConfigSchema.default(DEFAULT_WIN_SCREEN),
  matchesScene: matchesSceneConfigSchema.default(DEFAULT_MATCHES_SCENE),
  bracket: bracketConfigSchema.default(DEFAULT_BRACKET),
})

export const programFrameSchema = z.object({
  view: z.custom<ViewModel>((v) => typeof v === 'object' && v !== null),
  mode: takeModeSchema,
  speed: transitionSpeedSchema,
  takenAt: z.number(),
  layers: layersSchema.optional(),
  draft: showDataSchema.optional(),
})

// presets/stacks/settings are optional on input so state files saved before they existed still load.
export const showStateSchema: z.ZodType<ShowState, z.ZodTypeDef, unknown> = z.object({
  draft: showDataSchema,
  outputs: z.array(outputConfigSchema),
  layers: z.record(layersSchema),
  program: z.record(programFrameSchema),
  overlay: z.object({ hold: z.object({ on: z.boolean(), message: z.string() }), ftb: z.boolean() }),
  transition: transitionSpeedSchema,
  armed: z.array(z.string()),
  clocks: z.object({ onAirSince: z.number().nullable() }),
  uploadedFonts: z.array(z.object({ family: z.string(), file: z.string() })),
  presets: z.array(presetSchema).default([]),
  lastPreset: z.string().nullable().default(null),
  settings: z.object({ mattify: z.boolean() }).default({ mattify: false }),
  stacks: z.array(cueStackSchema).default([]),
  tournaments: z.array(tournamentSchema).default([]),
  activeTournamentId: z.string().nullable().default(null),
})

export const showFileSchema: z.ZodType<ShowFile, z.ZodTypeDef, unknown> = z.object({
  draft: showDataSchema,
  outputs: z.array(outputConfigSchema),
  layers: z.record(layersSchema),
  transition: transitionSpeedSchema,
  presets: z.array(presetSchema).default([]),
  stacks: z.array(cueStackSchema).default([]),
  tournaments: z.array(tournamentSchema).default([]),
})

export const commandSchema: z.ZodType<Command> = z.discriminatedUnion('type', [
  z.object({ type: z.literal('setPlayer'), index: slotSchema, patch: playerSchema.partial() }),
  z.object({ type: z.literal('setRace'), patch: raceStateSchema.partial() }),
  z.object({ type: z.literal('stepRace'), delta: z.union([z.literal(1), z.literal(-1)]) }),
  z.object({ type: z.literal('randomRace') }),
  z.object({
    type: z.literal('saveResults'), raceNo: z.number().int().min(1), trackId: z.string(),
    positions: z.array(z.number().int().min(0).max(12)).length(4),
    adjustments: z.array(z.number().finite()).length(4).optional(),
  }),
  z.object({ type: z.literal('setAdjustment'), index: slotSchema, value: z.number().finite() }),
  z.object({ type: z.literal('setEventText'), patch: eventTextSchema.partial() }),
  z.object({
    type: z.literal('setTypography'),
    role: z.enum(['eventTitle', 'headings', 'names', 'labels']),
    patch: z.object({
      font: z.string().optional(),
      style: z.enum(['chrome', 'classic']).optional(),
      look: z.enum(['chrome', 'classic', 'plain']).optional(),
    }),
  }),
  z.object({ type: z.literal('setLayers'), outputId: z.string(), patch: z.object({
    background: backgroundIdSchema.optional(),
    scene: sceneIdSchema.optional(),
    trackCard: z.boolean().optional(),
    lowerThirds: z.object({ on: z.boolean(), players: z.array(slotSchema).max(4) }).optional(),
    lineupShown: z.number().int().min(1).max(4).optional(),
    part: scenePartSchema.optional(),
    matchRef: matchRefSchema.optional(),
    matchSet: matchSetSchema.optional(),
  }) }),
  z.object({ type: z.literal('savePreset'), name: z.string().trim().min(1).max(100), from: z.enum(['pvw', 'pgm']).optional(), scope: partialScopeSchema.optional() }),
  z.object({ type: z.literal('updatePreset'), id: z.string(), name: z.string().trim().min(1).max(100).optional(), from: z.enum(['pvw', 'pgm']).optional(), scope: partialScopeSchema.optional() }),
  z.object({ type: z.literal('deletePreset'), id: z.string() }),
  z.object({ type: z.literal('recallPreset'), id: z.string(), take: takeModeSchema.optional() }),
  z.object({ type: z.literal('createStack'), name: z.string().trim().min(1).max(100) }),
  z.object({ type: z.literal('renameStack'), id: z.string(), name: z.string().trim().min(1).max(100) }),
  z.object({ type: z.literal('deleteStack'), id: z.string() }),
  z.object({ type: z.literal('resetStack'), id: z.string() }),
  z.object({ type: z.literal('addCue'), stackId: z.string(), presetId: z.string(), take: takeModeSchema.nullable(), index: z.number().int().min(0).optional(), scope: cueScopePatchSchema.optional(), action: cueActionSchema.optional() }),
  z.object({ type: z.literal('updateCue'), stackId: z.string(), cueId: z.string(), presetId: z.string().optional(), take: takeModeSchema.nullable().optional(), scope: cueScopePatchSchema.optional(), action: cueActionSchema.nullable().optional() }),
  z.object({ type: z.literal('removeCue'), stackId: z.string(), cueId: z.string() }),
  z.object({ type: z.literal('moveCue'), stackId: z.string(), cueId: z.string(), delta: z.union([z.literal(1), z.literal(-1)]) }),
  z.object({ type: z.literal('fireCue'), stackId: z.string(), cueId: z.string() }),
  z.object({ type: z.literal('selectCue'), stackId: z.string(), cueId: z.string() }),
  z.object({ type: z.literal('stepSelection'), stackId: z.string(), delta: z.union([z.literal(1), z.literal(-1)]) }),
  z.object({ type: z.literal('goStack'), stackId: z.string() }),
  z.object({ type: z.literal('arm'), outputIds: z.array(z.string()) }),
  z.object({ type: z.literal('take'), mode: takeModeSchema, outputIds: z.array(z.string()).optional() }),
  z.object({ type: z.literal('setTransition'), speed: transitionSpeedSchema }),
  z.object({ type: z.literal('hold'), on: z.boolean(), message: z.string().optional() }),
  z.object({ type: z.literal('clear') }),
  z.object({ type: z.literal('ftb'), on: z.boolean() }),
  z.object({ type: z.literal('addOutput'), output: outputConfigSchema }),
  z.object({
    type: z.literal('updateOutput'), id: z.string(),
    patch: z.object({
      name: z.string().max(100).optional(),
      format: outputFormatSchema.optional(),
      safeArea: safeAreaSchema.optional(),
      graphicsScale: z.number().finite().positive().max(10).optional(),
    }),
  }),
  z.object({ type: z.literal('removeOutput'), id: z.string() }),
  z.object({ type: z.literal('importShow'), file: showFileSchema }),
  z.object({ type: z.literal('resetScores') }),
  z.object({ type: z.literal('resetShow') }),
  z.object({ type: z.literal('resetOnAirClock') }),
  z.object({ type: z.literal('setMattify'), on: z.boolean() }),
  z.object({ type: z.literal('createTournament'), name: z.string().trim().min(1).max(100), template: z.enum(['bracket', 'empty']).optional() }),
  z.object({ type: z.literal('loadTournament'), id: z.string().nullable() }),
  z.object({ type: z.literal('renameTournament'), id: z.string(), name: z.string().trim().min(1).max(100) }),
  z.object({ type: z.literal('deleteTournament'), id: z.string() }),
  z.object({ type: z.literal('addMatch'), label: z.string().trim().min(1).max(100).optional(), round: z.number().int().min(0).max(20).optional() }),
  z.object({
    type: z.literal('updateMatch'), matchId: z.string(),
    patch: z.object({
      label: z.string().trim().min(1).max(100).optional(),
      round: z.number().int().min(0).max(20).optional(),
      players: z.array(playerSchema.partial().nullable()).max(4).optional(),
      race: raceStateSchema.partial().optional(),
    }),
  }),
  z.object({ type: z.literal('removeMatch'), matchId: z.string() }),
  z.object({ type: z.literal('setActiveMatch'), matchId: z.string() }),
  z.object({ type: z.literal('nextMatch') }),
  z.object({
    type: z.literal('setMatchResults'), matchId: z.string(),
    races: z.array(raceResultSchema).max(99).optional(),
    adjustments: z.array(z.number().finite()).length(4).optional(),
  }),
  z.object({ type: z.literal('setWinnerOverride'), matchId: z.string(), slot: slotSchema.nullable() }),
  z.object({ type: z.literal('setSlotSource'), matchId: z.string(), slot: slotSchema, source: slotSourceSchema.nullable() }),
  z.object({
    type: z.literal('setWinScreenConfig'),
    patch: z.object({ layout: z.enum(['heroLeft', 'heroCentre']).optional(), blocks: z.object({ hero: z.boolean(), board: z.boolean(), cupEmblem: z.boolean(), trackName: z.boolean(), racePoints: z.boolean() }).partial().optional() }),
  }),
  z.object({
    type: z.literal('setMatchesSceneConfig'),
    patch: z.object({
      layout: matchesLayoutSchema.optional(),
      detail: z.object({ wide: matchesDetailSchema, twin: matchesDetailSchema, hd: matchesDetailSchema }).partial().optional(),
      pendingScores: z.enum(['zeros', 'hide']).optional(),
      liveMarker: z.boolean().optional(),
    }),
  }),
  z.object({ type: z.literal('setBracketConfig'), patch: z.object({ showScores: z.boolean(), showStatus: z.boolean() }).partial() }),
  z.object({ type: z.literal('registerFont'), family: z.string().min(1).max(100), file: z.string().min(1).max(300) }),
]) as unknown as z.ZodType<Command>
