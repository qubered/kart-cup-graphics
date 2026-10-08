import { describe, expect, it } from 'vitest'
import { duplicatePositions, searchCharacters, searchTracks } from '../../web/src/control/catalog'
import { indexCatalog } from '../../shared/catalog'
import { fixtureCatalog } from '../fixtures/catalog'

const idx = indexCatalog(fixtureCatalog)

describe('control catalog search', () => {
  it('characters: prefix first, then contains, case-insensitive', () => {
    expect(searchCharacters(idx, 'pe').map((c) => c.name)).toEqual(['Peach', 'Peachette', 'Pink Gold Peach'])
    expect(searchCharacters(idx, 'RED').map((c) => c.id)).toEqual(['yoshi-red'])
    expect(searchCharacters(idx, '')).toHaveLength(idx.characters.length)
  })
  it('tracks grouped by cup, empty cups dropped', () => {
    const g = searchTracks(idx, 'mario')
    expect(g.map((x) => x.cup.id)).toEqual(['mushroom', 'flower', 'boomerang'])
    expect(searchTracks(idx, 'water').map((x) => x.tracks.map((t) => t.id))).toEqual([['water-park']])
    expect(searchTracks(idx, 'zzz')).toEqual([])
    expect(searchTracks(idx, '')).toHaveLength(3)
  })
  it('duplicatePositions', () => {
    expect(duplicatePositions([1, 3, 3, 0])).toEqual([3])
    expect(duplicatePositions([0, 0, 1, 2])).toEqual([])
    expect(duplicatePositions([2, 2, 1, 1])).toEqual([1, 2])
  })
})
