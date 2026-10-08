import { describe, it, expect } from 'vitest'
import {
  kebab, characterIconCandidates, trackThumbTitle, trackLargeCandidates, cupEmblemTitle, CHARACTER_SPECS, CUP_SPECS,
} from '../../scripts/lib/catalog-data'

describe('catalog-data', () => {
  it('builds track titles', () => {
    expect(trackThumbTitle('Wii Moo Moo Meadows')).toBe('MK8D Wii Moo Moo Meadows Course Icon Full.png')
    expect(trackLargeCandidates('Water Park')).toEqual(['MK8 Water Park.png', 'MK8D Water Park.png'])
  })
  it('builds cup emblem titles', () => {
    expect(cupEmblemTitle('mushroom')).toBe('MK8 MushroomCup.png')
    expect(cupEmblemTitle('flower')).toBe('MK8 FlowerCup.png')
    expect(cupEmblemTitle('star')).toBe('MK8 Star Cup Emblem.png')
    expect(cupEmblemTitle('golden-dash')).toBe('MK8D BCP Golden Dash Emblem.png')
    expect(() => cupEmblemTitle('nope')).toThrow()
  })
  it('builds character icon candidates', () => {
    expect(characterIconCandidates('Petey Piranha')).toEqual([
      'MK8DX Petey Piranha Icon.png', 'MK8D Petey Piranha Icon.png', 'MK8 Petey Piranha Icon.png',
    ])
    expect(characterIconCandidates('Donkey Kong')[0]).toBe('MK8DX DK Icon.png')
    expect(characterIconCandidates('Mii')).toEqual(['Mii MK8.png'])
  })
  it('has 24 cups and 96 tracks', () => {
    expect(CUP_SPECS).toHaveLength(24)
    expect(CUP_SPECS.flatMap((c) => c.tracks)).toHaveLength(96)
  })
  it('has unique ids and variants after their base', () => {
    const ids = CHARACTER_SPECS.map((c) => c.id)
    expect(ids).toContain('yoshi-red')
    expect(ids).toContain('yoshi-light-blue')
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.indexOf('yoshi-red')).toBe(ids.indexOf('yoshi') + 3)
    expect(CHARACTER_SPECS.find((c) => c.id === 'yoshi-red')?.name).toBe('Yoshi (Red)')
    expect(CHARACTER_SPECS.find((c) => c.id === 'villager-boy')?.name).toBe('Villager (Boy)')
  })
  it('kebabs names', () => {
    expect(kebab('Bowser Jr.')).toBe('bowser-jr')
    expect(kebab("Yoshi's Island")).toBe('yoshis-island')
  })
})
