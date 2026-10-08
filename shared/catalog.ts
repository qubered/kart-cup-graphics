export interface CharacterEntry { id: string; name: string; base: string; variant?: string; icon: string; art?: string }
export interface CupEntry { id: string; name: string; emblem: string; tracks: [string, string, string, string] }
export interface TrackEntry { id: string; name: string; cupId: string; thumb: string; image?: string }
export interface Catalog { characters: CharacterEntry[]; cups: CupEntry[]; tracks: TrackEntry[] }
export interface CatalogIndex extends Catalog {
  character(id: string): CharacterEntry | undefined
  cup(id: string): CupEntry | undefined
  track(id: string): TrackEntry | undefined
  tracksOfCup(cupId: string): TrackEntry[]
}

export function indexCatalog(c: Catalog): CatalogIndex {
  const chars = new Map(c.characters.map((x) => [x.id, x]))
  const cups = new Map(c.cups.map((x) => [x.id, x]))
  const tracks = new Map(c.tracks.map((x) => [x.id, x]))
  return {
    ...c,
    character: (id) => chars.get(id),
    cup: (id) => cups.get(id),
    track: (id) => tracks.get(id),
    tracksOfCup: (cupId) =>
      (cups.get(cupId)?.tracks ?? []).map((t) => tracks.get(t)).filter((t): t is TrackEntry => !!t),
  }
}
