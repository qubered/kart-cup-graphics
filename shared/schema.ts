import { z } from 'zod'
import type { Command, Layers, OutputConfig, ShowData, ShowFile, ShowState, ViewModel } from './types'

export const colourIdSchema = z.enum(['red', 'blue', 'green', 'yellow', 'pink', 'orange', 'purple', 'cyan'])
export const outputFormatSchema = z.enum(['wide', 'twin', 'hd'])
export const backgroundIdSchema = z.enum(['A', 'B', 'C', 'none'])
export const sceneIdSchema = z.enum(['none', 'title', 'lineup', 'nextRace', 'standings', 'winner'])
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
export const layersSchema: z.ZodType<Layers> = z.object({
  background: backgroundIdSchema,
  scene: sceneIdSchema,
  trackCard: z.boolean(),
  lowerThirds: z.object({ on: z.boolean(), players: z.array(slotSchema).max(4) }),
  lineupShown: z.number().int().min(1).max(4).optional(),
})

export const programFrameSchema = z.object({
  view: z.custom<ViewModel>((v) => typeof v === 'object' && v !== null),
  mode: takeModeSchema,
  speed: transitionSpeedSchema,
  takenAt: z.number(),
})

// `settings` is optional on input so state files saved before it existed still load (Mattify off).
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
  settings: z.object({ mattify: z.boolean() }).default({ mattify: false }),
})

export const showFileSchema: z.ZodType<ShowFile, z.ZodTypeDef, unknown> = z.object({
  draft: showDataSchema,
  outputs: z.array(outputConfigSchema),
  layers: z.record(layersSchema),
  transition: transitionSpeedSchema,
})


export const commandSchema: z.ZodType<Command> = z.discriminatedUnion('type', [
  z.object({ type: z.literal('setPlayer'), index: slotSchema, patch: playerSchema.partial() }),
  z.object({ type: z.literal('setRace'), patch: raceStateSchema.partial() }),
  z.object({ type: z.literal('stepRace'), delta: z.union([z.literal(1), z.literal(-1)]) }),
  z.object({ type: z.literal('randomRace') }),
  z.object({
    type: z.literal('saveResults'), raceNo: z.number().int().min(1), trackId: z.string(),
    positions: z.array(z.number().int().min(0).max(12)).length(4),
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
  }) }),
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
  z.object({ type: z.literal('registerFont'), family: z.string().min(1).max(100), file: z.string().min(1).max(300) }),
]) as unknown as z.ZodType<Command>
