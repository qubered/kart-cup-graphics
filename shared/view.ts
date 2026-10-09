import type { CatalogIndex } from './catalog'
import { fontStack, isUpright } from './fonts'
import { colourHex, textOn } from './palette'
import { pointsFor, standings } from './scoring'
import { DEFAULT_BRACKET, DEFAULT_MATCHES_SCENE, DEFAULT_WIN_SCREEN, effectiveTrackId, hasResults, liveMatches, matchWinnerSlot, resolveMatchRef, resolveMatchSet } from './tournament'
import type {
  BoardRace, BoardRow, BracketView, CupWinView, Layers, Match, MatchCardView, MatchesView, RaceWinView, ScenePart, Tournament, OutputConfig, OutputFormat, Player, PlayerView, SceneId, SceneView, ShowData, TitleView, TrackCardView, ViewModel,
} from './types'

export const FORMAT_CANVAS: Record<OutputFormat, { w: number; h: number }> = {
  wide: { w: 3840, h: 1152 },
  twin: { w: 1920, h: 1152 },
  hd: { w: 1920, h: 1080 },
}

export const SUPPORTED_SCENES: Record<OutputFormat, SceneId[]> = {
  wide: ['none', 'title', 'lineup', 'announce', 'nextRace', 'standings', 'winner', 'notice', 'qr', 'raceWin', 'cupWin', 'bracket', 'matches'],
  hd: ['none', 'title', 'lineup', 'announce', 'nextRace', 'standings', 'winner', 'notice', 'qr', 'raceWin', 'cupWin', 'bracket', 'matches'],
  // twin: win screens only as a hero or board half (not both in one 1920 wide canvas)
  twin: ['none', 'title', 'announce', 'qr', 'raceWin', 'cupWin', 'bracket', 'matches'],
}

/** Can this format show the scene (with this part, for the win screens)? */
export function isSceneSupported(format: OutputFormat, scene: SceneId, part: ScenePart = 'full'): boolean {
  if (!SUPPORTED_SCENES[format].includes(scene)) return false
  return !(format === 'twin' && (scene === 'raceWin' || scene === 'cupWin') && part === 'full')
}

function playerView(p: Player | undefined, slot: number, catalog: CatalogIndex): PlayerView {
  if (!p) return { slot, name: '', character: '?', icon: '', art: '', colour: colourHex('red'), textColour: textOn('red'), subtitle: '' }
  const c = catalog.character(p.characterId)
  return {
    slot, name: p.name, character: c?.name ?? '?', icon: c?.icon ?? '', art: '', // headshots only: every character shows its icon, never full-body art
    colour: colourHex(p.colour), textColour: textOn(p.colour), subtitle: p.subtitle ?? '',
  }
}

interface RaceInfo { raceLabel: string; cupName: string; cupEmblem: string; trackName: string; trackImage: string; cupId: string; trackId: string }

