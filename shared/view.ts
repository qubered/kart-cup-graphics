import type { CatalogIndex } from './catalog'
import { fontStack, isUpright } from './fonts'
import { colourHex, textOn } from './palette'
import { standings } from './scoring'
import type {
  Layers, OutputConfig, OutputFormat, Player, PlayerView, SceneId, SceneView, ShowData, TitleView, TrackCardView, ViewModel,
} from './types'

export const FORMAT_CANVAS: Record<OutputFormat, { w: number; h: number }> = {
  wide: { w: 3840, h: 1152 },
  twin: { w: 1920, h: 1152 },
  hd: { w: 1920, h: 1080 },
}

export const SUPPORTED_SCENES: Record<OutputFormat, SceneId[]> = {
  wide: ['none', 'title', 'lineup', 'nextRace', 'standings', 'winner'],
  hd: ['none', 'title', 'lineup', 'nextRace', 'standings', 'winner'],
  twin: ['none', 'title'],
}

function playerView(p: Player | undefined, slot: number, catalog: CatalogIndex): PlayerView {
  if (!p) return { slot, name: '', character: '?', icon: '', art: '', colour: colourHex('red'), textColour: textOn('red') }
  const c = catalog.character(p.characterId)
  return {
    slot, name: p.name, character: c?.name ?? '?', icon: c?.icon ?? '', art: '', // headshots only: every character shows its icon, never full-body art
    colour: colourHex(p.colour), textColour: textOn(p.colour),
  }
}

interface RaceInfo { raceLabel: string; cupName: string; cupEmblem: string; trackName: string; trackImage: string; cupId: string; trackId: string }

function raceInfo(data: ShowData, catalog: CatalogIndex): RaceInfo {
  const r = data.race
  const trackId = r.mode === 'cup' ? (catalog.cup(r.cupId)?.tracks[r.raceIndex] ?? '') : r.trackId
  const track = catalog.track(trackId)
  const cup = catalog.cup(r.mode === 'cup' ? r.cupId : (track?.cupId ?? r.cupId))
  return {
    raceLabel: `RACE ${r.raceNo} / ${r.raceTotal}`,
    cupName: cup?.name ?? '?',
    cupEmblem: cup?.emblem ?? '',
    trackName: track?.name ?? '?',
    trackImage: track ? (track.image ?? track.thumb) : '',
    cupId: cup?.id ?? '',
    trackId,
  }
}

export function deriveView(data: ShowData, layers: Layers, output: OutputConfig, catalog: CatalogIndex): ViewModel {
  const ty = data.typography
  const title: TitleView = { preTitle: data.event.preTitle, title: data.event.title, accent: data.event.titleAccent }
  const pv = (i: number) => playerView(data.players[i], i, catalog)
  const info = raceInfo(data, catalog)

  let scene: SceneView | null = null
  if (SUPPORTED_SCENES[output.format].includes(layers.scene)) {
    switch (layers.scene) {
      case 'title': scene = { kind: 'title', title }; break
      case 'lineup': scene = { kind: 'lineup', players: data.players.slice(0, Math.min(4, Math.max(1, layers.lineupShown ?? 4))).map((_, i) => pv(i)) }; break
      case 'nextRace':
        scene = {
          kind: 'nextRace', raceLabel: info.raceLabel, cupName: info.cupName, cupEmblem: info.cupEmblem,
          trackName: info.trackName, trackImage: info.trackImage, single: data.race.mode === 'track',
          cupTracks: catalog.tracksOfCup(info.cupId).map((t) => ({ name: t.name, thumb: t.thumb, current: t.id === info.trackId })),
        }
        break
      case 'standings': {
        const rows = standings(data.scores, data.players.length).map((r) => ({
          position: r.position, player: pv(r.playerIndex), total: r.total, lastRacePoints: r.lastRacePoints,
        }))
        scene = { kind: 'standings', rows, footer: `AFTER RACE ${data.scores.races.length} · ${info.cupName.toUpperCase()}` }
        break
      }
      case 'winner': {
        const top = standings(data.scores, data.players.length)[0]
        scene = { kind: 'winner', player: pv(top.playerIndex), total: top.total }
        break
      }
      default: scene = null
    }
  }

  const trackCard: TrackCardView | null = layers.trackCard
    ? { raceLabel: info.raceLabel, cupName: info.cupName, cupEmblem: info.cupEmblem, trackName: info.trackName }
    : null

  let slots: number[] = []
  if (layers.lowerThirds.on) {
    slots = output.format === 'twin' ? [0, 1, 2, 3] : [...new Set(layers.lowerThirds.players)].sort((a, b) => a - b)
  }

  return {
    format: output.format,
    canvas: { ...FORMAT_CANVAS[output.format] },
    safeArea: { ...output.safeArea },
    graphicsScale: output.graphicsScale,
    fonts: {
      eventTitle: fontStack(ty.eventTitle.font), headings: fontStack(ty.headings.font),
      names: fontStack(ty.names.font), labels: fontStack(ty.labels.font),
    },
    headingLook: ty.headings.look,
    headingUpright: isUpright(ty.headings.font),
    eventTitleStyle: ty.eventTitle.style,
    background: layers.background === 'none' ? null : { id: layers.background, watermark: data.event.watermark, title },
    scene,
    trackCard,
    lowerThirds: slots.map(pv),
  }
}
