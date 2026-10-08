import type { ColourId } from './types'
export type { ColourId }

export const PLAYER_COLOURS: { id: ColourId; name: string; hex: string }[] = [
  { id: 'red', name: 'Red', hex: '#e60012' },
  { id: 'blue', name: 'Blue', hex: '#1e6cff' },
  { id: 'green', name: 'Green', hex: '#22b14c' },
  { id: 'yellow', name: 'Yellow', hex: '#ffc400' },
  { id: 'pink', name: 'Pink', hex: '#ff5fa2' },
  { id: 'orange', name: 'Orange', hex: '#ff8a00' },
  { id: 'purple', name: 'Purple', hex: '#8b5cf6' },
  { id: 'cyan', name: 'Cyan', hex: '#06b6d4' },
]

export function colourHex(id: ColourId): string {
  return (PLAYER_COLOURS.find((c) => c.id === id) ?? PLAYER_COLOURS[0]).hex
}

export function textOn(id: ColourId): '#ffffff' | '#14213d' {
  return id === 'yellow' || id === 'cyan' ? '#14213d' : '#ffffff'
}