function raceInfo(data: ShowData, catalog: CatalogIndex): RaceInfo {
  const r = data.race
  const trackId = effectiveTrackId(catalog, r, r.raceIndex)
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

/** The Next-race scene's strip of maps. Cup mode: the cup's races in order, with any hand-picked maps, the current race flagged. Single-track mode: the track's cup. */
function nextRaceTracks(race: ShowData['race'], info: RaceInfo, catalog: CatalogIndex): { name: string; thumb: string; current: boolean }[] {
  if (race.mode !== 'cup') return catalog.tracksOfCup(info.cupId).map((t) => ({ name: t.name, thumb: t.thumb, current: t.id === info.trackId }))
  const out: { name: string; thumb: string; current: boolean }[] = []
  for (let i = 0; i < (catalog.cup(race.cupId)?.tracks.length ?? 0); i++) {
    const t = catalog.track(effectiveTrackId(catalog, race, i))
    if (t) out.push({ name: t.name, thumb: t.thumb, current: i === race.raceIndex })
  }
  return out
}

function boardRaces(data: ShowData, catalog: CatalogIndex, upTo = data.scores.races.length): BoardRace[] {
  return data.scores.races.slice(0, upTo).map((r) => ({ raceNo: r.raceNo, trackName: catalog.track(r.trackId)?.name ?? '?' }))
}

/** Scoreboard rows ordered by standings() over the first `upTo` races. `winnerSlot` flags the row that won. */
function boardRows(data: ShowData, pv: (i: number) => PlayerView, winnerSlot: number | null, upTo = data.scores.races.length): BoardRow[] {
  const races = data.scores.races.slice(0, upTo)
  const scores = { races, adjustments: data.scores.adjustments }
  return standings(scores, data.players.length).map((r) => ({
    position: r.position, player: pv(r.playerIndex), total: r.total,
    racePoints: races.map((x) => pointsFor(x.positions[r.playerIndex] ?? 0)),
    lastRacePoints: r.lastRacePoints, adjustment: data.scores.adjustments[r.playerIndex] ?? 0, winner: r.playerIndex === winnerSlot,
  }))
}

/** The match a win screen reads. Without a tournament the draft itself is the (only) match, so the win screens still work. */
function winMatch(t: Tournament | null, draft: ShowData, layers: Layers): { id: string; label: string; data: ShowData; winnerOverride: number | null } {
  if (t) {
    const m = resolveMatchRef({ ...t, matches: liveMatches(t, draft) }, layers.matchRef) ?? liveMatches(t, draft)[0]
    if (m) return m
  }
  return { id: '', label: '', data: draft, winnerOverride: null }
}

function raceWinView(m: ReturnType<typeof winMatch>, layers: Layers, t: Tournament | null, catalog: CatalogIndex): RaceWinView {
  const d = m.data
  const pv = (i: number) => playerView(d.players[i], i, catalog)
  const info = raceInfo(d, catalog)
  const last = d.scores.races[d.scores.races.length - 1]
  let slot = 0
  if (last) {
    let best = Number.MAX_SAFE_INTEGER
    last.positions.forEach((p, i) => { if (p >= 1 && p < best) { best = p; slot = i } })
  } else slot = standings(d.scores, d.players.length)[0].playerIndex
  const rows = boardRows(d, pv, last ? slot : null)
  const lastRow = rows.find((r) => r.player.slot === slot)
  return {
    kind: 'raceWin', matchId: m.id, matchLabel: m.label, part: layers.part ?? 'full', config: t?.winScreen ?? DEFAULT_WIN_SCREEN,
    winner: pv(slot), rows, races: boardRaces(d, catalog), cupName: info.cupName, cupEmblem: info.cupEmblem, empty: !last,
    raceNo: last?.raceNo ?? null, raceLabel: last ? `RACE ${last.raceNo} / ${d.race.raceTotal}` : '',
    trackName: last ? (catalog.track(last.trackId)?.name ?? '?') : '', racePoints: lastRow?.lastRacePoints ?? 0,
  }
}

function cupWinView(m: ReturnType<typeof winMatch>, layers: Layers, t: Tournament | null, catalog: CatalogIndex): CupWinView {
  const d = m.data
  const pv = (i: number) => playerView(d.players[i], i, catalog)
  const info = raceInfo(d, catalog)
  const slot = matchWinnerSlot(m.winnerOverride, d) ?? standings(d.scores, d.players.length)[0].playerIndex
  const rows = boardRows(d, pv, slot)
  return {
    kind: 'cupWin', matchId: m.id, matchLabel: m.label, part: layers.part ?? 'full', config: t?.winScreen ?? DEFAULT_WIN_SCREEN,
    winner: pv(slot), rows, races: boardRaces(d, catalog), cupName: info.cupName, cupEmblem: info.cupEmblem, empty: !hasResults(d),
    total: rows.find((r) => r.winner)?.total ?? 0, overridden: m.winnerOverride !== null,
  }
}

function matchCard(m: Match, t: Tournament, catalog: CatalogIndex): MatchCardView {
  const d = m.data
  const pv = (i: number) => playerView(d.players[i], i, catalog)
  const info = raceInfo(d, catalog)
  const slot = matchWinnerSlot(m.winnerOverride, d)
  return {
    id: m.id, label: m.label, round: m.round, status: m.status, live: m.id === t.activeMatchId,
    cupName: info.cupName, cupEmblem: info.cupEmblem, hasResults: hasResults(d),
    rows: boardRows(d, pv, slot), races: boardRaces(d, catalog), winner: slot === null ? null : pv(slot),
  }
}

function matchesView(t: Tournament, draft: ShowData, layers: Layers, format: OutputFormat, catalog: CatalogIndex): MatchesView {
  const config = t.matchesScene ?? DEFAULT_MATCHES_SCENE
  const picked = resolveMatchSet(liveMatches(t, draft), layers.matchSet)
  const cards = picked.map((m) => matchCard(m, t, catalog))
  return {
    kind: 'matches', config, detail: config.detail[format], layout: config.layout, matchIds: picked.map((m) => m.id), cards,
    focusId: cards.find((c) => c.live)?.id ?? cards[0]?.id ?? null,
  }
}

function bracketView(t: Tournament, draft: ShowData, catalog: CatalogIndex): BracketView {
  const rounds = [...new Set(t.matches.map((m) => m.round))].sort((a, b) => a - b)
  return {
    kind: 'bracket', config: t.bracket ?? DEFAULT_BRACKET, tournamentName: t.name,
    rounds: rounds.map((round) => ({
      round,
      nodes: liveMatches(t, draft).filter((m) => m.round === round).map((m) => {
        const d = m.data
        const pv = (i: number) => playerView(d.players[i], i, catalog)
        const slot = matchWinnerSlot(m.winnerOverride, d)
        const tot = standings(d.scores, d.players.length)
        return {
          matchId: m.id, label: m.label, status: m.status, live: m.id === t.activeMatchId, hasResults: hasResults(d),
          slots: d.players.map((_, i) => ({ player: pv(i), total: tot.find((r) => r.playerIndex === i)?.total ?? 0, winner: i === slot, fromMatchId: m.slotSources?.[i]?.matchId ?? null })),
          winner: slot === null ? null : pv(slot), overridden: m.winnerOverride !== null,
        }
      }),
    })),
  }
}

/** `tournament`: the active tournament, if any. `data` is always the draft (= the active match's live data). */
export function deriveView(data: ShowData, layers: Layers, output: OutputConfig, catalog: CatalogIndex, tournament: Tournament | null = null): ViewModel {
  const ty = data.typography
  const title: TitleView = { preTitle: data.event.preTitle, title: data.event.title, accent: data.event.titleAccent }
  const pv = (i: number) => playerView(data.players[i], i, catalog)
  const info = raceInfo(data, catalog)

  let scene: SceneView | null = null
  if (isSceneSupported(output.format, layers.scene, layers.part)) {
    switch (layers.scene) {
      case 'title': scene = { kind: 'title', title, logo: layers.logo ?? 'corner' }; break
      case 'lineup': scene = { kind: 'lineup', players: data.players.slice(0, Math.min(4, Math.max(0, layers.lineupShown ?? 4))).map((_, i) => pv(i)) }; break
      case 'announce': scene = { kind: 'announce', player: pv(Math.min(3, Math.max(0, layers.announceSlot ?? 0))), card: !layers.announceBare }; break
      case 'nextRace':
        scene = {
          kind: 'nextRace', raceLabel: info.raceLabel, cupName: info.cupName, cupEmblem: info.cupEmblem,
          trackName: info.trackName, trackImage: info.trackImage, single: data.race.mode === 'track',
          cupTracks: nextRaceTracks(data.race, info, catalog),
        }
        break
      case 'standings': {
        const rows = standings(data.scores, data.players.length).map((r) => ({
          position: r.position, player: pv(r.playerIndex), total: r.total, lastRacePoints: r.lastRacePoints,
        }))
        scene = { kind: 'standings', rows }
        break
      }
      case 'winner': {
        const top = standings(data.scores, data.players.length)[0]
        scene = { kind: 'winner', player: pv(top.playerIndex), total: top.total }
        break
      }
      case 'raceWin': scene = raceWinView(winMatch(tournament, data, layers), layers, tournament, catalog); break
      case 'cupWin': scene = cupWinView(winMatch(tournament, data, layers), layers, tournament, catalog); break
      case 'matches': scene = tournament ? matchesView(tournament, data, layers, output.format, catalog) : null; break
      case 'bracket': scene = tournament ? bracketView(tournament, data, catalog) : null; break
      case 'notice': scene = { kind: 'notice', doc: structuredClone(data.notice), qr: layers.noticeQr ? data.qr.items.map((i) => ({ ...i })) : null }; break
      case 'qr': scene = { kind: 'qr', style: layers.qrStyle ?? 'center', title, text: data.qr.text, items: data.qr.items.map((i) => ({ ...i })) }; break
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
