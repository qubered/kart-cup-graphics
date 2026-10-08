import type { CatalogIndex, CharacterEntry, CupEntry, TrackEntry } from '../../../shared/catalog'

/** Prefix matches first, then contains-matches; roster order within each group. */
export function searchCharacters(c: CatalogIndex, q: string): CharacterEntry[] {
  const needle = q.trim().toLowerCase()
  if (!needle) return [...c.characters]
  const starts: CharacterEntry[] = []
  const contains: CharacterEntry[] = []
  for (const ch of c.characters) {
    const n = ch.name.toLowerCase()
    if (n.startsWith(needle)) starts.push(ch)
    else if (n.includes(needle)) contains.push(ch)
  }
  return [...starts, ...contains]
}

/** Tracks grouped by cup; cups with no matches are dropped. */
export function searchTracks(c: CatalogIndex, q: string): { cup: CupEntry; tracks: TrackEntry[] }[] {
  const needle = q.trim().toLowerCase()
  const out: { cup: CupEntry; tracks: TrackEntry[] }[] = []
  for (const cup of c.cups) {
    const all = c.tracksOfCup(cup.id)
    const tracks = needle ? all.filter((t) => t.name.toLowerCase().includes(needle)) : all
    if (tracks.length) out.push({ cup, tracks })
  }
  return out
}

/** Positions (ignoring 0) that appear more than once, sorted ascending. */
export function duplicatePositions(positions: number[]): number[] {
  const seen = new Set<number>()
  const dup = new Set<number>()
  for (const p of positions) {
    if (!p) continue
    if (seen.has(p)) dup.add(p)
    seen.add(p)
  }
  return [...dup].sort((a, b) => a - b)
}
